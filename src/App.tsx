import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { PageLayout } from './components/layout';
import { Login } from './pages/Login';
import { AcceptInvite } from './pages/AcceptInvite';
import { Dashboard } from './pages/Dashboard';

// Error boundary to catch runtime crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    // @ts-expect-error TS doesn't see inherited state with this tsconfig
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if ((this as any).state.hasError) {
      const err = (this as any).state.error as Error | null;
      return (
        <div className="p-8 border border-red-500 m-4">
          <h2 className="text-lg font-bold text-red-600">Something crashed</h2>
          <pre className="text-xs mt-2 whitespace-pre-wrap text-red-800">
            {err?.message}{'\n'}{err?.stack}
          </pre>
          <button
            className="mt-4 px-3 py-1 border border-black text-sm"
            onClick={() => (this as any).setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// Operations — Receipts
import { ReceiptsList } from './pages/ReceiptsList';
import { ReceiptNew } from './pages/ReceiptNew';
import { ReceiptDetail } from './pages/ReceiptDetail';

// Operations — Deliveries
import { DeliveriesList } from './pages/DeliveriesList';
import { DeliveryNew } from './pages/DeliveryNew';
import { DeliveryDetail } from './pages/DeliveryDetail';

// Operations — Production
import { ProductionList } from './pages/ProductionList';
import { ProductionNew } from './pages/ProductionNew';
import { ProductionDetail } from './pages/ProductionDetail';

// Operations — Adjustments
import { AdjustmentsList } from './pages/AdjustmentsList';
import { AdjustmentNew } from './pages/AdjustmentNew';
import { AdjustmentDetail } from './pages/AdjustmentDetail';

// Operations — Transfers
import { TransfersList } from './pages/TransfersList';
import { TransferNew } from './pages/TransferNew';
import { TransferDetail } from './pages/TransferDetail';

// Inventory
import { MoveHistory } from './pages/MoveHistory';
import { ProductsList } from './pages/ProductsList';

// Settings
import { WarehousesList } from './pages/WarehousesList';
import { LocationsList } from './pages/LocationsList';
import { SuppliersList } from './pages/SuppliersList';

// Users
import { UsersList } from './pages/UsersList';
import { UserEdit } from './pages/UserEdit';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <PageLayout>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* Receipts */}
          <Route path="/receipts" element={<ReceiptsList />} />
          <Route path="/receipts/new" element={<ReceiptNew />} />
          <Route path="/receipts/:id" element={<ReceiptDetail />} />

          {/* Deliveries */}
          <Route path="/deliveries" element={<DeliveriesList />} />
          <Route path="/deliveries/new" element={<DeliveryNew />} />
          <Route path="/deliveries/:id" element={<DeliveryDetail />} />

          {/* Production */}
          <Route path="/production" element={<ProductionList />} />
          <Route path="/production/new" element={<ProductionNew />} />
          <Route path="/production/:id" element={<ProductionDetail />} />

          {/* Adjustments */}
          <Route path="/adjustments" element={<AdjustmentsList />} />
          <Route path="/adjustments/new" element={<AdjustmentNew />} />
          <Route path="/adjustments/:id" element={<AdjustmentDetail />} />

          {/* Transfers */}
          <Route path="/transfers" element={<TransfersList />} />
          <Route path="/transfers/new" element={<TransferNew />} />
          <Route path="/transfers/:id" element={<TransferDetail />} />

          {/* Inventory */}
          <Route path="/moves" element={<MoveHistory />} />
          <Route path="/products" element={<ProductsList />} />

          {/* Settings */}
          <Route path="/settings/warehouses" element={<WarehousesList />} />
          <Route path="/settings/locations" element={<LocationsList />} />
          <Route path="/settings/suppliers" element={<SuppliersList />} />
          <Route path="/settings/users" element={<UsersList />} />
          <Route path="/settings/users/:id" element={<UserEdit />} />

          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/accept-invite" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </PageLayout>
    </BrowserRouter>
  );
}
