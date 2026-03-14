// ── Enums / Union Types ───────────────────────────────────────────────

export type Status = 'draft' | 'waiting' | 'ready' | 'in_progress' | 'done' | 'cancelled';

export type OperationType = 'receipt' | 'delivery' | 'production' | 'adjustment' | 'transfer';

export type ProductType = 'green' | 'roasted';

export type Unit = 'kg' | 'g' | 'bags' | 'units';

export type SupplierType = 'estate' | 'trader' | 'cooperative' | 'direct_farm';

export type LotStatus = 'active' | 'depleted' | 'expired';

export type FreshnessStatus = 'green' | 'amber' | 'red' | 'expired';

// ── Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'manager' | 'staff';

export type UserStatus = 'active' | 'invited' | 'deactivated';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_super_admin: boolean;
  permissions: Record<string, boolean>;
}

export interface UserDetail extends User {
  status: UserStatus;
  last_login: string | null;
  created_by: number | null;
  created_at: string;
  overrides?: PermissionOverride[];
}

export interface PermissionOverride {
  permission: string;
  granted: number;
  set_by: number | null;
  set_at: string;
}

// ── Warehouses ────────────────────────────────────────────────────────

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  location_count?: number; // included in list + create/update, NOT in get-by-id
}

// ── Locations ─────────────────────────────────────────────────────────

export interface Location {
  id: number;
  name: string;
  warehouse_id: number;
  is_default: number; // SQLite boolean: 0 | 1
  notes: string | null;
  created_at: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

// ── Suppliers ─────────────────────────────────────────────────────────

export interface Supplier {
  id: number;
  name: string;
  code: string;
  type: SupplierType | null;
  origin_country: string | null;
  region: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

// ── Products ──────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  process: string | null;
  origin: string | null;
  unit: Unit;
  reorder_pt: number;
  shelf_life_days: number;
  supplier_id: number | null;
  notes: string | null;
  created_at: string;
  // Joined from supplier
  supplier_name: string | null;
  supplier_code: string | null;
  // Computed stock (list endpoint)
  onHand: number;
  reserved: number;
  available: number;
  isLowStock: boolean;
}

export interface ProductDetail extends Omit<Product, 'onHand' | 'reserved' | 'available'> {
  totalStock: {
    onHand: number;
    reserved: number;
    available: number;
  };
  activeLots: Lot[];
}

// ── Lots ──────────────────────────────────────────────────────────────

export interface Lot {
  id: number;
  lot_number: string;
  product_id: number;
  supplier_id: number | null;
  receipt_operation_id: number | null;
  production_operation_id: number | null;
  product_type: ProductType;
  arrival_date: string | null;
  roast_date: string | null;
  expiry_date: string | null;
  initial_qty: number;
  remaining_qty: number;
  status: LotStatus;
  harvest_year: number | null;
  process: string | null;
  cupping_score: number | null;
  roast_profile: string | null;
  notes: string | null;
  created_at: string;
  // Warehouse
  warehouse_id: number | null;
  // Joined
  product_name?: string;
  sku?: string;
  unit?: string;
  shelf_life_days?: number | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  warehouse_name?: string | null;
  warehouse_code?: string | null;
}

export interface LotDetail extends Lot {
  receipt_reference: string | null;
  production_reference: string | null;
  parentLots: LotLineage[];
  childLots: LotLineage[];
  moves: LotStockMove[];
}

export interface LotLineage {
  id: number;
  lot_number: string;
  product_type: ProductType;
  remaining_qty: number;
  roast_date?: string | null;
  product_name: string;
  sku: string;
}

export interface LotStockMove {
  id: number;
  operation_id: number;
  lot_id: number | null;
  product_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  qty: number;
  reason: string | null;
  created_at: string;
  reference: string;
  operation_type: string;
  operation_status: string;
  from_location_name: string | null;
  to_location_name: string | null;
}

export interface LotSearchResult {
  id: number;
  lot_number: string;
  remaining_qty: number;
  expiry_date: string | null;
  product_type: ProductType;
  roast_date: string | null;
  status: LotStatus;
  harvest_year: number | null;
  process: string | null;
  product_name: string;
  sku: string;
  unit: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  warehouse_code: string | null;
}

// ── Operations (base) ─────────────────────────────────────────────────

export interface Operation {
  id: number;
  reference: string;
  type: OperationType;
  status: Status;
  warehouse_id: number;
  destination_warehouse_id: number | null;
  supplier_id: number | null;
  customer: string | null;
  scheduled_date: string | null;
  roast_date: string | null;
  roast_profile: string | null;
  reason: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  validated_at: string | null;
  // Joined
  warehouse_name: string;
  warehouse_code: string;
  created_by_name: string;
  supplier_name?: string | null;
  supplier_code?: string | null; // only on detail endpoint
  destination_warehouse_name?: string | null;
  destination_warehouse_code?: string | null;
  // Lines (only on detail endpoint, shape varies by type)
  lines?: ReceiptLine[] | DeliveryLine[] | ProductionInput[] | AdjustmentLine[] | TransferLine[];
}

// ── Receipt Lines ─────────────────────────────────────────────────────

export interface ReceiptLine {
  id: number;
  operation_id: number;
  product_id: number;
  product_type: ProductType;
  demand_qty: number;
  done_qty: number;
  harvest_year: number | null;
  process: string | null;
  cupping_score: number | null;
  roast_date: string | null;
  lot_notes: string | null;
  // Joined
  product_name: string;
  sku: string;
  unit: string;
}

// ── Delivery Lines ────────────────────────────────────────────────────

export interface DeliveryLine {
  id: number;
  operation_id: number;
  product_id: number;
  demand_qty: number;
  done_qty: number;
  // Joined
  product_name: string;
  sku: string;
  unit: string;
  // Nested
  allocations: DeliveryLotAllocation[];
}

export interface DeliveryLotAllocation {
  id: number;
  delivery_line_id: number;
  lot_id: number;
  qty: number;
  lot_number: string;
  lot_remaining: number;
  expiry_date: string | null;
}

// ── Production Lines ──────────────────────────────────────────────────

export interface ProductionInput {
  id: number;
  operation_id: number;
  lot_id: number;
  qty: number;
  expected_yield: number | null;
  actual_yield: number | null;
  // Joined
  lot_number: string;
  lot_remaining: number;
  product_name: string;
  sku: string;
  unit: string;
  product_type: ProductType;
}

// ── Adjustment Lines ──────────────────────────────────────────────────

export interface AdjustmentLine {
  id: number;
  operation_id: number;
  lot_id: number;
  system_qty: number;
  actual_qty: number;
  notes: string | null;
  // Joined
  lot_number: string;
  lot_remaining: number;
  product_name: string;
  sku: string;
  unit: string;
}

// ── Transfer Lines ────────────────────────────────────────────────────

export interface TransferLine {
  id: number;
  operation_id: number;
  lot_id: number;
  qty: number;
  notes: string | null;
  // Joined
  lot_number: string;
  lot_remaining: number;
  product_type: ProductType;
  expiry_date: string | null;
  product_name: string;
  sku: string;
  unit: string;
}

// ── Stock Moves ───────────────────────────────────────────────────────

export interface StockMove {
  id: number;
  operation_id: number;
  lot_id: number | null;
  product_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  qty: number;
  reason: string | null;
  created_at: string;
  // Joined
  reference: string;
  operation_type: string;
  operation_status: string;
  product_name: string;
  sku: string;
  unit: string;
  lot_number: string | null;
  from_location_name: string | null;
  to_location_name: string | null;
  from_warehouse_name: string | null;
  to_warehouse_name: string | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────

export interface DashboardKPIs {
  greenStock: number;
  roastedStock: number;
  expiringSoon: number;
  pendingArrivals: number;
  lowStockItems: number;
  avgFreshness: number | null;
}

export interface FreshnessLot extends Lot {
  freshness_pct: number;
  freshness_status: FreshnessStatus;
}

export interface PendingArrival {
  id: number;
  reference: string;
  status: Status;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  warehouse_name: string;
  supplier_name: string | null;
  line_count: number;
  total_demand: number;
}

// ── Availability Check ────────────────────────────────────────────────

export interface AvailabilityIssue {
  productId: number;
  productName: string;
  sku: string;
  demandQty: number;
  availableQty: number;
  shortfall: number;
}

// ── FIFO Lot Suggestions ──────────────────────────────────────────────

export interface LotSuggestion {
  lot_id: number;
  lot_number: string;
  qty: number;
  remaining_qty: number;
  expiry_date: string | null;
  requires_transfer?: boolean;
  source_warehouse_id?: number;
  source_warehouse_name?: string;
}

export interface LotSuggestionResponse {
  demand_qty: number;
  suggestions: LotSuggestion[];
  cross_warehouse_suggestions?: LotSuggestion[];
  shortfall: number;
}
