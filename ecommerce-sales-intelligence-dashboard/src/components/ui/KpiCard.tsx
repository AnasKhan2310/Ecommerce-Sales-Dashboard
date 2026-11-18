import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  deltaPct?: number | null;
  invertDeltaColor?: boolean;
  showDelta?: boolean;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  deltaPct = null,
  invertDeltaColor = false,
  showDelta = true,
  icon
}) => {
  const hasDelta = showDelta && deltaPct !== null && Number.isFinite(deltaPct);
  const isPositiveNumeric = (deltaPct ?? 0) >= 0;
  const isFavorable = invertDeltaColor ? !isPositiveNumeric : isPositiveNumeric;

  return (
    <div className="print-surface bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">{label}</span>
        {icon && <span className="text-[#008d97] shrink-0">{icon}</span>}
      </div>

      <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono-numbers tracking-tight leading-tight truncate">
        {value}
      </div>

      {hasDelta && (
        <div
          className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold font-mono-numbers ${
            isFavorable ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {isPositiveNumeric ? (
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {deltaPct! > 0 ? '+' : ''}
            {deltaPct!.toFixed(1)}%
          </span>
          <span className="text-slate-400 font-sans font-normal">prev</span>
        </div>
      )}
    </div>
  );
};
