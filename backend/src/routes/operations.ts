import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../lib/permissions';
import type { Permission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// ── Permission mapping helper ─────────────────────────────────
// Maps (operation type, action) to the required permission
function getOperationPermission(opType: string, action: string): Permission | null {
  // Map operation types to permission prefixes
  const prefixMap: Record<string, string> = {
    receipt: 'receipts',
    delivery: 'deliveries',
    production: 'production',
    adjustment: 'adjustments',
    transfer: 'transfers',
  };
  const prefix = prefixMap[opType];
  if (!prefix) return null;
  const perm = `${prefix}.${action}` as Permission;
  return perm;
}

// Helper: check permission for the requesting user based on operation type + action
function checkOpPermission(req: AuthRequest, res: Response, opType: string, action: string): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  const userRow = db
    .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
    .get(req.user.id) as { id: number; role: string; is_super_admin: number } | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'User not found' });
    return false;
  }
  if (userRow.is_super_admin) return true;

  const perm = getOperationPermission(opType, action);
  if (!perm) return true; // Unknown type = allow (shouldn't happen)
  if (!hasPermission(userRow, perm)) {
    res.status(403).json({ error: 'Insufficient permissions', required: perm });
    return false;
  }
  return true;
}

// ─── Helpers ───────────────────────────────────────────────

const TYPE_CODES: Record<string, string> = {
  receipt: 'IN',
  delivery: 'OUT',
  production: 'PRD',
  adjustment: 'ADJ',
  transfer: 'TRF'
};

function generateReference(warehouseId: number, type: string): string {
  const warehouse = db.prepare('SELECT code FROM warehouses WHERE id = ?').get(warehouseId) as any;
  if (!warehouse) throw new Error('Warehouse not found');
  const typeCode = TYPE_CODES[type];
  const prefix = `${warehouse.code}/${typeCode}/`;
  // Find the highest existing sequence number for this warehouse+type prefix
  const last = db.prepare(
    "SELECT reference FROM operations WHERE reference LIKE ? ORDER BY reference DESC LIMIT 1"
  ).get(`${prefix}%`) as any;
  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.reference.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

function getDefaultLocation(warehouseId: number) {
  const loc = db.prepare(
    'SELECT id FROM locations WHERE warehouse_id = ? AND is_default = 1'
  ).get(warehouseId) as any;
  if (!loc) throw new Error('No default location for warehouse');
  return loc.id;
}

function generateLotNumber(prefix: string, sku: string, dateStr: string, productId: number): string {
  const dateFormatted = dateStr.replace(/-/g, '').slice(0, 8);
  // If the SKU already starts with the prefix (supplier/warehouse code), strip it to avoid repetition
  // e.g. prefix="RE", sku="RE-AN-001" → use "AN-001" instead of "RE-AN-001"
  let skuPart = sku;
  if (sku.startsWith(prefix + '-')) {
    skuPart = sku.slice(prefix.length + 1);
  }
  // Count existing lots with same prefix-sku-date pattern for sequence
  const pattern = `${prefix}-${skuPart}-${dateFormatted}-%`;
  const count = (db.prepare(
    'SELECT COUNT(*) as total FROM lots WHERE lot_number LIKE ?'
  ).get(pattern) as any).total;
  const seq = String(count + 1).padStart(2, '0');
  return `${prefix}-${skuPart}-${dateFormatted}-${seq}`;
}

// Fetch operation with joins
function getOperationFull(id: number | bigint) {
  return db.prepare(`
    SELECT o.*, w.name as warehouse_name, w.code as warehouse_code,
           u.name as created_by_name,
           s.name as supplier_name, s.code as supplier_code,
           dw.name as destination_warehouse_name, dw.code as destination_warehouse_code
    FROM operations o
    JOIN warehouses w ON o.warehouse_id = w.id
    JOIN users u ON o.created_by = u.id
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    LEFT JOIN warehouses dw ON o.destination_warehouse_id = dw.id
    WHERE o.id = ?
  `).get(id);
}

// ─── State machine rules ───────────────────────────────────
// Receipt:    draft -> waiting -> done   (Confirm, Validate)
// Delivery:   draft -> waiting -> ready -> done  (Confirm, Check Availability, Validate)
// Production: draft -> in_progress -> done  (Start Roast, Validate)
// Adjustment: draft -> done  (Validate)
// Transfer:   draft -> waiting -> done  (Confirm, Validate)
// All cancellable from any pre-done state

// ─── LIST ──────────────────────────────────────────────────

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { type, status, warehouse_id } = req.query;

    // If filtering by type, check view permission for that type
    if (type && typeof type === 'string') {
      if (!checkOpPermission(req, res, type, 'view')) return;
    }
    let query = `
      SELECT o.*, w.name as warehouse_name, w.code as warehouse_code,
             u.name as created_by_name,
             s.name as supplier_name,
             dw.name as destination_warehouse_name
      FROM operations o
      JOIN warehouses w ON o.warehouse_id = w.id
      JOIN users u ON o.created_by = u.id
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      LEFT JOIN warehouses dw ON o.destination_warehouse_id = dw.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type) { query += ' AND o.type = ?'; params.push(type); }
    if (status) { query += ' AND o.status = ?'; params.push(status); }
    if (warehouse_id) { query += ' AND o.warehouse_id = ?'; params.push(warehouse_id); }

    query += ' ORDER BY o.created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (error: any) {
    console.error('Get operations error:', error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

// ─── GET BY ID ─────────────────────────────────────────────

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const operation = getOperationFull(Number(req.params.id)) as any;
    if (!operation) return res.status(404).json({ error: 'Operation not found' });

    // Check view permission for this operation type
    if (!checkOpPermission(req, res, operation.type, 'view')) return;

    // Fetch type-specific lines
    let lines: any = [];
    if (operation.type === 'receipt') {
      lines = db.prepare(`
        SELECT rl.*, p.name as product_name, p.sku, p.unit
        FROM receipt_lines rl
        JOIN products p ON rl.product_id = p.id
        WHERE rl.operation_id = ?
      `).all(operation.id);
    } else if (operation.type === 'delivery') {
      lines = db.prepare(`
        SELECT dl.*, p.name as product_name, p.sku, p.unit
        FROM delivery_lines dl
        JOIN products p ON dl.product_id = p.id
        WHERE dl.operation_id = ?
      `).all(operation.id);
      // Attach lot allocations per line
      for (const line of lines) {
        (line as any).allocations = db.prepare(`
          SELECT dla.*, l.lot_number, l.remaining_qty as lot_remaining, l.expiry_date
          FROM delivery_lot_allocations dla
          JOIN lots l ON dla.lot_id = l.id
          WHERE dla.delivery_line_id = ?
        `).all(line.id);
      }
    } else if (operation.type === 'production') {
      lines = db.prepare(`
        SELECT pi.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, p.name as product_name, p.sku, p.unit
        FROM production_inputs pi
        JOIN lots l ON pi.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE pi.operation_id = ?
      `).all(operation.id);
    } else if (operation.type === 'adjustment') {
      lines = db.prepare(`
        SELECT al.*, l.lot_number, l.remaining_qty as lot_remaining,
               p.name as product_name, p.sku, p.unit
        FROM adjustment_lines al
        JOIN lots l ON al.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE al.operation_id = ?
      `).all(operation.id);
    } else if (operation.type === 'transfer') {
      lines = db.prepare(`
        SELECT tl.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, l.expiry_date,
               p.name as product_name, p.sku, p.unit
        FROM transfer_lines tl
        JOIN lots l ON tl.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE tl.operation_id = ?
      `).all(operation.id);
    }

    res.json({ ...operation, lines });
  } catch (error: any) {
    console.error('Get operation error:', error);
    res.status(500).json({ error: 'Failed to fetch operation' });
  }
});

// ─── CREATE ────────────────────────────────────────────────

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { type, warehouse_id, destination_warehouse_id, supplier_id, customer, scheduled_date, roast_date, roast_profile, reason, notes } = req.body;

    // Check create permission for the operation type
    if (!checkOpPermission(req, res, type, 'create')) return;

    if (!type || !warehouse_id) {
      return res.status(400).json({ error: 'Type and warehouse_id are required' });
    }

    const validTypes = ['receipt', 'delivery', 'production', 'adjustment', 'transfer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid operation type' });
    }

    if (type === 'receipt' && !supplier_id) {
      return res.status(400).json({ error: 'Supplier is required for receipts' });
    }
    if (type === 'production' && !roast_date) {
      return res.status(400).json({ error: 'Roast date is required for production orders' });
    }
    if (type === 'transfer') {
      if (!destination_warehouse_id) {
        return res.status(400).json({ error: 'Destination warehouse is required for transfers' });
      }
      if (Number(destination_warehouse_id) === Number(warehouse_id)) {
        return res.status(400).json({ error: 'Source and destination warehouse must be different' });
      }
      // Verify destination warehouse exists
      const destWh = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(destination_warehouse_id);
      if (!destWh) return res.status(400).json({ error: 'Destination warehouse not found' });
    }

    const reference = generateReference(warehouse_id, type);

    const result = db.prepare(`
      INSERT INTO operations (reference, type, status, warehouse_id, destination_warehouse_id, supplier_id, customer,
        scheduled_date, roast_date, roast_profile, reason, notes, created_by)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reference, type, warehouse_id,
      destination_warehouse_id || null,
      supplier_id || null, customer || null, scheduled_date || null,
      roast_date || null, roast_profile || null, reason || null, notes || null,
      req.user!.id
    );

    res.status(201).json(getOperationFull(result.lastInsertRowid));
  } catch (error: any) {
    console.error('Create operation error:', error);
    res.status(500).json({ error: 'Failed to create operation' });
  }
});

// ─── UPDATE ────────────────────────────────────────────────

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT status, type FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Editing requires create permission for that op type
    if (!checkOpPermission(req, res, op.type, 'create')) return;

    if (op.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft operations' });

    const { warehouse_id, destination_warehouse_id, supplier_id, customer, scheduled_date, roast_date, roast_profile, reason, notes } = req.body;

    db.prepare(`
      UPDATE operations SET warehouse_id = COALESCE(?, warehouse_id),
        destination_warehouse_id = ?,
        supplier_id = ?,
        customer = ?, scheduled_date = ?, roast_date = ?, roast_profile = ?,
        reason = ?, notes = ? WHERE id = ?
    `).run(
      warehouse_id, destination_warehouse_id ?? null, supplier_id || null, customer || null,
      scheduled_date || null, roast_date || null, roast_profile || null,
      reason || null, notes || null, req.params.id
    );

    res.json(getOperationFull(Number(req.params.id)));
  } catch (error: any) {
    console.error('Update operation error:', error);
    res.status(500).json({ error: 'Failed to update operation' });
  }
});

// ─── DELETE ────────────────────────────────────────────────
// Supports ?force=true to delete operations in any status (for testing).
// Force-delete of validated operations reverses all inventory effects.

router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Delete requires cancel permission for that op type
    if (!checkOpPermission(req, res, op.type, 'cancel')) return;

    const force = req.query.force === 'true';

    if (!force && op.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft operations. Use ?force=true to force-delete.' });
    }

    const deleteTxn = db.transaction(() => {
      if (op.status === 'done') {
        // Reverse inventory effects based on operation type
        if (op.type === 'receipt') {
          // Lots created by this receipt — check for downstream usage
          const lots = db.prepare('SELECT id, remaining_qty, initial_qty FROM lots WHERE receipt_operation_id = ?').all(op.id) as any[];
          for (const lot of lots) {
            // Delete stock_moves referencing this lot from OTHER operations too
            // (if lot was consumed by deliveries/production, those stock_moves reference this lot)
            // First: check if lot has been consumed by other operations
            const otherMoves = db.prepare(
              'SELECT COUNT(*) as cnt FROM stock_moves WHERE lot_id = ? AND operation_id != ?'
            ).get(lot.id, op.id) as any;
            const deliveryAllocs = db.prepare(
              'SELECT COUNT(*) as cnt FROM delivery_lot_allocations WHERE lot_id = ?'
            ).get(lot.id) as any;
            const prodInputs = db.prepare(
              'SELECT COUNT(*) as cnt FROM production_inputs WHERE lot_id = ?'
            ).get(lot.id) as any;
            const adjLines = db.prepare(
              'SELECT COUNT(*) as cnt FROM adjustment_lines WHERE lot_id = ?'
            ).get(lot.id) as any;

            if (otherMoves.cnt > 0 || deliveryAllocs.cnt > 0 || prodInputs.cnt > 0 || adjLines.cnt > 0) {
              throw new Error(
                `Cannot delete: lot ${lot.id} from this receipt is referenced by other operations. Delete those first.`
              );
            }

            // Safe to delete: remove stock_moves for this lot, then the lot itself
            db.prepare('DELETE FROM stock_moves WHERE lot_id = ?').run(lot.id);
            // lot_lineage and alerts cascade automatically
            db.prepare('DELETE FROM lots WHERE id = ?').run(lot.id);
          }
        } else if (op.type === 'delivery') {
          // Restore lot quantities that were decremented
          const moves = db.prepare('SELECT * FROM stock_moves WHERE operation_id = ?').all(op.id) as any[];
          for (const move of moves) {
            if (move.lot_id) {
              // Delivery moves are from_location → NULL (outward), qty is positive
              // Restoring means adding qty back to the lot
              db.prepare('UPDATE lots SET remaining_qty = remaining_qty + ?, status = ? WHERE id = ?')
                .run(move.qty, 'active', move.lot_id);
            }
          }
          // Clean up delivery_lot_allocations (cascades from delivery_lines on operation delete)
        } else if (op.type === 'production') {
          // Restore input lot quantities
          const inputMoves = db.prepare(
            "SELECT * FROM stock_moves WHERE operation_id = ? AND from_location_id IS NOT NULL AND to_location_id IS NULL"
          ).all(op.id) as any[];
          for (const move of inputMoves) {
            if (move.lot_id) {
              db.prepare('UPDATE lots SET remaining_qty = remaining_qty + ?, status = ? WHERE id = ?')
                .run(move.qty, 'active', move.lot_id);
            }
          }
          // Delete output lots created by this production
          const outputLots = db.prepare('SELECT id FROM lots WHERE production_operation_id = ?').all(op.id) as any[];
          for (const lot of outputLots) {
            // Check for downstream usage
            const otherMoves = db.prepare(
              'SELECT COUNT(*) as cnt FROM stock_moves WHERE lot_id = ? AND operation_id != ?'
            ).get(lot.id, op.id) as any;
            const deliveryAllocs = db.prepare(
              'SELECT COUNT(*) as cnt FROM delivery_lot_allocations WHERE lot_id = ?'
            ).get(lot.id) as any;
            if (otherMoves.cnt > 0 || deliveryAllocs.cnt > 0) {
              throw new Error(
                `Cannot delete: output lot ${lot.id} from this production is referenced by other operations.`
              );
            }
            db.prepare('DELETE FROM stock_moves WHERE lot_id = ?').run(lot.id);
            db.prepare('DELETE FROM lots WHERE id = ?').run(lot.id);
          }
        } else if (op.type === 'adjustment') {
          // Reverse adjustment qty changes
          const adjLines = db.prepare('SELECT * FROM adjustment_lines WHERE operation_id = ?').all(op.id) as any[];
          for (const line of adjLines) {
            const diff = line.actual_qty - line.system_qty;
            if (diff !== 0) {
              db.prepare('UPDATE lots SET remaining_qty = remaining_qty - ? WHERE id = ?')
                .run(diff, line.lot_id);
              // Re-check if lot should be depleted
              const lot = db.prepare('SELECT remaining_qty FROM lots WHERE id = ?').get(line.lot_id) as any;
              if (lot && lot.remaining_qty <= 0) {
                db.prepare("UPDATE lots SET status = 'depleted' WHERE id = ?").run(line.lot_id);
              } else if (lot) {
                db.prepare("UPDATE lots SET status = 'active' WHERE id = ?").run(line.lot_id);
              }
            }
          }
        } else if (op.type === 'transfer') {
          // Transfer reversal: no lot qty changes needed since transfers preserve lot identity
          // and don't change remaining_qty. Just delete the stock_moves.
          // (Stock moves for transfers have both from_location_id and to_location_id non-NULL)
        }

        // Delete all stock_moves for this operation
        db.prepare('DELETE FROM stock_moves WHERE operation_id = ?').run(op.id);
      }

      // Delete the operation (lines cascade via ON DELETE CASCADE)
      db.prepare('DELETE FROM operations WHERE id = ?').run(op.id);
    });

    deleteTxn();
    res.json({ message: 'Operation deleted successfully' });
  } catch (error: any) {
    console.error('Delete operation error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete operation' });
  }
});

// ─── LINE MANAGEMENT ───────────────────────────────────────

// Add line (dispatches to correct table based on operation type)
router.post('/:id/lines', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT id, type, status FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // All operation types: can only add lines in draft status
    if (op.status !== 'draft') {
      return res.status(400).json({ error: 'Can only add lines to draft operations' });
    }

    if (op.type === 'receipt') {
      const { product_id, demand_qty, harvest_year, process, cupping_score, roast_date, lot_notes, product_type } = req.body;
      if (!product_id || !demand_qty || demand_qty <= 0) {
        return res.status(400).json({ error: 'Product and valid demand_qty required' });
      }
      const pType = product_type === 'roasted' ? 'roasted' : 'green';

      const result = db.prepare(`
        INSERT INTO receipt_lines (operation_id, product_id, product_type, demand_qty, done_qty, harvest_year, process, cupping_score, roast_date, lot_notes)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(op.id, product_id, pType, demand_qty, harvest_year || null, process || null, cupping_score || null, roast_date || null, lot_notes || null);

      const line = db.prepare(`
        SELECT rl.*, p.name as product_name, p.sku, p.unit
        FROM receipt_lines rl JOIN products p ON rl.product_id = p.id WHERE rl.id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json(line);

    } else if (op.type === 'delivery') {
      const { product_id, demand_qty } = req.body;
      if (!product_id || !demand_qty || demand_qty <= 0) {
        return res.status(400).json({ error: 'Product and valid demand_qty required' });
      }

      const result = db.prepare(`
        INSERT INTO delivery_lines (operation_id, product_id, demand_qty, done_qty) VALUES (?, ?, ?, 0)
      `).run(op.id, product_id, demand_qty);

      const line = db.prepare(`
        SELECT dl.*, p.name as product_name, p.sku, p.unit
        FROM delivery_lines dl JOIN products p ON dl.product_id = p.id WHERE dl.id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json(line);

    } else if (op.type === 'production') {
      // Production lines are inputs only: lot_id + qty + expected_yield
      // Only editable in draft status
      if (op.status !== 'draft') {
        return res.status(400).json({ error: 'Can only add lines to draft production orders' });
      }
      const { lot_id, qty, expected_yield } = req.body;
      if (!lot_id || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Lot and valid qty required' });
      }
      // Verify lot exists and is active green bean
      const lot = db.prepare("SELECT id, remaining_qty, product_type FROM lots WHERE id = ? AND status = 'active'").get(lot_id) as any;
      if (!lot) return res.status(400).json({ error: 'Lot not found or not active' });
      if (lot.product_type !== 'green') return res.status(400).json({ error: 'Production inputs must be green bean lots' });
      if (qty > lot.remaining_qty) return res.status(400).json({ error: `Only ${lot.remaining_qty} remaining in lot` });

      const result = db.prepare(
        'INSERT INTO production_inputs (operation_id, lot_id, qty, expected_yield) VALUES (?, ?, ?, ?)'
      ).run(op.id, lot_id, qty, expected_yield || null);

      const line = db.prepare(`
        SELECT pi.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, p.name as product_name, p.sku, p.unit
        FROM production_inputs pi
        JOIN lots l ON pi.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE pi.id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json(line);

    } else if (op.type === 'adjustment') {
      const { lot_id, actual_qty, notes } = req.body;
      if (!lot_id || actual_qty === undefined || actual_qty < 0) {
        return res.status(400).json({ error: 'Lot and valid actual_qty required' });
      }

      const lot = db.prepare("SELECT id, remaining_qty FROM lots WHERE id = ? AND status = 'active'").get(lot_id) as any;
      if (!lot) return res.status(400).json({ error: 'Lot not found or not active' });

      const result = db.prepare(
        'INSERT INTO adjustment_lines (operation_id, lot_id, system_qty, actual_qty, notes) VALUES (?, ?, ?, ?, ?)'
      ).run(op.id, lot_id, lot.remaining_qty, actual_qty, notes || null);

      const line = db.prepare(`
        SELECT al.*, l.lot_number, l.remaining_qty as lot_remaining,
               p.name as product_name, p.sku, p.unit
        FROM adjustment_lines al
        JOIN lots l ON al.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE al.id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json(line);

    } else if (op.type === 'transfer') {
      const { lot_id, qty, notes } = req.body;
      if (!lot_id || !qty || qty <= 0) {
        return res.status(400).json({ error: 'Lot and valid qty required' });
      }

      // Verify lot exists and is active
      const lot = db.prepare("SELECT id, remaining_qty, product_type FROM lots WHERE id = ? AND status = 'active'").get(lot_id) as any;
      if (!lot) return res.status(400).json({ error: 'Lot not found or not active' });
      if (qty > lot.remaining_qty) return res.status(400).json({ error: `Only ${lot.remaining_qty} remaining in lot` });

      // Check lot is not already added to this transfer
      const existing = db.prepare('SELECT id FROM transfer_lines WHERE operation_id = ? AND lot_id = ?').get(op.id, lot_id) as any;
      if (existing) return res.status(400).json({ error: 'Lot already added to this transfer' });

      const result = db.prepare(
        'INSERT INTO transfer_lines (operation_id, lot_id, qty, notes) VALUES (?, ?, ?, ?)'
      ).run(op.id, lot_id, qty, notes || null);

      const line = db.prepare(`
        SELECT tl.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, l.expiry_date,
               p.name as product_name, p.sku, p.unit
        FROM transfer_lines tl
        JOIN lots l ON tl.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE tl.id = ?
      `).get(result.lastInsertRowid);
      return res.status(201).json(line);
    }
  } catch (error: any) {
    console.error('Add line error:', error);
    res.status(500).json({ error: 'Failed to add line' });
  }
});

// Update line
router.put('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT id, type, status FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    if (op.type === 'receipt') {
      // In draft: can edit everything. In waiting: can edit done_qty, cupping_score, lot_notes
      const { demand_qty, done_qty, harvest_year, process, cupping_score, roast_date, lot_notes, product_type } = req.body;

      if (op.status === 'draft') {
        const pType = product_type === 'roasted' ? 'roasted' : (product_type === 'green' ? 'green' : undefined);
        db.prepare(`
          UPDATE receipt_lines SET demand_qty = COALESCE(?, demand_qty), done_qty = COALESCE(?, done_qty),
            product_type = COALESCE(?, product_type),
            harvest_year = ?, process = ?, cupping_score = ?, roast_date = ?, lot_notes = ?
          WHERE id = ? AND operation_id = ?
        `).run(demand_qty, done_qty, pType, harvest_year ?? null, process ?? null, cupping_score ?? null, roast_date ?? null, lot_notes ?? null, req.params.lineId, op.id);
      } else if (op.status === 'waiting') {
        db.prepare(`
          UPDATE receipt_lines SET done_qty = COALESCE(?, done_qty),
            cupping_score = COALESCE(?, cupping_score), lot_notes = COALESCE(?, lot_notes),
            roast_date = COALESCE(?, roast_date)
          WHERE id = ? AND operation_id = ?
        `).run(done_qty, cupping_score, lot_notes, roast_date ?? null, req.params.lineId, op.id);
      } else {
        return res.status(400).json({ error: 'Cannot edit lines in this status' });
      }

      const line = db.prepare(`
        SELECT rl.*, p.name as product_name, p.sku, p.unit
        FROM receipt_lines rl JOIN products p ON rl.product_id = p.id WHERE rl.id = ?
      `).get(req.params.lineId);
      return res.json(line);

    } else if (op.type === 'delivery') {
      if (!['draft', 'waiting', 'ready'].includes(op.status)) {
        return res.status(400).json({ error: 'Cannot edit lines in this status' });
      }
      const { demand_qty, done_qty } = req.body;
      if (op.status === 'draft') {
        db.prepare('UPDATE delivery_lines SET demand_qty = COALESCE(?, demand_qty), done_qty = COALESCE(?, done_qty) WHERE id = ? AND operation_id = ?')
          .run(demand_qty, done_qty, req.params.lineId, op.id);
      } else {
        db.prepare('UPDATE delivery_lines SET done_qty = COALESCE(?, done_qty) WHERE id = ? AND operation_id = ?')
          .run(done_qty, req.params.lineId, op.id);
      }

      const line = db.prepare(`
        SELECT dl.*, p.name as product_name, p.sku, p.unit
        FROM delivery_lines dl JOIN products p ON dl.product_id = p.id WHERE dl.id = ?
      `).get(req.params.lineId);
      return res.json(line);

    } else if (op.type === 'production') {
      // In draft: can edit qty, expected_yield. In in_progress: can edit actual_yield.
      if (op.status !== 'in_progress' && op.status !== 'draft') {
        return res.status(400).json({ error: 'Cannot edit lines in this status' });
      }
      const { actual_yield, qty, expected_yield } = req.body;

      if (op.status === 'draft') {
        if (qty !== undefined) {
          db.prepare('UPDATE production_inputs SET qty = ? WHERE id = ? AND operation_id = ?')
            .run(qty, req.params.lineId, op.id);
        }
        if (expected_yield !== undefined) {
          db.prepare('UPDATE production_inputs SET expected_yield = ? WHERE id = ? AND operation_id = ?')
            .run(expected_yield, req.params.lineId, op.id);
        }
      }
      if (op.status === 'in_progress' && actual_yield !== undefined) {
        db.prepare('UPDATE production_inputs SET actual_yield = ? WHERE id = ? AND operation_id = ?')
          .run(actual_yield, req.params.lineId, op.id);
      }

      const line = db.prepare(`
        SELECT pi.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, p.name as product_name, p.sku, p.unit
        FROM production_inputs pi
        JOIN lots l ON pi.lot_id = l.id
        JOIN products p ON l.product_id = p.id
        WHERE pi.id = ?
      `).get(req.params.lineId);
      return res.json(line);

    } else if (op.type === 'adjustment') {
      if (op.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft adjustments' });
      const { actual_qty, notes } = req.body;
      db.prepare('UPDATE adjustment_lines SET actual_qty = COALESCE(?, actual_qty), notes = COALESCE(?, notes) WHERE id = ? AND operation_id = ?')
        .run(actual_qty, notes, req.params.lineId, op.id);

      const line = db.prepare(`
        SELECT al.*, l.lot_number, l.remaining_qty as lot_remaining,
               p.name as product_name, p.sku, p.unit
        FROM adjustment_lines al JOIN lots l ON al.lot_id = l.id
        JOIN products p ON l.product_id = p.id WHERE al.id = ?
      `).get(req.params.lineId);
      return res.json(line);

    } else if (op.type === 'transfer') {
      if (op.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft transfers' });
      const { qty, notes } = req.body;
      db.prepare('UPDATE transfer_lines SET qty = COALESCE(?, qty), notes = COALESCE(?, notes) WHERE id = ? AND operation_id = ?')
        .run(qty, notes, req.params.lineId, op.id);

      const line = db.prepare(`
        SELECT tl.*, l.lot_number, l.remaining_qty as lot_remaining,
               l.product_type, l.expiry_date,
               p.name as product_name, p.sku, p.unit
        FROM transfer_lines tl JOIN lots l ON tl.lot_id = l.id
        JOIN products p ON l.product_id = p.id WHERE tl.id = ?
      `).get(req.params.lineId);
      return res.json(line);
    }
  } catch (error: any) {
    console.error('Update line error:', error);
    res.status(500).json({ error: 'Failed to update line' });
  }
});

// Delete line
router.delete('/:id/lines/:lineId', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT id, type, status FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });
    if (op.status !== 'draft') return res.status(400).json({ error: 'Can only delete lines from draft operations' });

    const table = {
      receipt: 'receipt_lines',
      delivery: 'delivery_lines',
      production: 'production_inputs',
      adjustment: 'adjustment_lines',
      transfer: 'transfer_lines'
    }[op.type as string];

    if (table) {
      db.prepare(`DELETE FROM ${table} WHERE id = ? AND operation_id = ?`).run(req.params.lineId, op.id);
    }

    res.json({ message: 'Line deleted successfully' });
  } catch (error: any) {
    console.error('Delete line error:', error);
    res.status(500).json({ error: 'Failed to delete line' });
  }
});

// ─── DELIVERY LOT ALLOCATIONS ──────────────────────────────

// Set lot allocations for a delivery line
router.put('/:id/lines/:lineId/allocations', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT id, type, status FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });
    if (op.type !== 'delivery') return res.status(400).json({ error: 'Allocations only apply to deliveries' });
    if (!['waiting', 'ready'].includes(op.status)) return res.status(400).json({ error: 'Can only set allocations for waiting/ready deliveries' });

    const { allocations } = req.body; // [{ lot_id, qty }]
    if (!Array.isArray(allocations)) return res.status(400).json({ error: 'allocations must be an array' });

    const setAllocations = db.transaction(() => {
      // Clear existing allocations for this line
      db.prepare('DELETE FROM delivery_lot_allocations WHERE delivery_line_id = ?').run(req.params.lineId);

      for (const alloc of allocations) {
        if (!alloc.lot_id || !alloc.qty || alloc.qty <= 0) continue;
        db.prepare('INSERT INTO delivery_lot_allocations (delivery_line_id, lot_id, qty) VALUES (?, ?, ?)')
          .run(req.params.lineId, alloc.lot_id, alloc.qty);
      }
    });
    setAllocations();

    const updatedAllocs = db.prepare(`
      SELECT dla.*, l.lot_number, l.remaining_qty as lot_remaining, l.expiry_date
      FROM delivery_lot_allocations dla
      JOIN lots l ON dla.lot_id = l.id
      WHERE dla.delivery_line_id = ?
    `).all(req.params.lineId);

    res.json(updatedAllocs);
  } catch (error: any) {
    console.error('Set allocations error:', error);
    res.status(500).json({ error: 'Failed to set allocations' });
  }
});

// Get FIFO lot suggestions for a delivery line's product (scoped to operation's warehouse)
router.get('/:id/lines/:lineId/lot-suggestions', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT type, warehouse_id FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op || op.type !== 'delivery') return res.status(400).json({ error: 'Only for deliveries' });

    const line = db.prepare('SELECT product_id, demand_qty FROM delivery_lines WHERE id = ? AND operation_id = ?').get(req.params.lineId, req.params.id) as any;
    if (!line) return res.status(404).json({ error: 'Line not found' });

    // FIFO: active lots for this product IN THIS WAREHOUSE, sorted by expiry ASC (nearest expiry first)
    const lots = db.prepare(`
      SELECT l.id, l.lot_number, l.remaining_qty, l.expiry_date, l.roast_date,
             l.product_type, l.status, l.warehouse_id,
             w.name as warehouse_name, w.code as warehouse_code
      FROM lots l
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.product_id = ? AND l.warehouse_id = ? AND l.status = 'active' AND l.remaining_qty > 0
      ORDER BY l.expiry_date ASC NULLS LAST, l.created_at ASC
    `).all(line.product_id, op.warehouse_id);

    // Also get lots from OTHER warehouses for cross-warehouse visibility
    const otherWarehouseLots = db.prepare(`
      SELECT l.id, l.lot_number, l.remaining_qty, l.expiry_date, l.roast_date,
             l.product_type, l.status, l.warehouse_id,
             w.name as warehouse_name, w.code as warehouse_code
      FROM lots l
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.product_id = ? AND l.warehouse_id != ? AND l.status = 'active' AND l.remaining_qty > 0
      ORDER BY l.expiry_date ASC NULLS LAST, l.created_at ASC
    `).all(line.product_id, op.warehouse_id);

    // Build FIFO suggestion from local warehouse lots
    let remaining = line.demand_qty;
    const suggestions: any[] = [];
    for (const lot of lots as any[]) {
      if (remaining <= 0) break;
      const allocQty = Math.min(remaining, lot.remaining_qty);
      suggestions.push({
        lot_id: lot.id, lot_number: lot.lot_number, qty: allocQty,
        remaining_qty: lot.remaining_qty, expiry_date: lot.expiry_date,
        warehouse_name: lot.warehouse_name, warehouse_code: lot.warehouse_code
      });
      remaining -= allocQty;
    }

    // If local warehouse is short, suggest from other warehouses (marked as cross-warehouse)
    const crossWarehouseSuggestions: any[] = [];
    if (remaining > 0) {
      for (const lot of otherWarehouseLots as any[]) {
        if (remaining <= 0) break;
        const allocQty = Math.min(remaining, lot.remaining_qty);
        crossWarehouseSuggestions.push({
          lot_id: lot.id, lot_number: lot.lot_number, qty: allocQty,
          remaining_qty: lot.remaining_qty, expiry_date: lot.expiry_date,
          warehouse_name: lot.warehouse_name, warehouse_code: lot.warehouse_code,
          requires_transfer: true
        });
        remaining -= allocQty;
      }
    }

    res.json({
      demand_qty: line.demand_qty,
      suggestions,
      cross_warehouse_suggestions: crossWarehouseSuggestions.length > 0 ? crossWarehouseSuggestions : null,
      shortfall: Math.max(0, remaining)
    });
  } catch (error: any) {
    console.error('Lot suggestions error:', error);
    res.status(500).json({ error: 'Failed to get lot suggestions' });
  }
});

// ─── STATE TRANSITIONS ─────────────────────────────────────

// CONFIRM: draft -> waiting (receipt, delivery) or just validate check for others
router.post('/:id/confirm', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Check confirm permission (production uses 'start' instead of 'confirm')
    const action = op.type === 'production' ? 'start' : 'confirm';
    if (!checkOpPermission(req, res, op.type, action)) return;

    if (op.status !== 'draft') return res.status(400).json({ error: 'Can only confirm draft operations' });

    // Check that operation has lines
    let hasLines = false;
    if (op.type === 'receipt') {
      hasLines = !!(db.prepare('SELECT id FROM receipt_lines WHERE operation_id = ? LIMIT 1').get(op.id));
    } else if (op.type === 'delivery') {
      hasLines = !!(db.prepare('SELECT id FROM delivery_lines WHERE operation_id = ? LIMIT 1').get(op.id));
    } else if (op.type === 'production') {
      hasLines = !!(db.prepare('SELECT id FROM production_inputs WHERE operation_id = ? LIMIT 1').get(op.id));
      if (!hasLines) return res.status(400).json({ error: 'Production orders need at least one input line' });
    } else if (op.type === 'adjustment') {
      hasLines = !!(db.prepare('SELECT id FROM adjustment_lines WHERE operation_id = ? LIMIT 1').get(op.id));
    } else if (op.type === 'transfer') {
      hasLines = !!(db.prepare('SELECT id FROM transfer_lines WHERE operation_id = ? LIMIT 1').get(op.id));
    }

    if (!hasLines) return res.status(400).json({ error: 'Operation must have at least one line' });

    // Receipt/Delivery/Transfer: draft -> waiting
    // Production: draft -> in_progress (Start Roast)
    // Adjustment: skip directly — adjustment goes draft -> done via validate
    let newStatus: string;
    if (op.type === 'receipt' || op.type === 'delivery' || op.type === 'transfer') {
      newStatus = 'waiting';
    } else if (op.type === 'production') {
      newStatus = 'in_progress';
    } else {
      return res.status(400).json({ error: 'Adjustments go directly from draft to done via validate' });
    }

    db.prepare('UPDATE operations SET status = ? WHERE id = ?').run(newStatus, op.id);
    res.json(getOperationFull(op.id));
  } catch (error: any) {
    console.error('Confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm operation' });
  }
});

// CHECK AVAILABILITY: waiting -> ready (delivery only)
router.post('/:id/check-availability', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Check confirm permission for deliveries
    if (!checkOpPermission(req, res, op.type, 'confirm')) return;

    if (op.type !== 'delivery') return res.status(400).json({ error: 'Check availability is for deliveries only' });
    if (op.status !== 'waiting') return res.status(400).json({ error: 'Can only check availability for waiting deliveries' });

    const lines = db.prepare(`
      SELECT dl.*, p.name as product_name, p.sku
      FROM delivery_lines dl JOIN products p ON dl.product_id = p.id
      WHERE dl.operation_id = ?
    `).all(op.id) as any[];

    const issues: any[] = [];
    for (const line of lines) {
      const available = (db.prepare(`
        SELECT COALESCE(SUM(remaining_qty), 0) as total
        FROM lots WHERE product_id = ? AND status = 'active'
      `).get(line.product_id) as any).total;

      if (line.demand_qty > available) {
        issues.push({
          productId: line.product_id,
          productName: line.product_name,
          sku: line.sku,
          demandQty: line.demand_qty,
          availableQty: available,
          shortfall: line.demand_qty - available
        });
      }
    }

    // Move to ready regardless — issues are warnings
    db.prepare('UPDATE operations SET status = ? WHERE id = ?').run('ready', op.id);

    res.json({ operation: getOperationFull(op.id), availabilityIssues: issues.length > 0 ? issues : null });
  } catch (error: any) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ─── VALIDATE ──────────────────────────────────────────────
// The big one. Creates lots, stock moves, updates quantities.

router.post('/:id/validate', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Check validate permission for this operation type
    if (!checkOpPermission(req, res, op.type, 'validate')) return;

    // Validate allowed status transitions
    const allowedStatus: Record<string, string> = {
      receipt: 'waiting',
      delivery: 'ready',
      production: 'in_progress',
      adjustment: 'draft',
      transfer: 'waiting'
    };
    if (op.status !== allowedStatus[op.type]) {
      return res.status(400).json({ error: `Cannot validate ${op.type} in ${op.status} status (needs ${allowedStatus[op.type]})` });
    }

    const locationId = getDefaultLocation(op.warehouse_id);
    const now = new Date().toISOString();

    const validateTxn = db.transaction(() => {
      if (op.type === 'receipt') {
        // ─── RECEIPT VALIDATE ────────────────────────
        const lines = db.prepare('SELECT * FROM receipt_lines WHERE operation_id = ?').all(op.id) as any[];
        if (lines.length === 0) throw new Error('No lines to validate');

        const supplier = op.supplier_id ? db.prepare('SELECT code FROM suppliers WHERE id = ?').get(op.supplier_id) as any : null;
        const supplierCode = supplier?.code || 'XX';

        for (const line of lines) {
          if (line.done_qty <= 0) continue;

          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.product_id) as any;
          const arrivalDate = op.scheduled_date || now.slice(0, 10);
          const lotNumber = generateLotNumber(supplierCode, product.sku, arrivalDate, product.id);

          // Determine product_type from explicit field on the receipt line
          const productType = line.product_type === 'roasted' ? 'roasted' : 'green';

          // Calculate expiry for roasted products
          // For received roasted coffee, shelf life starts from arrival date (not roast_date)
          // roast_date is metadata about when it was roasted elsewhere
          let expiryDate: string | null = null;
          if (productType === 'roasted') {
            const ad = new Date(arrivalDate);
            ad.setDate(ad.getDate() + (product.shelf_life_days || 30));
            expiryDate = ad.toISOString().slice(0, 10);
          }

          // Create lot
          const lotResult = db.prepare(`
            INSERT INTO lots (lot_number, product_id, supplier_id, warehouse_id, receipt_operation_id, product_type,
              arrival_date, roast_date, expiry_date, initial_qty, remaining_qty, status,
              harvest_year, process, cupping_score, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
          `).run(
            lotNumber, product.id, op.supplier_id, op.warehouse_id, op.id, productType,
            arrivalDate, line.roast_date || null, expiryDate,
            line.done_qty, line.done_qty,
            line.harvest_year || null, line.process || null,
            line.cupping_score || null, line.lot_notes || null
          );

          // Create stock move: NULL -> location
          db.prepare(`
            INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
            VALUES (?, ?, ?, NULL, ?, ?, 'receipt')
          `).run(op.id, lotResult.lastInsertRowid, product.id, locationId, line.done_qty);
        }

      } else if (op.type === 'delivery') {
        // ─── DELIVERY VALIDATE ───────────────────────
        // Supports cross-warehouse fulfillment: if the dispatch warehouse is short,
        // automatically create and validate transfers from other warehouses.
        const lines = db.prepare('SELECT * FROM delivery_lines WHERE operation_id = ?').all(op.id) as any[];
        if (lines.length === 0) throw new Error('No lines to validate');

        const autoTransfers: number[] = []; // track auto-created transfer op IDs

        for (const line of lines) {
          let allocations = db.prepare('SELECT * FROM delivery_lot_allocations WHERE delivery_line_id = ?').all(line.id) as any[];

          if (allocations.length === 0) {
            // Auto-allocate FIFO from THIS warehouse first
            const localLots = db.prepare(`
              SELECT * FROM lots WHERE product_id = ? AND warehouse_id = ? AND status = 'active' AND remaining_qty > 0
              ORDER BY expiry_date ASC NULLS LAST, created_at ASC
            `).all(line.product_id, op.warehouse_id) as any[];

            let remaining = line.demand_qty;
            for (const lot of localLots) {
              if (remaining <= 0) break;
              const allocQty = Math.min(remaining, lot.remaining_qty);
              db.prepare('INSERT INTO delivery_lot_allocations (delivery_line_id, lot_id, qty) VALUES (?, ?, ?)')
                .run(line.id, lot.id, allocQty);
              remaining -= allocQty;
            }

            // If still short, pull from other warehouses via auto-transfer
            if (remaining > 0) {
              const otherLots = db.prepare(`
                SELECT * FROM lots WHERE product_id = ? AND warehouse_id != ? AND status = 'active' AND remaining_qty > 0
                ORDER BY expiry_date ASC NULLS LAST, created_at ASC
              `).all(line.product_id, op.warehouse_id) as any[];

              for (const otherLot of otherLots) {
                if (remaining <= 0) break;
                const transferQty = Math.min(remaining, otherLot.remaining_qty);

                // Create and validate a transfer operation: otherLot.warehouse_id → op.warehouse_id
                const transferRef = generateReference(otherLot.warehouse_id, 'transfer');
                const transferResult = db.prepare(`
                  INSERT INTO operations (reference, type, status, warehouse_id, destination_warehouse_id, notes, created_by)
                  VALUES (?, 'transfer', 'draft', ?, ?, ?, ?)
                `).run(
                  transferRef, otherLot.warehouse_id, op.warehouse_id,
                  `Auto-transfer for delivery ${op.reference}`,
                  op.created_by
                );
                const transferOpId = transferResult.lastInsertRowid;

                // Add transfer line
                db.prepare('INSERT INTO transfer_lines (operation_id, lot_id, qty, notes) VALUES (?, ?, ?, ?)')
                  .run(transferOpId, otherLot.id, transferQty, `Auto-created for delivery shortfall`);

                // Validate the transfer inline (confirm → waiting → done)
                db.prepare("UPDATE operations SET status = 'waiting' WHERE id = ?").run(transferOpId);

                const sourceLocId = getDefaultLocation(otherLot.warehouse_id);
                const destLocId = getDefaultLocation(op.warehouse_id);

                // Create stock move for transfer
                db.prepare(`
                  INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
                  VALUES (?, ?, ?, ?, ?, ?, 'transfer')
                `).run(transferOpId, otherLot.id, otherLot.product_id, sourceLocId, destLocId, transferQty);

                // Update lot warehouse_id to destination
                db.prepare('UPDATE lots SET warehouse_id = ? WHERE id = ?').run(op.warehouse_id, otherLot.id);

                // Mark transfer done
                db.prepare("UPDATE operations SET status = 'done', validated_at = ? WHERE id = ?").run(now, transferOpId);
                autoTransfers.push(Number(transferOpId));

                // Now allocate this lot (now in our warehouse) to the delivery
                db.prepare('INSERT INTO delivery_lot_allocations (delivery_line_id, lot_id, qty) VALUES (?, ?, ?)')
                  .run(line.id, otherLot.id, transferQty);
                remaining -= transferQty;
              }

              if (remaining > 0) {
                throw new Error(
                  `Insufficient stock across all warehouses for product ${line.product_id}. Short by ${remaining.toFixed(2)} ${line.demand_qty > 0 ? '' : 'units'}`
                );
              }
            }
          }

          // Now process all allocations (including auto-transferred ones)
          const finalAllocations = db.prepare('SELECT * FROM delivery_lot_allocations WHERE delivery_line_id = ?').all(line.id) as any[];
          let totalDone = 0;

          for (const alloc of finalAllocations) {
            // Decrement lot
            db.prepare('UPDATE lots SET remaining_qty = remaining_qty - ? WHERE id = ?').run(alloc.qty, alloc.lot_id);

            // Deplete lot if remaining_qty hits 0
            db.prepare("UPDATE lots SET status = 'depleted' WHERE id = ? AND remaining_qty <= 0").run(alloc.lot_id);

            // Stock move: location -> NULL
            db.prepare(`
              INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
              VALUES (?, ?, ?, ?, NULL, ?, 'delivery')
            `).run(op.id, alloc.lot_id, line.product_id, locationId, alloc.qty);

            totalDone += alloc.qty;
          }

          // Update done_qty
          db.prepare('UPDATE delivery_lines SET done_qty = ? WHERE id = ?').run(totalDone, line.id);
        }

        // Store auto-transfer references on the operation notes for visibility
        if (autoTransfers.length > 0) {
          const transferRefs = autoTransfers.map(id => {
            const t = db.prepare('SELECT reference FROM operations WHERE id = ?').get(id) as any;
            return t?.reference;
          }).filter(Boolean).join(', ');
          db.prepare('UPDATE operations SET notes = COALESCE(notes || \'\n\', \'\') || ? WHERE id = ?')
            .run(`Auto-transfers created: ${transferRefs}`, op.id);
        }

      } else if (op.type === 'production') {
        // ─── PRODUCTION VALIDATE ─────────────────────
        // New model: each production_input has expected_yield + actual_yield.
        // For each input: consume the green lot, create a NEW roasted lot for the SAME product.
        const inputs = db.prepare('SELECT * FROM production_inputs WHERE operation_id = ?').all(op.id) as any[];
        if (inputs.length === 0) throw new Error('Production needs at least one input line');

        // Check all inputs have actual_yield filled
        for (const input of inputs) {
          if (input.actual_yield === null || input.actual_yield === undefined) {
            throw new Error('All input lines must have actual_yield filled before validation');
          }
        }

        const warehouseCode = (db.prepare('SELECT code FROM warehouses WHERE id = ?').get(op.warehouse_id) as any).code;
        const roastDate = op.roast_date || now.slice(0, 10);

        for (const input of inputs) {
          // Get the input lot and its product
          const inputLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(input.lot_id) as any;
          if (!inputLot) throw new Error(`Input lot ${input.lot_id} not found`);

          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(inputLot.product_id) as any;

          // 1. Consume the input lot (decrement remaining_qty)
          db.prepare('UPDATE lots SET remaining_qty = remaining_qty - ? WHERE id = ?').run(input.qty, input.lot_id);
          db.prepare("UPDATE lots SET status = 'depleted' WHERE id = ? AND remaining_qty <= 0").run(input.lot_id);

          // 2. Create stock move: location → NULL (production consumption)
          db.prepare(`
            INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
            VALUES (?, ?, ?, ?, NULL, ?, 'production_input')
          `).run(op.id, input.lot_id, inputLot.product_id, locationId, input.qty);

          // 3. Create a NEW roasted lot for the SAME product
          const lotNumber = generateLotNumber(warehouseCode, product.sku, roastDate, product.id);

          // Always compute expiry for roasted lots: roast_date + shelf_life_days (default 30)
          const shelfDays = product.shelf_life_days || 30;
          const rd = new Date(roastDate);
          rd.setDate(rd.getDate() + shelfDays);
          const expiryDate = rd.toISOString().slice(0, 10);

          const lotResult = db.prepare(`
            INSERT INTO lots (lot_number, product_id, supplier_id, warehouse_id, production_operation_id, product_type,
              roast_date, expiry_date, initial_qty, remaining_qty, status, roast_profile, notes)
            VALUES (?, ?, ?, ?, ?, 'roasted', ?, ?, ?, ?, 'active', ?, ?)
          `).run(
            lotNumber, product.id, inputLot.supplier_id, op.warehouse_id, op.id,
            roastDate, expiryDate,
            input.actual_yield, input.actual_yield,
            op.roast_profile || null, op.notes || null
          );

          // 4. Create lot lineage: child (new roasted) → parent (input green)
          db.prepare('INSERT INTO lot_lineage (child_lot_id, parent_lot_id) VALUES (?, ?)').run(lotResult.lastInsertRowid, input.lot_id);

          // 5. Create stock move: NULL → location (production output)
          db.prepare(`
            INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
            VALUES (?, ?, ?, NULL, ?, ?, 'production_output')
          `).run(op.id, lotResult.lastInsertRowid, product.id, locationId, input.actual_yield);
        }

      } else if (op.type === 'adjustment') {
        // ─── ADJUSTMENT VALIDATE ─────────────────────
        const lines = db.prepare('SELECT * FROM adjustment_lines WHERE operation_id = ?').all(op.id) as any[];
        if (lines.length === 0) throw new Error('No lines to validate');

        for (const line of lines) {
          const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(line.lot_id) as any;
          const delta = line.actual_qty - line.system_qty;

          if (delta > 0) {
            // Gain: NULL -> location
            db.prepare(`
              INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
              VALUES (?, ?, ?, NULL, ?, ?, 'adjustment_gain')
            `).run(op.id, lot.id, lot.product_id, locationId, Math.abs(delta));
          } else if (delta < 0) {
            // Loss: location -> NULL
            db.prepare(`
              INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
              VALUES (?, ?, ?, ?, NULL, ?, 'adjustment_loss')
            `).run(op.id, lot.id, lot.product_id, locationId, Math.abs(delta));
          }

          // Update lot remaining_qty
          db.prepare('UPDATE lots SET remaining_qty = ? WHERE id = ?').run(line.actual_qty, lot.id);
          // Deplete if zero
          if (line.actual_qty <= 0) {
            db.prepare("UPDATE lots SET status = 'depleted' WHERE id = ?").run(lot.id);
          } else {
            db.prepare("UPDATE lots SET status = 'active' WHERE id = ?").run(lot.id);
          }
        }

      } else if (op.type === 'transfer') {
        // ─── TRANSFER VALIDATE ─────────────────────
        const lines = db.prepare('SELECT * FROM transfer_lines WHERE operation_id = ?').all(op.id) as any[];
        if (lines.length === 0) throw new Error('No lines to validate');

        // Get source and destination default locations
        const sourceLocationId = getDefaultLocation(op.warehouse_id);
        const destLocationId = getDefaultLocation(op.destination_warehouse_id);

        for (const line of lines) {
          const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(line.lot_id) as any;
          if (!lot) throw new Error(`Lot ${line.lot_id} not found`);
          if (lot.status !== 'active') throw new Error(`Lot ${lot.lot_number} is not active`);
          if (line.qty > lot.remaining_qty) throw new Error(`Lot ${lot.lot_number} only has ${lot.remaining_qty} remaining, cannot transfer ${line.qty}`);

          // Create stock move: from source location -> to destination location
          // Lot identity preserved — remaining_qty unchanged since it's the same lot just in a different place
          db.prepare(`
            INSERT INTO stock_moves (operation_id, lot_id, product_id, from_location_id, to_location_id, qty, reason)
            VALUES (?, ?, ?, ?, ?, ?, 'transfer')
          `).run(op.id, lot.id, lot.product_id, sourceLocationId, destLocationId, line.qty);

          // Update lot's warehouse to the destination
          db.prepare('UPDATE lots SET warehouse_id = ? WHERE id = ?').run(op.destination_warehouse_id, lot.id);
        }
      }

      // Mark operation done
      db.prepare("UPDATE operations SET status = 'done', validated_at = ? WHERE id = ?").run(now, op.id);
    });

    validateTxn();
    res.json(getOperationFull(op.id));
  } catch (error: any) {
    console.error('Validate error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate operation' });
  }
});

// ─── CANCEL ────────────────────────────────────────────────

router.post('/:id/cancel', (req: AuthRequest, res: Response) => {
  try {
    const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id) as any;
    if (!op) return res.status(404).json({ error: 'Operation not found' });

    // Check cancel permission for this operation type
    if (!checkOpPermission(req, res, op.type, 'cancel')) return;

    if (op.status === 'done') return res.status(400).json({ error: 'Cannot cancel completed operations' });
    if (op.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    db.prepare("UPDATE operations SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json(getOperationFull(Number(req.params.id)));
  } catch (error: any) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel operation' });
  }
});

export default router;
