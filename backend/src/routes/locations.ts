import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// All location routes require settings.locations permission
router.use(requirePermission('settings.locations'));

// Get all locations
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    let query = `
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const params: any[] = [];

    if (warehouse_id) {
      query += ' WHERE l.warehouse_id = ?';
      params.push(warehouse_id);
    }

    query += ' ORDER BY w.name, l.is_default DESC, l.name';

    const locations = db.prepare(query).all(...params);
    res.json(locations);
  } catch (error: any) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get location by ID
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const location = db.prepare(`
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error: any) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Create location
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, warehouse_id, is_default, notes } = req.body;

    if (!name || !warehouse_id) {
      return res.status(400).json({ error: 'Name and warehouse_id are required' });
    }

    const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    // If setting as default, unset other defaults for this warehouse
    if (is_default) {
      db.prepare('UPDATE locations SET is_default = 0 WHERE warehouse_id = ?').run(warehouse_id);
    }

    const result = db.prepare(
      'INSERT INTO locations (name, warehouse_id, is_default, notes) VALUES (?, ?, ?, ?)'
    ).run(name, warehouse_id, is_default ? 1 : 0, notes || null);

    const location = db.prepare(`
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(location);
  } catch (error: any) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, is_default, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = db.prepare('SELECT warehouse_id FROM locations WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // If setting as default, unset other defaults for this warehouse
    if (is_default) {
      db.prepare('UPDATE locations SET is_default = 0 WHERE warehouse_id = ?').run(existing.warehouse_id);
    }

    db.prepare(
      'UPDATE locations SET name = ?, is_default = ?, notes = ? WHERE id = ?'
    ).run(name, is_default ? 1 : 0, notes || null, req.params.id);

    const location = db.prepare(`
      SELECT l.*, w.name as warehouse_name, w.code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `).get(req.params.id);

    res.json(location);
  } catch (error: any) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete location
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const location = db.prepare('SELECT is_default FROM locations WHERE id = ?').get(req.params.id) as any;
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (location.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default location' });
    }

    // Check if location has stock moves
    const moves = db.prepare(
      'SELECT id FROM stock_moves WHERE from_location_id = ? OR to_location_id = ? LIMIT 1'
    ).get(req.params.id, req.params.id);
    if (moves) {
      return res.status(400).json({ error: 'Cannot delete location with stock movement history' });
    }

    db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    res.json({ message: 'Location deleted successfully' });
  } catch (error: any) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
