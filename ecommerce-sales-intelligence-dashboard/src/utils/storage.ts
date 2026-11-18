import { AppSettings, CurrencyCode, DateDisplayFormat, TransactionRecord, UploadAuditRecord } from '../types/analytics';

const SETTINGS_KEY = 'esid_app_settings_v1';
const HISTORY_KEY = 'esid_upload_history_v1';
const ACTIVE_DATASET_KEY = 'esid_active_dataset_v1';

const VALID_CURRENCIES = new Set<CurrencyCode>(['GBP', 'USD', 'EUR', 'PKR', 'INR']);
const VALID_DATE_FORMATS = new Set<DateDisplayFormat>(['YYYY-MM-DD', 'DD MMM YYYY', 'MM/DD/YYYY']);

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Apex Commerce Store',
  currency: 'USD',
  dateFormat: 'DD MMM YYYY',
  lowStockThreshold: 15,
  showComparisonDeltas: true
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    const currency = VALID_CURRENCIES.has(parsed.currency as CurrencyCode)
      ? (parsed.currency as CurrencyCode)
      : DEFAULT_SETTINGS.currency;
    const dateFormat = VALID_DATE_FORMATS.has(parsed.dateFormat as DateDisplayFormat)
      ? (parsed.dateFormat as DateDisplayFormat)
      : DEFAULT_SETTINGS.dateFormat;
    const lowStockThreshold =
      typeof parsed.lowStockThreshold === 'number' && Number.isFinite(parsed.lowStockThreshold)
        ? Math.min(500, Math.max(1, Math.round(parsed.lowStockThreshold)))
        : DEFAULT_SETTINGS.lowStockThreshold;
    const companyName =
      typeof parsed.companyName === 'string' && parsed.companyName.trim()
        ? parsed.companyName.trim().slice(0, 80)
        : DEFAULT_SETTINGS.companyName;

    return {
      companyName,
      currency,
      dateFormat,
      lowStockThreshold,
      showComparisonDeltas:
        typeof parsed.showComparisonDeltas === 'boolean'
          ? parsed.showComparisonDeltas
          : DEFAULT_SETTINGS.showComparisonDeltas
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    const safe: AppSettings = {
      ...settings,
      companyName: settings.companyName.trim().slice(0, 80) || DEFAULT_SETTINGS.companyName,
      lowStockThreshold: Math.min(500, Math.max(1, Math.round(settings.lowStockThreshold)))
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadUploadHistory(): UploadAuditRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.fileName === 'string')
      .slice(0, 15);
  } catch {
    return [];
  }
}

export function saveUploadHistory(history: UploadAuditRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadSavedCustomDataset(): {
  records: TransactionRecord[];
  audit: UploadAuditRecord;
} | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DATASET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed?.records) ||
      parsed.records.length === 0 ||
      !parsed?.audit ||
      typeof parsed.audit.fileName !== 'string'
    ) {
      return null;
    }

    const validRecords = parsed.records.filter(
      (r: unknown): r is TransactionRecord =>
        Boolean(r) &&
        typeof (r as TransactionRecord).orderId === 'string' &&
        typeof (r as TransactionRecord).orderDate === 'string' &&
        typeof (r as TransactionRecord).productName === 'string' &&
        Number.isFinite((r as TransactionRecord).netRevenue)
    );

    return validRecords.length > 0 ? { records: validRecords, audit: parsed.audit } : null;
  } catch {
    return null;
  }
}

export function saveCustomDataset(records: TransactionRecord[], audit: UploadAuditRecord): boolean {
  try {
    if (records.length > 10000) {
      localStorage.removeItem(ACTIVE_DATASET_KEY);
      return false;
    }
    const payload = JSON.stringify({ records, audit });
    if (payload.length > 3_500_000) {
      localStorage.removeItem(ACTIVE_DATASET_KEY);
      return false;
    }
    localStorage.setItem(ACTIVE_DATASET_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export function clearSavedCustomDataset(): void {
  try {
    localStorage.removeItem(ACTIVE_DATASET_KEY);
  } catch {
    // Ignore
  }
}
