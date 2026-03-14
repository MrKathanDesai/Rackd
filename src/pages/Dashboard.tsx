import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useDashboardKPIs,
  useFreshnessBoard,
  usePendingArrivals,
  useGreenBeanInventory,
  useWarehouses,
} from '../hooks/queries';
import { Badge, Button } from '../components/common';
import type { FreshnessLot, PendingArrival, Lot } from '../types';

// ── Freshness progress bar ────────────────────────────────────────────

function FreshnessBar({ pct, status }: { pct: number; status: string }) {
  const clampedPct = Math.min(pct, 100);
  const colorClass =
    status === 'green'
      ? 'bg-green-600'
      : status === 'amber'
        ? 'bg-amber-500'
        : status === 'red'
          ? 'bg-red-600'
          : 'bg-gray-400';

  return (
    <div className="w-full h-2 bg-gray-200 relative">
      <div
        className={`h-2 ${colorClass}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}

// ── Inline lot detail (expand) ────────────────────────────────────────

function LotExpandedRow({ lot }: { lot: FreshnessLot }) {
  return (
    <tr>
      <td colSpan={8} className="p-4 bg-gray-50 border-t border-b">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase block">Product</span>
            <span className="font-bold">{lot.product_name}</span>
            <span className="text-xs text-gray-400 ml-1">{lot.sku}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Roast Date</span>
            <span>{lot.roast_date ? new Date(lot.roast_date).toLocaleDateString() : '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Expiry Date</span>
            <span>{lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Shelf Life</span>
            <span>{lot.shelf_life_days ? `${lot.shelf_life_days} days` : '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Initial Qty</span>
            <span>{lot.initial_qty} {lot.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Remaining</span>
            <span className="font-bold">{lot.remaining_qty} {lot.unit}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Roast Profile</span>
            <span>{lot.roast_profile ?? '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Supplier</span>
            <span>{lot.supplier_name ?? '-'}</span>
          </div>
        </div>
        {lot.notes && (
          <div className="mt-2 text-sm">
            <span className="text-xs text-gray-400 uppercase">Notes: </span>
            {lot.notes}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);

  const { data: warehouses } = useWarehouses();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(warehouseId);
  const { data: freshnessLots, isLoading: freshnessLoading } = useFreshnessBoard(warehouseId);
  const { data: pendingArrivals, isLoading: arrivalsLoading } = usePendingArrivals(warehouseId);
  const { data: greenInventory, isLoading: greenLoading } = useGreenBeanInventory(warehouseId);

  const [expandedLot, setExpandedLot] = useState<number | null>(null);

  if (kpisLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const toggleExpand = (lotId: number) => {
    setExpandedLot(expandedLot === lotId ? null : lotId);
  };

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase">Warehouse</span>
          <select
            value={warehouseId ?? ''}
            onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-black px-2 py-1 text-sm bg-white"
          >
            <option value="">All Warehouses</option>
            {(warehouses ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6 KPI Tiles */}
      <div className="grid grid-cols-6 gap-4">
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Green Bean Stock</div>
          <div className="text-3xl font-bold">{kpis?.greenStock ?? 0}</div>
          <div className="text-xs text-gray-400">kg</div>
        </div>
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Roasted Stock</div>
          <div className="text-3xl font-bold">{kpis?.roastedStock ?? 0}</div>
          <div className="text-xs text-gray-400">kg</div>
        </div>
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Expiring Soon</div>
          <div className={`text-3xl font-bold ${(kpis?.expiringSoon ?? 0) > 0 ? 'text-danger' : ''}`}>
            {kpis?.expiringSoon ?? 0}
          </div>
          <div className="text-xs text-gray-400">&lt;7 days</div>
        </div>
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Pending Arrivals</div>
          <div className="text-3xl font-bold">{kpis?.pendingArrivals ?? 0}</div>
        </div>
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Low Stock</div>
          <div className={`text-3xl font-bold ${(kpis?.lowStockItems ?? 0) > 0 ? 'text-danger' : ''}`}>
            {kpis?.lowStockItems ?? 0}
          </div>
          <div className="text-xs text-gray-400">items</div>
        </div>
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Avg Freshness</div>
          <div className="text-3xl font-bold">
            {kpis?.avgFreshness != null ? `${Math.round(kpis.avgFreshness)}%` : '-'}
          </div>
          <div className="text-xs text-gray-400">freshness remaining</div>
        </div>
      </div>

      {/* Freshness Board */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Freshness Board</h2>
          <span className="text-xs text-gray-400">Roasted lots sorted by expiry (soonest first)</span>
        </div>
        {freshnessLoading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : (freshnessLots ?? []).length === 0 ? (
          <div className="border border-black p-8 text-center">
            <p className="text-sm text-gray-600">No active roasted lots.</p>
            <p className="text-sm text-gray-400 mt-1">
              Complete a receipt or production order to see freshness tracking.
            </p>
          </div>
        ) : (
          <div className="border border-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-xs uppercase text-left">
                  <th className="p-2">Lot</th>
                  <th className="p-2">Product</th>
                  <th className="p-2">Warehouse</th>
                  <th className="p-2 text-right">Remaining</th>
                  <th className="p-2">Expiry</th>
                  <th className="p-2 w-48">Freshness</th>
                  <th className="p-2 text-right">%</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(freshnessLots ?? []).map((lot: FreshnessLot) => (
                  <React.Fragment key={lot.id}>
                    <tr
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpand(lot.id)}
                    >
                      <td className="p-2 text-sm font-mono font-bold">{lot.lot_number}</td>
                      <td className="p-2 text-sm">
                        {lot.product_name}
                        <span className="text-xs text-gray-400 ml-1">{lot.sku}</span>
                      </td>
                      <td className="p-2 text-xs text-gray-600">
                        {lot.warehouse_code ?? '-'}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {lot.remaining_qty} {lot.unit}
                      </td>
                      <td className="p-2 text-sm">
                        {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        <FreshnessBar pct={lot.freshness_pct} status={lot.freshness_status} />
                      </td>
                      <td className="p-2 text-sm text-right font-bold">
                        {Math.round(lot.freshness_pct)}%
                      </td>
                      <td className="p-2">
                        {lot.freshness_status === 'expired' ? (
                          <span className="text-xs px-1 py-0.5 bg-gray-200 text-gray-600 font-bold uppercase">
                            EXPIRED
                          </span>
                        ) : (
                          <Badge
                            status={
                              lot.freshness_status === 'green'
                                ? 'done'
                                : lot.freshness_status === 'amber'
                                  ? 'waiting'
                                  : 'cancelled'
                            }
                          >
                            {lot.freshness_status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                    {expandedLot === lot.id && <LotExpandedRow lot={lot} />}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom two sections */}
      <div className="grid grid-cols-2 gap-8">
        {/* Pending Arrivals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Pending Arrivals</h2>
            <Link to="/receipts">
              <Button size="sm">View All</Button>
            </Link>
          </div>
          {arrivalsLoading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (pendingArrivals ?? []).length === 0 ? (
            <div className="border border-black p-4 text-sm text-gray-600 text-center">
              No pending arrivals
            </div>
          ) : (
            <div className="border border-black">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-xs uppercase text-left">
                    <th className="p-2">Reference</th>
                    <th className="p-2">Supplier</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Lines</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingArrivals ?? []).map((a: PendingArrival) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-sm">
                        <Link to={`/receipts/${a.id}`} className="font-bold font-mono hover:underline">
                          {a.reference}
                        </Link>
                      </td>
                      <td className="p-2 text-sm">{a.supplier_name ?? '-'}</td>
                      <td className="p-2">
                        <Badge status={a.status} />
                      </td>
                      <td className="p-2 text-sm text-right">{a.line_count}</td>
                      <td className="p-2 text-sm">
                        {a.scheduled_date
                          ? new Date(a.scheduled_date).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Green Bean Inventory */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Green Bean Inventory</h2>
            <Link to="/products">
              <Button size="sm">View All</Button>
            </Link>
          </div>
          {greenLoading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (greenInventory ?? []).length === 0 ? (
            <div className="border border-black p-4 text-sm text-gray-600 text-center">
              No green bean lots
            </div>
          ) : (
            <div className="border border-black">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr className="text-xs uppercase text-left">
                    <th className="p-2">Lot</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Warehouse</th>
                    <th className="p-2 text-right">Remaining</th>
                    <th className="p-2">Harvest</th>
                    <th className="p-2">Process</th>
                  </tr>
                </thead>
                <tbody>
                  {(greenInventory ?? []).map((lot: Lot) => (
                    <tr key={lot.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 text-sm font-mono font-bold">{lot.lot_number}</td>
                      <td className="p-2 text-sm">
                        {lot.product_name}
                        <span className="text-xs text-gray-400 ml-1">{lot.sku}</span>
                      </td>
                      <td className="p-2 text-xs text-gray-600">
                        {lot.warehouse_code ?? '-'}
                      </td>
                      <td className="p-2 text-sm text-right font-bold">
                        {lot.remaining_qty} {lot.unit}
                      </td>
                      <td className="p-2 text-sm">{lot.harvest_year ?? '-'}</td>
                      <td className="p-2 text-sm">{lot.process ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
