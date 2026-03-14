import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/endpoints';

// ── Products ──────────────────────────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateProduct>[1] & { id: number }) =>
      api.updateProduct(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ── Suppliers ─────────────────────────────────────────────────────────

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateSupplier>[1] & { id: number }) =>
      api.updateSupplier(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

// ── Operations ────────────────────────────────────────────────────────

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createOperation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateOperation>[1] & { id: number }) =>
      api.updateOperation(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: number; force?: boolean }) => api.deleteOperation(id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
      qc.invalidateQueries({ queryKey: ['stock-moves'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ── Operation Lines ───────────────────────────────────────────────────

export function useAddReceiptLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      ...body
    }: Parameters<typeof api.addReceiptLine>[1] & { operationId: number }) =>
      api.addReceiptLine(operationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useAddDeliveryLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      ...body
    }: { operationId: number; product_id: number; demand_qty: number }) =>
      api.addDeliveryLine(operationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useAddProductionInput() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      ...body
    }: { operationId: number; lot_id: number; qty: number; expected_yield?: number }) =>
      api.addProductionInput(operationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useAddAdjustmentLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      ...body
    }: { operationId: number; lot_id: number; actual_qty: number; notes?: string }) =>
      api.addAdjustmentLine(operationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useAddTransferLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      ...body
    }: { operationId: number; lot_id: number; qty: number; notes?: string }) =>
      api.addTransferLine(operationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useUpdateOperationLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      lineId,
      ...body
    }: {
      operationId: number;
      lineId: number;
      [key: string]: unknown;
    }) => api.updateOperationLine(operationId, lineId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

export function useDeleteOperationLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ operationId, lineId }: { operationId: number; lineId: number }) =>
      api.deleteOperationLine(operationId, lineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

// ── Delivery Lot Allocations ──────────────────────────────────────────

export function useSetDeliveryAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      operationId,
      lineId,
      allocations,
    }: {
      operationId: number;
      lineId: number;
      allocations: Array<{ lot_id: number; qty: number }>;
    }) => api.setDeliveryAllocations(operationId, lineId, allocations),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations'] }),
  });
}

// ── State Transitions ─────────────────────────────────────────────────

export function useConfirmOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.confirmOperation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCheckAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.checkAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useValidateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.validateOperation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['stock-moves'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['lots'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.cancelOperation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ── Warehouses ────────────────────────────────────────────────────────

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createWarehouse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateWarehouse>[1] & { id: number }) =>
      api.updateWarehouse(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteWarehouse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}

// ── Locations ─────────────────────────────────────────────────────────

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Parameters<typeof api.updateLocation>[1] & { id: number }) =>
      api.updateLocation(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────────

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.inviteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; role?: string }) =>
      api.updateUser(id, body as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.resendInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      api.resetUserPassword(id, newPassword),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useSetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      permissions,
    }: {
      id: number;
      permissions: Array<{ permission: string; granted: boolean }>;
    }) => api.setUserPermissions(id, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.resetUserPermissions,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
