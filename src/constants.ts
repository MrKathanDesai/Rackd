import { Product, Warehouse, Receipt, Delivery, Move } from './types';

export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: 'Main Distribution Center', code: 'MDC-01', address: '123 Logistics Way, Chicago, IL' },
  { id: 'wh-2', name: 'North Regional Hub', code: 'NRH-02', address: '456 Supply Road, Seattle, WA' },
  { id: 'wh-3', name: 'East Coast Annex', code: 'ECA-03', address: '789 Port Blvd, Newark, NJ' },
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
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=200&h=200'
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
    thumbnail: 'https://images.unsplash.com/photo-1530124560676-587cad3223c1?auto=format&fit=crop&q=80&w=200&h=200'
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
    thumbnail: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'p-4',
    name: 'Heavy Duty Caster Wheel',
    sku: 'CW-HD-008',
    category: 'Hardware',
    uom: 'Units',
    onHand: 320,
    available: 280,
    reserved: 40,
    reorderPt: 50,
    thumbnail: 'https://images.unsplash.com/photo-1589793907316-f94025b46850?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    id: 'p-5',
    name: 'Electric Motor 5HP',
    sku: 'EM-05HP-V3',
    category: 'Electrical',
    uom: 'Units',
    onHand: 12,
    available: 8,
    reserved: 4,
    reorderPt: 5,
    thumbnail: 'https://images.unsplash.com/photo-1590959651373-a39065200152?auto=format&fit=crop&q=80&w=200&h=200'
  }
];

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'rc-1',
    reference: 'PO-2024-001',
    supplier: 'Steel Corp International',
    location: 'Dock 4',
    arrivalDate: '2024-03-15',
    status: 'Ready',
    destination: 'MDC-01',
    items: 12
  },
  {
    id: 'rc-2',
    reference: 'PO-2024-002',
    supplier: 'Precision Parts Ltd',
    location: 'Dock 2',
    arrivalDate: '2024-03-14',
    status: 'Processing',
    destination: 'NRH-02',
    items: 45
  }
];

export const MOCK_DELIVERIES: Delivery[] = [
  {
    id: 'dl-1',
    reference: 'SO-2024-882',
    customer: 'BuildRight Construction',
    destination: 'Site A - Downtown',
    shipDate: '2024-03-16',
    status: 'Draft',
    sourceWh: 'MDC-01',
    items: 8
  },
  {
    id: 'dl-2',
    reference: 'SO-2024-885',
    customer: 'AutoWorks Mfg',
    destination: 'Factory 4, Detroit',
    shipDate: '2024-03-15',
    status: 'Ready',
    sourceWh: 'MDC-01',
    items: 156
  }
];

export const MOCK_MOVES: Move[] = [
  {
    id: 'mv-1',
    reference: 'IM-2024-012',
    date: '2024-03-14 10:30',
    from: 'Zone A-12',
    to: 'Zone B-04',
    product: 'ST-BM-200-H',
    qty: 20,
    unit: 'Units',
    type: 'Internal',
    status: 'Success'
  }
];
