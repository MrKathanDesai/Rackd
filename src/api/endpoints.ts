import api from './client';
import type {
  User,
  UserDetail,
  Product,
  ProductDetail,
  Warehouse,
  Location,
  Supplier,
  Operation,
  ReceiptLine,
  DeliveryLine,
  DeliveryLotAllocation,
  ProductionInput,
  AdjustmentLine,
  TransferLine,
  StockMove,
  DashboardKPIs,
  FreshnessLot,
  PendingArrival,
  Lot,
  LotDetail,
  LotSearchResult,
  LotSuggestionResponse,
  OperationType,
  AvailabilityIssue,
  ProductType,
  LotStatus,
  UserRole,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/login', { email, password });
  return data.user;
}

export async function sendLoginOtp(email: string): Promise<void> {
  await api.post('/auth/otp/send', { email });
}

export async function loginWithOtp(email: string, code: string): Promise<User> {
  const { data } = await api.post('/auth/otp/login', { email, code });
  return data.user;
}

export async function acceptInvite(
  email: string,
  code: string,
  name: string,
  password: string
): Promise<User> {
  const { data } = await api.post('/auth/accept-invite', { email, code, name, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.user;
}

// ── Users ─────────────────────────────────────────────────────────────

export async function getUsers(params?: {
  role?: UserRole;
  status?: string;
  search?: string;
}): Promise<UserDetail[]> {
  const { data } = await api.get('/users', { params });
  return data;
}

export async function getUser(id: number): Promise<UserDetail> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function inviteUser(body: {
  email: string;
  name?: string;
  role: UserRole;
}): Promise<UserDetail> {
  const { data } = await api.post('/users/invite', body);
  return data;
}

export async function updateUser(
  id: number,
  body: { name?: string; role?: UserRole }
): Promise<UserDetail> {
  const { data } = await api.put(`/users/${id}`, body);
  return data;
}

export async function deactivateUser(id: number): Promise<UserDetail> {
  const { data } = await api.post(`/users/${id}/deactivate`);
  return data;
}

export async function reactivateUser(id: number): Promise<UserDetail> {
  const { data } = await api.post(`/users/${id}/reactivate`);
  return data;
}

export async function resendInvite(id: number): Promise<void> {
  await api.post(`/users/${id}/resend-invite`);
}

export async function revokeInvite(id: number): Promise<void> {
  await api.post(`/users/${id}/revoke-invite`);
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await api.post(`/users/${id}/reset-password`, { newPassword });
}

export async function setUserPermissions(
  id: number,
  permissions: Array<{ permission: string; granted: boolean }>
): Promise<UserDetail> {
  const { data } = await api.put(`/users/${id}/permissions`, { permissions });
  return data;
}

export async function resetUserPermissions(id: number): Promise<UserDetail> {
  const { data } = await api.post(`/users/${id}/reset-permissions`);
  return data;
}

export async function getRoleDefaults(): Promise<{
  permissions: string[];
  defaults: Record<string, Record<string, boolean>>;
}> {
  const { data } = await api.get('/users/meta/role-defaults');
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────

export async function getDashboardKPIs(params?: { warehouse_id?: number }): Promise<DashboardKPIs> {
  const { data } = await api.get('/dashboard/kpis', { params });
  return data;
}

export async function getFreshnessBoard(params?: { warehouse_id?: number }): Promise<FreshnessLot[]> {
  const { data } = await api.get('/dashboard/freshness-board', { params });
  return data;
}

export async function getPendingArrivals(params?: { warehouse_id?: number }): Promise<PendingArrival[]> {
  const { data } = await api.get('/dashboard/pending-arrivals', { params });
  return data;
}

export async function getGreenBeanInventory(params?: { warehouse_id?: number }): Promise<Lot[]> {
  const { data } = await api.get('/dashboard/green-bean-inventory', { params });
  return data;
}

// ── Products ──────────────────────────────────────────────────────────

export async function getProducts(params?: {
  search?: string;
  supplier_id?: number;
}): Promise<Product[]> {
  const { data } = await api.get('/products', { params });
  return data;
}

export async function getProduct(id: number): Promise<ProductDetail> {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function createProduct(body: {
  name: string;
  sku: string;
  unit: string;
  category?: string;
  process?: string;
  origin?: string;
  reorder_pt?: number;
  shelf_life_days?: number;
  supplier_id?: number;
  notes?: string;
}): Promise<Product> {
  const { data } = await api.post('/products', body);
  return data;
}

export async function updateProduct(
  id: number,
  body: {
    name: string;
    sku: string;
    unit: string;
    category?: string;
    process?: string;
    origin?: string;
    reorder_pt?: number;
    shelf_life_days?: number;
    supplier_id?: number;
    notes?: string;
  }
): Promise<Product> {
  const { data } = await api.put(`/products/${id}`, body);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ── Suppliers ─────────────────────────────────────────────────────────

export async function getSuppliers(params?: {
  search?: string;
  type?: string;
}): Promise<Supplier[]> {
  const { data } = await api.get('/suppliers', { params });
  return data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const { data } = await api.get(`/suppliers/${id}`);
  return data;
}

export async function createSupplier(body: {
  name: string;
  code: string;
  type?: string;
  origin_country?: string;
  region?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<Supplier> {
  const { data } = await api.post('/suppliers', body);
  return data;
}

export async function updateSupplier(
  id: number,
  body: {
    name: string;
    code: string;
    type?: string;
    origin_country?: string;
    region?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }
): Promise<Supplier> {
  const { data } = await api.put(`/suppliers/${id}`, body);
  return data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}

// ── Lots ──────────────────────────────────────────────────────────────

export async function getLots(params?: {
  product_type?: ProductType;
  status?: LotStatus;
  product_id?: number;
  supplier_id?: number;
  warehouse_id?: number;
  search?: string;
}): Promise<Lot[]> {
  const { data } = await api.get('/lots', { params });
  return data;
}

export async function getLot(id: number): Promise<LotDetail> {
  const { data } = await api.get(`/lots/${id}`);
  return data;
}

export async function searchLots(params?: {
  product_type?: ProductType;
  product_id?: number;
  status?: LotStatus;
  warehouse_id?: number;
  q?: string;
}): Promise<LotSearchResult[]> {
  const { data } = await api.get('/lots/search', { params });
  return data;
}

// ── Operations ────────────────────────────────────────────────────────

export async function getOperations(params?: {
  type?: OperationType;
  status?: string;
  warehouse_id?: number;
}): Promise<Operation[]> {
  const { data } = await api.get('/operations', { params });
  return data;
}

export async function getOperation(id: number): Promise<Operation> {
  const { data } = await api.get(`/operations/${id}`);
  return data;
}

export async function createOperation(body: {
  type: OperationType;
  warehouse_id: number;
  destination_warehouse_id?: number;
  supplier_id?: number;
  customer?: string;
  scheduled_date?: string;
  roast_date?: string;
  roast_profile?: string;
  reason?: string;
  notes?: string;
}): Promise<Operation> {
  const { data } = await api.post('/operations', body);
  return data;
}

export async function updateOperation(
  id: number,
  body: {
    warehouse_id?: number;
    destination_warehouse_id?: number;
    supplier_id?: number;
    customer?: string;
    scheduled_date?: string;
    roast_date?: string;
    roast_profile?: string;
    reason?: string;
    notes?: string;
  }
): Promise<Operation> {
  const { data } = await api.put(`/operations/${id}`, body);
  return data;
}

export async function deleteOperation(id: number, force?: boolean): Promise<void> {
  await api.delete(`/operations/${id}`, { params: force ? { force: 'true' } : undefined });
}

// ── Operation Lines ───────────────────────────────────────────────────

// Receipt line
export async function addReceiptLine(
  operationId: number,
  body: {
    product_id: number;
    demand_qty: number;
    product_type?: 'green' | 'roasted';
    harvest_year?: number;
    process?: string;
    cupping_score?: number;
    roast_date?: string;
    lot_notes?: string;
  }
): Promise<ReceiptLine> {
  const { data } = await api.post(`/operations/${operationId}/lines`, body);
  return data;
}

// Delivery line
export async function addDeliveryLine(
  operationId: number,
  body: { product_id: number; demand_qty: number }
): Promise<DeliveryLine> {
  const { data } = await api.post(`/operations/${operationId}/lines`, body);
  return data;
}

// Production input line
export async function addProductionInput(
  operationId: number,
  body: { lot_id: number; qty: number; expected_yield?: number }
): Promise<ProductionInput> {
  const { data } = await api.post(`/operations/${operationId}/lines`, body);
  return data;
}

// Adjustment line
export async function addAdjustmentLine(
  operationId: number,
  body: { lot_id: number; actual_qty: number; notes?: string }
): Promise<AdjustmentLine> {
  const { data } = await api.post(`/operations/${operationId}/lines`, body);
  return data;
}

// Transfer line
export async function addTransferLine(
  operationId: number,
  body: { lot_id: number; qty: number; notes?: string }
): Promise<TransferLine> {
  const { data } = await api.post(`/operations/${operationId}/lines`, body);
  return data;
}

// Generic update line (works for any type)
export async function updateOperationLine(
  operationId: number,
  lineId: number,
  body: Record<string, unknown>
): Promise<unknown> {
  const { data } = await api.put(`/operations/${operationId}/lines/${lineId}`, body);
  return data;
}

// Delete line
export async function deleteOperationLine(
  operationId: number,
  lineId: number
): Promise<void> {
  await api.delete(`/operations/${operationId}/lines/${lineId}`);
}

// ── Delivery Lot Allocations ──────────────────────────────────────────

export async function setDeliveryAllocations(
  operationId: number,
  lineId: number,
  allocations: Array<{ lot_id: number; qty: number }>
): Promise<DeliveryLotAllocation[]> {
  const { data } = await api.put(
    `/operations/${operationId}/lines/${lineId}/allocations`,
    { allocations }
  );
  return data;
}

export async function getLotSuggestions(
  operationId: number,
  lineId: number
): Promise<LotSuggestionResponse> {
  const { data } = await api.get(
    `/operations/${operationId}/lines/${lineId}/lot-suggestions`
  );
  return data;
}

// ── State Transitions ─────────────────────────────────────────────────

export async function confirmOperation(id: number): Promise<Operation> {
  const { data } = await api.post(`/operations/${id}/confirm`);
  return data;
}

export async function checkAvailability(
  id: number
): Promise<{ operation: Operation; availabilityIssues: AvailabilityIssue[] | null }> {
  const { data } = await api.post(`/operations/${id}/check-availability`);
  return data;
}

export async function validateOperation(id: number): Promise<Operation> {
  const { data } = await api.post(`/operations/${id}/validate`);
  return data;
}

export async function cancelOperation(id: number): Promise<Operation> {
  const { data } = await api.post(`/operations/${id}/cancel`);
  return data;
}

// ── Stock Moves ───────────────────────────────────────────────────────

export async function getStockMoves(params?: {
  product_id?: number;
  lot_id?: number;
  warehouse_id?: number;
  from?: string;
  to?: string;
  type?: OperationType;
  reason?: string;
}): Promise<StockMove[]> {
  const { data } = await api.get('/stock-moves', { params });
  return data;
}

// ── Warehouses ────────────────────────────────────────────────────────

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get('/warehouses');
  return data;
}

export async function getWarehouse(id: number): Promise<Warehouse> {
  const { data } = await api.get(`/warehouses/${id}`);
  return data;
}

export async function createWarehouse(body: {
  name: string;
  code: string;
  address?: string;
  notes?: string;
}): Promise<Warehouse> {
  const { data } = await api.post('/warehouses', body);
  return data;
}

export async function updateWarehouse(
  id: number,
  body: { name: string; code: string; address?: string; notes?: string }
): Promise<Warehouse> {
  const { data } = await api.put(`/warehouses/${id}`, body);
  return data;
}

export async function deleteWarehouse(id: number): Promise<void> {
  await api.delete(`/warehouses/${id}`);
}

export async function getWarehouseLocations(warehouseId: number): Promise<Location[]> {
  const { data } = await api.get(`/warehouses/${warehouseId}/locations`);
  return data;
}

// ── Locations ─────────────────────────────────────────────────────────

export async function getLocations(params?: {
  warehouse_id?: number;
}): Promise<Location[]> {
  const { data } = await api.get('/locations', { params });
  return data;
}

export async function getLocation(id: number): Promise<Location> {
  const { data } = await api.get(`/locations/${id}`);
  return data;
}

export async function createLocation(body: {
  name: string;
  warehouse_id: number;
  is_default?: boolean;
  notes?: string;
}): Promise<Location> {
  const { data } = await api.post('/locations', body);
  return data;
}

export async function updateLocation(
  id: number,
  body: { name: string; is_default?: boolean; notes?: string }
): Promise<Location> {
  const { data } = await api.put(`/locations/${id}`, body);
  return data;
}

export async function deleteLocation(id: number): Promise<void> {
  await api.delete(`/locations/${id}`);
}
