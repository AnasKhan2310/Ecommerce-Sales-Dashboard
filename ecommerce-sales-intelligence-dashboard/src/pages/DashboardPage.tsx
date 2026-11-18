import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Receipt,
  Users,
  PackageCheck,
  RotateCcw,
  TrendingUp,
  Percent,
  ArrowRight,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import {
  AppSettings,
  BreakdownMetric,
  BusinessInsightItem,
  ExecutiveKPIs,
  PageId,
  ProductPerformanceRow,
  SalesSeriesPoint
} from '../types/analytics';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { KpiCard } from '../components/ui/KpiCard';
import { EmptyState } from '../components/ui/EmptyState';

interface DashboardPageProps {
  kpis: ExecutiveKPIs;
  monthlySeries: SalesSeriesPoint[];
  categories: BreakdownMetric[];
  topProducts: ProductPerformanceRow[];
  insights: BusinessInsightItem[];
  settings: AppSettings;
  onResetFilters: () => void;
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  kpis,
  monthlySeries,
  categories,
  topProducts,
  insights,
  settings,
  onResetFilters,
  onNavigate
}) => {
  if (kpis.totalOrders === 0) {
    return (
      <EmptyState
        title="No matching orders"
        description="Reset your filters to view revenue and order metrics."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
      />
    );
  }

  const currency = settings.currency;
  const showDeltas = settings.showComparisonDeltas;

  return (
    <div className="space-y-5">
      {/* Simple 3-Step Quick Action Strip (Immediately tells user what to do) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-900">Quick Start:</span>
          <button
            onClick={() => onNavigate('data')}
            className="inline-flex items-center gap-1.5 text-[#008d97] hover:underline font-semibold cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>1. Upload CSV / Excel</span>
          </button>
          <span aria-hidden="true">→</span>
          <button
            onClick={() => onNavigate('customers')}
            className="hover:text-slate-900 font-medium cursor-pointer"
          >
            2. View RFM &amp; Insights
          </button>
          <span aria-hidden="true">→</span>
          <button
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1 hover:text-slate-900 font-medium cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#5a57f6]" />
            <span>3. Export Report</span>
          </button>
        </div>

        {!kpis.hasCostData && (
          <span className="text-[11px] text-slate-500">
            Profit hidden (no cost column)
          </span>
        )}
      </section>

      {/* KPI Grid (2-col on mobile, 4-col on desktop) */}
      <section aria-label="Executive KPIs" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(kpis.totalRevenue, currency, true)}
          deltaPct={kpis.deltas.revenuePct}
          showDelta={showDeltas}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          label="Orders"
          value={formatNumber(kpis.totalOrders)}
          deltaPct={kpis.deltas.ordersPct}
          showDelta={showDeltas}
          icon={<ShoppingBag className="w-4 h-4" />}
        />
        <KpiCard
          label="Avg Order"
          value={formatCurrency(kpis.averageOrderValue, currency)}
          deltaPct={kpis.deltas.aovPct}
          showDelta={showDeltas}
          icon={<Receipt className="w-4 h-4" />}
        />
        <KpiCard
          label="Customers"
          value={formatNumber(kpis.totalCustomers)}
          deltaPct={kpis.deltas.customersPct}
          showDelta={showDeltas}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          label="Units Sold"
          value={formatNumber(kpis.totalProductsSold)}
          deltaPct={kpis.deltas.unitsPct}
          showDelta={showDeltas}
          icon={<PackageCheck className="w-4 h-4" />}
        />
        <KpiCard
          label="Refunds"
          value={formatCurrency(kpis.totalRefunds, currency, true)}
          deltaPct={kpis.deltas.refundsPct}
          invertDeltaColor
          showDelta={showDeltas}
          icon={<RotateCcw className="w-4 h-4" />}
        />

        {kpis.hasCostData && kpis.grossProfit !== null && kpis.profitMarginPct !== null && (
          <>
            <KpiCard
              label="Gross Profit"
              value={formatCurrency(kpis.grossProfit, currency, true)}
              deltaPct={kpis.deltas.profitPct}
              showDelta={showDeltas}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label="Profit Margin"
              value={formatPercent(kpis.profitMarginPct)}
              icon={<Percent className="w-4 h-4" />}
            />
          </>
        )}
      </section>

      {/* Primary Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Revenue Trend</h2>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-[#008d97] hover:text-[#00737b] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Sales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-[240px] sm:h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a57f6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#5a57f6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(Number(v), currency, true)}
                  width={56}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0), currency), 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#5a57f6" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Orders Volume</h2>
          </div>

          <div className="h-[240px] sm:h-[265px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [formatNumber(Number(value ?? 0)), 'Orders']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="orders" fill="#00bac7" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Category Share & Top Products */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3.5">Category Share</h2>
          <div className="space-y-2.5">
            {categories.slice(0, 6).map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                  <span className="font-mono-numbers text-slate-600">
                    {formatCurrency(cat.revenue, currency, true)} · {formatPercent(cat.sharePct)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00bac7]"
                    style={{ width: `${Math.min(100, Math.max(3, cat.sharePct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Top 5 Products</h2>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-[#008d97] hover:text-[#00737b] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.slice(0, 5).map((p) => (
                  <tr key={p.productName} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-3 font-semibold text-slate-800 max-w-[180px] truncate" title={p.productName}>
                      {p.productName}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{p.category}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-700">
                      {formatNumber(p.unitsSold)}
                    </td>
                    <td className="py-2 pl-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatCurrency(p.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Compact Key Takeaways */}
      {insights.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Key Highlights</h2>
            <button
              onClick={() => onNavigate('insights')}
              className="text-xs font-semibold text-[#008d97] hover:text-[#00737b] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>All Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {insights.slice(0, 3).map((item, idx) => (
              <div key={item.id} className={idx > 0 ? 'pt-3 md:pt-0 md:pl-4' : ''}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 truncate">{item.title}</span>
                  <span
                    className={`font-mono-numbers font-bold shrink-0 ${
                      item.severity === 'warning'
                        ? 'text-amber-600'
                        : item.severity === 'positive'
                        ? 'text-emerald-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.metricHighlight}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
