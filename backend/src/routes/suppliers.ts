import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// All supplier routes require settings.suppliers permission
router.use(requirePermission('settings.suppliers'));

// Get all suppliers (with optional search)
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { search, type } = req.query;
    let query = 'SELECT * FROM suppliers';
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR code LIKE ? OR origin_country LIKE ? OR region LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY name';

    const suppliers = db.prepare(query).all(...params);
    res.json(suppliers);
  } catch (error: any) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error: any) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// Create supplier
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, code, type, origin_country, region, contact_person, phone, email, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Validate code format: 2-4 uppercase chars
    if (!/^[A-Z]{2,4}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 2-4 uppercase letters' });
    }

    // Validate type if provided
    const validTypes = ['estate', 'trader', 'cooperative', 'direct_farm'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    // Check if code already exists
    const existing = db.prepare('SELECT id FROM suppliers WHERE code = ?').get(code);
    if (existing) {
      return res.status(400).json({ error: 'Supplier code already exists' });
    }

    const result = db.prepare(
      `INSERT INTO suppliers (name, code, type, origin_country, region, contact_person, phone, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, code, type || null, origin_country || null, region || null, contact_person || null, phone || null, email || null, notes || null);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(supplier);
  } catch (error: any) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { name, code, type, origin_country, region, contact_person, phone, email, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    if (!/^[A-Z]{2,4}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 2-4 uppercase letters' });
    }

    const validTypes = ['estate', 'trader', 'cooperative', 'direct_farm'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const codeCheck = db.prepare('SELECT id FROM suppliers WHERE code = ? AND id != ?').get(code, req.params.id);
    if (codeCheck) {
      return res.status(400).json({ error: 'Supplier code already exists' });
    }

    db.prepare(
      `UPDATE suppliers SET name = ?, code = ?, type = ?, origin_country = ?, region = ?,
       contact_person = ?, phone = ?, email = ?, notes = ? WHERE id = ?`
    ).run(name, code, type || null, origin_country || null, region || null, contact_person || null, phone || null, email || null, notes || null, req.params.id);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(supplier);
  } catch (error: any) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    // Check if supplier has lots
    const lots = db.prepare('SELECT id FROM lots WHERE supplier_id = ? LIMIT 1').get(req.params.id);
    if (lots) {
      return res.status(400).json({ error: 'Cannot delete supplier with existing lots' });
    }

    // Check if supplier has operations
    const ops = db.prepare('SELECT id FROM operations WHERE supplier_id = ? LIMIT 1').get(req.params.id);
    if (ops) {
      return res.status(400).json({ error: 'Cannot delete supplier with existing operations' });
    }

    const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
