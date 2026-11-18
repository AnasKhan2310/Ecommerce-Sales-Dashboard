import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import {
  AppSettings,
  BusinessInsightItem,
  SalesSeriesPoint,
  TransactionRecord
} from '../types/analytics';
import { computeSalesForecast } from '../utils/analyticsEngine';
import { formatCurrency } from '../utils/formatters';
import { EmptyState } from '../components/ui/EmptyState';

interface InsightsPageProps {
  filteredRecords: TransactionRecord[];
  monthlySeries: SalesSeriesPoint[];
  insights: BusinessInsightItem[];
  settings: AppSettings;
  onResetFilters: () => void;
}

export const InsightsPage: React.FC<InsightsPageProps> = ({
  filteredRecords,
  monthlySeries,
  insights,
  settings,
  onResetFilters
}) => {
  const [filterCat, setFilterCat] = useState<'all' | BusinessInsightItem['category']>('all');
  const currency = settings.currency;

  const forecast = useMemo(() => computeSalesForecast(monthlySeries), [monthlySeries]);

  if (filteredRecords.length === 0) {
    return (
      <EmptyState
        title="No data for insights"
        description="Reset your filters to generate insights and forecasts."
        actionLabel="Reset Filters"
        onAction={onResetFilters}
      />
    );
  }

  const visibleInsights =
    filterCat === 'all' ? insights : insights.filter((i) => i.category === filterCat);

  const chartData = forecast
    ? forecast.points.map((pt) => ({
        ...pt,
        bandRange:
          pt.lowerBound !== null && pt.upperBound !== null ? [pt.lowerBound, pt.upperBound] : null
      }))
    : [];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#e8f5f6] text-[#008d97] flex items-center justify-center shrink-0">
            <Lightbulb className="w-4.5 h-4.5" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Data-Backed Insights</h2>
        </div>

        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl gap-1 self-start">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'product', label: 'Products' },
              { id: 'trend', label: 'Trends' },
              { id: 'customer', label: 'Customers' },
              { id: 'risk', label: 'Risks' },
              { id: 'opportunity', label: 'Actions' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCat(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                filterCat === tab.id ? 'bg-white text-[#008d97] shadow-xs' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleInsights.map((item) => (
          <article
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {item.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : item.severity === 'positive' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-[#008d97] shrink-0" />
                )}
                <h3 className="text-sm font-bold text-slate-900 truncate">{item.title}</h3>
              </div>
              <span
                className={`font-mono-numbers text-sm font-bold shrink-0 ${
                  item.severity === 'warning'
                    ? 'text-amber-600'
                    : item.severity === 'positive'
                    ? 'text-emerald-600'
                    : 'text-[#5a57f6]'
                }`}
              >
                {item.metricHighlight}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
              <strong className="text-slate-900">Next:</strong> {item.recommendation}
            </div>
          </article>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#5a57f6]" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">3-Month Sales Forecast</h2>
          </div>

          {forecast && (
            <div className="text-xs text-slate-600">
              Next ({forecast.nextPeriodLabel}):{' '}
              <strong className="font-mono-numbers text-[#008d97] text-sm">
                {formatCurrency(forecast.projectedNextRevenue, currency)}
              </strong>
            </div>
          )}
        </div>

        {forecast ? (
          <div className="h-[250px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
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
                  formatter={(value, name) => {
                    if (Array.isArray(value)) {
                      return [
                        `${formatCurrency(Number(value[0]), currency)} – ${formatCurrency(Number(value[1]), currency)}`,
                        'Range'
                      ];
                    }
                    return [formatCurrency(Number(value ?? 0), currency), String(name)];
                  }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="bandRange" name="Range" stroke="none" fill="#00bac7" fillOpacity={0.14} />
                <Line
                  type="monotone"
                  dataKey="actualRevenue"
                  name="Actual"
                  stroke="#5a57f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#5a57f6' }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecastRevenue"
                  name="Forecast"
                  stroke="#00bac7"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 4, fill: '#00bac7' }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            Select at least 3 months to display sales forecast.
          </div>
        )}
      </section>
    </div>
  );
};
