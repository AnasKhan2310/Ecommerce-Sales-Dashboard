import React, { useMemo } from 'react';
import { FileSpreadsheet, FileText, Printer, Download } from 'lucide-react';
import {
  AppSettings,
  BusinessInsightItem,
  CustomerAnalyticsSummary,
  ExecutiveKPIs,
  ProductPerformanceRow,
  SalesSeriesPoint,
  TransactionRecord
} from '../types/analytics';
import {
  exportCustomerAnalyticsCSV,
  exportFullExcelWorkbook,
  exportMonthlySalesCSV,
  exportProductPerformanceCSV
} from '../utils/exportUtils';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface ReportsPageProps {
  filteredRecords: TransactionRecord[];
  kpis: ExecutiveKPIs;
  monthlySeries: SalesSeriesPoint[];
  products: ProductPerformanceRow[];
  customerSummary: CustomerAnalyticsSummary;
  insights: BusinessInsightItem[];
  settings: AppSettings;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  filteredRecords,
  kpis,
  monthlySeries,
  products,
  customerSummary,
  insights,
  settings
}) => {
  const currency = settings.currency;
  const generatedDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="space-y-5">
      <section className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4 text-[#008d97]" />
            <span>Excel Workbook (.xlsx)</span>
          </div>
          <button
            onClick={() =>
              exportFullExcelWorkbook(
                settings.companyName,
                kpis,
                monthlySeries,
                products,
                customerSummary.customers,
                filteredRecords
              )
            }
            className="w-full py-2 px-3 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .xlsx</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FileText className="w-4 h-4 text-[#5a57f6]" />
            <span>CSV Exports</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => exportMonthlySalesCSV(monthlySeries, kpis.hasCostData)}
              className="py-2 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Sales
            </button>
            <button
              onClick={() => exportProductPerformanceCSV(products, kpis.hasCostData)}
              className="py-2 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              Products
            </button>
            <button
              onClick={() => exportCustomerAnalyticsCSV(customerSummary.customers)}
              className="py-2 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              RFM
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Printer className="w-4 h-4 text-[#ffbe3b]" />
            <span>Print / PDF Report</span>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </section>

      <section className="print-surface bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold text-[#008d97]">Executive Summary</div>
            <h2 className="text-lg font-bold text-slate-900">{settings.companyName}</h2>
          </div>
          <div className="text-xs text-slate-500 font-mono-numbers">
            {generatedDate} · {formatNumber(filteredRecords.length)} items
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-500">Revenue</div>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-slate-900">
              {formatCurrency(kpis.totalRevenue, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Orders</div>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-slate-900">
              {formatNumber(kpis.totalOrders)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Avg Order</div>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-slate-900">
              {formatCurrency(kpis.averageOrderValue, currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Repeat Rate</div>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-slate-900">
              {formatPercent(customerSummary.repeatPurchaseRatePct)}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">Top 5 Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Units</th>
                  <th className="py-2 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.slice(0, 5).map((p) => (
                  <tr key={p.productName}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{p.productName}</td>
                    <td className="py-2 px-3 text-slate-600">{p.category}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers">{formatNumber(p.unitsSold)}</td>
                    <td className="py-2 pl-3 text-right font-mono-numbers font-bold">
                      {formatCurrency(p.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {insights.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Key Takeaways</h3>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {insights.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <strong className="text-slate-900">{item.title} ({item.metricHighlight}):</strong> {item.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};
