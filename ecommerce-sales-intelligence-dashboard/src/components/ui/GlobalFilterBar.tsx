import React, { useState } from 'react';
import { Calendar, Layers, Search, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { GlobalFilters } from '../../types/analytics';

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  minDate: string;
  maxDate: string;
  categories: string[];
  filteredCount: number;
  totalCount: number;
  onChange: (next: GlobalFilters) => void;
  onReset: () => void;
}

function shiftMonthsISO(maxDate: string, monthsBack: number, minBound: string): string {
  if (!maxDate) return minBound;
  const [y, m, d] = maxDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - monthsBack, d));
  const iso = dt.toISOString().slice(0, 10);
  return iso < minBound ? minBound : iso;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  minDate,
  maxDate,
  categories,
  filteredCount,
  totalCount,
  onChange,
  onReset
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const isFiltered =
    (filters.dateFrom && filters.dateFrom !== minDate) ||
    (filters.dateTo && filters.dateTo !== maxDate) ||
    filters.category !== 'All Categories' ||
    filters.productQuery.trim() !== '';

  const applyPreset = (monthsBack: number | 'all' | 'ytd') => {
    if (monthsBack === 'all') {
      onChange({ ...filters, dateFrom: minDate, dateTo: maxDate });
    } else if (monthsBack === 'ytd') {
      const ytdStart = `${maxDate.slice(0, 4)}-01-01`;
      onChange({
        ...filters,
        dateFrom: ytdStart < minDate ? minDate : ytdStart,
        dateTo: maxDate
      });
    } else {
      onChange({
        ...filters,
        dateFrom: shiftMonthsISO(maxDate, monthsBack, minDate),
        dateTo: maxDate
      });
    }
  };

  return (
    <section
      aria-label="Filters"
      className="no-print mb-4 bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs"
    >
      {/* Mobile Compact Header Row (Keeps KPIs above the fold on phones) */}
      <div className="flex md:hidden items-center justify-between gap-2">
        <div className="text-xs text-slate-600 font-medium truncate">
          <strong className="font-mono-numbers text-slate-900">{filteredCount.toLocaleString('en-US')}</strong>{' '}
          items · {filters.category === 'All Categories' ? 'All Categories' : filters.category}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFiltered && (
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setMobileExpanded((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer ${
              mobileExpanded
                ? 'bg-[#e8f5f6] border-[#00bac7] text-[#008d97]'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{mobileExpanded ? 'Hide Filters' : 'Filters'}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls (Always visible on Desktop, collapsible on Mobile) */}
      <div className={`${mobileExpanded ? 'mt-3 pt-3 border-t border-slate-100 flex' : 'hidden'} md:flex flex-col lg:flex-row lg:items-center justify-between gap-2.5`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 flex-1">
          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={filters.dateFrom}
              min={minDate}
              max={filters.dateTo || maxDate}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="bg-transparent text-slate-800 font-semibold font-mono-numbers focus:outline-none w-full"
              aria-label="Date from"
            />
          </label>

          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || minDate}
              max={maxDate}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="bg-transparent text-slate-800 font-semibold font-mono-numbers focus:outline-none w-full"
              aria-label="Date to"
            />
          </label>

          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filters.category}
              onChange={(e) => onChange({ ...filters, category: e.target.value })}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer w-full"
              aria-label="Category"
            >
              <option value="All Categories">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search product or order..."
              value={filters.productQuery}
              onChange={(e) => onChange({ ...filters, productQuery: e.target.value })}
              className="bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filters.dateFrom === minDate && filters.dateTo === maxDate
                  ? 'bg-white text-[#008d97] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => applyPreset(3)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              3M
            </button>
            <button
              onClick={() => applyPreset(6)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              6M
            </button>
            <button
              onClick={() => applyPreset('ytd')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              YTD
            </button>
          </div>

          <span className="hidden xl:inline text-xs text-slate-400 font-mono-numbers">
            {filteredCount.toLocaleString('en-US')}/{totalCount.toLocaleString('en-US')}
          </span>

          {isFiltered && (
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3 text-[#00bac7]" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
