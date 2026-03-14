import { Router, Response } from 'express';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../lib/permissions';

const router = Router();

router.use(authMiddleware);
router.use(requirePermission('movehistory.view'));

// Get stock moves with filters
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { product_id, lot_id, warehouse_id, from, to, type, reason } = req.query;

    let query = `
      SELECT
        sm.*,
        o.reference, o.type as operation_type, o.status as operation_status,
        p.name as product_name, p.sku, p.unit,
        l.lot_number,
        fl.name as from_location_name,
        tl.name as to_location_name,
        fw.name as from_warehouse_name,
        tw.name as to_warehouse_name
      FROM stock_moves sm
      JOIN operations o ON sm.operation_id = o.id
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN lots l ON sm.lot_id = l.id
      LEFT JOIN locations fl ON sm.from_location_id = fl.id
      LEFT JOIN locations tl ON sm.to_location_id = tl.id
      LEFT JOIN warehouses fw ON fl.warehouse_id = fw.id
      LEFT JOIN warehouses tw ON tl.warehouse_id = tw.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (product_id) {
      query += ' AND sm.product_id = ?';
      params.push(product_id);
    }
    if (lot_id) {
      query += ' AND sm.lot_id = ?';
      params.push(lot_id);
    }
    if (warehouse_id) {
      query += ' AND (fl.warehouse_id = ? OR tl.warehouse_id = ?)';
      params.push(warehouse_id, warehouse_id);
    }
    if (from) {
      query += ' AND sm.created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND sm.created_at <= ?';
      params.push(to);
    }
    if (type) {
      query += ' AND o.type = ?';
      params.push(type);
    }
    if (reason) {
      query += ' AND sm.reason = ?';
      params.push(reason);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT 200';

    const moves = db.prepare(query).all(...params);
    res.json(moves);
  } catch (error: any) {
    console.error('Get stock moves error:', error);
    res.status(500).json({ error: 'Failed to fetch stock moves' });
  }
});

export default router;
