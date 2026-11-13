import React, { useState } from 'react';
import {
  PLATFORM_DEFINITIONS,
  type GisPlatformId,
  type GisTemplate,
  type ScriptParameters,
} from '../utils/gisEngine';
import {
  BookmarkPlus,
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileImage,
  BookOpenCheck,
  Loader2,
  Play,
  Terminal,
} from 'lucide-react';
import type { RealEoGrid } from '../utils/realEoGridLoader';
import { ReportAndJpgExporter } from './ReportAndJpgExporter';

interface CodeViewerPanelProps {
  template: GisTemplate;
  platformId: GisPlatformId;
  params: ScriptParameters;
  generatedCode: string;
  validationErrors: string[];
  isRunningViz?: boolean;
  realEoGrid?: RealEoGrid | null;
  onSelectPlatform: (platformId: GisPlatformId) => void;
  onSaveScript: () => void;
  onDownloadScript: () => void;
  onTogglePipelineStep: (stepName: string) => void;
  onRunOnMap?: () => void;
}

const AVAILABLE_PIPELINE_STEPS = [
  'Cloud Masking',
  'Clip AOI',
  'Reproyeksi UTM',
  'Hitung Indeks',
  'Klasifikasi Ambang',
  'Hitung Luas (Ha)',
  'Ekspor GeoTIFF/GPKG',
];

export const CodeViewerPanel: React.FC<CodeViewerPanelProps> = ({
  template,
  platformId,
  params,
  generatedCode,
  validationErrors,
  isRunningViz = false,
  realEoGrid = null,
  onSelectPlatform,
  onSaveScript,
  onDownloadScript,
  onTogglePipelineStep,
  onRunOnMap,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'code' | 'tutorial' | 'report'>('code');

  const platformMeta =
    PLATFORM_DEFINITIONS.find((p) => p.id === platformId) || PLATFORM_DEFINITIONS[0];
  const tutorialSteps =
    template.tutorialsByPlatform[platformId] ||
    template.tutorialsByPlatform[template.defaultPlatform] ||
    [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    onSaveScript();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const codeLines = generatedCode.trimEnd().split('\n');

  return (
    <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)] flex flex-col overflow-hidden">
      {/* Platform Selector Bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/75 px-4 py-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Target Platform GIS</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{platformMeta.environment}</span>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {codeLines.length} baris kode · {platformMeta.fileExtension}
          </div>
        </div>

        {/* Segmented Platform Switcher */}
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Pilih Bahasa atau Platform GIS"
        >
          {PLATFORM_DEFINITIONS.map((platform) => {
            const isSelected = platform.id === platformId;
            return (
              <button
                key={platform.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectPlatform(platform.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100/80'
                }`}
              >
                {platform.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Step Composer */}
      <div className="border-b border-slate-200 px-4 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Modul Pipeline:</span>
          {AVAILABLE_PIPELINE_STEPS.map((step) => {
            const active = params.pipelineSteps.includes(step);
            return (
              <button
                key={step}
                type="button"
                onClick={() => onTogglePipelineStep(step)}
                aria-pressed={active}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-sky-50 text-sky-800 border border-sky-300'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                {active ? `✓ ${step}` : `+ ${step}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Errors Banner (if any) */}
      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 space-y-1"
        >
          <p className="font-semibold">Periksa kembali parameter spasial Anda:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Toolbar: View Switcher (Code vs Step-by-Step Tutorial) + Copy/Download/Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#16202e] text-slate-200 border-b border-slate-800/80">
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('code')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'code'
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Script Siap Pakai ({platformMeta.fileExtension})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tutorial')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'tutorial'
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            Panduan Eksekusi ({tutorialSteps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('report')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeSubTab === 'report'
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            Laporan & Ekspor JPG
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRunOnMap && (
            <button
              type="button"
              onClick={onRunOnMap}
              disabled={isRunningViz}
              data-testid="code-panel-run-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/70 text-white rounded-xl transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              {isRunningViz ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menghitung...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run di Peta
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {savedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Tersimpan di Koleksi
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 text-teal-400" />
                Simpan ke Koleksi
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Salin Script
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDownloadScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh {platformMeta.fileExtension}
          </button>
        </div>
      </div>

      {/* Main Content Area: Code or Step-by-Step Guide */}
      {activeSubTab === 'code' ? (
        <div className="bg-[#0f1724] text-slate-100 overflow-x-auto max-h-[540px] overflow-y-auto">
          <pre
            className="p-4 text-xs sm:text-[13px] leading-relaxed font-mono tabular-nums"
            data-testid="generated-script-code"
          >
            <code>
              {codeLines.map((line, idx) => {
                const trimmed = line.trim();
                const isComment =
                  trimmed.startsWith('//') ||
                  trimmed.startsWith('#') ||
                  trimmed.startsWith('--') ||
                  trimmed.startsWith('$') ||
                  trimmed.startsWith('/*') ||
                  trimmed.startsWith('*');
                return (
                  <div
                    key={idx}
                    className="table-row hover:bg-slate-900/80 transition-colors"
                  >
                    <span className="table-cell pr-4 text-right text-slate-600 select-none w-9">
                      {idx + 1}
                    </span>
                    <span
                      className={`table-cell whitespace-pre ${
                        isComment ? 'text-slate-400 italic' : 'text-slate-100'
                      }`}
                    >
                      {line || ' '}
                    </span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      ) : (
        <div className="p-5 bg-white space-y-4 max-h-[540px] overflow-y-auto">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-semibold text-slate-900">
              Cara Menjalankan di {platformMeta.label}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Lingkungan kerja: {platformMeta.environment} · Output diharapkan: {template.expectedOutput}
            </p>
          </div>

          <div className="space-y-3">
            {tutorialSteps.map((step) => (
              <div
                key={step.stepNumber}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    0{step.stepNumber}. {step.title}
                  </h4>
                  {step.menuPath && (
                    <span className="text-xs font-mono text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md">
                      {step.menuPath}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{step.instruction}</p>
                {step.proTip && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                    <strong className="text-slate-900">Catatan Praktis GIS:</strong> {step.proTip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'report' && (
        <ReportAndJpgExporter
          template={template}
          platformId={platformId}
          params={params}
          generatedCode={generatedCode}
          realEoGrid={realEoGrid}
        />
      )}

      {/* Footer Info Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Output: {template.expectedOutput}</span>
        </div>
        <div className="flex items-center gap-2 font-mono tabular-nums text-slate-500">
          <Terminal className="w-3.5 h-3.5 shrink-0" />
          <span>CRS: {params.crsEpsg} · Resolusi: {params.spatialResolutionMeters}m</span>
        </div>
      </div>
    </div>
  );
};
