import React, { useRef, useState } from 'react';
import {
  SAMPLE_SPATIAL_FILES,
  parseUploadedSpatialFile,
  type SpatialFileSummary,
} from '../utils/gisEngine';
import {
  FileUp,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  FileCode2,
} from 'lucide-react';

interface SpatialFileImporterProps {
  activeFileSummary?: SpatialFileSummary | null;
  onSpatialFileLoaded: (summary: SpatialFileSummary) => void;
  onClearSpatialFile: () => void;
}

export const SpatialFileImporter: React.FC<SpatialFileImporterProps> = ({
  activeFileSummary,
  onSpatialFileLoaded,
  onClearSpatialFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFileGuide, setShowFileGuide] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const processFileText = (fileName: string, rawContent: string) => {
    try {
      setErrorMsg(null);
      const parsed = parseUploadedSpatialFile(fileName, rawContent);
      onSpatialFileLoaded(parsed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal membaca file spasial. Pastikan format GeoJSON, KML, CSV, atau WKT valid.'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processFileText(file.name, reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari perangkat Anda.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processFileText(file.name, reader.result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)] space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Impor File Spasial Lokal & Contoh Dataset AOI
          </h2>
          <p className="text-xs text-slate-500">
            Unggah file batas wilayah (.geojson, .kml, .csv titik koordinat, .wkt) untuk mengekstrak poligon AOI, kolom atribut, dan proyeksi UTM otomatis ke dalam script.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFileGuide((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
          {showFileGuide ? 'Tutup Panduan File' : 'File Apa Saja yang Didukung?'}
        </button>
      </div>

      {/* Answer to user's question: "jika butuh file lainnya lagi beritahu saya" */}
      {showFileGuide && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 space-y-2">
          <div className="font-semibold text-slate-900">
            Daftar File Spasial yang Dapat Anda Gunakan di GeoScript Studio:
          </div>
          <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
            <li>
              <strong className="text-slate-900">1. GeoJSON (`.geojson` / `.json`) — Langsung Diimpor di Web:</strong>{' '}
              Poligon batas wilayah studi (DAS, IUP, KIPP, Kabupaten) atau titik sampel. Koordinat poligon dan nama kolom atribut akan langsung disuntikkan ke dalam script GEE, Python, QGIS, dan PostGIS.
            </li>
            <li>
              <strong className="text-slate-900">2. KML Google Earth (`.kml`) & WKT (`.wkt` / `.txt`) — Langsung Diimpor di Web:</strong>{' '}
              File ekspor dari Google Earth Pro atau teks geometri `POLYGON((...))`. Sistem otomatis mengekstrak titik sudut (vertices) dan menampilkan poligon di atas peta Google/Esri.
            </li>
            <li>
              <strong className="text-slate-900">3. Tabel Titik Koordinat Lapangan (`.csv`) — Langsung Diimpor di Web:</strong>{' '}
              File CSV yang memiliki kolom `lat`/`latitude`/`lintang` dan `lon`/`longitude`/`bujur` (contoh: titik stasiun kualitas air, plot sampel kehutanan, atau titik bor).
            </li>
            <li>
              <strong className="text-slate-900">4. Shapefile (`.shp/.dbf/.shx`), GeoPackage (`.gpkg`), & Raster DEM/Citra (`.tif`):</strong>{' '}
              Untuk file biner berukuran besar di komputer lokal Anda, cukup masukkan nama file pada kolom <em>Path File Input/Output</em> di bawah atau konversi batas AOI-nya ke `.geojson` di QGIS agar bentuk poligonnya tampil di peta interaktif ini.
            </li>
          </ul>
        </div>
      )}

      {/* Drag and drop / file upload zone + Sample Dataset Quick Loaders */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
          isDragging
            ? 'border-teal-500 bg-teal-50/60'
            : 'border-slate-200/90 bg-slate-50/60 hover:border-slate-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.kml,.csv,.wkt,.txt"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Unggah file spasial (.geojson, .kml, .csv, .wkt)"
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Tarik & Lepas File Spasial atau Klik Pilih File
              </div>
              <div className="text-[11px] text-slate-500">
                Mendukung <span className="font-mono">.geojson</span>, <span className="font-mono">.kml</span>, <span className="font-mono">.csv (lat,lon)</span>, dan <span className="font-mono">.wkt</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Pilih File Lokal...
          </button>
        </div>

        {/* 3 Built-in Real Sample Spatial Files for instant interactive testing */}
        <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 mr-1">
            Atau muat contoh file siap uji:
          </span>
          {SAMPLE_SPATIAL_FILES.map((sample) => {
            const isLoaded = activeFileSummary?.fileName === sample.fileName;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => processFileText(sample.fileName, sample.content)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  isLoaded
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FileCode2 className="w-3 h-3" />
                {sample.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeFileSummary && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-mono font-semibold text-emerald-950">
                {activeFileSummary.fileName}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 rounded-md">
                {activeFileSummary.formatLabel} · {activeFileSummary.geometryType} ({activeFileSummary.featureCount} fitur)
              </span>
            </div>
            {activeFileSummary.attributeColumns.length > 0 && (
              <div className="text-[11px] text-emerald-800 pl-6">
                Kolom Atribut Terdeteksi:{' '}
                <span className="font-mono">
                  {activeFileSummary.attributeColumns.join(', ')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClearSpatialFile}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus File
          </button>
        </div>
      )}
    </div>
  );
};
