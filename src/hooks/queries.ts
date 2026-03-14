import { useQuery } from '@tanstack/react-query';
import * as api from '../api/endpoints';
import type { OperationType, ProductType, LotStatus } from '../types';

// ── Dashboard ─────────────────────────────────────────────────────────

export function useDashboardKPIs(warehouse_id?: number) {
  const params = warehouse_id ? { warehouse_id } : undefined;
  return useQuery({
    queryKey: ['dashboard', 'kpis', warehouse_id],
    queryFn: () => api.getDashboardKPIs(params),
  });
}

export function useFreshnessBoard(warehouse_id?: number) {
  const params = warehouse_id ? { warehouse_id } : undefined;
  return useQuery({
    queryKey: ['dashboard', 'freshness-board', warehouse_id],
    queryFn: () => api.getFreshnessBoard(params),
  });
}

export function usePendingArrivals(warehouse_id?: number) {
  const params = warehouse_id ? { warehouse_id } : undefined;
  return useQuery({
    queryKey: ['dashboard', 'pending-arrivals', warehouse_id],
    queryFn: () => api.getPendingArrivals(params),
  });
}

export function useGreenBeanInventory(warehouse_id?: number) {
  const params = warehouse_id ? { warehouse_id } : undefined;
  return useQuery({
    queryKey: ['dashboard', 'green-bean-inventory', warehouse_id],
    queryFn: () => api.getGreenBeanInventory(params),
  });
}

// ── Products ──────────────────────────────────────────────────────────

export function useProducts(params?: { search?: string; supplier_id?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => api.getProducts(params),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.getProduct(id),
    enabled: !!id,
  });
}

// ── Suppliers ─────────────────────────────────────────────────────────

export function useSuppliers(params?: { search?: string; type?: string }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => api.getSuppliers(params),
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => api.getSupplier(id),
    enabled: !!id,
  });
}

// ── Lots ──────────────────────────────────────────────────────────────

export function useLots(params?: {
  product_type?: ProductType;
  status?: LotStatus;
  product_id?: number;
  supplier_id?: number;
  warehouse_id?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['lots', params],
    queryFn: () => api.getLots(params),
  });
}

export function useLot(id: number) {
  return useQuery({
    queryKey: ['lots', id],
    queryFn: () => api.getLot(id),
    enabled: !!id,
  });
}

export function useLotSearch(params?: {
  product_type?: ProductType;
  product_id?: number;
  status?: LotStatus;
  warehouse_id?: number;
  q?: string;
}) {
  return useQuery({
    queryKey: ['lots', 'search', params],
    queryFn: () => api.searchLots(params),
  });
}

// ── Operations ────────────────────────────────────────────────────────

export function useOperations(type?: OperationType, status?: string) {
  return useQuery({
    queryKey: ['operations', { type, status }],
    queryFn: () =>
      api.getOperations({ type, status: status === 'all' ? undefined : status }),
  });
}

export function useOperation(id: number) {
  return useQuery({
    queryKey: ['operations', id],
    queryFn: () => api.getOperation(id),
    enabled: !!id,
  });
}

// ── Lot Suggestions (FIFO) ────────────────────────────────────────────

export function useLotSuggestions(operationId: number, lineId: number) {
  return useQuery({
    queryKey: ['operations', operationId, 'lines', lineId, 'lot-suggestions'],
    queryFn: () => api.getLotSuggestions(operationId, lineId),
    enabled: !!operationId && !!lineId,
  });
}

// ── Stock Moves ───────────────────────────────────────────────────────

export function useStockMoves(params?: Parameters<typeof api.getStockMoves>[0]) {
  return useQuery({
    queryKey: ['stock-moves', params],
    queryFn: () => api.getStockMoves(params),
  });
}

// ── Warehouses ────────────────────────────────────────────────────────

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: api.getWarehouses,
  });
}

export function useWarehouse(id: number) {
  return useQuery({
    queryKey: ['warehouses', id],
    queryFn: () => api.getWarehouse(id),
    enabled: !!id,
  });
}

export function useWarehouseLocations(warehouseId: number) {
  return useQuery({
    queryKey: ['warehouses', warehouseId, 'locations'],
    queryFn: () => api.getWarehouseLocations(warehouseId),
    enabled: !!warehouseId,
  });
}

// ── Locations ─────────────────────────────────────────────────────────

export function useLocations(params?: { warehouse_id?: number }) {
  return useQuery({
    queryKey: ['locations', params],
    queryFn: () => api.getLocations(params),
  });
}

// ── Users ─────────────────────────────────────────────────────────────

export function useUsers(params?: { role?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.getUsers(params as any),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.getUser(id),
    enabled: !!id,
  });
}

export function useRoleDefaults() {
  return useQuery({
    queryKey: ['users', 'role-defaults'],
    queryFn: api.getRoleDefaults,
    staleTime: Infinity,
  });
}
