export type Status = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';

export type OperationType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  uom: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderPt: number;
}

export interface Location {
  id: string;
  name: string;
  type: 'stock' | 'transit' | 'customer' | 'supplier';
  warehouseId?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
}

export interface OperationLine {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  uom: string;
}

export interface Operation {
  id: string;
  reference: string;
  type: OperationType;
  status: Status;
  partner?: string;
  scheduledDate: string;
  sourceLocationId: string;
  sourceLocationName: string;
  destLocationId: string;
  destLocationName: string;
  notes?: string;
  lines: OperationLine[];
  createdAt: string;
  createdBy: string;
}

export interface StockMove {
  id: string;
  date: string;
  operationId: string;
  operationReference: string;
  productId: string;
  productName: string;
  productSku: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  quantity: number;
  uom: string;
  user: string;
}
