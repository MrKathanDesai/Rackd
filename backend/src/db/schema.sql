-- Rackd Coffee Roastery Management System
-- Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK(role IN ('superadmin', 'manager', 'staff')),
    is_super_admin INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('active', 'invited', 'deactivated')) DEFAULT 'active',
    invite_code TEXT,
    invite_expires TEXT,
    last_login TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Per-user permission overrides
CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    granted INTEGER NOT NULL DEFAULT 1,
    set_by INTEGER,
    set_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, permission),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE SET NULL
);

-- OTPs table (login OTP + password reset)
CREATE TABLE IF NOT EXISTS otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK(purpose IN ('login', 'reset')) DEFAULT 'reset',
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    warehouse_id INTEGER NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('estate', 'trader', 'cooperative', 'direct_farm')),
    origin_country TEXT,
    region TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products table (coffee-specific)
-- Product represents the coffee itself (origin, variety, process). No type field.
-- Whether a lot is green or roasted is tracked on the lot, not the product.
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT,
    process TEXT,
    origin TEXT,
    unit TEXT NOT NULL CHECK(unit IN ('kg', 'g', 'bags', 'units')),
    reorder_pt REAL NOT NULL DEFAULT 0,
    shelf_life_days INTEGER DEFAULT 30,
    supplier_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Operations table (receipts, deliveries, production, adjustments, transfers)
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('receipt', 'delivery', 'production', 'adjustment', 'transfer')),
    status TEXT NOT NULL CHECK(status IN ('draft', 'waiting', 'ready', 'in_progress', 'done', 'cancelled')),
    warehouse_id INTEGER NOT NULL,
    destination_warehouse_id INTEGER,
    supplier_id INTEGER,
    customer TEXT,
    scheduled_date TEXT,
    roast_date TEXT,
    roast_profile TEXT,
    reason TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    validated_at TEXT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Receipt lines table
CREATE TABLE IF NOT EXISTS receipt_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_type TEXT NOT NULL CHECK(product_type IN ('green', 'roasted')) DEFAULT 'green',
    demand_qty REAL NOT NULL CHECK(demand_qty > 0),
    done_qty REAL NOT NULL DEFAULT 0 CHECK(done_qty >= 0),
    harvest_year INTEGER,
    process TEXT,
    cupping_score REAL,
    roast_date TEXT,
    lot_notes TEXT,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Delivery lines table
CREATE TABLE IF NOT EXISTS delivery_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    demand_qty REAL NOT NULL CHECK(demand_qty > 0),
    done_qty REAL NOT NULL DEFAULT 0 CHECK(done_qty >= 0),
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Delivery lot allocations (which lots fulfill each delivery line)
CREATE TABLE IF NOT EXISTS delivery_lot_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_line_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    qty REAL NOT NULL CHECK(qty > 0),
    FOREIGN KEY (delivery_line_id) REFERENCES delivery_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT
);

-- Production inputs (green bean lots consumed, with yield tracking)
CREATE TABLE IF NOT EXISTS production_inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    qty REAL NOT NULL CHECK(qty > 0),
    expected_yield REAL,
    actual_yield REAL,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT
);

-- Adjustment lines (lot quantity corrections)
CREATE TABLE IF NOT EXISTS adjustment_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    system_qty REAL NOT NULL,
    actual_qty REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT
);

-- Transfer lines table (lot-level stock transfers between warehouses)
CREATE TABLE IF NOT EXISTS transfer_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    qty REAL NOT NULL CHECK(qty > 0),
    notes TEXT,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT
);

-- Lots table (the core tracking entity)
CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL UNIQUE,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER,
    warehouse_id INTEGER,
    receipt_operation_id INTEGER,
    production_operation_id INTEGER,
    product_type TEXT NOT NULL CHECK(product_type IN ('green', 'roasted')),
    arrival_date TEXT,
    roast_date TEXT,
    expiry_date TEXT,
    initial_qty REAL NOT NULL CHECK(initial_qty > 0),
    remaining_qty REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('active', 'depleted', 'expired')) DEFAULT 'active',
    harvest_year INTEGER,
    process TEXT,
    cupping_score REAL,
    roast_profile TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (receipt_operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
    FOREIGN KEY (production_operation_id) REFERENCES operations(id) ON DELETE RESTRICT
);

-- Lot lineage (tracks which parent lots produced which child lots)
CREATE TABLE IF NOT EXISTS lot_lineage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_lot_id INTEGER NOT NULL,
    parent_lot_id INTEGER NOT NULL,
    FOREIGN KEY (child_lot_id) REFERENCES lots(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_lot_id) REFERENCES lots(id) ON DELETE CASCADE
);

-- Stock moves table (immutable ledger)
CREATE TABLE IF NOT EXISTS stock_moves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id INTEGER NOT NULL,
    lot_id INTEGER,
    product_id INTEGER NOT NULL,
    from_location_id INTEGER,
    to_location_id INTEGER,
    qty REAL NOT NULL CHECK(qty > 0),
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE RESTRICT
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    lot_id INTEGER,
    type TEXT NOT NULL CHECK(type IN ('low_stock', 'expiry')),
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_warehouse ON operations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_operations_supplier ON operations(supplier_id);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_operation ON receipt_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_product ON receipt_lines(product_id);

CREATE INDEX IF NOT EXISTS idx_delivery_lines_operation ON delivery_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lines_product ON delivery_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lot_alloc_line ON delivery_lot_allocations(delivery_line_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lot_alloc_lot ON delivery_lot_allocations(lot_id);

CREATE INDEX IF NOT EXISTS idx_production_inputs_operation ON production_inputs(operation_id);
CREATE INDEX IF NOT EXISTS idx_production_inputs_lot ON production_inputs(lot_id);

CREATE INDEX IF NOT EXISTS idx_adjustment_lines_operation ON adjustment_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_lines_lot ON adjustment_lines(lot_id);

CREATE INDEX IF NOT EXISTS idx_transfer_lines_operation ON transfer_lines(operation_id);
CREATE INDEX IF NOT EXISTS idx_transfer_lines_lot ON transfer_lines(lot_id);

CREATE INDEX IF NOT EXISTS idx_operations_dest_warehouse ON operations(destination_warehouse_id);

CREATE INDEX IF NOT EXISTS idx_lots_product ON lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_supplier ON lots(supplier_id);

CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_lots_product_type ON lots(product_type);
CREATE INDEX IF NOT EXISTS idx_lots_lot_number ON lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_lots_expiry ON lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_receipt ON lots(receipt_operation_id);
CREATE INDEX IF NOT EXISTS idx_lots_production ON lots(production_operation_id);

CREATE INDEX IF NOT EXISTS idx_lot_lineage_child ON lot_lineage(child_lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_lineage_parent ON lot_lineage(parent_lot_id);

CREATE INDEX IF NOT EXISTS idx_stock_moves_operation ON stock_moves(operation_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_lot ON stock_moves(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_from_location ON stock_moves(from_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_to_location ON stock_moves(to_location_id);

CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_lot ON alerts(lot_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- User / permission indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose);
