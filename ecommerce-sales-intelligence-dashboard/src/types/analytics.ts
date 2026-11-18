export type PageId =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'customers'
  | 'insights'
  | 'data'
  | 'reports'
  | 'settings';

export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'PKR' | 'INR';

export type SalesGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type DateDisplayFormat = 'YYYY-MM-DD' | 'DD MMM YYYY' | 'MM/DD/YYYY';

export type CanonicalField =
  | 'order_id'
  | 'order_date'
  | 'customer_id'
  | 'product_name'
  | 'category'
  | 'quantity'
  | 'unit_price'
  | 'total_amount'
  | 'discount'
  | 'refund_amount'
  | 'order_status'
  | 'payment_method'
  | 'product_cost'
  | 'stock_quantity';

export interface TransactionRecord {
  orderId: string;
  orderDate: string; // ISO YYYY-MM-DD
  customerId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  refundAmount: number;
  orderStatus: string;
  paymentMethod: string;
  productCost?: number;
  stockQuantity?: number;
  grossLineTotal: number;
  netRevenue: number;
}

export interface CleaningIssue {
  rowNumber: number;
  field: string;
  issue: string;
  resolution: string;
}

export interface UploadAuditRecord {
  id: string;
  datasetName: string;
  fileName: string;
  fileSizeBytes: number;
  format: 'CSV' | 'XLSX' | 'SAMPLE';
  uploadedAt: string;
  totalRows: number;
  cleanRows: number;
  duplicatesRemoved: number;
  missingRepaired: number;
  rejectedRows: number;
  hasCostData: boolean;
  hasInventoryData: boolean;
  detectedColumns: Partial<Record<CanonicalField, string>>;
  issuesSample: CleaningIssue[];
  errorReport: string[];
}

export interface GlobalFilters {
  dateFrom: string;
  dateTo: string;
  category: string;
  productQuery: string;
}

export interface AppSettings {
  companyName: string;
  currency: CurrencyCode;
  dateFormat: DateDisplayFormat;
  lowStockThreshold: number;
  showComparisonDeltas: boolean;
}

export interface ExecutiveKPIs {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalProductsSold: number;
  totalRefunds: number;
  hasCostData: boolean;
  grossProfit: number | null;
  profitMarginPct: number | null;
  deltas: {
    revenuePct: number | null;
    ordersPct: number | null;
    aovPct: number | null;
    customersPct: number | null;
    unitsPct: number | null;
    refundsPct: number | null;
    profitPct: number | null;
  };
  previousPeriodLabel: string | null;
}

export interface SalesSeriesPoint {
  periodKey: string;
  label: string;
  revenue: number;
  orders: number;
  units: number;
  refunds: number;
  profit: number | null;
  growthPct: number | null;
}

export interface PeakDaySummary {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface WeekdayPerformance {
  day: string;
  revenue: number;
  orders: number;
}

export interface BreakdownMetric {
  name: string;
  revenue: number;
  orders: number;
  units: number;
  aov: number;
  sharePct: number;
  profit: number | null;
}

export interface ProductPerformanceRow {
  productName: string;
  category: string;
  revenue: number;
  unitsSold: number;
  ordersCount: number;
  avgUnitPrice: number;
  refundAmount: number;
  revenueSharePct: number;
  profit: number | null;
  marginPct: number | null;
  stockQuantity: number | null;
}

export type RFMSegmentName =
  | 'Champions'
  | 'Loyal'
  | 'Potential'
  | 'Promising'
  | 'At Risk'
  | 'Hibernating';

export interface CustomerRFMRow {
  customerId: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  avgOrderValue: number;
  rScore: number;
  fScore: number;
  mScore: number;
  rfmCode: string;
  segment: RFMSegmentName;
  firstOrderDate: string;
  lastOrderDate: string;
  isReturning: boolean;
}

export interface CustomerAnalyticsSummary {
  uniqueCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  newCustomerRevenue: number;
  returningCustomerRevenue: number;
  returningRevenueSharePct: number;
  repeatPurchaseRatePct: number;
  purchaseFrequency: number;
  avgCustomerOrderValue: number;
  avgCustomerLifetimeSpend: number;
  segments: {
    segment: RFMSegmentName;
    count: number;
    sharePct: number;
    revenue: number;
    avgMonetary: number;
    description: string;
  }[];
  customers: CustomerRFMRow[];
}

export interface BusinessInsightItem {
  id: string;
  category: 'product' | 'trend' | 'customer' | 'category' | 'risk' | 'opportunity';
  severity: 'positive' | 'warning' | 'neutral';
  title: string;
  metricHighlight: string;
  description: string;
  recommendation: string;
}

export interface ForecastPoint {
  periodKey: string;
  label: string;
  actualRevenue: number | null;
  forecastRevenue: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface ForecastSummary {
  points: ForecastPoint[];
  nextPeriodLabel: string;
  projectedNextRevenue: number;
  trendDirection: 'upward' | 'downward' | 'flat';
  monthlySlope: number;
  confidenceNote: string;
}
