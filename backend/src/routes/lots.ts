import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
// Lots are read-only and needed by multiple operation forms.
// Any authenticated user can view lots; fine-grained permissions are enforced on the operations themselves.

// Search lots (lightweight, for dropdowns)
// Must be before /:id to avoid route conflict
router.get('/search', (req: AuthRequest, res: Response) => {
  try {
    const { product_type, product_id, status, q, warehouse_id } = req.query;
    let query = `
      SELECT l.id, l.lot_number, l.remaining_qty, l.expiry_date, l.product_type,
             l.roast_date, l.status, l.harvest_year, l.process, l.warehouse_id,
             p.name as product_name, p.sku, p.unit,
             w.name as warehouse_name, w.code as warehouse_code
      FROM lots l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (product_type) {
      conditions.push('l.product_type = ?');
      params.push(product_type);
    }
    if (product_id) {
      conditions.push('l.product_id = ?');
      params.push(product_id);
    }
    if (warehouse_id) {
      conditions.push('l.warehouse_id = ?');
      params.push(Number(warehouse_id));
    }
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    } else {
      // Default: only active lots for dropdowns
      conditions.push("l.status = 'active'");
    }
    if (q) {
      conditions.push('(l.lot_number LIKE ? OR p.name LIKE ?)');
      const s = `%${q}%`;
      params.push(s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY l.expiry_date ASC NULLS LAST, l.created_at ASC';

    const lots = db.prepare(query).all(...params);
    res.json(lots);
  } catch (error: any) {
    console.error('Search lots error:', error);
    res.status(500).json({ error: 'Failed to search lots' });
  }
});

// Get all lots (with filters)
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { product_type, status, product_id, supplier_id, search, warehouse_id } = req.query;
    let query = `
      SELECT l.*,
             p.name as product_name, p.sku, p.unit, p.shelf_life_days,
             s.name as supplier_name, s.code as supplier_code,
             w.name as warehouse_name, w.code as warehouse_code
      FROM lots l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (product_type) {
      conditions.push('l.product_type = ?');
      params.push(product_type);
    }
    if (status) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (product_id) {
      conditions.push('l.product_id = ?');
      params.push(product_id);
    }
    if (supplier_id) {
      conditions.push('l.supplier_id = ?');
      params.push(supplier_id);
    }
    if (warehouse_id) {
      conditions.push('l.warehouse_id = ?');
      params.push(Number(warehouse_id));
    }
    if (search) {
      conditions.push('(l.lot_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY l.created_at DESC';

    const lots = db.prepare(query).all(...params);
    res.json(lots);
  } catch (error: any) {
    console.error('Get lots error:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// Get lot by ID (full detail with lineage + move history)
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const lot = db.prepare(`
      SELECT l.*,
             p.name as product_name, p.sku, p.unit, p.shelf_life_days,
             s.name as supplier_name, s.code as supplier_code,
             ro.reference as receipt_reference,
             po.reference as production_reference
      FROM lots l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN operations ro ON l.receipt_operation_id = ro.id
      LEFT JOIN operations po ON l.production_operation_id = po.id
      WHERE l.id = ?
    `).get(req.params.id) as any;

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Get parent lots (green beans that produced this roasted lot)
    const parentLots = db.prepare(`
      SELECT l.id, l.lot_number, l.product_type, l.remaining_qty,
             p.name as product_name, p.sku
      FROM lot_lineage ll
      JOIN lots l ON ll.parent_lot_id = l.id
      JOIN products p ON l.product_id = p.id
      WHERE ll.child_lot_id = ?
    `).all(req.params.id);

    // Get child lots (roasted lots produced from this green lot)
    const childLots = db.prepare(`
      SELECT l.id, l.lot_number, l.product_type, l.remaining_qty, l.roast_date,
             p.name as product_name, p.sku
      FROM lot_lineage ll
      JOIN lots l ON ll.child_lot_id = l.id
      JOIN products p ON l.product_id = p.id
      WHERE ll.parent_lot_id = ?
    `).all(req.params.id);

    // Get stock move history for this lot
    const moves = db.prepare(`
      SELECT sm.*,
             o.reference, o.type as operation_type, o.status as operation_status,
             fl.name as from_location_name,
             tl.name as to_location_name
      FROM stock_moves sm
      JOIN operations o ON sm.operation_id = o.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      WHERE sm.lot_id = ?
      ORDER BY sm.created_at DESC
    `).all(req.params.id);

    res.json({
      ...lot,
      parentLots,
      childLots,
      moves
    });
  } catch (error: any) {
    console.error('Get lot error:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
});

export default router;
