import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { AppSettings, SalesGranularity, TransactionRecord } from '../types/analytics';
import {
  computeBreakdownByField,
  computePeakDaysAndWeekdays,
  computeSalesSeries
} from '../utils/analyticsEngine';
import { formatCurrency, formatDateDisplay, formatNumber, formatPercent } from '../utils/formatters';
import { EmptyState } from '../components/ui/EmptyState';

interface SalesAnalyticsPageProps {
  filteredRecords: TransactionRecord[];
  hasCostData: boolean;
  settings: AppSettings;
  onResetFilters: () => void;
}

const CHART_COLORS = ['#00bac7', '#5a57f6', '#ffbe3b', '#10b981', '#f97316', '#64748b'];

export const SalesAnalyticsPage: React.FC<SalesAnalyticsPageProps> = ({
  filteredRecords,
  hasCostData,
  settings,
  onResetFilters
}) => {
  const [granularity, setGranularity] = useState<SalesGranularity>('monthly');
  const currency = settings.currency;

  const series = useMemo(
    () => computeSalesSeries(filteredRecords, granularity, hasCostData),
    [filteredRecords, granularity, hasCostData]
  );

  const { peakDays, weekdays } = useMemo(
    () => computePeakDaysAndWeekdays(filteredRecords),
    [filteredRecords]
  );

  const byCategory = useMemo(
    () => computeBreakdownByField(filteredRecords, 'category', hasCostData),
    [filteredRecords, hasCostData]
  );

  const byPayment = useMemo(
    () => computeBreakdownByField(filteredRecords, 'paymentMethod', hasCostData),
    [filteredRecords, hasCostData]
  );

  if (filteredRecords.length === 0) {
    return (
      <EmptyState
        title="No sales records found"
        description="Reset your filters to view sales trends."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
      />
    );
  }

  const bestPeriod = [...series].sort((a, b) => b.revenue - a.revenue)[0];
  const latestGrowth = series.length > 0 ? series[series.length - 1].growthPct : null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Sales Trend</h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Peak: <strong className="text-slate-800">{bestPeriod?.label}</strong> ({formatCurrency(bestPeriod?.revenue ?? 0, currency, true)})
              {latestGrowth !== null && (
                <span className={`ml-2 font-mono-numbers font-semibold ${latestGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatPercent(latestGrowth, true)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 self-start">
            {(['daily', 'weekly', 'monthly', 'yearly'] as SalesGranularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  granularity === g ? 'bg-white text-[#008d97] shadow-xs' : 'text-slate-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[260px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(Number(v), currency, true)}
                width={56}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={38} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'Revenue'
                    ? [formatCurrency(Number(value ?? 0), currency), name]
                    : [formatNumber(Number(value ?? 0)), String(name)]
                }
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#00bac7" fillOpacity={0.28} radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#5a57f6"
                strokeWidth={2.5}
                dot={{ r: series.length > 40 ? 0 : 3, fill: '#5a57f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Peak Sales Days</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 px-3 text-right">Orders</th>
                  <th className="py-2 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {peakDays.map((d) => (
                  <tr key={d.date}>
                    <td className="py-2 pr-3 font-semibold text-slate-800 font-mono-numbers">
                      {formatDateDisplay(d.date, settings.dateFormat)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">{formatNumber(d.orders)}</td>
                    <td className="py-2 pl-3 text-right font-mono-numbers font-bold text-[#5a57f6]">
                      {formatCurrency(d.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Day of Week</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdays} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="revenue" fill="#ffbe3b" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">By Category</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 px-3 text-right">AOV</th>
                  <th className="py-2 px-3 text-right">Share</th>
                  <th className="py-2 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCategory.map((c) => (
                  <tr key={c.name}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">{formatCurrency(c.aov, currency)}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-600">{formatPercent(c.sharePct)}</td>
                    <td className="py-2 pl-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatCurrency(c.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">By Payment Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5 h-[175px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPayment} dataKey="revenue" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                    {byPayment.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v ?? 0), currency)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="sm:col-span-7 space-y-2">
              {byPayment.map((pm, idx) => (
                <div key={pm.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="font-semibold text-slate-800 truncate">{pm.name}</span>
                  </div>
                  <div className="font-mono-numbers text-slate-700 whitespace-nowrap">
                    {formatCurrency(pm.revenue, currency, true)} · {formatPercent(pm.sharePct)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
