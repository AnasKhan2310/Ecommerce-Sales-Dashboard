import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  CustomerRFMRow,
  ExecutiveKPIs,
  ProductPerformanceRow,
  SalesSeriesPoint,
  TransactionRecord
} from '../types/analytics';

// Prevent CSV / Excel Formula Injection (DDE / CWE-1236) on user-uploaded text fields
function sanitizeSpreadsheetCell(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  const trimmed = val.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed) && !/^-\d+(\.\d+)?$/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
}

function sanitizeExportRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k] = sanitizeSpreadsheetCell(v);
    }
    return clean;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRowsToCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(sanitizeExportRows(rows));
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportMonthlySalesCSV(series: SalesSeriesPoint[], hasCostData: boolean) {
  const rows = series.map((s) => ({
    Period: s.label,
    PeriodKey: s.periodKey,
    NetRevenue: s.revenue.toFixed(2),
    Orders: s.orders,
    UnitsSold: s.units,
    Refunds: s.refunds.toFixed(2),
    ...(hasCostData && s.profit !== null ? { GrossProfit: s.profit.toFixed(2) } : {}),
    GrowthPercent: s.growthPct !== null ? s.growthPct.toFixed(2) : ''
  }));
  exportRowsToCSV(`sales_report_${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportProductPerformanceCSV(products: ProductPerformanceRow[], hasCostData: boolean) {
  const rows = products.map((p) => ({
    ProductName: p.productName,
    Category: p.category,
    Revenue: p.revenue.toFixed(2),
    RevenueSharePct: p.revenueSharePct.toFixed(2),
    UnitsSold: p.unitsSold,
    Orders: p.ordersCount,
    AvgUnitPrice: p.avgUnitPrice.toFixed(2),
    Refunds: p.refundAmount.toFixed(2),
    ...(hasCostData && p.profit !== null ? { GrossProfit: p.profit.toFixed(2), MarginPct: p.marginPct?.toFixed(2) ?? '' } : {}),
    ...(p.stockQuantity !== null ? { StockQuantity: p.stockQuantity } : {})
  }));
  exportRowsToCSV(`product_performance_${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportCustomerAnalyticsCSV(customers: CustomerRFMRow[]) {
  const rows = customers.map((c) => ({
    CustomerID: c.customerId,
    RFMSegment: c.segment,
    RFMCode: c.rfmCode,
    RecencyDays: c.recencyDays,
    FrequencyOrders: c.frequency,
    TotalMonetarySpend: c.monetary.toFixed(2),
    AverageOrderValue: c.avgOrderValue.toFixed(2),
    Type: c.isReturning ? 'Returning' : 'New',
    FirstOrderDate: c.firstOrderDate,
    LastOrderDate: c.lastOrderDate
  }));
  exportRowsToCSV(`customer_rfm_analytics_${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportFullExcelWorkbook(
  companyName: string,
  kpis: ExecutiveKPIs,
  monthlySeries: SalesSeriesPoint[],
  products: ProductPerformanceRow[],
  customers: CustomerRFMRow[],
  transactions: TransactionRecord[]
) {
  const wb = XLSX.utils.book_new();

  const summaryRows: Record<string, unknown>[] = [
    { Metric: 'Organization / Store', Value: companyName },
    { Metric: 'Generated On', Value: new Date().toISOString().slice(0, 10) },
    { Metric: 'Total Revenue', Value: Number(kpis.totalRevenue.toFixed(2)) },
    { Metric: 'Total Orders', Value: kpis.totalOrders },
    { Metric: 'Average Order Value', Value: Number(kpis.averageOrderValue.toFixed(2)) },
    { Metric: 'Unique Customers', Value: kpis.totalCustomers },
    { Metric: 'Total Products Sold', Value: kpis.totalProductsSold },
    { Metric: 'Total Refunds', Value: Number(kpis.totalRefunds.toFixed(2)) }
  ];
  if (kpis.hasCostData && kpis.grossProfit !== null && kpis.profitMarginPct !== null) {
    summaryRows.push(
      { Metric: 'Gross Profit', Value: Number(kpis.grossProfit.toFixed(2)) },
      { Metric: 'Profit Margin (%)', Value: Number(kpis.profitMarginPct.toFixed(2)) }
    );
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeExportRows(summaryRows)), 'Executive Summary');

  const salesRows = monthlySeries.map((s) => ({
    Period: s.label,
    Net_Revenue: Number(s.revenue.toFixed(2)),
    Orders: s.orders,
    Units_Sold: s.units,
    Refunds: Number(s.refunds.toFixed(2)),
    ...(kpis.hasCostData && s.profit !== null ? { Gross_Profit: Number(s.profit.toFixed(2)) } : {}),
    Growth_Pct: s.growthPct !== null ? Number(s.growthPct.toFixed(2)) : ''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeExportRows(salesRows)), 'Sales Trend');

  const prodRows = products.map((p) => ({
    Product_Name: p.productName,
    Category: p.category,
    Net_Revenue: Number(p.revenue.toFixed(2)),
    Share_Pct: Number(p.revenueSharePct.toFixed(2)),
    Units_Sold: p.unitsSold,
    Orders: p.ordersCount,
    Avg_Unit_Price: Number(p.avgUnitPrice.toFixed(2)),
    Refunds: Number(p.refundAmount.toFixed(2)),
    ...(kpis.hasCostData && p.profit !== null
      ? { Gross_Profit: Number(p.profit.toFixed(2)), Margin_Pct: Number((p.marginPct ?? 0).toFixed(2)) }
      : {}),
    ...(p.stockQuantity !== null ? { Stock_On_Hand: p.stockQuantity } : {})
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeExportRows(prodRows)), 'Product Performance');

  const custRows = customers.slice(0, 1000).map((c) => ({
    Customer_ID: c.customerId,
    RFM_Segment: c.segment,
    RFM_Score: c.rfmCode,
    Recency_Days: c.recencyDays,
    Orders: c.frequency,
    Total_Spend: Number(c.monetary.toFixed(2)),
    Avg_Order_Value: Number(c.avgOrderValue.toFixed(2)),
    Customer_Type: c.isReturning ? 'Returning' : 'New',
    Last_Order_Date: c.lastOrderDate
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeExportRows(custRows)), 'Customer RFM');

  const txRows = transactions.slice(0, 5000).map((t) => ({
    order_id: t.orderId,
    order_date: t.orderDate,
    customer_id: t.customerId,
    product_name: t.productName,
    category: t.category,
    quantity: t.quantity,
    unit_price: t.unitPrice,
    discount: t.discount,
    refund_amount: t.refundAmount,
    order_status: t.orderStatus,
    payment_method: t.paymentMethod,
    ...(typeof t.productCost === 'number' ? { product_cost: t.productCost } : {}),
    net_revenue: t.netRevenue
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeExportRows(txRows)), 'Transactions');

  XLSX.writeFile(wb, `ecommerce_intelligence_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function downloadTemplateFile(format: 'csv' | 'xlsx') {
  const sampleRows = [
    {
      order_id: 'ORD-1001',
      order_date: '2026-10-15',
      customer_id: 'CUST-101',
      product_name: 'AeroStride Running Shoes',
      category: 'Footwear',
      quantity: 2,
      unit_price: 118,
      discount: 10,
      refund_amount: 0,
      order_status: 'Completed',
      payment_method: 'Card',
      product_cost: 48,
      stock_quantity: 42
    },
    {
      order_id: 'ORD-1002',
      order_date: '2026-10-16',
      customer_id: 'CUST-102',
      product_name: 'PulseANC Wireless Headphones',
      category: 'Electronics',
      quantity: 1,
      unit_price: 199,
      discount: 0,
      refund_amount: 0,
      order_status: 'Completed',
      payment_method: 'Apple Pay',
      product_cost: 84,
      stock_quantity: 11
    },
    {
      order_id: 'ORD-1003',
      order_date: '2026-10-17',
      customer_id: 'CUST-101',
      product_name: 'Merino Knit Crew Sweater',
      category: 'Apparel',
      quantity: 1,
      unit_price: 89,
      discount: 0,
      refund_amount: 89,
      order_status: 'Returned',
      payment_method: 'PayPal',
      product_cost: 34,
      stock_quantity: 27
    }
  ];

  if (format === 'csv') {
    exportRowsToCSV('ecommerce_sales_template.csv', sampleRows);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleRows), 'SalesData');
    XLSX.writeFile(wb, 'ecommerce_sales_template.xlsx');
  }
}
