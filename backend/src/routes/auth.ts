import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/client';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { resolvePermissions } from '../lib/permissions';
import { sendLoginOtpEmail } from '../lib/mailer';

const router = Router();

// ── Helper: build token + user response for a DB user row ───────────
function buildAuthResponse(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  is_super_admin: number;
}) {
  const permissions = resolvePermissions(user);
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    is_super_admin: !!user.is_super_admin,
    permissions,
  });

  // Update last_login
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_super_admin: !!user.is_super_admin,
      permissions,
    },
  };
}

// ── Login (email + password) ────────────────────────────────────────
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'deactivated') {
      return res.status(403).json({ error: 'Account deactivated. Contact your administrator.' });
    }

    if (user.status === 'invited') {
      return res.status(403).json({ error: 'Account not yet activated. Check your email for the invite code.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { token, user: userData } = buildAuthResponse(user);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: userData });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Send login OTP ──────────────────────────────────────────────────
router.post('/otp/send', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = db.prepare('SELECT id, status FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If this email is registered, an OTP has been sent.' });
    }

    if (user.status === 'deactivated') {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    if (user.status === 'invited') {
      return res.status(403).json({ error: 'Account not yet activated. Use your invite code first.' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    db.prepare('INSERT INTO otps (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)').run(
      email,
      code,
      'login',
      expiresAt
    );

    // Send email (non-fatal — OTP is saved even if email fails)
    try {
      await sendLoginOtpEmail(email, code);
    } catch (emailErr: any) {
      console.error('Failed to send login OTP email:', emailErr.message || emailErr);
      console.log(`[FALLBACK] Login OTP for ${email}: ${code}`);
    }

    res.json({ message: 'If this email is registered, an OTP has been sent.' });
  } catch (error: any) {
    console.error('OTP send error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ── Verify login OTP → log in ───────────────────────────────────────
router.post('/otp/login', (req, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code required' });
    }

    // Find valid OTP
    const otp = db
      .prepare(
        `SELECT * FROM otps
         WHERE email = ? AND code = ? AND purpose = 'login' AND used = 0
           AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(email, code) as any;

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otp.id);

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { token, user: userData } = buildAuthResponse(user);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: userData });
  } catch (error: any) {
    console.error('OTP login error:', error);
    res.status(500).json({ error: 'OTP login failed' });
  }
});

// ── Accept Invite ───────────────────────────────────────────────────
router.post('/accept-invite', async (req, res: Response) => {
  try {
    const { email, code, name, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, invite code, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      return res.status(400).json({ error: 'Invalid invite' });
    }

    if (user.status !== 'invited') {
      return res.status(400).json({ error: 'This account is already activated' });
    }

    if (!user.invite_code || user.invite_code !== code) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    if (!user.invite_expires || new Date(user.invite_expires) < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' });
    }

    // Activate
    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare(
      `UPDATE users
       SET password = ?, status = 'active', invite_code = NULL, invite_expires = NULL,
           name = COALESCE(?, name)
       WHERE id = ?`
    ).run(hashedPassword, name || null, user.id);

    // Fetch updated user
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
    const { token, user: userData } = buildAuthResponse(updated);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: userData });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// ── Logout ──────────────────────────────────────────────────────────
router.post('/logout', (req, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// ── Get current user ────────────────────────────────────────────────
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db
    .prepare('SELECT id, name, email, role, is_super_admin, status FROM users WHERE id = ?')
    .get(req.user!.id) as any;

  if (!user || user.status !== 'active') {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Account not active' });
  }

  const permissions = resolvePermissions(user);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_super_admin: !!user.is_super_admin,
      permissions,
    },
  });
});

// ── Password reset: request OTP ─────────────────────────────────────
router.post('/otp/request-reset', async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ? AND status = ?').get(email, 'active');
    if (!user) {
      return res.json({ message: 'If this email is registered, an OTP has been sent.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare('INSERT INTO otps (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)').run(
      email,
      code,
      'reset',
      expiresAt
    );

    // Send email (non-fatal — OTP is saved even if email fails)
    try {
      await sendLoginOtpEmail(email, code);
    } catch (emailErr: any) {
      console.error('Failed to send reset OTP email:', emailErr.message || emailErr);
      console.log(`[FALLBACK] Reset OTP for ${email}: ${code}`);
    }

    res.json({ message: 'If this email is registered, an OTP has been sent.' });
  } catch (error: any) {
    console.error('Reset OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ── Password reset: verify + set new password ───────────────────────
router.post('/otp/reset', async (req, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const otp = db
      .prepare(
        `SELECT * FROM otps
         WHERE email = ? AND code = ? AND purpose = 'reset' AND used = 0
           AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(email, code) as any;

    if (!otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, email);
    db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otp.id);

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
