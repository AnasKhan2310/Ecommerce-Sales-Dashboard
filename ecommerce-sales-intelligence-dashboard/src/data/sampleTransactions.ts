import { TransactionRecord, UploadAuditRecord } from '../types/analytics';

interface CatalogSeed {
  productName: string;
  category: string;
  unitPrice: number;
  unitCost: number;
  stockQuantity: number;
  weight: number;
  trendSlope: number; // > 1 grows over time, < 1 declines over time
}

const PRODUCT_CATALOG: CatalogSeed[] = [
  { productName: 'AeroStride Running Shoes', category: 'Footwear', unitPrice: 118, unitCost: 48, stockQuantity: 64, weight: 14, trendSlope: 1.35 },
  { productName: 'TrailPeak Waterproof Boots', category: 'Footwear', unitPrice: 145, unitCost: 62, stockQuantity: 9, weight: 8, trendSlope: 1.15 },
  { productName: 'UrbanSlip Canvas Sneakers', category: 'Footwear', unitPrice: 68, unitCost: 27, stockQuantity: 42, weight: 10, trendSlope: 0.68 },
  { productName: 'CloudStep Recovery Slides', category: 'Footwear', unitPrice: 44, unitCost: 16, stockQuantity: 110, weight: 9, trendSlope: 1.05 },

  { productName: 'Merino Knit Crew Sweater', category: 'Apparel', unitPrice: 89, unitCost: 34, stockQuantity: 31, weight: 11, trendSlope: 1.25 },
  { productName: 'All-Weather Tech Parka', category: 'Apparel', unitPrice: 185, unitCost: 78, stockQuantity: 7, weight: 7, trendSlope: 1.42 },
  { productName: 'Relaxed Linen Overshirt', category: 'Apparel', unitPrice: 72, unitCost: 28, stockQuantity: 54, weight: 9, trendSlope: 0.72 },
  { productName: 'Performance Stretch Chinos', category: 'Apparel', unitPrice: 78, unitCost: 31, stockQuantity: 39, weight: 10, trendSlope: 1.12 },

  { productName: 'PulseANC Wireless Headphones', category: 'Electronics', unitPrice: 199, unitCost: 84, stockQuantity: 12, weight: 11, trendSlope: 1.48 },
  { productName: 'MagDock 3-in-1 Fast Charger', category: 'Electronics', unitPrice: 64, unitCost: 22, stockQuantity: 75, weight: 12, trendSlope: 1.22 },
  { productName: 'SmartScale Body Analyzer', category: 'Electronics', unitPrice: 92, unitCost: 39, stockQuantity: 19, weight: 6, trendSlope: 0.85 },
  { productName: 'DeskCam 4K Streaming Lens', category: 'Electronics', unitPrice: 129, unitCost: 56, stockQuantity: 28, weight: 5, trendSlope: 0.62 },

  { productName: 'Artisan Ceramic Pour-Over Set', category: 'Home & Living', unitPrice: 58, unitCost: 21, stockQuantity: 47, weight: 10, trendSlope: 1.18 },
  { productName: 'Nordic Woven Throw Blanket', category: 'Home & Living', unitPrice: 76, unitCost: 29, stockQuantity: 11, weight: 8, trendSlope: 1.10 },
  { productName: 'Smart Aroma Mist Diffuser', category: 'Home & Living', unitPrice: 54, unitCost: 19, stockQuantity: 62, weight: 9, trendSlope: 0.95 },
  { productName: 'Bamboo Modular Desk Tray', category: 'Home & Living', unitPrice: 38, unitCost: 13, stockQuantity: 84, weight: 7, trendSlope: 0.74 },

  { productName: 'Commuter RFID Leather Wallet', category: 'Accessories', unitPrice: 49, unitCost: 16, stockQuantity: 53, weight: 10, trendSlope: 1.08 },
  { productName: 'Transit 28L Laptop Backpack', category: 'Accessories', unitPrice: 112, unitCost: 44, stockQuantity: 8, weight: 9, trendSlope: 1.38 },
  { productName: 'Polarized Aviator Sunglasses', category: 'Accessories', unitPrice: 82, unitCost: 26, stockQuantity: 41, weight: 6, trendSlope: 0.92 },
  { productName: 'Insulated Steel Bottle 750ml', category: 'Accessories', unitPrice: 32, unitCost: 10, stockQuantity: 120, weight: 12, trendSlope: 1.15 },

  { productName: 'Botanical Vitamin C Serum', category: 'Beauty & Care', unitPrice: 46, unitCost: 13, stockQuantity: 14, weight: 11, trendSlope: 1.32 },
  { productName: 'Cedarwood Daily Beard Oil', category: 'Beauty & Care', unitPrice: 28, unitCost: 8, stockQuantity: 58, weight: 7, trendSlope: 0.88 },
  { productName: 'Mineral SPF 50 Day Cream', category: 'Beauty & Care', unitPrice: 36, unitCost: 11, stockQuantity: 45, weight: 9, trendSlope: 1.14 },
  { productName: 'Silk Overnight Hair Wrap', category: 'Beauty & Care', unitPrice: 34, unitCost: 12, stockQuantity: 29, weight: 6, trendSlope: 0.79 }
];

const PAYMENT_METHODS = [
  { name: 'Card', weight: 46 },
  { name: 'Apple Pay', weight: 21 },
  { name: 'PayPal', weight: 17 },
  { name: 'Shop Pay', weight: 10 },
  { name: 'Bank Transfer', weight: 6 }
];

// Deterministic PRNG (Mulberry32) so sample dataset stays identical across sessions
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function buildSampleDataset(includeCostAndInventory = true): {
  records: TransactionRecord[];
  audit: UploadAuditRecord;
} {
  const rng = createRng(20261018);
  const records: TransactionRecord[] = [];

  // Build customer cohorts (VIP loyalists, repeat regulars, occasional, churned/at-risk, one-time)
  const totalCustomers = 260;
  const pickCustomerId = (monthIdx: number): string => {
    const roll = rng();
    if (roll < 0.28) {
      // Loyal repeat cohort (CUST-1001..CUST-1035) active across all months
      return `CUST-${1001 + Math.floor(rng() * 35)}`;
    }
    if (roll < 0.56) {
      // Regular cohort (CUST-1036..CUST-1110)
      return `CUST-${1036 + Math.floor(rng() * 75)}`;
    }
    if (roll < 0.74 && monthIdx < 16) {
      // Early / At-Risk cohort (mostly ordered in 2025 – early 2026)
      return `CUST-${1111 + Math.floor(rng() * 55)}`;
    }
    // Newer / single-order acquisitions scaling in later months
    const minId = 1166 + Math.floor((monthIdx / 22) * 50);
    const span = Math.max(20, totalCustomers - (minId - 1001));
    return `CUST-${minId + Math.floor(rng() * span)}`;
  };

  const pickPayment = (): string => {
    const total = PAYMENT_METHODS.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total;
    for (const p of PAYMENT_METHODS) {
      r -= p.weight;
      if (r <= 0) return p.name;
    }
    return 'Card';
  };

  // 22 months: Jan 2025 -> Oct 2026
  const startYear = 2025;
  const totalMonths = 22;
  let orderCounter = 1001;

  for (let mOffset = 0; mOffset < totalMonths; mOffset++) {
    const year = startYear + Math.floor(mOffset / 12);
    const month0 = mOffset % 12;
    const maxDay = daysInMonth(year, month0);

    // Seasonality + steady growth curve
    const monthNum = month0 + 1;
    let seasonalMultiplier = 1.0;
    if (monthNum === 11) seasonalMultiplier = 1.52;
    else if (monthNum === 12) seasonalMultiplier = 1.44;
    else if (monthNum === 5 || monthNum === 6) seasonalMultiplier = 1.14;
    else if (monthNum === 1 || monthNum === 2) seasonalMultiplier = 0.86;

    const growthMultiplier = 0.84 + (mOffset / (totalMonths - 1)) * 0.42;
    const ordersThisMonth = Math.round(74 * seasonalMultiplier * growthMultiplier);

    const progressRatio = mOffset / (totalMonths - 1);

    for (let o = 0; o < ordersThisMonth; o++) {
      // Weight weekends & mid-month Fridays slightly higher
      let day = 1 + Math.floor(rng() * maxDay);
      const dt = new Date(Date.UTC(year, month0, day));
      const dow = dt.getUTCDay();
      if (dow === 1 && rng() < 0.35) {
        day = Math.min(maxDay, day + 4);
      }

      const orderDate = `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
      const orderId = `ORD-${orderCounter++}`;
      const customerId = pickCustomerId(mOffset);
      const paymentMethod = pickPayment();

      // 1 or 2 line items per order (~30% multi-item baskets)
      const lineCount = rng() < 0.3 ? 2 : 1;
      const usedProducts = new Set<string>();

      for (let li = 0; li < lineCount; li++) {
        // Weighted product choice adjusted by trendSlope over time
        const weighted = PRODUCT_CATALOG.map((p) => {
          const timeFactor = 1 + (p.trendSlope - 1) * progressRatio;
          return Math.max(0.5, p.weight * timeFactor);
        });
        const totalW = weighted.reduce((a, b) => a + b, 0);
        let pick = rng() * totalW;
        let chosen = PRODUCT_CATALOG[0];
        for (let idx = 0; idx < PRODUCT_CATALOG.length; idx++) {
          pick -= weighted[idx];
          if (pick <= 0) {
            chosen = PRODUCT_CATALOG[idx];
            break;
          }
        }
        if (usedProducts.has(chosen.productName)) continue;
        usedProducts.add(chosen.productName);

        const quantity = rng() < 0.72 ? 1 : rng() < 0.85 ? 2 : 3;
        const unitPrice = chosen.unitPrice;
        const grossLineTotal = quantity * unitPrice;

        // Discount ~24% of orders receive 5%-15% promo
        const discount = rng() < 0.24 ? Math.round(grossLineTotal * (0.05 + rng() * 0.1) * 100) / 100 : 0;

        // Refunds ~3.8% of line items
        const isRefunded = rng() < 0.038;
        const refundAmount = isRefunded
          ? Math.round((grossLineTotal - discount) * (rng() < 0.7 ? 1 : 0.5) * 100) / 100
          : 0;
        const orderStatus = isRefunded ? 'Returned' : 'Completed';

        const netRevenue = Math.max(0, Math.round((grossLineTotal - discount - refundAmount) * 100) / 100);

        const record: TransactionRecord = {
          orderId,
          orderDate,
          customerId,
          productName: chosen.productName,
          category: chosen.category,
          quantity,
          unitPrice,
          discount,
          refundAmount,
          orderStatus,
          paymentMethod,
          grossLineTotal,
          netRevenue
        };

        if (includeCostAndInventory) {
          record.productCost = chosen.unitCost;
          record.stockQuantity = chosen.stockQuantity;
        }

        records.push(record);
      }
    }
  }

  records.sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  const audit: UploadAuditRecord = {
    id: includeCostAndInventory ? 'sample-full-retail' : 'sample-orders-only',
    datasetName: includeCostAndInventory
      ? 'Sample Store (Full Cost & Inventory)'
      : 'Sample Store (Orders-Only Export)',
    fileName: includeCostAndInventory
      ? 'sample_ecommerce_full_2025_2026.csv'
      : 'sample_orders_no_cost_2025_2026.csv',
    fileSizeBytes: includeCostAndInventory ? 248_400 : 212_600,
    format: 'SAMPLE',
    uploadedAt: '2026-10-31T10:00:00Z',
    totalRows: records.length,
    cleanRows: records.length,
    duplicatesRemoved: 0,
    missingRepaired: 0,
    rejectedRows: 0,
    hasCostData: includeCostAndInventory,
    hasInventoryData: includeCostAndInventory,
    detectedColumns: {
      order_id: 'order_id',
      order_date: 'order_date',
      customer_id: 'customer_id',
      product_name: 'product_name',
      category: 'category',
      quantity: 'quantity',
      unit_price: 'unit_price',
      discount: 'discount',
      refund_amount: 'refund_amount',
      order_status: 'order_status',
      payment_method: 'payment_method',
      ...(includeCostAndInventory ? { product_cost: 'product_cost', stock_quantity: 'stock_quantity' } : {})
    },
    issuesSample: [],
    errorReport: []
  };

  return { records, audit };
}
