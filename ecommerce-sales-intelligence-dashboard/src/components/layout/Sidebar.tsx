import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Users,
  Lightbulb,
  Upload,
  FileSpreadsheet,
  Settings,
  MoreHorizontal,
  X
} from 'lucide-react';
import { PageId } from '../../types/analytics';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  datasetName: string;
  cleanRowsCount: number;
}

export const NAV_ITEMS: { id: PageId; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales', shortLabel: 'Sales', icon: TrendingUp },
  { id: 'products', label: 'Products', shortLabel: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', shortLabel: 'Customers', icon: Users },
  { id: 'insights', label: 'Insights', shortLabel: 'Insights', icon: Lightbulb },
  { id: 'data', label: 'Upload Data', shortLabel: 'Upload', icon: Upload },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  datasetName,
  cleanRowsCount
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobilePrimary: PageId[] = ['dashboard', 'sales', 'products', 'data'];
  const mobileSecondary: PageId[] = ['customers', 'insights', 'reports', 'settings'];

  const handleNav = (id: PageId) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop & Windows Sidebar */}
      <aside className="no-print hidden md:flex w-20 xl:w-56 bg-[#00bac7] flex-col justify-between py-5 px-3 xl:px-3.5 shrink-0 shadow-md rounded-r-3xl my-2 ml-2 sticky top-2 h-[calc(100vh-16px)] z-30 select-none">
        <div className="flex flex-col gap-5">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center justify-center xl:justify-start gap-2.5 px-1 xl:px-2 py-1 text-left cursor-pointer rounded-xl"
            title="Sales Intelligence"
          >
            <img src="/favicon.svg" alt="Sales Intelligence" className="w-9 h-9 rounded-xl shadow-xs shrink-0 bg-white/10" />
            <div className="hidden xl:block min-w-0">
              <div className="text-sm font-bold text-white leading-tight truncate">
                Sales Intelligence
              </div>
              <div className="text-[11px] text-white/80 font-medium truncate">
                Ecommerce BI
              </div>
            </div>
          </button>

          <nav aria-label="Primary Navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={item.label}
                  className={`flex items-center justify-center xl:justify-start gap-3 px-2.5 xl:px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-[#008d97] shadow-sm'
                      : 'text-white/90 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="hidden xl:inline truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden xl:block pt-3 border-t border-white/20 px-2 text-white/90">
          <div className="text-xs font-semibold text-white truncate" title={datasetName}>
            {datasetName}
          </div>
          <div className="text-[11px] text-white/80 font-mono-numbers mt-0.5">
            {cleanRowsCount.toLocaleString('en-US')} rows
          </div>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#00bac7] border-t border-white/20 px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        {NAV_ITEMS.filter((i) => mobilePrimary.includes(i.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`min-h-[44px] min-w-[56px] px-2 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isActive ? 'bg-white text-[#008d97] shadow-xs' : 'text-white/95 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`min-h-[44px] min-w-[56px] px-2 py-1 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
            mobileSecondary.includes(activePage) || mobileMenuOpen
              ? 'bg-white text-[#008d97] shadow-xs'
              : 'text-white/95 hover:bg-white/10'
          }`}
        >
          {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <MoreHorizontal className="w-4.5 h-4.5" />}
          <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">More</span>
        </button>
      </nav>

      {/* Mobile More Menu Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 bg-slate-900/40 flex items-end" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-full bg-white rounded-t-2xl p-4 pb-6 shadow-xl border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">More Views</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {NAV_ITEMS.filter((i) => mobileSecondary.includes(i.id)).map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`min-h-[48px] flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left text-sm font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#e8f5f6] border-[#00bac7] text-[#008d97]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
