import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// Helper: Calculate stock for a product from lots
function calculateStock(productId: number) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(remaining_qty), 0) as onHand
    FROM lots
    WHERE product_id = ? AND status = 'active'
  `).get(productId) as any;

  // Calculate reserved from ready deliveries
  const reserved = db.prepare(`
    SELECT COALESCE(SUM(dla.qty), 0) as total
    FROM delivery_lot_allocations dla
    JOIN delivery_lines dl ON dla.delivery_line_id = dl.id
    JOIN operations o ON dl.operation_id = o.id
    WHERE o.status = 'ready'
      AND dla.lot_id IN (SELECT id FROM lots WHERE product_id = ?)
  `).get(productId) as any;

  const onHand = result.onHand;
  const reservedQty = reserved.total;

  return {
    onHand,
    reserved: reservedQty,
    available: onHand - reservedQty
  };
}

// Get all products with computed stock
router.get('/', requirePermission('products.view'), (req: AuthRequest, res: Response) => {
  try {
    const { search, supplier_id } = req.query;
    let query = `
      SELECT p.*, s.name as supplier_name, s.code as supplier_code
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (supplier_id) {
      conditions.push('p.supplier_id = ?');
      params.push(supplier_id);
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.origin LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.name';

    const products = db.prepare(query).all(...params) as any[];

    const productsWithStock = products.map(product => {
      const stock = calculateStock(product.id);
      return {
        ...product,
        onHand: stock.onHand,
        reserved: stock.reserved,
        available: stock.available,
        isLowStock: stock.available < product.reorder_pt
      };
    });

    res.json(productsWithStock);
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID with lot breakdown
router.get('/:id', requirePermission('products.view'), (req: AuthRequest, res: Response) => {
  try {
    const product = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.code as supplier_code
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
    `).get(req.params.id) as any;
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalStock = calculateStock(product.id);

    // Get active lots for this product
    const activeLots = db.prepare(`
      SELECT l.*, s.name as supplier_name, s.code as supplier_code
      FROM lots l
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      WHERE l.product_id = ? AND l.status = 'active'
      ORDER BY l.expiry_date ASC NULLS LAST, l.created_at ASC
    `).all(req.params.id);

    res.json({
      ...product,
      totalStock,
      activeLots,
      isLowStock: totalStock.available < product.reorder_pt
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', requirePermission('products.create'), (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, process, origin, unit, reorder_pt, shelf_life_days, supplier_id, notes } = req.body;

    if (!name || !sku || !unit) {
      return res.status(400).json({ error: 'Name, SKU, and unit are required' });
    }

    const validUnits = ['kg', 'g', 'bags', 'units'];
    if (!validUnits.includes(unit)) {
      return res.status(400).json({ error: `Unit must be one of: ${validUnits.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const result = db.prepare(
      `INSERT INTO products (name, sku, category, process, origin, unit, reorder_pt, shelf_life_days, supplier_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name, sku, category || null, process || null, origin || null,
      unit, reorder_pt || 0, shelf_life_days || 30,
      supplier_id || null, notes || null
    );

    const product = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.code as supplier_code
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
    `).get(result.lastInsertRowid) as any;
    const stock = calculateStock(product.id);

    res.status(201).json({
      ...product,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available: stock.available,
      isLowStock: stock.available < product.reorder_pt
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', requirePermission('products.edit'), (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, process, origin, unit, reorder_pt, shelf_life_days, supplier_id, notes } = req.body;

    if (!name || !sku || !unit) {
      return res.status(400).json({ error: 'Name, SKU, and unit are required' });
    }

    const validUnits = ['kg', 'g', 'bags', 'units'];
    if (!validUnits.includes(unit)) {
      return res.status(400).json({ error: `Unit must be one of: ${validUnits.join(', ')}` });
    }

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const skuCheck = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, req.params.id);
    if (skuCheck) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    db.prepare(
      `UPDATE products SET name = ?, sku = ?, category = ?, process = ?, origin = ?,
       unit = ?, reorder_pt = ?, shelf_life_days = ?, supplier_id = ?, notes = ? WHERE id = ?`
    ).run(
      name, sku, category || null, process || null, origin || null,
      unit, reorder_pt || 0, shelf_life_days || 30,
      supplier_id || null, notes || null,
      req.params.id
    );

    const product = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.code as supplier_code
      FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?
    `).get(req.params.id) as any;
    const stock = calculateStock(product.id);

    res.json({
      ...product,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available: stock.available,
      isLowStock: stock.available < product.reorder_pt
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', requirePermission('products.delete'), (req: AuthRequest, res: Response) => {
  try {
    // Check if product has lots
    const lots = db.prepare('SELECT id FROM lots WHERE product_id = ? LIMIT 1').get(req.params.id);
    if (lots) {
      return res.status(400).json({ error: 'Cannot delete product with existing lots' });
    }

    // Check if product has operation lines
    const receiptLines = db.prepare('SELECT id FROM receipt_lines WHERE product_id = ? LIMIT 1').get(req.params.id);
    const deliveryLines = db.prepare('SELECT id FROM delivery_lines WHERE product_id = ? LIMIT 1').get(req.params.id);
    if (receiptLines || deliveryLines) {
      return res.status(400).json({ error: 'Cannot delete product referenced in operations' });
    }

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
