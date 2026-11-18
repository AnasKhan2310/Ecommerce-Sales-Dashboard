import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  CanonicalField,
  CleaningIssue,
  TransactionRecord,
  UploadAuditRecord
} from '../types/analytics';

export interface ParsedRawSpreadsheet {
  headers: string[];
  rows: Record<string, unknown>[];
  format: 'CSV' | 'XLSX';
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB browser safety cap
const MAX_ROW_LIMIT = 150_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const FIELD_DEFINITIONS: {
  field: CanonicalField;
  label: string;
  required: boolean;
  example: string;
}[] = [
  { field: 'order_id', label: 'Order ID', required: true, example: 'ORD-1001' },
  { field: 'order_date', label: 'Order Date', required: true, example: '2026-10-15' },
  { field: 'customer_id', label: 'Customer ID', required: false, example: 'CUST-101' },
  { field: 'product_name', label: 'Product Name', required: true, example: 'Running Shoes' },
  { field: 'category', label: 'Category', required: false, example: 'Footwear' },
  { field: 'quantity', label: 'Quantity', required: false, example: '2 (defaults 1)' },
  { field: 'unit_price', label: 'Unit Price', required: false, example: '50 (or Total)' },
  { field: 'total_amount', label: 'Total / Sales Amount', required: false, example: '100' },
  { field: 'discount', label: 'Discount', required: false, example: '5' },
  { field: 'refund_amount', label: 'Refund Amount', required: false, example: '0' },
  { field: 'order_status', label: 'Order Status', required: false, example: 'Completed' },
  { field: 'payment_method', label: 'Payment Method', required: false, example: 'Card' },
  { field: 'product_cost', label: 'Product Cost (COGS)', required: false, example: '25' },
  { field: 'stock_quantity', label: 'Stock / Inventory', required: false, example: '40' }
];

const HEADER_SYNONYMS: Record<CanonicalField, string[]> = {
  order_id: [
    'order_id', 'orderid', 'order id', 'order', 'order no', 'order_no', 'order number',
    'order_number', 'invoiceno', 'invoice_no', 'invoice', 'invoice no', 'transaction_id',
    'transaction id', 'receipt', 'name'
  ],
  order_date: [
    'order_date', 'orderdate', 'order date', 'date', 'invoicedate', 'invoice_date',
    'created_at', 'created at', 'purchase_date', 'sale_date', 'order created', 'timestamp'
  ],
  customer_id: [
    'customer_id', 'customerid', 'customer id', 'customer', 'client_id', 'client id',
    'email', 'buyer_id', 'user_id', 'customer name'
  ],
  product_name: [
    'product_name', 'productname', 'product name', 'product', 'item_name', 'item name',
    'item', 'lineitem name', 'description', 'sku_name', 'sku', 'title', 'product title', 'goods'
  ],
  category: [
    'category', 'product_category', 'product category', 'department', 'collection',
    'type', 'product type', 'sub category', 'segment'
  ],
  quantity: [
    'quantity', 'qty', 'units', 'lineitem quantity', 'item_qty', 'count', 'items', 'units sold'
  ],
  unit_price: [
    'unit_price', 'unitprice', 'unit price', 'price', 'lineitem price', 'item_price',
    'sale_price', 'rate', 'unit rate'
  ],
  total_amount: [
    'total', 'total_amount', 'total amount', 'amount', 'sales', 'revenue', 'net_sales',
    'gross_sales', 'line_total', 'subtotal', 'net revenue', 'total price'
  ],
  discount: ['discount', 'discount_amount', 'discount amount', 'promo_discount', 'coupon'],
  refund_amount: ['refund_amount', 'refundamount', 'refund amount', 'refund', 'refunded amount', 'return_amount'],
  order_status: ['order_status', 'orderstatus', 'order status', 'status', 'financial status', 'fulfillment status'],
  payment_method: ['payment_method', 'paymentmethod', 'payment method', 'payment', 'gateway', 'payment_type'],
  product_cost: ['product_cost', 'productcost', 'product cost', 'cost', 'unit_cost', 'cogs', 'cost_price', 'wholesale_cost'],
  stock_quantity: ['stock_quantity', 'stock', 'inventory', 'stock_qty', 'on_hand', 'available_stock', 'inventory_qty']
};

function sanitizeCellText(val: unknown, maxLen = 160): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeHeaderName(raw: unknown, idx: number): string {
  const cleaned = sanitizeCellText(raw, 80).replace(/[\ufeff]/g, '');
  if (!cleaned || FORBIDDEN_KEYS.has(cleaned.toLowerCase())) {
    return `Column_${idx + 1}`;
  }
  return cleaned;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\ufeff]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function autoDetectColumns(headers: string[]): Partial<Record<CanonicalField, string>> {
  const mapping: Partial<Record<CanonicalField, string>> = {};
  const usedHeaders = new Set<string>();

  for (const def of FIELD_DEFINITIONS) {
    const synonyms = HEADER_SYNONYMS[def.field];
    let found = headers.find((h) => {
      if (usedHeaders.has(h)) return false;
      const nh = normalizeHeader(h);
      return synonyms.some((s) => normalizeHeader(s) === nh);
    });

    if (!found) {
      found = headers.find((h) => {
        if (usedHeaders.has(h)) return false;
        const nh = normalizeHeader(h);
        return synonyms.some((s) => {
          const ns = normalizeHeader(s);
          return ns.length >= 4 && nh.includes(ns);
        });
      });
    }

    if (found) {
      mapping[def.field] = found;
      usedHeaders.add(found);
    }
  }

  return mapping;
}

export function isMinimumMappingSatisfied(mapping: Partial<Record<CanonicalField, string>>): boolean {
  return (
    Boolean(mapping.order_id) &&
    Boolean(mapping.order_date) &&
    Boolean(mapping.product_name) &&
    (Boolean(mapping.unit_price) || Boolean(mapping.total_amount))
  );
}

function buildRowsFromMatrix(matrix: unknown[][]): {
  headers: string[];
  rows: Record<string, unknown>[];
} {
  if (matrix.length === 0) return { headers: [], rows: [] };

  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(15, matrix.length); i++) {
    const row = matrix[i] || [];
    const nonEmptyStrings = row.filter((cell) => typeof cell === 'string' && cell.trim().length > 0);
    if (nonEmptyStrings.length >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = (matrix[headerRowIdx] || []).map((cell, idx) => sanitizeHeaderName(cell, idx));
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  const limit = Math.min(matrix.length, headerRowIdx + 1 + MAX_ROW_LIMIT);
  for (let r = headerRowIdx + 1; r < limit; r++) {
    const rowArr = matrix[r];
    if (!rowArr || rowArr.every((c) => c === '' || c === null || c === undefined)) continue;

    // Prototype-safe row object
    const obj = Object.create(null) as Record<string, unknown>;
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < rowArr.length ? rowArr[c] : '';
    }
    rows.push(obj);
  }

  return { headers, rows };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedRawSpreadsheet> {
  if (file.size <= 0) {
    throw new Error('The selected file is empty.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 25 MB browser safety limit. Please split very large exports.');
  }

  const lower = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();

  const isCsv =
    lower.endsWith('.csv') ||
    lower.endsWith('.tsv') ||
    lower.endsWith('.txt') ||
    mime.includes('csv') ||
    mime.includes('tab-separated-values');

  const isExcel =
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsm') ||
    lower.endsWith('.xlsb') ||
    lower.endsWith('.ods') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel');

  if (isCsv) {
    const cleanText = (await file.text()).replace(/^\ufeff/, '');
    const result = Papa.parse<Record<string, unknown>>(cleanText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      preview: MAX_ROW_LIMIT
    });

    const headers = (result.meta.fields ?? [])
      .map((h, idx) => sanitizeHeaderName(h, idx))
      .filter((h) => !FORBIDDEN_KEYS.has(h.toLowerCase()));

    if (headers.length === 0 || result.data.length === 0) {
      throw new Error('The CSV file appears empty or does not contain readable column headers.');
    }

    return { headers, rows: result.data, format: 'CSV' };
  }

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    let chosenMatrix: unknown[][] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: true
      });
      if (matrix.length >= 2) {
        chosenMatrix = matrix;
        break;
      }
    }

    if (chosenMatrix.length < 2) {
      throw new Error('No readable data rows were found inside the Excel workbook.');
    }

    const { headers, rows } = buildRowsFromMatrix(chosenMatrix);
    if (headers.length === 0 || rows.length === 0) {
      throw new Error('The Excel sheet does not contain recognizable header and data rows.');
    }

    return { headers, rows, format: 'XLSX' };
  }

  throw new Error('Unsupported file format. Please select a .csv, .tsv, .xlsx, or .xls file.');
}

function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).replace(/[£$€₨₹,\s]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseIsoDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof val === 'number' && val > 20000 && val < 80000) {
    const dt = new Date(Math.floor(val - 25569) * 86400 * 1000);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }

  const raw = sanitizeCellText(val, 48);
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const [, y, mRaw, dRaw] = isoMatch;
    const m = mRaw.padStart(2, '0');
    const d = dRaw.padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  const slashMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;

    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const fallback = new Date(raw);
  return !Number.isNaN(fallback.getTime()) ? fallback.toISOString().slice(0, 10) : null;
}

export function processAndCleanRows(
  rawRows: Record<string, unknown>[],
  mapping: Partial<Record<CanonicalField, string>>,
  fileName: string,
  fileSizeBytes: number,
  format: 'CSV' | 'XLSX'
): {
  records: TransactionRecord[];
  audit: UploadAuditRecord;
} {
  const safeFileName = sanitizeCellText(fileName, 120) || 'uploaded_dataset';
  const errorReport: string[] = [];

  if (!mapping.order_id) errorReport.push('Order ID column must be mapped.');
  if (!mapping.order_date) errorReport.push('Order Date column must be mapped.');
  if (!mapping.product_name) errorReport.push('Product Name column must be mapped.');
  if (!mapping.unit_price && !mapping.total_amount) {
    errorReport.push('Either Unit Price or Total / Sales Amount column must be mapped.');
  }

  if (errorReport.length > 0) {
    return {
      records: [],
      audit: {
        id: `upload-${Date.now()}`,
        datasetName: safeFileName.replace(/\.(csv|tsv|txt|xlsx|xls|xlsm|ods)$/i, ''),
        fileName: safeFileName,
        fileSizeBytes,
        format,
        uploadedAt: new Date().toISOString(),
        totalRows: rawRows.length,
        cleanRows: 0,
        duplicatesRemoved: 0,
        missingRepaired: 0,
        rejectedRows: rawRows.length,
        hasCostData: false,
        hasInventoryData: false,
        detectedColumns: mapping,
        issuesSample: [],
        errorReport
      }
    };
  }

  const issuesSample: CleaningIssue[] = [];
  const pushIssue = (rowNumber: number, field: string, issue: string, resolution: string) => {
    if (issuesSample.length < 40) {
      issuesSample.push({ rowNumber, field, issue, resolution });
    }
  };

  const dedupKeys = new Set<string>();
  const cleanRecords: TransactionRecord[] = [];

  let duplicatesRemoved = 0;
  let missingRepaired = 0;
  let rejectedRows = 0;
  let validCostCount = 0;
  let validStockCount = 0;

  const getCell = (row: Record<string, unknown>, field: CanonicalField): unknown => {
    const colName = mapping[field];
    if (!colName || FORBIDDEN_KEYS.has(colName.toLowerCase())) return undefined;
    return Object.prototype.hasOwnProperty.call(row, colName) ? row[colName] : undefined;
  };

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const rawOrderId = sanitizeCellText(getCell(row, 'order_id'), 64);
    const rawProduct = sanitizeCellText(getCell(row, 'product_name'), 120);
    const isoDate = parseIsoDate(getCell(row, 'order_date'));

    if (!rawOrderId || !rawProduct || !isoDate) {
      rejectedRows++;
      pushIssue(
        rowNum,
        !rawOrderId ? 'order_id' : !isoDate ? 'order_date' : 'product_name',
        'Missing or invalid required identifier/date',
        'Row skipped'
      );
      return;
    }

    let quantity = 1;
    if (mapping.quantity) {
      const parsedQty = parseNumeric(getCell(row, 'quantity'));
      if (parsedQty === null) {
        rejectedRows++;
        pushIssue(rowNum, 'quantity', 'Missing or non-numeric quantity', 'Row skipped');
        return;
      }
      quantity = parsedQty;
    }

    let unitPrice = mapping.unit_price ? parseNumeric(getCell(row, 'unit_price')) : null;
    const totalAmt = mapping.total_amount ? parseNumeric(getCell(row, 'total_amount')) : null;

    if (unitPrice === null && totalAmt !== null) {
      unitPrice = Math.abs(totalAmt) / Math.max(1, Math.abs(quantity));
    }

    if (unitPrice === null || unitPrice < 0) {
      rejectedRows++;
      pushIssue(rowNum, 'unit_price', 'Invalid or negative unit price', 'Row skipped');
      return;
    }

    let refundAmount = Math.max(0, parseNumeric(getCell(row, 'refund_amount')) ?? 0);
    const discount = Math.max(0, parseNumeric(getCell(row, 'discount')) ?? 0);

    let rawStatus = sanitizeCellText(getCell(row, 'order_status'), 32);
    if (quantity < 0 || (totalAmt !== null && totalAmt < 0)) {
      const absQty = Math.max(1, Math.abs(quantity));
      refundAmount = Math.max(refundAmount, absQty * unitPrice);
      quantity = absQty;
      if (!rawStatus) rawStatus = 'Returned';
      missingRepaired++;
      pushIssue(rowNum, 'quantity', 'Negative value converted to refund record', 'Converted to Returned');
    } else if (quantity === 0) {
      rejectedRows++;
      pushIssue(rowNum, 'quantity', 'Zero quantity line item', 'Row skipped');
      return;
    }

    let customerId = sanitizeCellText(getCell(row, 'customer_id'), 64);
    if (!customerId) {
      customerId = `GUEST-${rawOrderId}`;
      missingRepaired++;
    }

    let category = sanitizeCellText(getCell(row, 'category'), 64);
    if (!category) {
      category = 'Uncategorized';
      missingRepaired++;
    }

    const paymentMethod = sanitizeCellText(getCell(row, 'payment_method'), 48) || 'Unspecified';
    if (!rawStatus) {
      rawStatus = refundAmount > 0 ? 'Returned' : 'Completed';
    }

    const dedupSignature = `${rawOrderId}|${isoDate}|${rawProduct.toLowerCase()}|${quantity}|${unitPrice.toFixed(2)}`;
    if (dedupKeys.has(dedupSignature)) {
      duplicatesRemoved++;
      pushIssue(rowNum, 'order_id', 'Exact duplicate transaction line detected', 'Duplicate removed');
      return;
    }
    dedupKeys.add(dedupSignature);

    const grossLineTotal = Math.round(quantity * unitPrice * 100) / 100;
    const netRevenue = Math.max(0, Math.round((grossLineTotal - discount - refundAmount) * 100) / 100);

    const parsedCost = parseNumeric(getCell(row, 'product_cost'));
    const hasRowCost = parsedCost !== null && parsedCost >= 0;
    if (hasRowCost) validCostCount++;

    const parsedStock = parseNumeric(getCell(row, 'stock_quantity'));
    const hasRowStock = parsedStock !== null && parsedStock >= 0;
    if (hasRowStock) validStockCount++;

    cleanRecords.push({
      orderId: rawOrderId,
      orderDate: isoDate,
      customerId,
      productName: rawProduct,
      category,
      quantity,
      unitPrice: Math.round(unitPrice * 100) / 100,
      discount,
      refundAmount,
      orderStatus: rawStatus,
      paymentMethod,
      grossLineTotal,
      netRevenue,
      ...(hasRowCost ? { productCost: parsedCost! } : {}),
      ...(hasRowStock ? { stockQuantity: parsedStock! } : {})
    });
  });

  if (cleanRecords.length === 0) {
    errorReport.push('Zero valid transaction rows remained after cleaning and validation. Please verify your column mappings.');
  }

  cleanRecords.sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  const hasCostData =
    Boolean(mapping.product_cost) &&
    cleanRecords.length > 0 &&
    validCostCount / cleanRecords.length >= 0.8;

  if (!hasCostData) {
    cleanRecords.forEach((r) => {
      delete r.productCost;
    });
  }

  const hasInventoryData =
    Boolean(mapping.stock_quantity) &&
    cleanRecords.length > 0 &&
    validStockCount / cleanRecords.length >= 0.5;

  return {
    records: cleanRecords,
    audit: {
      id: `upload-${Date.now()}`,
      datasetName: safeFileName.replace(/\.(csv|tsv|txt|xlsx|xls|xlsm|ods)$/i, ''),
      fileName: safeFileName,
      fileSizeBytes,
      format,
      uploadedAt: new Date().toISOString(),
      totalRows: rawRows.length,
      cleanRows: cleanRecords.length,
      duplicatesRemoved,
      missingRepaired,
      rejectedRows,
      hasCostData,
      hasInventoryData,
      detectedColumns: mapping,
      issuesSample,
      errorReport
    }
  };
}
