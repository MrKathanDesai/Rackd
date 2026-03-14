import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// All warehouse routes require settings.warehouses permission
router.use(requirePermission('settings.warehouses'));

// Get all warehouses
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const warehouses = db.prepare(`
      SELECT w.*,
             (SELECT COUNT(*) FROM locations WHERE warehouse_id = w.id) as location_count
      FROM warehouses w
      ORDER BY w.name
    `).all();
    res.json(warehouses);
  } catch (error: any) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

// Get warehouse by ID
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    res.json(warehouse);
  } catch (error: any) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse' });
  }
});

// Create warehouse (auto-creates default "Main" location)
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, code, address, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Validate code format: 2-4 uppercase chars
    if (!/^[A-Z0-9]{2,4}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 2-4 uppercase alphanumeric characters' });
    }

    const existing = db.prepare('SELECT id FROM warehouses WHERE code = ?').get(code);
    if (existing) {
      return res.status(400).json({ error: 'Warehouse code already exists' });
    }

    // Use transaction to create warehouse + default location atomically
    const createWarehouse = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO warehouses (name, code, address, notes) VALUES (?, ?, ?, ?)'
      ).run(name, code, address || null, notes || null);

      // Auto-create default "Main" location
      db.prepare(
        'INSERT INTO locations (name, warehouse_id, is_default) VALUES (?, ?, 1)'
      ).run('Main', result.lastInsertRowid);

      return result.lastInsertRowid;
    });

    const warehouseId = createWarehouse();
    const warehouse = db.prepare(`
      SELECT w.*,
             (SELECT COUNT(*) FROM locations WHERE warehouse_id = w.id) as location_count
      FROM warehouses w WHERE w.id = ?
    `).get(warehouseId);
    res.status(201).json(warehouse);
  } catch (error: any) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

// Update warehouse
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, code, address, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    if (!/^[A-Z0-9]{2,4}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 2-4 uppercase alphanumeric characters' });
    }

    const existing = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const codeCheck = db.prepare('SELECT id FROM warehouses WHERE code = ? AND id != ?').get(code, req.params.id);
    if (codeCheck) {
      return res.status(400).json({ error: 'Warehouse code already exists' });
    }

    db.prepare(
      'UPDATE warehouses SET name = ?, code = ?, address = ?, notes = ? WHERE id = ?'
    ).run(name, code, address || null, notes || null, req.params.id);

    const warehouse = db.prepare(`
      SELECT w.*,
             (SELECT COUNT(*) FROM locations WHERE warehouse_id = w.id) as location_count
      FROM warehouses w WHERE w.id = ?
    `).get(req.params.id);
    res.json(warehouse);
  } catch (error: any) {
    console.error('Update warehouse error:', error);
    res.status(500).json({ error: 'Failed to update warehouse' });
  }
});

// Delete warehouse
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    // Check if warehouse has operations
    const ops = db.prepare('SELECT id FROM operations WHERE warehouse_id = ? LIMIT 1').get(req.params.id);
    if (ops) {
      return res.status(400).json({ error: 'Cannot delete warehouse with existing operations' });
    }

    const result = db.prepare('DELETE FROM warehouses WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({ error: 'Failed to delete warehouse' });
  }
});

// Get locations for a warehouse
router.get('/:id/locations', (req: AuthRequest, res: Response) => {
  try {
    const locations = db.prepare(
      'SELECT * FROM locations WHERE warehouse_id = ? ORDER BY is_default DESC, name'
    ).all(req.params.id);
    res.json(locations);
  } catch (error: any) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

export default router;
