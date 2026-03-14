import { Response, NextFunction } from 'express';
import db from '../db/client';
import type { AuthRequest } from '../middleware/auth';

// ── All 33 permissions ──────────────────────────────────────────────
export const ALL_PERMISSIONS = [
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'receipts.view',
  'receipts.create',
  'receipts.confirm',
  'receipts.validate',
  'receipts.cancel',
  'deliveries.view',
  'deliveries.create',
  'deliveries.confirm',
  'deliveries.validate',
  'deliveries.cancel',
  'production.view',
  'production.create',
  'production.start',
  'production.validate',
  'production.cancel',
  'adjustments.view',
  'adjustments.create',
  'adjustments.validate',
  'transfers.view',
  'transfers.create',
  'transfers.validate',
  'transfers.cancel',
  'dashboard.view',
  'movehistory.view',
  'freshness.view',
  'settings.warehouses',
  'settings.locations',
  'settings.suppliers',
  'settings.users',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// ── Role defaults ───────────────────────────────────────────────────
export const ROLE_DEFAULTS: Record<string, Record<Permission, boolean>> = {
  manager: {
    'products.view': true,
    'products.create': true,
    'products.edit': true,
    'products.delete': true,
    'receipts.view': true,
    'receipts.create': true,
    'receipts.confirm': true,
    'receipts.validate': true,
    'receipts.cancel': true,
    'deliveries.view': true,
    'deliveries.create': true,
    'deliveries.confirm': true,
    'deliveries.validate': true,
    'deliveries.cancel': true,
    'production.view': true,
    'production.create': true,
    'production.start': true,
    'production.validate': true,
    'production.cancel': true,
    'adjustments.view': true,
    'adjustments.create': true,
    'adjustments.validate': true,
    'transfers.view': true,
    'transfers.create': true,
    'transfers.validate': true,
    'transfers.cancel': true,
    'dashboard.view': true,
    'movehistory.view': true,
    'freshness.view': true,
    'settings.warehouses': true,
    'settings.locations': true,
    'settings.suppliers': true,
    'settings.users': true,
  },
  staff: {
    'products.view': false,
    'products.create': false,
    'products.edit': false,
    'products.delete': false,
    'receipts.view': true,
    'receipts.create': false,
    'receipts.confirm': false,
    'receipts.validate': true,
    'receipts.cancel': false,
    'deliveries.view': true,
    'deliveries.create': false,
    'deliveries.confirm': false,
    'deliveries.validate': true,
    'deliveries.cancel': false,
    'production.view': true,
    'production.create': false,
    'production.start': true,
    'production.validate': true,
    'production.cancel': false,
    'adjustments.view': true,
    'adjustments.create': true,
    'adjustments.validate': true,
    'transfers.view': true,
    'transfers.create': false,
    'transfers.validate': true,
    'transfers.cancel': false,
    'dashboard.view': true,
    'movehistory.view': true,
    'freshness.view': true,
    'settings.warehouses': false,
    'settings.locations': false,
    'settings.suppliers': false,
    'settings.users': false,
  },
};

// ── Resolve all permissions for a user ──────────────────────────────
// Super admin bypasses all → check per-user overrides → fall back to role defaults
export function resolvePermissions(user: {
  id: number;
  role: string;
  is_super_admin: number;
}): Record<string, boolean> {
  // Super admin: everything true
  if (user.is_super_admin) {
    const perms: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) perms[p] = true;
    return perms;
  }

  // Start from role defaults
  const roleDefaults = ROLE_DEFAULTS[user.role];
  if (!roleDefaults) {
    // Unknown role = deny everything
    const perms: Record<string, boolean> = {};
    for (const p of ALL_PERMISSIONS) perms[p] = false;
    return perms;
  }

  const perms: Record<string, boolean> = { ...roleDefaults };

  // Apply per-user overrides
  const overrides = db
    .prepare('SELECT permission, granted FROM user_permissions WHERE user_id = ?')
    .all(user.id) as Array<{ permission: string; granted: number }>;

  for (const ov of overrides) {
    if (ov.permission in perms) {
      perms[ov.permission] = ov.granted === 1;
    }
  }

  return perms;
}

// ── Check a single permission ───────────────────────────────────────
export function hasPermission(
  user: { id: number; role: string; is_super_admin: number },
  permission: Permission
): boolean {
  if (user.is_super_admin) return true;
  const perms = resolvePermissions(user);
  return perms[permission] === true;
}

// ── Express middleware: require one or more permissions ──────────────
// Usage: router.get('/products', authMiddleware, requirePermission('products.view'), handler)
export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Load full user row for is_super_admin check
    const userRow = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user.id) as { id: number; role: string; is_super_admin: number } | undefined;

    if (!userRow) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Super admin bypasses all
    if (userRow.is_super_admin) {
      return next();
    }

    // Check each required permission
    for (const perm of permissions) {
      if (!hasPermission(userRow, perm)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: perm,
        });
      }
    }

    next();
  };
}
