import { Product, Warehouse, Location, Operation, StockMove } from './types';

export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'Main Distribution Center', code: 'MDC-01', address: '123 Logistics Way, Chicago, IL' },
  { id: 'wh-2', name: 'North Regional Hub', code: 'NRH-02', address: '456 Supply Road, Seattle, WA' },
];

export const MOCK_LOCATIONS: Location[] = [
  { id: 'loc-stock-1', name: 'Stock / Main Warehouse', type: 'stock', warehouseId: 'wh-1' },
  { id: 'loc-transit-1', name: 'Transit / In Transit', type: 'transit' },
  { id: 'loc-vendor-1', name: 'Vendor / Steel Corp', type: 'supplier' },
  { id: 'loc-customer-1', name: 'Customer / BuildRight', type: 'customer' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    name: 'Industrial Grade Steel Beam',
    sku: 'ST-BM-200-H',
    category: 'Structural Steel',
    uom: 'Units',
    onHand: 450,
    available: 420,
    reserved: 30,
    reorderPt: 100,
  },
  {
    id: 'p-2',
    name: 'Precision Ball Bearing 15mm',
    sku: 'BR-PB-015',
    category: 'Mechanical Components',
    uom: 'Boxes',
    onHand: 1200,
    available: 1150,
    reserved: 50,
    reorderPt: 500,
  },
  {
    id: 'p-3',
    name: 'Hydraulic Fluid Type-A',
    sku: 'HF-TA-05G',
    category: 'Consumables',
    uom: 'Gallons',
    onHand: 85,
    available: 85,
    reserved: 0,
    reorderPt: 20,
  },
];

export const MOCK_OPERATIONS: Operation[] = [
  {
    id: 'op-1',
    reference: 'REC/00001',
    type: 'receipt',
    status: 'ready',
    partner: 'Steel Corp International',
    scheduledDate: '2024-03-15',
    sourceLocationId: 'loc-vendor-1',
    sourceLocationName: 'Vendor / Steel Corp',
    destLocationId: 'loc-stock-1',
    destLocationName: 'Stock / Main Warehouse',
    notes: 'Urgent delivery for Project Alpha',
    lines: [
      { id: 'line-1', productId: 'p-1', productName: 'Industrial Grade Steel Beam', productSku: 'ST-BM-200-H', quantity: 50, uom: 'Units' },
      { id: 'line-2', productId: 'p-2', productName: 'Precision Ball Bearing 15mm', productSku: 'BR-PB-015', quantity: 200, uom: 'Boxes' },
    ],
    createdAt: '2024-03-10T08:30:00Z',
    createdBy: 'John Doe',
  },
  {
    id: 'op-2',
    reference: 'DEL/00001',
    type: 'delivery',
    status: 'draft',
    partner: 'BuildRight Construction',
    scheduledDate: '2024-03-16',
    sourceLocationId: 'loc-stock-1',
    sourceLocationName: 'Stock / Main Warehouse',
    destLocationId: 'loc-customer-1',
    destLocationName: 'Customer / BuildRight',
    lines: [
      { id: 'line-3', productId: 'p-1', productName: 'Industrial Grade Steel Beam', productSku: 'ST-BM-200-H', quantity: 20, uom: 'Units' },
    ],
    createdAt: '2024-03-12T10:00:00Z',
    createdBy: 'Jane Smith',
  },
  {
    id: 'op-3',
    reference: 'TRF/00001',
    type: 'transfer',
    status: 'done',
    scheduledDate: '2024-03-10',
    sourceLocationId: 'loc-stock-1',
    sourceLocationName: 'Stock / Main Warehouse',
    destLocationId: 'loc-transit-1',
    destLocationName: 'Transit / In Transit',
    lines: [
      { id: 'line-4', productId: 'p-3', productName: 'Hydraulic Fluid Type-A', productSku: 'HF-TA-05G', quantity: 10, uom: 'Gallons' },
    ],
    createdAt: '2024-03-08T14:00:00Z',
    createdBy: 'John Doe',
  },
];

export const MOCK_MOVES: StockMove[] = [
  {
    id: 'move-1',
    date: '2024-03-10T14:30:00Z',
    operationId: 'op-3',
    operationReference: 'TRF/00001',
    productId: 'p-3',
    productName: 'Hydraulic Fluid Type-A',
    productSku: 'HF-TA-05G',
    fromLocationId: 'loc-stock-1',
    fromLocationName: 'Stock / Main Warehouse',
    toLocationId: 'loc-transit-1',
    toLocationName: 'Transit / In Transit',
    quantity: 10,
    uom: 'Gallons',
    user: 'John Doe',
  },
];
