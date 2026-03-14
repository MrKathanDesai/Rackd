import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requirePermission, resolvePermissions, ALL_PERMISSIONS, ROLE_DEFAULTS } from '../lib/permissions';
import type { Permission } from '../lib/permissions';
import { sendInviteEmail } from '../lib/mailer';

const router = Router();

// All users routes require auth + settings.users permission
router.use(authMiddleware);
router.use(requirePermission('settings.users'));

// ── Helper: user row → safe response (no password) ─────────────────
function sanitizeUser(row: any) {
  if (!row) return null;
  const { password, invite_code, ...safe } = row;
  return {
    ...safe,
    is_super_admin: !!row.is_super_admin,
    permissions: resolvePermissions(row),
  };
}

// ── List users ──────────────────────────────────────────────────────
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search } = req.query;
    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    let sql = `SELECT id, name, email, role, is_super_admin, status, last_login, created_by, created_at FROM users WHERE 1=1`;
    const params: any[] = [];

    // Managers can only see staff they manage
    if (!requestingUser.is_super_admin && requestingUser.role === 'manager') {
      sql += ` AND role = 'staff'`;
    }

    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const users = db.prepare(sql).all(...params) as any[];
    const result = users.map((u) => sanitizeUser(u));

    res.json(result);
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ── Get single user ─────────────────────────────────────────────────
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const user = db
      .prepare(
        `SELECT id, name, email, role, is_super_admin, status, last_login, created_by, created_at
         FROM users WHERE id = ?`
      )
      .get(req.params.id) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Managers can only see staff
    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;
    if (!requestingUser.is_super_admin && requestingUser.role === 'manager' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Also fetch per-user permission overrides
    const overrides = db
      .prepare('SELECT permission, granted, set_by, set_at FROM user_permissions WHERE user_id = ?')
      .all(user.id);

    res.json({ ...sanitizeUser(user), overrides });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ── Invite user ─────────────────────────────────────────────────────
router.post('/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }

    // Check requesting user permissions
    const requestingUser = db
      .prepare('SELECT id, name, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    // Only super admin can create managers
    if (role === 'manager' && !requestingUser.is_super_admin) {
      return res.status(403).json({ error: 'Only Super Admin can create Manager accounts' });
    }

    // Check if email already exists
    const existing = db.prepare('SELECT id, status FROM users WHERE email = ?').get(email) as any;
    if (existing) {
      if (existing.status === 'invited') {
        return res.status(400).json({ error: 'This email has already been invited. Use resend to send a new code.' });
      }
      return res.status(400).json({ error: 'This email is already registered' });
    }

    // Generate 6-digit invite code
    const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
    const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    // Create user in invited status (no password yet)
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password, role, status, invite_code, invite_expires, created_by)
         VALUES (?, ?, '', ?, 'invited', ?, ?, ?)`
      )
      .run(name || email.split('@')[0], email, role, inviteCode, inviteExpires, requestingUser.id);

    // Send invite email (non-blocking — user is created even if email fails)
    let emailSent = true;
    try {
      await sendInviteEmail(email, inviteCode, requestingUser.name, role);
    } catch (emailErr) {
      console.error('Failed to send invite email:', emailErr);
      emailSent = false;
    }

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;

    const response = sanitizeUser(newUser);
    if (!emailSent) {
      (response as any).warning = 'User created but invite email could not be sent';
    }
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// ── Resend invite ───────────────────────────────────────────────────
router.post('/:id/resend-invite', async (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'invited') {
      return res.status(400).json({ error: 'Can only resend invite for pending invites' });
    }

    const requestingUser = db
      .prepare('SELECT id, name, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    // Manager can only resend to staff
    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Generate new code
    const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
    const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET invite_code = ?, invite_expires = ? WHERE id = ?').run(
      inviteCode,
      inviteExpires,
      user.id
    );

    // Send invite email (non-blocking — resend succeeds even if email fails)
    let emailSent = true;
    try {
      await sendInviteEmail(user.email, inviteCode, requestingUser.name, user.role);
    } catch (emailErr) {
      console.error('Failed to resend invite email:', emailErr);
      emailSent = false;
    }

    const msg: any = { message: 'Invite resent' };
    if (!emailSent) {
      msg.warning = 'Invite code updated but email could not be sent';
    }
    res.json(msg);
  } catch (error: any) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

// ── Revoke invite ───────────────────────────────────────────────────
router.post('/:id/revoke-invite', (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'invited') {
      return res.status(400).json({ error: 'Can only revoke pending invites' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete the user record entirely
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    res.json({ message: 'Invite revoked' });
  } catch (error: any) {
    console.error('Revoke invite error:', error);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

// ── Update user (name, role) ────────────────────────────────────────
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, role } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot edit super admin from API (except name/password by themselves)
    if (user.is_super_admin && role && role !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot change Super Admin role' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    // Only super admin can change roles
    if (role && role !== user.role && !requestingUser.is_super_admin) {
      return res.status(403).json({ error: 'Only Super Admin can change user roles' });
    }

    // Managers can only edit staff
    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (role && !['manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be manager or staff' });
    }

    db.prepare('UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role) WHERE id = ?').run(
      name || null,
      role || null,
      userId
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    res.json(sanitizeUser(updated));
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── Reset user password (admin action) ──────────────────────────────
router.post('/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot reset super admin password via API
    if (user.is_super_admin) {
      return res.status(403).json({ error: 'Super Admin password is managed via environment variable' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── Deactivate user ─────────────────────────────────────────────────
router.post('/:id/deactivate', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_super_admin) {
      return res.status(403).json({ error: 'Cannot deactivate Super Admin' });
    }

    if (user.status === 'deactivated') {
      return res.status(400).json({ error: 'User already deactivated' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.prepare("UPDATE users SET status = 'deactivated' WHERE id = ?").run(userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    res.json(sanitizeUser(updated));
  } catch (error: any) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// ── Reactivate user ─────────────────────────────────────────────────
router.post('/:id/reactivate', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'deactivated') {
      return res.status(400).json({ error: 'User is not deactivated' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    res.json(sanitizeUser(updated));
  } catch (error: any) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// ── Set permission overrides (Super Admin only) ─────────────────────
router.put('/:id/permissions', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { permissions } = req.body as { permissions: Array<{ permission: string; granted: boolean }> };

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array of { permission, granted }' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin) {
      return res.status(403).json({ error: 'Only Super Admin can set permission overrides' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.is_super_admin) {
      return res.status(400).json({ error: 'Cannot set permission overrides for Super Admin' });
    }

    // Validate permissions
    const validPerms = new Set(ALL_PERMISSIONS as readonly string[]);
    for (const p of permissions) {
      if (!validPerms.has(p.permission)) {
        return res.status(400).json({ error: `Unknown permission: ${p.permission}` });
      }
    }

    // Clear existing overrides and set new ones
    const deleteStmt = db.prepare('DELETE FROM user_permissions WHERE user_id = ?');
    const insertStmt = db.prepare(
      'INSERT INTO user_permissions (user_id, permission, granted, set_by) VALUES (?, ?, ?, ?)'
    );

    const transaction = db.transaction(() => {
      deleteStmt.run(userId);
      for (const p of permissions) {
        insertStmt.run(userId, p.permission, p.granted ? 1 : 0, requestingUser.id);
      }
    });

    transaction();

    // Return updated user with resolved permissions
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    const overrides = db
      .prepare('SELECT permission, granted, set_by, set_at FROM user_permissions WHERE user_id = ?')
      .all(userId);

    res.json({ ...sanitizeUser(updated), overrides });
  } catch (error: any) {
    console.error('Set permissions error:', error);
    res.status(500).json({ error: 'Failed to set permissions' });
  }
});

// ── Reset permissions to role defaults ──────────────────────────────
router.post('/:id/reset-permissions', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    if (!requestingUser.is_super_admin) {
      return res.status(403).json({ error: 'Only Super Admin can reset permission overrides' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all overrides
    db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    res.json(sanitizeUser(updated));
  } catch (error: any) {
    console.error('Reset permissions error:', error);
    res.status(500).json({ error: 'Failed to reset permissions' });
  }
});

// ── Delete user permanently ─────────────────────────────────────────
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_super_admin) {
      return res.status(400).json({ error: 'Cannot delete Super Admin' });
    }

    const requestingUser = db
      .prepare('SELECT id, role, is_super_admin FROM users WHERE id = ?')
      .get(req.user!.id) as any;

    // Managers can only delete staff
    if (!requestingUser.is_super_admin && user.role !== 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Cannot delete yourself
    if (userId === requestingUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    });

    transaction();

    res.json({ message: 'User deleted' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── Get role defaults (utility) ─────────────────────────────────────
router.get('/meta/role-defaults', (req: AuthRequest, res: Response) => {
  res.json({
    permissions: ALL_PERMISSIONS,
    defaults: ROLE_DEFAULTS,
  });
});

export default router;
