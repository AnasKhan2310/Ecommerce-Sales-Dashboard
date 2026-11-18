import { CurrencyCode, DateDisplayFormat } from '../types/analytics';

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; decimals: number }> = {
  GBP: { symbol: '£', decimals: 2 },
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  PKR: { symbol: '₨', decimals: 0 },
  INR: { symbol: '₹', decimals: 0 }
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatCurrency(value: number, currency: CurrencyCode = 'USD', compact = false): string {
  const cfg = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;
  if (!Number.isFinite(value)) return `${cfg.symbol}0`;

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000) return `${sign}${cfg.symbol}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${cfg.symbol}${(abs / 1_000).toFixed(1)}k`;
  }

  return `${sign}${cfg.symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: abs >= 1000 && cfg.decimals === 2 ? 0 : cfg.decimals,
    maximumFractionDigits: cfg.decimals
  })}`;
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '0';
}

export function formatDecimal(value: number, digits = 1): string {
  return Number.isFinite(value)
    ? value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : '0';
}

export function formatPercent(value: number, includeSign = false): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${includeSign && value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateDisplay(isoDate: string, format: DateDisplayFormat = 'DD MMM YYYY'): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate || '—';
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${Number(d)} ${SHORT_MONTHS[monthIdx]} ${y}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${SHORT_MONTHS[monthIdx]} ${y}`;
}
