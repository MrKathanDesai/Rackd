# RACKD Industrial OS

Production-grade inventory and warehouse management system for specialty coffee roasteries. Full-stack application with lot tracking, freshness monitoring, multi-warehouse operations, and role-based access control.

## What It Does

- **Receipt Management** -- Receive green and roasted coffee from suppliers with per-line coffee type selection, cupping scores, harvest year, process method, and roast date tracking
- **Delivery Management** -- Ship to customers with FIFO lot allocation and automatic cross-warehouse transfer creation when local stock is insufficient
- **Production Orders** -- Track roasting batches: input green lots, record actual yield, auto-generate roasted lots with freshness tracking and lot lineage
- **Transfers** -- Move stock between warehouses with full traceability
- **Adjustments** -- Cycle count corrections with gain/loss stock moves
- **Freshness Board** -- Real-time freshness monitoring for all roasted lots, calculated from expiry date with color-coded status (green/amber/red/expired)
- **Lot Tracking** -- Every kg traced from receipt through production to delivery with lot lineage (parent green lot -> child roasted lot)

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, React Router v7, React Query v5, Axios |
| Backend | Node.js, Express, TypeScript, better-sqlite3 |
| Auth | JWT in httpOnly cookies, bcrypt passwords, OTP via email |
| Email | Gmail SMTP via Nodemailer (falls back to console logging) |
| Build | Vite 6 (frontend), tsx (backend) |

## Design Philosophy

Brutal minimalism. Black text on white background. System fonts. No animations. 1px borders. Maximum information density. This is an operations tool, not a marketing site.

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/MrKathanDesai/Rackd.git
cd Rackd
npm install
cd backend && npm install && cd ..
```

### 2. Configure backend environment

Create `backend/.env`:

```env
PORT=5001
JWT_SECRET=your-secret-key
DATABASE_PATH=./rackd.db
ADMIN_PASSWORD=your-admin-password
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASS=your-gmail-app-password
```

- `ADMIN_PASSWORD` is required -- the server refuses to start without it. This is the Super Admin password.
- `GMAIL_USER` / `GMAIL_APP_PASS` are optional -- if not set, OTP codes and invite links are logged to the server console instead.

### 3. Start the backend

```bash
npx tsx backend/src/index.ts
```

The backend runs on `http://localhost:5001`. On first start it:
- Creates all database tables via `schema.sql`
- Runs incremental migrations
- Seeds the Super Admin account (`kathandesai2404@gmail.com`)

### 4. Start the frontend

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`.

### 5. Login

Use the Super Admin credentials:
- Email: `kathandesai2404@gmail.com`
- Password: whatever you set as `ADMIN_PASSWORD`

## Auth System

### Three-Tier Hierarchy

```
Super Admin  (hardcoded, seeded on server start)
      |
   Manager   (created by Super Admin via invite)
      |
   Staff     (created by Manager or Super Admin via invite)
```

### Login Modes

1. **Email + Password** -- traditional login
2. **Email + OTP** -- enter email, receive 6-digit code via Gmail, enter code

### Invite Flow

1. Admin/Manager creates invite from the Users panel
2. 6-digit OTP generated, stored with 48hr expiry, emailed to invitee
3. Invitee goes to `/accept-invite`, enters email + code + new password
4. Account activated, JWT issued, logged in immediately

No public signup. All accounts created via invite.

### Permissions

33 granular permissions across Products, Receipts, Deliveries, Production, Adjustments, Transfers, History/Dashboard, and Settings. Each role has defaults:

- **Super Admin** -- bypasses all permission checks
- **Manager** -- full operational access (all CRUD on operations, products, settings)
- **Staff** -- view + validate existing operations, create adjustments only

Super Admin can override any individual permission per user via the User Edit page.

## Project Structure

```
rackd/
|-- backend/
|   |-- .env                    # Environment config
|   |-- src/
|   |   |-- env.ts              # Dotenv bootstrap (imported first)
|   |   |-- index.ts            # Express server, route mounts, super admin seeding
|   |   |-- db/
|   |   |   |-- client.ts       # SQLite connection, schema init, migrations
|   |   |   |-- schema.sql      # Full database schema
|   |   |   +-- seed.ts         # Seed data (warehouses, locations, suppliers, products)
|   |   |-- middleware/
|   |   |   +-- auth.ts         # JWT verification, AuthRequest type
|   |   |-- lib/
|   |   |   |-- permissions.ts  # ROLE_DEFAULTS, hasPermission, requirePermission middleware
|   |   |   +-- mailer.ts       # Gmail SMTP with lazy init, console fallback
|   |   +-- routes/
|   |       |-- auth.ts         # Login, OTP, accept-invite, /me
|   |       |-- users.ts        # User CRUD, invite, permissions, delete
|   |       |-- operations.ts   # All operation types: receipt, delivery, production, adjustment, transfer
|   |       |-- dashboard.ts    # KPIs, freshness board, pending arrivals, green bean inventory
|   |       |-- products.ts     # Product CRUD
|   |       |-- lots.ts         # Lot queries (read-only, no permission gate)
|   |       |-- warehouses.ts   # Warehouse CRUD
|   |       |-- locations.ts    # Location CRUD
|   |       |-- suppliers.ts    # Supplier CRUD
|   |       +-- stockMoves.ts   # Stock movement ledger
|   +-- rackd.db                # SQLite database file
|-- src/
|   |-- main.tsx                # React entry point
|   |-- App.tsx                 # Router configuration
|   |-- types.ts                # All TypeScript interfaces
|   |-- api/
|   |   |-- client.ts           # Axios instance (baseURL, withCredentials)
|   |   +-- endpoints.ts        # All API endpoint functions
|   |-- hooks/
|   |   |-- useAuth.tsx         # Auth context, permission hooks
|   |   |-- queries.ts          # React Query hooks (read)
|   |   |-- mutations.ts        # React Query hooks (write)
|   |   +-- useToast.ts         # Toast notification hook
|   |-- components/
|   |   |-- common/             # Button, Badge, Input, Select, Textarea, Table, Modal
|   |   +-- layout/             # Sidebar (permission-gated), Header, PageLayout
|   +-- pages/
|       |-- Login.tsx           # Dual-mode login (password / OTP)
|       |-- AcceptInvite.tsx    # Invite acceptance page
|       |-- Dashboard.tsx       # KPI tiles, freshness board, pending arrivals, green inventory
|       |-- UsersList.tsx       # User management table with invite modal
|       |-- UserEdit.tsx        # User detail, role, permissions, danger zone
|       |-- ProductsList.tsx    # Product management
|       |-- ReceiptNew.tsx      # Create receipt with coffee type per line
|       |-- ReceiptDetail.tsx   # Receipt detail with fill/validate workflow
|       |-- ReceiptsList.tsx    # Receipt operations list
|       |-- DeliveriesList.tsx  # Delivery operations
|       |-- DeliveryNew.tsx     # Create delivery
|       |-- DeliveryDetail.tsx  # Delivery detail with lot allocation
|       |-- ProductionList.tsx  # Production orders
|       |-- ProductionNew.tsx   # Create production batch
|       |-- ProductionDetail.tsx # Production detail with yield tracking
|       |-- TransfersList.tsx   # Transfer operations
|       |-- AdjustmentsList.tsx # Adjustment operations
|       |-- MoveHistory.tsx     # Stock movement ledger
|       +-- Settings pages      # Warehouses, Locations, Suppliers
+-- index.html
```

## Database Schema

Key tables:

- `users` -- accounts with role, status, invite_code, is_super_admin flag
- `user_permissions` -- per-user permission overrides (user_id, permission, granted)
- `otps` -- email OTP codes with expiry and purpose
- `products` -- SKU, category, unit, shelf_life_days, reorder_pt
- `operations` -- all operation types with status workflow
- `receipt_lines` -- per-line product_type (green/roasted), demand_qty, done_qty, harvest_year, process, cupping_score, roast_date
- `delivery_lines` -- with lot allocation sub-table
- `production_inputs` -- green lot consumption with actual_yield
- `adjustment_lines` -- system_qty vs actual_qty
- `transfer_lines` -- lot-based transfers
- `lots` -- full lot tracking: product_type, arrival_date, roast_date, expiry_date, freshness, lineage
- `lot_lineage` -- parent/child relationships (green -> roasted)
- `stock_moves` -- immutable ledger of every stock movement
- `warehouses`, `locations`, `suppliers` -- configuration

## Operation Workflow

```
Draft  -->  Confirm  -->  Waiting  -->  Validate  -->  Done
  |                          |
  +-----> Cancel             +-----> Cancel
```

- **Draft** -- fully editable, no stock impact
- **Waiting** -- confirmed, fill received quantities / actual yields
- **Done** -- validated, lots created, stock moves recorded, immutable
- **Cancelled** -- archived, no stock impact

## API Endpoints

```
Auth:
  POST /api/auth/login              Email + password login
  POST /api/auth/send-otp           Send OTP to email
  POST /api/auth/verify-otp         Verify OTP and login
  POST /api/auth/accept-invite      Accept invite with code + new password
  GET  /api/auth/me                 Current user + permissions

Users:
  GET    /api/users                 List users (filtered by role visibility)
  GET    /api/users/:id             User detail with permissions
  PUT    /api/users/:id             Update user (name, role, status)
  DELETE /api/users/:id             Permanently delete user
  POST   /api/users/invite          Create invite (generates OTP, sends email)
  POST   /api/users/:id/permissions Set permission overrides
  POST   /api/users/:id/reset-permissions  Reset to role defaults

Operations:
  GET    /api/operations             List (filterable by type, status, warehouse)
  GET    /api/operations/:id         Full detail with lines
  POST   /api/operations             Create operation
  PUT    /api/operations/:id         Update operation header
  POST   /api/operations/:id/confirm Confirm (draft -> waiting)
  POST   /api/operations/:id/validate Validate (waiting -> done, creates lots/moves)
  POST   /api/operations/:id/cancel  Cancel operation
  POST   /api/operations/:id/lines   Add line
  PUT    /api/operations/:id/lines/:lineId  Update line
  DELETE /api/operations/:id/lines/:lineId  Delete line

Dashboard:
  GET /api/dashboard/kpis              KPI tiles (green/roasted stock, expiring, etc.)
  GET /api/dashboard/freshness-board   All active roasted lots with freshness %
  GET /api/dashboard/pending-arrivals  Receipts in draft/waiting
  GET /api/dashboard/green-bean-inventory  Active green lots

Resources:
  GET/POST/PUT/DELETE /api/products
  GET/POST/PUT/DELETE /api/warehouses
  GET/POST/PUT/DELETE /api/locations
  GET/POST/PUT/DELETE /api/suppliers
  GET /api/lots
  GET /api/stock-moves
```

## Available Scripts

```bash
# Frontend
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # TypeScript type check

# Backend
npx tsx backend/src/index.ts          # Start backend (port 5001)
npx tsx watch backend/src/index.ts    # Start with file watching
```

## License

MIT

## Author

Kathan Desai
