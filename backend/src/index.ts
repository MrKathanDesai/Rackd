import './env'; // must be first — loads .env before any other module reads process.env
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import bcrypt from 'bcryptjs';
import db from './db/client';

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Super Admin Seeding ─────────────────────────────────────────────
const ADMIN_EMAIL = 'kathandesai2404@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD env var is required. Server refusing to start.');
  process.exit(1);
}

(async () => {
  const existing = db
    .prepare('SELECT id, is_super_admin FROM users WHERE email = ?')
    .get(ADMIN_EMAIL) as { id: number; is_super_admin: number } | undefined;

  if (!existing) {
    // Create super admin from scratch
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare(
      `INSERT INTO users (name, email, password, role, is_super_admin, status)
       VALUES (?, ?, ?, 'superadmin', 1, 'active')`
    ).run('Kathan Desai', ADMIN_EMAIL, hashed);
    console.log('Super Admin seeded');
  } else if (!existing.is_super_admin) {
    // Existing user but not yet superadmin — promote + update password
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare(
      "UPDATE users SET role = 'superadmin', is_super_admin = 1, password = ? WHERE id = ?"
    ).run(hashed, existing.id);
    console.log('Super Admin promoted');
  } else {
    // Already superadmin — update password to match env
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, existing.id);
    console.log('Super Admin password synced from env');
  }
})();

// CORS configuration
if (NODE_ENV === 'development') {
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }));
}

// Middleware
app.use(express.json());
app.use(cookieParser());

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import warehouseRoutes from './routes/warehouses';
import locationRoutes from './routes/locations';
import productRoutes from './routes/products';
import supplierRoutes from './routes/suppliers';
import lotRoutes from './routes/lots';
import operationRoutes from './routes/operations';
import stockMoveRoutes from './routes/stockMoves';
import dashboardRoutes from './routes/dashboard';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/stock-moves', stockMoveRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Production: serve frontend static files
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Rackd backend running on port ${PORT} (${NODE_ENV} mode)`);
});

export default app;
