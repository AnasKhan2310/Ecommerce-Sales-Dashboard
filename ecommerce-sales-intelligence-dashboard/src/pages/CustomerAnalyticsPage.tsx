import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Users, Repeat, ShoppingCart, Award } from 'lucide-react';
import { AppSettings, RFMSegmentName, TransactionRecord } from '../types/analytics';
import { computeCustomerRFM } from '../utils/analyticsEngine';
import {
  formatCurrency,
  formatDateDisplay,
  formatDecimal,
  formatNumber,
  formatPercent
} from '../utils/formatters';
import { KpiCard } from '../components/ui/KpiCard';
import { EmptyState } from '../components/ui/EmptyState';

interface CustomerAnalyticsPageProps {
  allRecords: TransactionRecord[];
  filteredRecords: TransactionRecord[];
  settings: AppSettings;
  onResetFilters: () => void;
}

const SEGMENT_COLORS: Record<RFMSegmentName, string> = {
  Champions: '#5a57f6',
  Loyal: '#00bac7',
  Potential: '#10b981',
  Promising: '#ffbe3b',
  'At Risk': '#f97316',
  Hibernating: '#94a3b8'
};

export const CustomerAnalyticsPage: React.FC<CustomerAnalyticsPageProps> = ({
  allRecords,
  filteredRecords,
  settings,
  onResetFilters
}) => {
  const [selectedSegment, setSelectedSegment] = useState<'ALL' | RFMSegmentName>('ALL');
  const currency = settings.currency;

  const summary = useMemo(
    () => computeCustomerRFM(allRecords, filteredRecords),
    [allRecords, filteredRecords]
  );

  if (filteredRecords.length === 0 || summary.uniqueCustomers === 0) {
    return (
      <EmptyState
        title="No customers found"
        description="Reset your filters to view customer cohorts."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
      />
    );
  }

  const newVsReturningData = [
    { name: 'Returning', customers: summary.returningCustomers, revenue: summary.returningCustomerRevenue },
    { name: 'New', customers: summary.newCustomers, revenue: summary.newCustomerRevenue }
  ];

  const visibleCustomers =
    selectedSegment === 'ALL'
      ? summary.customers
      : summary.customers.filter((c) => c.segment === selectedSegment);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Customers"
          value={formatNumber(summary.uniqueCustomers)}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          label="Repeat Rate"
          value={formatPercent(summary.repeatPurchaseRatePct)}
          icon={<Repeat className="w-4 h-4" />}
        />
        <KpiCard
          label="Order Frequency"
          value={`${formatDecimal(summary.purchaseFrequency, 2)}×`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <KpiCard
          label="Avg Customer Order"
          value={formatCurrency(summary.avgCustomerOrderValue, currency)}
          icon={<Award className="w-4 h-4" />}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">New vs. Returning</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            Returning share: <strong className="font-mono-numbers text-slate-800">{formatPercent(summary.returningRevenueSharePct)}</strong>
          </p>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={newVsReturningData} dataKey="revenue" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={3}>
                  <Cell fill="#00bac7" />
                  <Cell fill="#ffbe3b" />
                </Pie>
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v ?? 0), currency)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00bac7]" />
                <span>Returning ({formatNumber(summary.returningCustomers)})</span>
              </div>
              <div className="font-mono-numbers font-bold text-slate-900 mt-0.5">
                {formatCurrency(summary.returningCustomerRevenue, currency, true)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ffbe3b]" />
                <span>New ({formatNumber(summary.newCustomers)})</span>
              </div>
              <div className="font-mono-numbers font-bold text-slate-900 mt-0.5">
                {formatCurrency(summary.newCustomerRevenue, currency, true)}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">RFM Segments</h2>

          <div className="h-[205px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.segments} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="segment" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), currency, true)}
                  width={54}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v ?? 0), currency), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {summary.segments.map((seg) => (
                    <Cell key={seg.segment} fill={SEGMENT_COLORS[seg.segment]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSegment('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border cursor-pointer ${
                selectedSegment === 'ALL'
                  ? 'bg-[#00bac7] text-white border-[#00bac7]'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              All ({formatNumber(summary.uniqueCustomers)})
            </button>
            {summary.segments.map((seg) => (
              <button
                key={seg.segment}
                onClick={() => setSelectedSegment(seg.segment)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border cursor-pointer ${
                  selectedSegment === seg.segment
                    ? 'bg-[#5a57f6] text-white border-[#5a57f6]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {seg.segment} ({formatNumber(seg.count)})
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
          Top Customers {selectedSegment !== 'ALL' ? `· ${selectedSegment}` : ''}
        </h2>

        <div className="overflow-x-auto max-h-[340px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 px-3">Segment</th>
                <th className="py-2 px-3 text-right">RFM</th>
                <th className="py-2 px-3 text-right">Orders</th>
                <th className="py-2 px-3">Last Order</th>
                <th className="py-2 pl-3 text-right">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCustomers.slice(0, 100).map((c) => (
                <tr key={c.customerId}>
                  <td className="py-2 pr-3 font-mono-numbers font-semibold text-slate-800">{c.customerId}</td>
                  <td className="py-2 px-3 font-semibold whitespace-nowrap" style={{ color: SEGMENT_COLORS[c.segment] }}>
                    {c.segment}
                  </td>
                  <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{c.rfmCode}</td>
                  <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">{c.frequency}</td>
                  <td className="py-2 px-3 font-mono-numbers text-slate-500 whitespace-nowrap">
                    {formatDateDisplay(c.lastOrderDate, settings.dateFormat)}
                  </td>
                  <td className="py-2 pl-3 text-right font-mono-numbers font-bold text-slate-900">
                    {formatCurrency(c.monetary, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
