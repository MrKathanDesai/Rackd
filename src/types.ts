export type Status = 'Processing' | 'Shipped' | 'Completed' | 'Pending' | 'Delayed' | 'Ready' | 'Draft' | 'Waiting' | 'Cancelled' | 'In Transit';

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
  thumbnail?: string;
}

export interface Operation {
  id: string;
  reference: string;
  type: 'Receipt' | 'Delivery' | 'Transfer' | 'Return';
  status: Status;
  date: string;
  warehouse: string;
  items: number;
}

export interface Receipt {
  id: string;
  reference: string;
  supplier: string;
  location: string;
  arrivalDate: string;
  status: Status;
  destination: string;
  items: number;
}

export interface Delivery {
  id: string;
  reference: string;
  customer: string;
  destination: string;
  shipDate: string;
  status: Status;
  sourceWh: string;
  items: number;
}

export interface Move {
  id: string;
  reference: string;
  date: string;
  from: string;
  to: string;
  product: string;
  qty: number;
  unit: string;
  type: 'Internal' | 'Inbound' | 'Outbound';
  status: 'Success' | 'Pending' | 'Processing';
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
}
