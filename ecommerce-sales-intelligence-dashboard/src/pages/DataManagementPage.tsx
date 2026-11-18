import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  History,
  Trash2,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import {
  CanonicalField,
  PageId,
  TransactionRecord,
  UploadAuditRecord
} from '../types/analytics';
import {
  autoDetectColumns,
  FIELD_DEFINITIONS,
  isMinimumMappingSatisfied,
  ParsedRawSpreadsheet,
  parseSpreadsheetFile,
  processAndCleanRows
} from '../utils/dataIngestion';
import { downloadTemplateFile } from '../utils/exportUtils';
import { formatBytes, formatDateDisplay, formatNumber } from '../utils/formatters';

interface DataManagementPageProps {
  activeAudit: UploadAuditRecord;
  uploadHistory: UploadAuditRecord[];
  onActivateDataset: (records: TransactionRecord[], audit: UploadAuditRecord) => void;
  onLoadSamplePreset: (includeCostAndInventory: boolean) => void;
  onClearHistory: () => void;
  onNavigate: (page: PageId) => void;
}

export const DataManagementPage: React.FC<DataManagementPageProps> = ({
  activeAudit,
  uploadHistory,
  onActivateDataset,
  onLoadSamplePreset,
  onClearHistory,
  onNavigate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const [lastParsedFile, setLastParsedFile] = useState<{
    fileName: string;
    fileSize: number;
    parsed: ParsedRawSpreadsheet;
    mapping: Partial<Record<CanonicalField, string>>;
  } | null>(null);

  const [showMapper, setShowMapper] = useState(false);

  const handleFileSelected = async (file: File) => {
    setParseError(null);
    setUploadSuccessMsg(null);
    setIsLoading(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      const mapping = autoDetectColumns(parsed.headers);
      const fileState = { fileName: file.name, fileSize: file.size, parsed, mapping };
      setLastParsedFile(fileState);

      if (isMinimumMappingSatisfied(mapping)) {
        const { records, audit } = processAndCleanRows(
          parsed.rows,
          mapping,
          file.name,
          file.size,
          parsed.format
        );

        if (audit.errorReport.length > 0 || records.length === 0) {
          setShowMapper(true);
          setParseError(audit.errorReport.join(' '));
        } else {
          setShowMapper(false);
          onActivateDataset(records, audit);
          setUploadSuccessMsg(
            `${file.name} · ${formatNumber(audit.cleanRows)} clean rows ready`
          );
        }
      } else {
        setShowMapper(true);
        setParseError('Match required columns below, then click Activate.');
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unable to read file.');
      setShowMapper(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!lastParsedFile) return;
    setParseError(null);
    setUploadSuccessMsg(null);

    const { records, audit } = processAndCleanRows(
      lastParsedFile.parsed.rows,
      lastParsedFile.mapping,
      lastParsedFile.fileName,
      lastParsedFile.fileSize,
      lastParsedFile.parsed.format
    );

    if (audit.errorReport.length > 0 || records.length === 0) {
      setParseError(audit.errorReport.join(' '));
      return;
    }

    onActivateDataset(records, audit);
    setShowMapper(false);
    setUploadSuccessMsg(`${lastParsedFile.fileName} · ${formatNumber(audit.cleanRows)} clean rows ready`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFileSelected(file);
  };

  return (
    <div className="space-y-5">
      {/* Success Banner */}
      {uploadSuccessMsg && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-emerald-900 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {lastParsedFile && (
              <button
                type="button"
                onClick={() => setShowMapper((v) => !v)}
                className="px-3 py-2 rounded-xl border border-emerald-300 bg-white text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showMapper ? 'Hide Columns' : 'Columns'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Column Mapping Review */}
      {showMapper && lastParsedFile && (
        <section className="bg-white rounded-2xl border-2 border-[#00bac7] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#008d97]" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Match Columns — {lastParsedFile.fileName}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowMapper(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-1.5 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold cursor-pointer"
              >
                Activate Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
            {FIELD_DEFINITIONS.map((def) => {
              const isPricingMissing =
                (def.field === 'unit_price' || def.field === 'total_amount') &&
                !lastParsedFile.mapping.unit_price &&
                !lastParsedFile.mapping.total_amount;
              const isReqMissing = (def.required && !lastParsedFile.mapping[def.field]) || isPricingMissing;

              return (
                <label
                  key={def.field}
                  className={`block rounded-xl p-2.5 text-xs border ${
                    isReqMissing ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">
                      {def.label}
                      {def.required && <span className="text-rose-600 ml-1">*</span>}
                    </span>
                  </div>
                  <select
                    value={lastParsedFile.mapping[def.field] ?? ''}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setLastParsedFile({
                        ...lastParsedFile,
                        mapping: {
                          ...lastParsedFile.mapping,
                          [def.field]: nextVal || undefined
                        }
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#00bac7]"
                  >
                    <option value="">— Skip —</option>
                    {lastParsedFile.parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Upload Dropzone & Demo Switcher */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Upload Sales File (.csv / .xlsx)</h2>

          <input
            id="dataset-file-upload"
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm,.xlsb,.ods,.tsv,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />

          <label
            htmlFor="dataset-file-upload"
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`block rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-[#00bac7] bg-[#e8f5f6]'
                : 'border-slate-300 hover:border-[#00bac7] bg-slate-50/70'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-[#008d97] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>

            {isLoading ? (
              <div className="text-sm font-semibold text-[#008d97]">Processing file...</div>
            ) : (
              <>
                <div className="text-sm font-bold text-slate-900">
                  Drop your CSV or Excel file here
                </div>
                <p className="text-xs text-slate-500 mt-1 mb-3.5">
                  Auto-cleans duplicates &amp; detects columns
                </p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00bac7] hover:bg-[#00a3af] text-white text-xs font-semibold shadow-xs">
                  <UploadCloud className="w-4 h-4" />
                  <span>Choose File</span>
                </span>
              </>
            )}
          </label>

          {parseError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500">Sample Templates:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplateFile('csv')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#008d97]" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTemplateFile('xlsx')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#5a57f6]" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Mode Switcher + Compact Audit */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3">Demo Presets</h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setParseError(null);
                  setUploadSuccessMsg(null);
                  onLoadSamplePreset(true);
                }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                  activeAudit.id === 'sample-full-retail'
                    ? 'bg-[#e8f5f6] border-[#00bac7]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>Full Store (Cost &amp; Stock)</span>
                  {activeAudit.id === 'sample-full-retail' && <span className="text-[#008d97]">Active</span>}
                </div>
                <div className="text-slate-500 mt-0.5">Shows Profit, Margin &amp; Low-Stock alerts</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setParseError(null);
                  setUploadSuccessMsg(null);
                  onLoadSamplePreset(false);
                }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer ${
                  activeAudit.id === 'sample-orders-only'
                    ? 'bg-[#e8f5f6] border-[#00bac7]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>Orders Only (No Cost)</span>
                  {activeAudit.id === 'sample-orders-only' && <span className="text-[#008d97]">Active</span>}
                </div>
                <div className="text-slate-500 mt-0.5">Hides Profit KPIs automatically</div>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] text-slate-500">Read</div>
              <div className="text-sm font-bold font-mono-numbers text-slate-900">{formatNumber(activeAudit.totalRows)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] text-slate-500">Clean</div>
              <div className="text-sm font-bold font-mono-numbers text-emerald-600">{formatNumber(activeAudit.cleanRows)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] text-slate-500">Duplicates</div>
              <div className="text-sm font-bold font-mono-numbers text-slate-900">{formatNumber(activeAudit.duplicatesRemoved)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="text-[10px] text-slate-500">Repaired</div>
              <div className="text-sm font-bold font-mono-numbers text-amber-600">{formatNumber(activeAudit.missingRepaired)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cleaning Issues Log (Only shown if issues exist) */}
      {activeAudit.issuesSample.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Cleaning Log</h2>
          <div className="overflow-x-auto max-h-[200px]">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-1.5 pr-3">Row</th>
                  <th className="py-1.5 px-3">Field</th>
                  <th className="py-1.5 px-3">Issue</th>
                  <th className="py-1.5 pl-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeAudit.issuesSample.map((iss, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 pr-3 font-mono-numbers text-slate-600">{iss.rowNumber}</td>
                    <td className="py-1.5 px-3 font-mono-numbers text-slate-800">{iss.field}</td>
                    <td className="py-1.5 px-3 text-slate-600">{iss.issue}</td>
                    <td className="py-1.5 pl-3 font-semibold text-[#008d97]">{iss.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#008d97]" />
              <h2 className="text-sm font-bold text-slate-900">Upload History</h2>
            </div>
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Rows</th>
                  <th className="py-2 px-3 text-right">Size</th>
                  <th className="py-2 pl-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploadHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{h.fileName}</td>
                    <td className="py-2 px-3 text-slate-500">{h.format}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-800">{formatNumber(h.cleanRows)}</td>
                    <td className="py-2 px-3 text-right font-mono-numbers text-slate-500">{formatBytes(h.fileSizeBytes)}</td>
                    <td className="py-2 pl-3 text-right font-mono-numbers text-slate-500 whitespace-nowrap">
                      {formatDateDisplay(h.uploadedAt.slice(0, 10), 'DD MMM YYYY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
