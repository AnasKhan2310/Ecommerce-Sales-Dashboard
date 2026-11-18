import React from 'react';
import { Upload, Download } from 'lucide-react';
import { PageId } from '../../types/analytics';
import { NAV_ITEMS } from './Sidebar';

interface TopBarProps {
  activePage: PageId;
  companyName: string;
  datasetName: string;
  cleanRowsCount: number;
  hasCostData: boolean;
  onUploadClick: () => void;
  onExportClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePage,
  companyName,
  datasetName,
  cleanRowsCount,
  hasCostData,
  onUploadClick,
  onExportClick
}) => {
  const currentNav = NAV_ITEMS.find((n) => n.id === activePage);

  return (
    <header className="no-print mb-4 flex items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80">
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/favicon.svg"
          alt="Sales Intelligence"
          className="w-8 h-8 rounded-lg shadow-xs shrink-0 md:hidden"
        />
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500 font-medium truncate">
            {companyName} <span aria-hidden="true">/</span>{' '}
            <span className="text-[#008d97] font-semibold">{currentNav?.label ?? 'Dashboard'}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
            Sales Intelligence
          </h1>
        </div>
      </div>

      {/* Middle: Clean Unboxed Status (Desktop only) */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium whitespace-nowrap">
        <span className="text-slate-700 font-semibold truncate max-w-[200px]" title={datasetName}>
          {datasetName}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono-numbers">{cleanRowsCount.toLocaleString('en-US')} rows</span>
        <span aria-hidden="true">·</span>
        <span>{hasCostData ? 'Profit enabled' : 'Revenue only'}</span>
      </div>

      {/* Right: Primary Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onUploadClick}
          className="min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span>Upload</span>
        </button>
        <button
          onClick={onExportClick}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          title="Reports & Export"
        >
          <Download className="w-3.5 h-3.5 shrink-0 text-[#008d97]" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
