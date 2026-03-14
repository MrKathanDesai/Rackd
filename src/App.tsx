import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageLayout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { ReceiptsList } from './pages/ReceiptsList';
import { ReceiptDetail } from './pages/ReceiptDetail';
import { DeliveriesList } from './pages/DeliveriesList';
import { DeliveryDetail } from './pages/DeliveryDetail';
import { TransfersList } from './pages/TransfersList';
import { TransferDetail } from './pages/TransferDetail';
import { AdjustmentsList } from './pages/AdjustmentsList';
import { AdjustmentDetail } from './pages/AdjustmentDetail';
import { MoveHistory } from './pages/MoveHistory';
import { ProductsList } from './pages/ProductsList';
import { WarehousesList } from './pages/WarehousesList';
import { LocationsList } from './pages/LocationsList';

export default function App() {
  return (
    <BrowserRouter>
      <PageLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/receipts" element={<ReceiptsList />} />
          <Route path="/receipts/:id" element={<ReceiptDetail />} />
          
          <Route path="/deliveries" element={<DeliveriesList />} />
          <Route path="/deliveries/:id" element={<DeliveryDetail />} />
          
          <Route path="/transfers" element={<TransfersList />} />
          <Route path="/transfers/:id" element={<TransferDetail />} />
          
          <Route path="/adjustments" element={<AdjustmentsList />} />
          <Route path="/adjustments/:id" element={<AdjustmentDetail />} />
          
          <Route path="/moves" element={<MoveHistory />} />
          <Route path="/products" element={<ProductsList />} />
          
          <Route path="/settings/warehouses" element={<WarehousesList />} />
          <Route path="/settings/locations" element={<LocationsList />} />
        </Routes>
      </PageLayout>
    </BrowserRouter>
  );
}
