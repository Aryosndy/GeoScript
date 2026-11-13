import React from 'react';
import {
  PLATFORM_DEFINITIONS,
  type GisPlatformId,
  type ScriptParameters,
} from '../utils/gisEngine';
import { ArrowUpRight, Download, FolderCode, Trash2 } from 'lucide-react';

export interface SavedScriptItem {
  id: string;
  title: string;
  templateId: string;
  platformId: GisPlatformId;
  params: ScriptParameters;
  code: string;
  createdAt: string;
}

interface SavedScriptsViewProps {
  savedScripts: SavedScriptItem[];
  onLoadSavedScript: (item: SavedScriptItem) => void;
  onDeleteSavedScript: (id: string) => void;
  onDownloadSavedScript: (item: SavedScriptItem) => void;
  onSwitchToStudio: () => void;
}

export const SavedScriptsView: React.FC<SavedScriptsViewProps> = ({
  savedScripts,
  onLoadSavedScript,
  onDeleteSavedScript,
  onDownloadSavedScript,
  onSwitchToStudio,
}) => {
  return (
    <section className="space-y-6" aria-labelledby="saved-scripts-heading">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 id="saved-scripts-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
            Koleksi Script GIS Tersimpan ({savedScripts.length})
          </h1>
          <p className="text-sm text-slate-600">
            Simpan berbagai variasi parameter wilayah AOI, sistem koordinat EPSG, dan platform untuk digunakan kembali pada proyek pemetaan berikutnya.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToStudio}
          className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Buat Script Baru di Studio
        </button>
      </div>

      {savedScripts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <FolderCode className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            Belum ada script yang disimpan di koleksi
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Konfigurasikan wilayah AOI, pilih platform (GEE, Python, PyQGIS, ArcPy, atau PostGIS), lalu klik tombol "Simpan ke Koleksi" di Studio Script.
          </p>
          <button
            type="button"
            onClick={onSwitchToStudio}
            className="px-4 py-2 text-xs font-medium bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition-colors"
          >
            Buka Studio Script Maker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {savedScripts.map((item) => {
            const platMeta =
              PLATFORM_DEFINITIONS.find((p) => p.id === item.platformId) ||
              PLATFORM_DEFINITIONS[0];
            const previewLines = item.code.trim().split('\n').slice(0, 10).join('\n');

            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Unboxed Metadata Line */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-sky-700">{platMeta.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{item.params.crsEpsg}</span>
                    <span aria-hidden="true">·</span>
                    <span>Disimpan {item.createdAt}</span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900">{item.title}</h2>

                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    Wilayah: {item.params.regionName} · BBox [{item.params.bbox.minLon}, {item.params.bbox.minLat}, {item.params.bbox.maxLon}, {item.params.bbox.maxLat}]
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-36">
                    <code>{previewLines}</code>
                  </pre>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onDeleteSavedScript(item.id)}
                    aria-label={`Hapus '${item.title}'`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDownloadSavedScript(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh {platMeta.fileExtension}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadSavedScript(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors"
                    >
                      Buka di Editor
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
