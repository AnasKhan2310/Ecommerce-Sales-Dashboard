import React, { useState } from 'react';
import { Save, RotateCcw, Check } from 'lucide-react';
import { AppSettings, CurrencyCode, DateDisplayFormat } from '../types/analytics';
import { DEFAULT_SETTINGS } from '../utils/storage';

interface SettingsPageProps {
  settings: AppSettings;
  onSaveSettings: (next: AppSettings) => void;
  onResetAllData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onResetAllData
}) => {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900">Preferences</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Store Name</span>
            <input
              type="text"
              value={draft.companyName}
              onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#00bac7]"
              required
            />
          </label>

          <label className="block text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Currency</span>
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value as CurrencyCode })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#00bac7]"
            >
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="PKR">PKR (₨)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </label>

          <label className="block text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Date Format</span>
            <select
              value={draft.dateFormat}
              onChange={(e) => setDraft({ ...draft, dateFormat: e.target.value as DateDisplayFormat })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#00bac7]"
            >
              <option value="DD MMM YYYY">15 Oct 2026</option>
              <option value="YYYY-MM-DD">2026-10-15</option>
              <option value="MM/DD/YYYY">10/15/2026</option>
            </select>
          </label>

          <label className="block text-xs">
            <span className="font-semibold text-slate-700 block mb-1">Low-Stock Alert Threshold</span>
            <input
              type="number"
              min={1}
              max={500}
              value={draft.lowStockThreshold}
              onChange={(e) =>
                setDraft({ ...draft, lowStockThreshold: Math.max(1, Number(e.target.value) || 15) })
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono-numbers text-slate-900 focus:outline-none focus:border-[#00bac7]"
            />
          </label>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={draft.showComparisonDeltas}
            onChange={(e) => setDraft({ ...draft, showComparisonDeltas: e.target.checked })}
            className="w-4 h-4 accent-[#00bac7] rounded cursor-pointer"
          />
          <span className="font-medium">Show period-over-period % deltas</span>
        </label>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              onSaveSettings(DEFAULT_SETTINGS);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Defaults
          </button>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </form>

      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Reset to Demo Dataset</h3>
          <p className="text-xs text-slate-500 mt-0.5">Clears uploaded data and restores defaults.</p>
        </div>
        <button
          type="button"
          onClick={onResetAllData}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#008d97]" />
          <span>Reset</span>
        </button>
      </section>
    </div>
  );
};
