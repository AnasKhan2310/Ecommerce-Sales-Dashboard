import {
  BreakdownMetric,
  BusinessInsightItem,
  CurrencyCode,
  CustomerAnalyticsSummary,
  CustomerRFMRow,
  ExecutiveKPIs,
  ForecastPoint,
  ForecastSummary,
  GlobalFilters,
  PeakDaySummary,
  ProductPerformanceRow,
  RFMSegmentName,
  SalesGranularity,
  SalesSeriesPoint,
  TransactionRecord,
  WeekdayPerformance
} from '../types/analytics';
import { formatCurrency, formatMonthLabel, formatPercent } from './formatters';

export function getDatasetBounds(records: TransactionRecord[]): { minDate: string; maxDate: string; categories: string[] } {
  if (records.length === 0) {
    return { minDate: '', maxDate: '', categories: [] };
  }
  let minDate = records[0].orderDate;
  let maxDate = records[0].orderDate;
  const catSet = new Set<string>();

  for (const r of records) {
    if (r.orderDate < minDate) minDate = r.orderDate;
    if (r.orderDate > maxDate) maxDate = r.orderDate;
    catSet.add(r.category);
  }

  return {
    minDate,
    maxDate,
    categories: Array.from(catSet).sort()
  };
}

export function filterTransactions(records: TransactionRecord[], filters: GlobalFilters): TransactionRecord[] {
  const q = filters.productQuery.trim().toLowerCase();
  return records.filter((r) => {
    if (filters.dateFrom && r.orderDate < filters.dateFrom) return false;
    if (filters.dateTo && r.orderDate > filters.dateTo) return false;
    if (filters.category !== 'All Categories' && r.category !== filters.category) return false;
    if (
      q &&
      !r.productName.toLowerCase().includes(q) &&
      !r.category.toLowerCase().includes(q) &&
      !r.orderId.toLowerCase().includes(q) &&
      !r.customerId.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

function addDaysISO(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function diffDaysISO(fromIso: string, toIso: string): number {
  const t1 = Date.parse(`${fromIso}T00:00:00Z`);
  const t2 = Date.parse(`${toIso}T00:00:00Z`);
  return Math.max(0, Math.round((t2 - t1) / 86400000));
}

export function computePreviousPeriodData(
  allRecords: TransactionRecord[],
  filtered: TransactionRecord[],
  filters: GlobalFilters
): { prevRecords: TransactionRecord[]; label: string | null } {
  if (filtered.length === 0) return { prevRecords: [], label: null };

  const bounds = getDatasetBounds(filtered);
  const start = filters.dateFrom || bounds.minDate;
  const end = filters.dateTo || bounds.maxDate;
  if (!start || !end) return { prevRecords: [], label: null };

  const spanDays = Math.max(1, diffDaysISO(start, end) + 1);
  const prevEnd = addDaysISO(start, -1);
  const prevStart = addDaysISO(prevEnd, -(spanDays - 1));

  // If current window covers the full dataset, compare second half vs first half internally
  const fullBounds = getDatasetBounds(allRecords);
  if (start <= fullBounds.minDate && end >= fullBounds.maxDate) {
    const totalDays = diffDaysISO(fullBounds.minDate, fullBounds.maxDate);
    if (totalDays < 14) return { prevRecords: [], label: null };
    const midDate = addDaysISO(fullBounds.minDate, Math.floor(totalDays / 2));
    const q = filters.productQuery.trim().toLowerCase();
    const prevRecords = allRecords.filter((r) => {
      if (r.orderDate > midDate) return false;
      if (filters.category !== 'All Categories' && r.category !== filters.category) return false;
      if (q && !r.productName.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false;
      return true;
    });
    return { prevRecords, label: 'first half baseline' };
  }

  const q = filters.productQuery.trim().toLowerCase();
  const prevRecords = allRecords.filter((r) => {
    if (r.orderDate < prevStart || r.orderDate > prevEnd) return false;
    if (filters.category !== 'All Categories' && r.category !== filters.category) return false;
    if (q && !r.productName.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false;
    return true;
  });

  if (prevRecords.length === 0) return { prevRecords: [], label: null };
  return { prevRecords, label: `${prevStart} to ${prevEnd}` };
}

function summarizeCore(records: TransactionRecord[], hasCostData: boolean) {
  let revenue = 0;
  let units = 0;
  let refunds = 0;
  let totalCost = 0;
  const orderSet = new Set<string>();
  const customerSet = new Set<string>();

  for (const r of records) {
    revenue += r.netRevenue;
    units += r.quantity;
    refunds += r.refundAmount;
    orderSet.add(r.orderId);
    customerSet.add(r.customerId);
    if (hasCostData && typeof r.productCost === 'number') {
      totalCost += r.productCost * r.quantity;
    }
  }

  const orders = orderSet.size;
  const customers = customerSet.size;
  const aov = orders > 0 ? revenue / orders : 0;
  const grossProfit = hasCostData ? revenue - totalCost : null;
  const profitMarginPct = hasCostData && revenue > 0 && grossProfit !== null ? (grossProfit / revenue) * 100 : null;

  return { revenue, orders, aov, customers, units, refunds, grossProfit, profitMarginPct };
}

function pctDelta(curr: number, prev: number): number | null {
  if (!Number.isFinite(prev) || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function computeExecutiveKPIs(
  filtered: TransactionRecord[],
  prevFiltered: TransactionRecord[],
  previousPeriodLabel: string | null,
  hasCostData: boolean,
  isFullSpanComparison: boolean
): ExecutiveKPIs {
  const curr = summarizeCore(filtered, hasCostData);

  // If comparing full span against first half, compare second half against first half so percentage is apples-to-apples
  let activeCompareRecords = filtered;
  if (isFullSpanComparison && prevFiltered.length > 0) {
    const maxPrevDate = prevFiltered.reduce((m, r) => (r.orderDate > m ? r.orderDate : m), prevFiltered[0].orderDate);
    activeCompareRecords = filtered.filter((r) => r.orderDate > maxPrevDate);
  }

  const hasPrev = prevFiltered.length > 0 && activeCompareRecords.length > 0;
  const currSlice = hasPrev ? summarizeCore(activeCompareRecords, hasCostData) : curr;
  const prev = hasPrev ? summarizeCore(prevFiltered, hasCostData) : null;

  return {
    totalRevenue: curr.revenue,
    totalOrders: curr.orders,
    averageOrderValue: curr.aov,
    totalCustomers: curr.customers,
    totalProductsSold: curr.units,
    totalRefunds: curr.refunds,
    hasCostData,
    grossProfit: curr.grossProfit,
    profitMarginPct: curr.profitMarginPct,
    deltas: {
      revenuePct: prev ? pctDelta(currSlice.revenue, prev.revenue) : null,
      ordersPct: prev ? pctDelta(currSlice.orders, prev.orders) : null,
      aovPct: prev ? pctDelta(currSlice.aov, prev.aov) : null,
      customersPct: prev ? pctDelta(currSlice.customers, prev.customers) : null,
      unitsPct: prev ? pctDelta(currSlice.units, prev.units) : null,
      refundsPct: prev ? pctDelta(currSlice.refunds, prev.refunds) : null,
      profitPct:
        prev && currSlice.grossProfit !== null && prev.grossProfit !== null
          ? pctDelta(currSlice.grossProfit, prev.grossProfit)
          : null
    },
    previousPeriodLabel: hasPrev ? previousPeriodLabel : null
  };
}

function getIsoWeekKey(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  return dt.toISOString().slice(0, 10);
}

export function computeSalesSeries(
  records: TransactionRecord[],
  granularity: SalesGranularity,
  hasCostData: boolean
): SalesSeriesPoint[] {
  const buckets = new Map<
    string,
    { revenue: number; orders: Set<string>; units: number; refunds: number; cost: number }
  >();

  for (const r of records) {
    let key: string;
    if (granularity === 'daily') key = r.orderDate;
    else if (granularity === 'weekly') key = getIsoWeekKey(r.orderDate);
    else if (granularity === 'monthly') key = r.orderDate.slice(0, 7);
    else key = r.orderDate.slice(0, 4);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { revenue: 0, orders: new Set<string>(), units: 0, refunds: 0, cost: 0 };
      buckets.set(key, bucket);
    }
    bucket.revenue += r.netRevenue;
    bucket.orders.add(r.orderId);
    bucket.units += r.quantity;
    bucket.refunds += r.refundAmount;
    if (hasCostData && typeof r.productCost === 'number') {
      bucket.cost += r.productCost * r.quantity;
    }
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((key, idx) => {
    const b = buckets.get(key)!;
    const prevKey = idx > 0 ? keys[idx - 1] : null;
    const prevRev = prevKey ? buckets.get(prevKey)!.revenue : null;
    const growthPct = prevRev && prevRev > 0 ? ((b.revenue - prevRev) / prevRev) * 100 : null;

    let label = key;
    if (granularity === 'monthly') label = formatMonthLabel(key);
    else if (granularity === 'weekly') label = `Wk ${key.slice(5)}`;
    else if (granularity === 'daily') label = key.slice(5);

    return {
      periodKey: key,
      label,
      revenue: Math.round(b.revenue * 100) / 100,
      orders: b.orders.size,
      units: b.units,
      refunds: Math.round(b.refunds * 100) / 100,
      profit: hasCostData ? Math.round((b.revenue - b.cost) * 100) / 100 : null,
      growthPct
    };
  });
}

export function computePeakDaysAndWeekdays(records: TransactionRecord[]): {
  peakDays: PeakDaySummary[];
  weekdays: WeekdayPerformance[];
} {
  const dayMap = new Map<string, { revenue: number; orders: Set<string>; units: number }>();
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayBuckets = weekdayNames.map((day) => ({
    day,
    revenue: 0,
    orders: new Set<string>()
  }));

  for (const r of records) {
    let dBucket = dayMap.get(r.orderDate);
    if (!dBucket) {
      dBucket = { revenue: 0, orders: new Set<string>(), units: 0 };
      dayMap.set(r.orderDate, dBucket);
    }
    dBucket.revenue += r.netRevenue;
    dBucket.orders.add(r.orderId);
    dBucket.units += r.quantity;

    const [y, m, d] = r.orderDate.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    weekdayBuckets[dow].revenue += r.netRevenue;
    weekdayBuckets[dow].orders.add(r.orderId);
  }

  const peakDays: PeakDaySummary[] = Array.from(dayMap.entries())
    .map(([date, b]) => ({
      date,
      revenue: Math.round(b.revenue * 100) / 100,
      orders: b.orders.size,
      units: b.units
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Order Mon -> Sun
  const orderedIndices = [1, 2, 3, 4, 5, 6, 0];
  const weekdays: WeekdayPerformance[] = orderedIndices.map((i) => ({
    day: weekdayBuckets[i].day,
    revenue: Math.round(weekdayBuckets[i].revenue * 100) / 100,
    orders: weekdayBuckets[i].orders.size
  }));

  return { peakDays, weekdays };
}

export function computeBreakdownByField(
  records: TransactionRecord[],
  field: 'category' | 'paymentMethod',
  hasCostData: boolean
): BreakdownMetric[] {
  const map = new Map<string, { revenue: number; orders: Set<string>; units: number; cost: number }>();
  let totalRev = 0;

  for (const r of records) {
    const key = (r[field] || 'Other').trim() || 'Other';
    let b = map.get(key);
    if (!b) {
      b = { revenue: 0, orders: new Set<string>(), units: 0, cost: 0 };
      map.set(key, b);
    }
    b.revenue += r.netRevenue;
    b.orders.add(r.orderId);
    b.units += r.quantity;
    if (hasCostData && typeof r.productCost === 'number') {
      b.cost += r.productCost * r.quantity;
    }
    totalRev += r.netRevenue;
  }

  return Array.from(map.entries())
    .map(([name, b]) => {
      const orders = b.orders.size;
      const revenue = Math.round(b.revenue * 100) / 100;
      const profit = hasCostData ? Math.round((b.revenue - b.cost) * 100) / 100 : null;
      return {
        name,
        revenue,
        orders,
        units: b.units,
        aov: orders > 0 ? revenue / orders : 0,
        sharePct: totalRev > 0 ? (revenue / totalRev) * 100 : 0,
        profit
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function computeProductAnalytics(
  records: TransactionRecord[],
  hasCostData: boolean,
  hasInventoryData: boolean,
  lowStockThreshold: number
): {
  allProducts: ProductPerformanceRow[];
  top10Products: ProductPerformanceRow[];
  lowestProducts: ProductPerformanceRow[];
  lowStockProducts: ProductPerformanceRow[];
} {
  const map = new Map<
    string,
    {
      category: string;
      revenue: number;
      unitsSold: number;
      orders: Set<string>;
      grossWeightedPrice: number;
      refundAmount: number;
      cost: number;
      stockQuantity: number | null;
      latestDate: string;
    }
  >();

  let totalRev = 0;

  for (const r of records) {
    totalRev += r.netRevenue;
    let p = map.get(r.productName);
    if (!p) {
      p = {
        category: r.category,
        revenue: 0,
        unitsSold: 0,
        orders: new Set<string>(),
        grossWeightedPrice: 0,
        refundAmount: 0,
        cost: 0,
        stockQuantity: null,
        latestDate: ''
      };
      map.set(r.productName, p);
    }
    p.revenue += r.netRevenue;
    p.unitsSold += r.quantity;
    p.orders.add(r.orderId);
    p.grossWeightedPrice += r.unitPrice * r.quantity;
    p.refundAmount += r.refundAmount;
    if (hasCostData && typeof r.productCost === 'number') {
      p.cost += r.productCost * r.quantity;
    }
    if (hasInventoryData && typeof r.stockQuantity === 'number' && r.orderDate >= p.latestDate) {
      p.stockQuantity = r.stockQuantity;
      p.latestDate = r.orderDate;
    }
  }

  const allProducts: ProductPerformanceRow[] = Array.from(map.entries())
    .map(([productName, p]) => {
      const revenue = Math.round(p.revenue * 100) / 100;
      const profit = hasCostData ? Math.round((p.revenue - p.cost) * 100) / 100 : null;
      const marginPct = hasCostData && revenue > 0 && profit !== null ? (profit / revenue) * 100 : null;
      return {
        productName,
        category: p.category,
        revenue,
        unitsSold: p.unitsSold,
        ordersCount: p.orders.size,
        avgUnitPrice: p.unitsSold > 0 ? p.grossWeightedPrice / p.unitsSold : 0,
        refundAmount: Math.round(p.refundAmount * 100) / 100,
        revenueSharePct: totalRev > 0 ? (revenue / totalRev) * 100 : 0,
        profit,
        marginPct,
        stockQuantity: p.stockQuantity
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const top10Products = allProducts.slice(0, 10);
  const lowestProducts = [...allProducts].sort((a, b) => a.revenue - b.revenue).slice(0, 10);
  const lowStockProducts = hasInventoryData
    ? allProducts
        .filter((p) => p.stockQuantity !== null && p.stockQuantity <= lowStockThreshold)
        .sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0))
    : [];

  return {
    allProducts,
    top10Products,
    lowestProducts,
    lowStockProducts
  };
}

function quantileScores(values: number[], ascendingIsBetter: boolean): number[] {
  const n = values.length;
  if (n === 0) return [];
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => (ascendingIsBetter ? b.v - a.v : a.v - b.v));
  const scores = new Array<number>(n).fill(3);
  indexed.forEach((item, rank) => {
    const pct = (rank + 1) / n;
    scores[item.i] = Math.min(5, Math.max(1, Math.ceil(pct * 5)));
  });
  return scores;
}

function classifyRFM(r: number, f: number, m: number): RFMSegmentName {
  if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
  if (f >= 3 && r >= 3) return 'Loyal';
  if (r >= 4 && f <= 3 && m >= 2) return 'Potential';
  if (r <= 2 && f >= 3) return 'At Risk';
  if (r <= 2 && f <= 2) return 'Hibernating';
  return 'Promising';
}

const SEGMENT_DESCRIPTIONS: Record<RFMSegmentName, string> = {
  Champions: 'Recent buyers with highest order frequency and lifetime spend',
  Loyal: 'Consistent repeat shoppers generating steady baseline revenue',
  Potential: 'Recent active shoppers ready for cross-sell or loyalty nudges',
  Promising: 'Newly acquired customers with moderate early spend',
  'At Risk': 'Previously frequent buyers who have not ordered recently',
  Hibernating: 'Low frequency customers with long gaps since last order'
};

export function computeCustomerRFM(
  allRecords: TransactionRecord[],
  filtered: TransactionRecord[]
): CustomerAnalyticsSummary {
  if (filtered.length === 0) {
    return {
      uniqueCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      newCustomerRevenue: 0,
      returningCustomerRevenue: 0,
      returningRevenueSharePct: 0,
      repeatPurchaseRatePct: 0,
      purchaseFrequency: 0,
      avgCustomerOrderValue: 0,
      avgCustomerLifetimeSpend: 0,
      segments: [],
      customers: []
    };
  }

  // Track global first order date per customer across all uploaded rows
  const globalFirstOrder = new Map<string, string>();
  const globalOrderCounts = new Map<string, Set<string>>();
  for (const r of allRecords) {
    const prevFirst = globalFirstOrder.get(r.customerId);
    if (!prevFirst || r.orderDate < prevFirst) {
      globalFirstOrder.set(r.customerId, r.orderDate);
    }
    let set = globalOrderCounts.get(r.customerId);
    if (!set) {
      set = new Set<string>();
      globalOrderCounts.set(r.customerId, set);
    }
    set.add(r.orderId);
  }

  let refMaxDate = filtered[0].orderDate;
  let minFilteredDate = filtered[0].orderDate;

  const custMap = new Map<
    string,
    {
      orders: Set<string>;
      monetary: number;
      firstOrderDate: string;
      lastOrderDate: string;
    }
  >();

  for (const r of filtered) {
    if (r.orderDate > refMaxDate) refMaxDate = r.orderDate;
    if (r.orderDate < minFilteredDate) minFilteredDate = r.orderDate;
    let c = custMap.get(r.customerId);
    if (!c) {
      c = {
        orders: new Set<string>(),
        monetary: 0,
        firstOrderDate: r.orderDate,
        lastOrderDate: r.orderDate
      };
      custMap.set(r.customerId, c);
    }
    c.orders.add(r.orderId);
    c.monetary += r.netRevenue;
    if (r.orderDate < c.firstOrderDate) c.firstOrderDate = r.orderDate;
    if (r.orderDate > c.lastOrderDate) c.lastOrderDate = r.orderDate;
  }

  const entries = Array.from(custMap.entries());
  const recencyArr = entries.map(([, c]) => diffDaysISO(c.lastOrderDate, refMaxDate));
  const freqArr = entries.map(([, c]) => c.orders.size);
  const monArr = entries.map(([, c]) => c.monetary);

  const rScores = quantileScores(recencyArr, true);
  const fScores = quantileScores(freqArr, false);
  const mScores = quantileScores(monArr, false);

  let newCustomers = 0;
  let returningCustomers = 0;
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;
  let totalOrders = 0;
  let totalRevenue = 0;
  let repeatCount = 0;

  const customers: CustomerRFMRow[] = entries.map(([customerId, c], i) => {
    const frequency = c.orders.size;
    const monetary = Math.round(c.monetary * 100) / 100;
    const rScore = rScores[i];
    const fScore = fScores[i];
    const mScore = mScores[i];
    const segment = classifyRFM(rScore, fScore, mScore);

    // Returning if customer ordered >1 time in window OR ordered prior to window start
    const firstGlobal = globalFirstOrder.get(customerId) || c.firstOrderDate;
    const isReturning = frequency > 1 || firstGlobal < minFilteredDate;

    if (isReturning) {
      returningCustomers++;
      returningCustomerRevenue += monetary;
    } else {
      newCustomers++;
      newCustomerRevenue += monetary;
    }

    if (frequency >= 2) repeatCount++;
    totalOrders += frequency;
    totalRevenue += monetary;

    return {
      customerId,
      recencyDays: recencyArr[i],
      frequency,
      monetary,
      avgOrderValue: frequency > 0 ? monetary / frequency : 0,
      rScore,
      fScore,
      mScore,
      rfmCode: `${rScore}${fScore}${mScore}`,
      segment,
      firstOrderDate: firstGlobal,
      lastOrderDate: c.lastOrderDate,
      isReturning
    };
  });

  customers.sort((a, b) => b.monetary - a.monetary);

  const segmentOrder: RFMSegmentName[] = [
    'Champions',
    'Loyal',
    'Potential',
    'Promising',
    'At Risk',
    'Hibernating'
  ];

  const segments = segmentOrder.map((segName) => {
    const matches = customers.filter((c) => c.segment === segName);
    const segRev = matches.reduce((s, c) => s + c.monetary, 0);
    return {
      segment: segName,
      count: matches.length,
      sharePct: customers.length > 0 ? (matches.length / customers.length) * 100 : 0,
      revenue: Math.round(segRev * 100) / 100,
      avgMonetary: matches.length > 0 ? segRev / matches.length : 0,
      description: SEGMENT_DESCRIPTIONS[segName]
    };
  });

  const uniqueCustomers = customers.length;
  return {
    uniqueCustomers,
    newCustomers,
    returningCustomers,
    newCustomerRevenue: Math.round(newCustomerRevenue * 100) / 100,
    returningCustomerRevenue: Math.round(returningCustomerRevenue * 100) / 100,
    returningRevenueSharePct: totalRevenue > 0 ? (returningCustomerRevenue / totalRevenue) * 100 : 0,
    repeatPurchaseRatePct: uniqueCustomers > 0 ? (repeatCount / uniqueCustomers) * 100 : 0,
    purchaseFrequency: uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 0,
    avgCustomerOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    avgCustomerLifetimeSpend: uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0,
    segments,
    customers
  };
}

export function computeRuleBasedInsights(
  filtered: TransactionRecord[],
  kpis: ExecutiveKPIs,
  monthlySeries: SalesSeriesPoint[],
  products: ProductPerformanceRow[],
  categories: BreakdownMetric[],
  customerSummary: CustomerAnalyticsSummary,
  hasCostData: boolean,
  currency: CurrencyCode
): BusinessInsightItem[] {
  if (filtered.length === 0 || products.length === 0) return [];

  const insights: BusinessInsightItem[] = [];
  const topProd = products[0];

  // 1. Top Revenue Product
  insights.push({
    id: 'top-product',
    category: 'product',
    severity: 'positive',
    title: 'Top Revenue Product',
    metricHighlight: formatCurrency(topProd.revenue, currency),
    description: `${topProd.productName} generated ${formatCurrency(topProd.revenue, currency)} across ${topProd.unitsSold} units (${formatPercent(topProd.revenueSharePct)} of filtered revenue).`,
    recommendation: 'Protect inventory buffer on this hero SKU and bundle it with complementary accessories to lift basket size.'
  });

  // 2. Period Momentum (Month-over-month or Period delta)
  if (monthlySeries.length >= 2) {
    const latest = monthlySeries[monthlySeries.length - 1];
    const prior = monthlySeries[monthlySeries.length - 2];
    const deltaPct = prior.revenue > 0 ? ((latest.revenue - prior.revenue) / prior.revenue) * 100 : 0;
    const isUp = deltaPct >= 0;
    insights.push({
      id: 'period-momentum',
      category: 'trend',
      severity: isUp ? 'positive' : 'warning',
      title: isUp ? 'Sales Accelerated vs. Prior Month' : 'Sales Softened vs. Prior Month',
      metricHighlight: formatPercent(deltaPct, true),
      description: `${latest.label} recorded ${formatCurrency(latest.revenue, currency)} compared with ${formatCurrency(prior.revenue, currency)} in ${prior.label}.`,
      recommendation: isUp
        ? 'Scale acquisition campaigns in the top-converting categories while momentum is elevated.'
        : 'Audit promo cadence and checkout conversion on high-traffic categories to recover order volume.'
    });
  } else if (kpis.deltas.revenuePct !== null) {
    const isUp = kpis.deltas.revenuePct >= 0;
    insights.push({
      id: 'period-delta',
      category: 'trend',
      severity: isUp ? 'positive' : 'warning',
      title: isUp ? 'Revenue Growth vs. Baseline' : 'Revenue Contraction vs. Baseline',
      metricHighlight: formatPercent(kpis.deltas.revenuePct, true),
      description: `Net revenue shifted ${formatPercent(kpis.deltas.revenuePct, true)} compared against the ${kpis.previousPeriodLabel ?? 'previous period'}.`,
      recommendation: isUp
        ? 'Maintain fulfillment capacity and monitor repeat purchase cadence.'
        : 'Investigate refund spikes or category slowdowns contributing to the variance.'
    });
  }

  // 3. Returning Customer Contribution
  insights.push({
    id: 'returning-share',
    category: 'customer',
    severity: customerSummary.returningRevenueSharePct >= 45 ? 'positive' : 'neutral',
    title: 'Returning Customer Revenue Share',
    metricHighlight: formatPercent(customerSummary.returningRevenueSharePct),
    description: `Returning buyers (${customerSummary.returningCustomers} of ${customerSummary.uniqueCustomers} customers) drove ${formatCurrency(customerSummary.returningCustomerRevenue, currency)} (${formatPercent(customerSummary.returningRevenueSharePct)} of total revenue).`,
    recommendation:
      customerSummary.returningRevenueSharePct >= 45
        ? 'Launch a VIP tier or early-access perk for Champions to lock in high-margin repeat orders.'
        : 'Introduce post-purchase Day-14 replenishment emails to lift your repeat purchase rate.'
  });

  // 4. Highest AOV Category
  if (categories.length > 0) {
    const highestAovCat = [...categories].sort((a, b) => b.aov - a.aov)[0];
    insights.push({
      id: 'highest-aov-category',
      category: 'category',
      severity: 'positive',
      title: 'Highest Average Order Value Category',
      metricHighlight: formatCurrency(highestAovCat.aov, currency),
      description: `${highestAovCat.name} leads basket size at ${formatCurrency(highestAovCat.aov, currency)} per order across ${highestAovCat.orders} orders.`,
      recommendation: `Feature ${highestAovCat.name} bundles prominently on checkout upsells to maximize order value.`
    });
  }

  // 5. Declining SKU Detection (compare second half vs first half of active dates)
  const bounds = getDatasetBounds(filtered);
  const spanDays = diffDaysISO(bounds.minDate, bounds.maxDate);
  if (spanDays >= 28) {
    const midDate = addDaysISO(bounds.minDate, Math.floor(spanDays / 2));
    const skuSplit = new Map<string, { first: number; second: number }>();
    for (const r of filtered) {
      let s = skuSplit.get(r.productName);
      if (!s) {
        s = { first: 0, second: 0 };
        skuSplit.set(r.productName, s);
      }
      if (r.orderDate <= midDate) s.first += r.netRevenue;
      else s.second += r.netRevenue;
    }

    const declining = Array.from(skuSplit.entries())
      .filter(([, s]) => s.first >= 250 && s.second < s.first * 0.85)
      .map(([name, s]) => ({
        name,
        dropPct: ((s.second - s.first) / s.first) * 100,
        first: s.first,
        second: s.second
      }))
      .sort((a, b) => a.dropPct - b.dropPct);

    if (declining.length > 0) {
      const worst = declining[0];
      insights.push({
        id: 'declining-sku',
        category: 'risk',
        severity: 'warning',
        title: 'Declining Product Alert',
        metricHighlight: formatPercent(worst.dropPct),
        description: `${declining.length} product(s) declined over 15% between the first and second halves of this period. Steepest drop: ${worst.name} (${formatCurrency(worst.first, currency)} → ${formatCurrency(worst.second, currency)}).`,
        recommendation: 'Review product pricing, ad spend allocation, or run targeted clearance bundles on slowing SKUs.'
      });
    }
  }

  // 6. Retention Opportunity (At-Risk RFM Cohort)
  const atRiskSeg = customerSummary.segments.find((s) => s.segment === 'At Risk');
  if (atRiskSeg && atRiskSeg.count > 0) {
    insights.push({
      id: 'at-risk-retention',
      category: 'opportunity',
      severity: 'warning',
      title: 'Customer Retention Opportunity',
      metricHighlight: `${atRiskSeg.count} Buyers`,
      description: `${atRiskSeg.count} previously active customers fall into the At-Risk segment, representing ${formatCurrency(atRiskSeg.revenue, currency)} in historical spend.`,
      recommendation: 'Trigger a win-back campaign with a time-limited incentive before these accounts shift to Hibernating.'
    });
  } else if (hasCostData && kpis.profitMarginPct !== null) {
    insights.push({
      id: 'margin-efficiency',
      category: 'opportunity',
      severity: kpis.profitMarginPct >= 45 ? 'positive' : 'neutral',
      title: 'Net Gross Margin Benchmark',
      metricHighlight: formatPercent(kpis.profitMarginPct),
      description: `Portfolio gross profit stands at ${formatCurrency(kpis.grossProfit ?? 0, currency)} on a ${formatPercent(kpis.profitMarginPct)} margin after discounts and refunds.`,
      recommendation: 'Focus promotional discounts on high-margin categories so net margin stays protected.'
    });
  }

  return insights;
}

export function computeSalesForecast(monthlySeries: SalesSeriesPoint[]): ForecastSummary | null {
  if (monthlySeries.length < 3) return null;

  const n = monthlySeries.length;
  const xs = monthlySeries.map((_, i) => i);
  const ys = monthlySeries.map((m) => m.revenue);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Compute historical residual standard deviation for realistic upper/lower bounds
  let sqErr = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    sqErr += (ys[i] - pred) ** 2;
  }
  const stdErr = Math.sqrt(sqErr / Math.max(1, n - 2));

  // Combine linear trend with trailing 3-month weighted average for balanced smoothing
  const trailingWma =
    n >= 3
      ? (ys[n - 1] * 0.5 + ys[n - 2] * 0.3 + ys[n - 3] * 0.2)
      : ys[n - 1];

  const lastKey = monthlySeries[n - 1].periodKey;
  const [lastY, lastM] = lastKey.split('-').map(Number);

  const points: ForecastPoint[] = monthlySeries.map((m, i) => ({
    periodKey: m.periodKey,
    label: m.label,
    actualRevenue: m.revenue,
    forecastRevenue: i === n - 1 ? m.revenue : null,
    lowerBound: null,
    upperBound: null
  }));

  let firstProjected = 0;
  let firstLabel = '';

  for (let h = 1; h <= 3; h++) {
    const nextDate = new Date(Date.UTC(lastY, lastM - 1 + h, 1));
    const pKey = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const pLabel = formatMonthLabel(pKey);

    const linearPred = intercept + slope * (n - 1 + h);
    const wmaPred = trailingWma + slope * h;
    const blended = Math.max(0, Math.round((linearPred * 0.65 + wmaPred * 0.35) * 100) / 100);
    const band = Math.round(stdErr * (1 + h * 0.15) * 100) / 100;

    if (h === 1) {
      firstProjected = blended;
      firstLabel = pLabel;
    }

    points.push({
      periodKey: pKey,
      label: pLabel,
      actualRevenue: null,
      forecastRevenue: blended,
      lowerBound: Math.max(0, Math.round((blended - band) * 100) / 100),
      upperBound: Math.round((blended + band) * 100) / 100
    });
  }

  const trendDirection: 'upward' | 'downward' | 'flat' =
    slope > meanY * 0.01 ? 'upward' : slope < -meanY * 0.01 ? 'downward' : 'flat';

  return {
    points,
    nextPeriodLabel: firstLabel,
    projectedNextRevenue: firstProjected,
    trendDirection,
    monthlySlope: slope,
    confidenceNote: `Blended OLS linear trend (${n} historical months) + 3-month weighted moving average (±1σ residual band).`
  };
}
