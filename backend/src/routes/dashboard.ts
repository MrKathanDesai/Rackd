import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);

// Get dashboard KPIs (optionally filtered by warehouse_id)
router.get('/kpis', requirePermission('dashboard.view'), (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    const whFilter = warehouse_id ? ' AND l.warehouse_id = ?' : '';
    const whParam = warehouse_id ? [Number(warehouse_id)] : [];

    // Green bean stock (total remaining_qty of active green lots)
    const greenStock = (db.prepare(`
      SELECT COALESCE(SUM(remaining_qty), 0) as total
      FROM lots l WHERE l.product_type = 'green' AND l.status = 'active'${whFilter}
    `).get(...whParam) as any).total;

    // Roasted stock (total remaining_qty of active roasted lots)
    const roastedStock = (db.prepare(`
      SELECT COALESCE(SUM(remaining_qty), 0) as total
      FROM lots l WHERE l.product_type = 'roasted' AND l.status = 'active'${whFilter}
    `).get(...whParam) as any).total;

    // Expiring soon: roasted lots expiring within 7 days
    const expiringSoon = (db.prepare(`
      SELECT COUNT(*) as count FROM lots l
      WHERE l.product_type = 'roasted' AND l.status = 'active' AND l.expiry_date IS NOT NULL
        AND date(l.expiry_date) <= date('now', '+7 days')
        AND date(l.expiry_date) >= date('now')${whFilter}
    `).get(...whParam) as any).count;

    // Pending arrivals: receipts in draft or waiting (optionally filtered by warehouse)
    let pendingArrivalsQuery = `
      SELECT COUNT(*) as count FROM operations
      WHERE type = 'receipt' AND status IN ('draft', 'waiting')
    `;
    const pendingParams: any[] = [];
    if (warehouse_id) {
      pendingArrivalsQuery += ' AND warehouse_id = ?';
      pendingParams.push(Number(warehouse_id));
    }
    const pendingArrivals = (db.prepare(pendingArrivalsQuery).get(...pendingParams) as any).count;

    // Low stock items: products where available at this warehouse < reorder_pt
    const products = db.prepare('SELECT id, reorder_pt FROM products').all() as any[];
    let lowStockItems = 0;
    for (const p of products) {
      const available = (db.prepare(`
        SELECT COALESCE(SUM(remaining_qty), 0) as total
        FROM lots l WHERE l.product_id = ? AND l.status = 'active'${whFilter}
      `).get(p.id, ...whParam) as any).total;
      if (available < p.reorder_pt && p.reorder_pt > 0) lowStockItems++;
    }

    // Average freshness of active roasted lots (100% = just roasted, 0% = expired)
    const avgFreshness = (db.prepare(`
      SELECT AVG(
        CASE
          WHEN p.shelf_life_days > 0 AND l.expiry_date IS NOT NULL
          THEN MAX(0, (julianday(l.expiry_date) - julianday('now')) / p.shelf_life_days * 100)
          WHEN p.shelf_life_days > 0 AND l.roast_date IS NOT NULL
          THEN MAX(0, 100.0 - (julianday('now') - julianday(l.roast_date)) / p.shelf_life_days * 100)
          WHEN p.shelf_life_days > 0 AND l.arrival_date IS NOT NULL
          THEN MAX(0, 100.0 - (julianday('now') - julianday(l.arrival_date)) / p.shelf_life_days * 100)
          ELSE 100
        END
      ) as avg_pct
      FROM lots l
      JOIN products p ON l.product_id = p.id
      WHERE l.product_type = 'roasted' AND l.status = 'active'${whFilter}
    `).get(...whParam) as any).avg_pct;

    res.json({
      greenStock,
      roastedStock,
      expiringSoon,
      pendingArrivals,
      lowStockItems,
      avgFreshness: avgFreshness !== null ? Math.round(avgFreshness * 10) / 10 : null
    });
  } catch (error: any) {
    console.error('Get KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// Get freshness board (all active roasted lots sorted by expiry, optionally filtered by warehouse)
router.get('/freshness-board', requirePermission('freshness.view'), (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    const whFilter = warehouse_id ? ' AND l.warehouse_id = ?' : '';
    const whParam = warehouse_id ? [Number(warehouse_id)] : [];

    const lots = db.prepare(`
      SELECT l.*,
             p.name as product_name, p.sku, p.unit, p.shelf_life_days,
             s.name as supplier_name,
             w.name as warehouse_name, w.code as warehouse_code,
             CASE
               WHEN p.shelf_life_days > 0 AND l.expiry_date IS NOT NULL
               THEN MAX(0, (julianday(l.expiry_date) - julianday('now')) / p.shelf_life_days * 100)
               WHEN p.shelf_life_days > 0 AND l.roast_date IS NOT NULL
               THEN MAX(0, 100.0 - (julianday('now') - julianday(l.roast_date)) / p.shelf_life_days * 100)
               WHEN p.shelf_life_days > 0 AND l.arrival_date IS NOT NULL
               THEN MAX(0, 100.0 - (julianday('now') - julianday(l.arrival_date)) / p.shelf_life_days * 100)
               ELSE 100
             END as freshness_pct,
             CASE
               WHEN l.expiry_date IS NOT NULL AND date(l.expiry_date) < date('now') THEN 'expired'
               WHEN p.shelf_life_days > 0 AND l.expiry_date IS NOT NULL
                 AND (julianday(l.expiry_date) - julianday('now')) / p.shelf_life_days * 100 < 20 THEN 'red'
               WHEN p.shelf_life_days > 0 AND l.expiry_date IS NOT NULL
                 AND (julianday(l.expiry_date) - julianday('now')) / p.shelf_life_days * 100 < 50 THEN 'amber'
               WHEN p.shelf_life_days > 0 AND l.roast_date IS NOT NULL
                 AND (100.0 - (julianday('now') - julianday(l.roast_date)) / p.shelf_life_days * 100) < 20 THEN 'red'
               WHEN p.shelf_life_days > 0 AND l.roast_date IS NOT NULL
                 AND (100.0 - (julianday('now') - julianday(l.roast_date)) / p.shelf_life_days * 100) < 50 THEN 'amber'
               WHEN p.shelf_life_days > 0 AND l.arrival_date IS NOT NULL
                 AND (100.0 - (julianday('now') - julianday(l.arrival_date)) / p.shelf_life_days * 100) < 20 THEN 'red'
               WHEN p.shelf_life_days > 0 AND l.arrival_date IS NOT NULL
                 AND (100.0 - (julianday('now') - julianday(l.arrival_date)) / p.shelf_life_days * 100) < 50 THEN 'amber'
               ELSE 'green'
             END as freshness_status
      FROM lots l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.product_type = 'roasted' AND l.status = 'active'${whFilter}
      ORDER BY l.expiry_date ASC NULLS LAST
    `).all(...whParam);

    res.json(lots);
  } catch (error: any) {
    console.error('Get freshness board error:', error);
    res.status(500).json({ error: 'Failed to fetch freshness board' });
  }
});

// Get pending arrivals (receipts in draft/waiting with line counts, optionally filtered by warehouse)
router.get('/pending-arrivals', requirePermission('dashboard.view'), (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    let whFilter = '';
    const params: any[] = [];
    if (warehouse_id) {
      whFilter = ' AND o.warehouse_id = ?';
      params.push(Number(warehouse_id));
    }

    const arrivals = db.prepare(`
      SELECT o.id, o.reference, o.status, o.scheduled_date, o.notes, o.created_at,
             w.name as warehouse_name, w.code as warehouse_code,
             s.name as supplier_name,
             (SELECT COUNT(*) FROM receipt_lines WHERE operation_id = o.id) as line_count,
             (SELECT COALESCE(SUM(demand_qty), 0) FROM receipt_lines WHERE operation_id = o.id) as total_demand
      FROM operations o
      JOIN warehouses w ON o.warehouse_id = w.id
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.type = 'receipt' AND o.status IN ('draft', 'waiting')${whFilter}
      ORDER BY o.scheduled_date ASC NULLS LAST, o.created_at DESC
    `).all(...params);

    res.json(arrivals);
  } catch (error: any) {
    console.error('Get pending arrivals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending arrivals' });
  }
});

// Get green bean inventory (all active green bean lots, optionally filtered by warehouse)
router.get('/green-bean-inventory', requirePermission('dashboard.view'), (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    const whFilter = warehouse_id ? ' AND l.warehouse_id = ?' : '';
    const whParam = warehouse_id ? [Number(warehouse_id)] : [];

    const lots = db.prepare(`
      SELECT l.*,
             p.name as product_name, p.sku, p.unit,
             s.name as supplier_name, s.code as supplier_code,
             w.name as warehouse_name, w.code as warehouse_code
      FROM lots l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.product_type = 'green' AND l.status = 'active'${whFilter}
      ORDER BY l.remaining_qty DESC
    `).all(...whParam);

    res.json(lots);
  } catch (error: any) {
    console.error('Get green bean inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch green bean inventory' });
  }
});

export default router;
