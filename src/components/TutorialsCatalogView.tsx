import React, { useState } from 'react';
import {
  GIS_TEMPLATES,
  PLATFORM_DEFINITIONS,
  type GisPlatformId,
  type GisTemplate,
  type WorkflowCategoryId,
} from '../utils/gisEngine';
import { ArrowUpRight, BookOpen, Layers, Search } from 'lucide-react';

interface TutorialsCatalogViewProps {
  onLoadTemplateIntoStudio: (template: GisTemplate, platform: GisPlatformId) => void;
}

const CATEGORIES: { id: WorkflowCategoryId; label: string }[] = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'remote-sensing', label: 'Penginderaan Jauh' },
  { id: 'vector-analysis', label: 'Analisis Vektor & Overlay' },
  { id: 'hydrology-terrain', label: 'Hidrologi & Kebencanaan' },
  { id: 'cartography-automation', label: 'Kartografi & Layout' },
];

export const TutorialsCatalogView: React.FC<TutorialsCatalogViewProps> = ({
  onLoadTemplateIntoStudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategoryId>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<GisPlatformId>('pyqgis');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = GIS_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activePlatformMeta =
    PLATFORM_DEFINITIONS.find((p) => p.id === selectedPlatform) || PLATFORM_DEFINITIONS[0];

  return (
    <section className="space-y-6" aria-labelledby="tutorials-heading">
      {/* Header & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 id="tutorials-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
              Panduan & Tutorial Pengolahan Data Spasial
            </h1>
            <p className="text-sm text-slate-600">
              Pelajari alur kerja langkah demi langkah untuk QGIS Desktop, ArcGIS Pro, Google Earth Engine, Python GeoPandas/Rasterio, serta PostGIS/GDAL, lalu buka langsung di Studio Script Maker.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Cari tutorial atau alur kerja GIS"
              placeholder="Cari NDVI, Banjir SAR, Buffer, LST, Atlas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        </div>

        {/* Category & Platform Segmented Selectors */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter Kategori Modul">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Pilih Perangkat Lunak Tutorial">
            <span className="text-xs font-medium text-slate-500 mr-1">Tampilkan Langkah untuk:</span>
            {PLATFORM_DEFINITIONS.map((plat) => (
              <button
                key={plat.id}
                type="button"
                onClick={() => setSelectedPlatform(plat.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedPlatform === plat.id
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {plat.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tutorials Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            Tidak ada panduan yang cocok dengan pencarian "{searchQuery}"
          </h2>
          <p className="text-sm text-slate-500">
            Coba kata kunci lain seperti NDVI, SAR, Buffer, DEM, atau pilih Semua Kategori.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredTemplates.map((tpl, index) => {
            const steps =
              tpl.tutorialsByPlatform[selectedPlatform] ||
              tpl.tutorialsByPlatform[tpl.defaultPlatform] ||
              [];
            return (
              <article
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-sky-700">
                      0{index + 1}. {tpl.categoryLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Tingkat {tpl.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">~{tpl.estimatedMinutes} menit</span>
                    <span aria-hidden="true">·</span>
                    <span>{tpl.primarySensorOrFormat}</span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {tpl.title}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{tpl.overview}</p>

                  {/* Platform Specific Tutorial Steps */}
                  <div className="pt-2 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-700" />
                      <span>Alur Eksekusi di {activePlatformMeta.label}:</span>
                    </div>
                    <ol className="space-y-2">
                      {steps.map((step) => (
                        <li
                          key={step.stepNumber}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              Langkah {step.stepNumber}: {step.title}
                            </span>
                            {step.menuPath && (
                              <code className="font-mono text-[11px] text-sky-800">
                                {step.menuPath}
                              </code>
                            )}
                          </div>
                          <p className="text-slate-600 leading-relaxed">{step.instruction}</p>
                          {step.proTip && (
                            <p className="text-slate-500 italic pt-0.5">
                              Tips: {step.proTip}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Card Footer CTA */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Hasil: <span className="text-slate-700 font-medium">{tpl.expectedOutput}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadTemplateIntoStudio(tpl, selectedPlatform)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Buka di Studio Script ({activePlatformMeta.shortLabel})
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
