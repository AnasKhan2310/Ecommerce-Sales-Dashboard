import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { AppSettings, TransactionRecord } from '../types/analytics';
import { computeBreakdownByField, computeProductAnalytics } from '../utils/analyticsEngine';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { EmptyState } from '../components/ui/EmptyState';

interface ProductAnalyticsPageProps {
  filteredRecords: TransactionRecord[];
  hasCostData: boolean;
  hasInventoryData: boolean;
  settings: AppSettings;
  onResetFilters: () => void;
}

export const ProductAnalyticsPage: React.FC<ProductAnalyticsPageProps> = ({
  filteredRecords,
  hasCostData,
  hasInventoryData,
  settings,
  onResetFilters
}) => {
  const [chartMetric, setChartMetric] = useState<'revenue' | 'unitsSold'>('revenue');
  const currency = settings.currency;

  const { allProducts, top10Products, lowestProducts, lowStockProducts } = useMemo(
    () =>
      computeProductAnalytics(
        filteredRecords,
        hasCostData,
        hasInventoryData,
        settings.lowStockThreshold
      ),
    [filteredRecords, hasCostData, hasInventoryData, settings.lowStockThreshold]
  );

  const categoryPerf = useMemo(
    () => computeBreakdownByField(filteredRecords, 'category', hasCostData),
    [filteredRecords, hasCostData]
  );

  if (filteredRecords.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Reset your filters to view product rankings."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Top 10 Products</h2>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  chartMetric === 'revenue' ? 'bg-white text-[#008d97] shadow-xs' : 'text-slate-600'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartMetric('unitsSold')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  chartMetric === 'unitsSold' ? 'bg-white text-[#008d97] shadow-xs' : 'text-slate-600'
                }`}
              >
                Units
              </button>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Products} layout="vertical" margin={{ top: 4, right: 14, left: 6, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    chartMetric === 'revenue'
                      ? formatCurrency(Number(v), currency, true)
                      : formatNumber(Number(v))
                  }
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  width={130}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) =>
                    chartMetric === 'revenue'
                      ? [formatCurrency(Number(v ?? 0), currency), 'Revenue']
                      : [formatNumber(Number(v ?? 0)), 'Units']
                  }
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar
                  dataKey={chartMetric}
                  fill={chartMetric === 'revenue' ? '#5a57f6' : '#00bac7'}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Categories</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 px-2 text-right">Units</th>
                  <th className="py-2 px-2 text-right">Share</th>
                  <th className="py-2 pl-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryPerf.map((cat) => (
                  <tr key={cat.name}>
                    <td className="py-2 pr-2 font-semibold text-slate-800">{cat.name}</td>
                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-700">{formatNumber(cat.units)}</td>
                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-600">{formatPercent(cat.sharePct)}</td>
                    <td className="py-2 pl-2 text-right font-mono-numbers font-bold text-slate-900">
                      {formatCurrency(cat.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {hasInventoryData && lowStockProducts.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Low Stock Alerts (&le; {settings.lowStockThreshold})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                  <th className="py-2 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.map((p) => {
                  const qty = p.stockQuantity ?? 0;
                  const isCritical = qty <= Math.max(5, Math.floor(settings.lowStockThreshold / 2));
                  return (
                    <tr key={p.productName}>
                      <td className="py-2 pr-3 font-semibold text-slate-800">{p.productName}</td>
                      <td className="py-2 px-3 text-slate-500">{p.category}</td>
                      <td className="py-2 px-3 text-right font-mono-numbers font-bold text-slate-900">{formatNumber(qty)}</td>
                      <td className={`py-2 pl-3 text-right font-semibold ${isCritical ? 'text-rose-600' : 'text-amber-600'}`}>
                        {isCritical ? 'Critical' : 'Low'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Lowest Performing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 px-2 text-right">Units</th>
                  <th className="py-2 pl-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowestProducts.slice(0, 8).map((p) => (
                  <tr key={p.productName}>
                    <td className="py-2 pr-2 font-semibold text-slate-800 max-w-[160px] truncate">{p.productName}</td>
                    <td className="py-2 px-2 text-right font-mono-numbers text-slate-600">{formatNumber(p.unitsSold)}</td>
                    <td className="py-2 pl-2 text-right font-mono-numbers font-semibold text-slate-800">
                      {formatCurrency(p.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">All Products ({formatNumber(allProducts.length)})</h2>
          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 px-3 text-right">Share</th>
                  {hasCostData && <th className="py-2 px-3 text-right">Margin</th>}
                  <th className="py-2 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allProducts.map((p) => (
                  <tr key={p.productName}>
                    <td className="py-2 pr-3 font-semibold text-slate-800 max-w-[160px] truncate">{p.productName}</td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{p.category}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">{formatNumber(p.unitsSold)}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{formatPercent(p.revenueSharePct)}</td>
                    {hasCostData && (
                      <td className="py-2 px-3 text-right font-mono-numbers text-emerald-700">
                        {p.marginPct !== null ? formatPercent(p.marginPct) : '—'}
                      </td>
                    )}
                    <td className="py-2 pl-3 text-right font-mono-numbers font-bold text-slate-900">
                      {formatCurrency(p.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
