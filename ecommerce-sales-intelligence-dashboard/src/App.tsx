import React, { useMemo, useState } from 'react';
import {
  AppSettings,
  GlobalFilters,
  PageId,
  TransactionRecord,
  UploadAuditRecord
} from './types/analytics';
import { buildSampleDataset } from './data/sampleTransactions';
import {
  clearSavedCustomDataset,
  loadSavedCustomDataset,
  loadSettings,
  loadUploadHistory,
  saveCustomDataset,
  saveSettings,
  saveUploadHistory
} from './utils/storage';
import {
  computeBreakdownByField,
  computeCustomerRFM,
  computeExecutiveKPIs,
  computePreviousPeriodData,
  computeProductAnalytics,
  computeRuleBasedInsights,
  computeSalesSeries,
  filterTransactions,
  getDatasetBounds
} from './utils/analyticsEngine';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { GlobalFilterBar } from './components/ui/GlobalFilterBar';
import { DashboardPage } from './pages/DashboardPage';
import { SalesAnalyticsPage } from './pages/SalesAnalyticsPage';
import { ProductAnalyticsPage } from './pages/ProductAnalyticsPage';
import { CustomerAnalyticsPage } from './pages/CustomerAnalyticsPage';
import { InsightsPage } from './pages/InsightsPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function getInitialDataset() {
  const saved = loadSavedCustomDataset();
  if (saved) return saved;
  return buildSampleDataset(true);
}

export default function App() {
  const initial = useMemo(() => getInitialDataset(), []);
  const [records, setRecords] = useState<TransactionRecord[]>(initial.records);
  const [activeAudit, setActiveAudit] = useState<UploadAuditRecord>(initial.audit);
  const [uploadHistory, setUploadHistory] = useState<UploadAuditRecord[]>(() => loadUploadHistory());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  const bounds = useMemo(() => getDatasetBounds(records), [records]);

  const [filters, setFilters] = useState<GlobalFilters>(() => ({
    dateFrom: bounds.minDate,
    dateTo: bounds.maxDate,
    category: 'All Categories',
    productQuery: ''
  }));

  const resetFiltersToBounds = (nextBounds = bounds) => {
    setFilters({
      dateFrom: nextBounds.minDate,
      dateTo: nextBounds.maxDate,
      category: 'All Categories',
      productQuery: ''
    });
  };

  const handleActivateDataset = (nextRecords: TransactionRecord[], nextAudit: UploadAuditRecord) => {
    setRecords(nextRecords);
    setActiveAudit(nextAudit);
    const nextBounds = getDatasetBounds(nextRecords);
    resetFiltersToBounds(nextBounds);

    const updatedHistory = [nextAudit, ...uploadHistory.filter((h) => h.id !== nextAudit.id)].slice(0, 15);
    setUploadHistory(updatedHistory);
    saveUploadHistory(updatedHistory);
    saveCustomDataset(nextRecords, nextAudit);
  };

  const handleLoadSamplePreset = (includeCostAndInventory: boolean) => {
    clearSavedCustomDataset();
    const sample = buildSampleDataset(includeCostAndInventory);
    setRecords(sample.records);
    setActiveAudit(sample.audit);
    const nextBounds = getDatasetBounds(sample.records);
    resetFiltersToBounds(nextBounds);
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleResetAllData = () => {
    clearSavedCustomDataset();
    const sample = buildSampleDataset(true);
    setRecords(sample.records);
    setActiveAudit(sample.audit);
    const nextBounds = getDatasetBounds(sample.records);
    resetFiltersToBounds(nextBounds);
    setActivePage('dashboard');
  };

  const handleClearHistory = () => {
    setUploadHistory([]);
    saveUploadHistory([]);
  };

  // Filtered transactions & previous-period baseline
  const filteredRecords = useMemo(() => filterTransactions(records, filters), [records, filters]);

  const { prevRecords, label: prevLabel } = useMemo(
    () => computePreviousPeriodData(records, filteredRecords, filters),
    [records, filteredRecords, filters]
  );

  const isFullSpan =
    (!filters.dateFrom || filters.dateFrom <= bounds.minDate) &&
    (!filters.dateTo || filters.dateTo >= bounds.maxDate);

  const kpis = useMemo(
    () => computeExecutiveKPIs(filteredRecords, prevRecords, prevLabel, activeAudit.hasCostData, isFullSpan),
    [filteredRecords, prevRecords, prevLabel, activeAudit.hasCostData, isFullSpan]
  );

  const monthlySeries = useMemo(
    () => computeSalesSeries(filteredRecords, 'monthly', activeAudit.hasCostData),
    [filteredRecords, activeAudit.hasCostData]
  );

  const categoryBreakdown = useMemo(
    () => computeBreakdownByField(filteredRecords, 'category', activeAudit.hasCostData),
    [filteredRecords, activeAudit.hasCostData]
  );

  const productAnalytics = useMemo(
    () =>
      computeProductAnalytics(
        filteredRecords,
        activeAudit.hasCostData,
        activeAudit.hasInventoryData,
        settings.lowStockThreshold
      ),
    [filteredRecords, activeAudit.hasCostData, activeAudit.hasInventoryData, settings.lowStockThreshold]
  );

  const customerSummary = useMemo(
    () => computeCustomerRFM(records, filteredRecords),
    [records, filteredRecords]
  );

  const insights = useMemo(
    () =>
      computeRuleBasedInsights(
        filteredRecords,
        kpis,
        monthlySeries,
        productAnalytics.allProducts,
        categoryBreakdown,
        customerSummary,
        activeAudit.hasCostData,
        settings.currency
      ),
    [
      filteredRecords,
      kpis,
      monthlySeries,
      productAnalytics.allProducts,
      categoryBreakdown,
      customerSummary,
      activeAudit.hasCostData,
      settings.currency
    ]
  );

  const showGlobalFilters =
    activePage === 'dashboard' ||
    activePage === 'sales' ||
    activePage === 'products' ||
    activePage === 'customers' ||
    activePage === 'insights' ||
    activePage === 'reports';

  return (
    <div className="min-h-screen bg-[#e8f5f6] text-slate-900 flex">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        datasetName={activeAudit.datasetName}
        cleanRowsCount={activeAudit.cleanRows}
      />

      <main className="flex-1 min-w-0 flex flex-col p-3.5 sm:p-6 pb-24 md:pb-8 max-w-[1520px] mx-auto w-full">
        <TopBar
          activePage={activePage}
          companyName={settings.companyName}
          datasetName={activeAudit.datasetName}
          cleanRowsCount={activeAudit.cleanRows}
          hasCostData={activeAudit.hasCostData}
          onUploadClick={() => setActivePage('data')}
          onExportClick={() => setActivePage('reports')}
        />

        {showGlobalFilters && (
          <GlobalFilterBar
            filters={filters}
            minDate={bounds.minDate}
            maxDate={bounds.maxDate}
            categories={bounds.categories}
            filteredCount={filteredRecords.length}
            totalCount={records.length}
            onChange={setFilters}
            onReset={() => resetFiltersToBounds()}
          />
        )}

        <div className="flex-1">
          {activePage === 'dashboard' && (
            <DashboardPage
              kpis={kpis}
              monthlySeries={monthlySeries}
              categories={categoryBreakdown}
              topProducts={productAnalytics.top10Products}
              insights={insights}
              settings={settings}
              onResetFilters={() => resetFiltersToBounds()}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'sales' && (
            <SalesAnalyticsPage
              filteredRecords={filteredRecords}
              hasCostData={activeAudit.hasCostData}
              settings={settings}
              onResetFilters={() => resetFiltersToBounds()}
            />
          )}

          {activePage === 'products' && (
            <ProductAnalyticsPage
              filteredRecords={filteredRecords}
              hasCostData={activeAudit.hasCostData}
              hasInventoryData={activeAudit.hasInventoryData}
              settings={settings}
              onResetFilters={() => resetFiltersToBounds()}
            />
          )}

          {activePage === 'customers' && (
            <CustomerAnalyticsPage
              allRecords={records}
              filteredRecords={filteredRecords}
              settings={settings}
              onResetFilters={() => resetFiltersToBounds()}
            />
          )}

          {activePage === 'insights' && (
            <InsightsPage
              filteredRecords={filteredRecords}
              monthlySeries={monthlySeries}
              insights={insights}
              settings={settings}
              onResetFilters={() => resetFiltersToBounds()}
            />
          )}

          {activePage === 'data' && (
            <DataManagementPage
              activeAudit={activeAudit}
              uploadHistory={uploadHistory}
              onActivateDataset={handleActivateDataset}
              onLoadSamplePreset={handleLoadSamplePreset}
              onClearHistory={handleClearHistory}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage
              filteredRecords={filteredRecords}
              kpis={kpis}
              monthlySeries={monthlySeries}
              products={productAnalytics.allProducts}
              customerSummary={customerSummary}
              insights={insights}
              settings={settings}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onResetAllData={handleResetAllData}
            />
          )}
        </div>

        <footer className="no-print mt-8 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">{settings.companyName}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Ecommerce Sales Intelligence Dashboard</span>
          </div>
          <div className="font-mono-numbers">
            {activeAudit.cleanRows.toLocaleString('en-US')} clean records active
          </div>
        </footer>
      </main>
    </div>
  );
}
