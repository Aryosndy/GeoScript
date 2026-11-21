/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  GIS_TEMPLATES,
  PLATFORM_DEFINITIONS,
  REGION_PRESETS,
  SPECTRAL_INDEX_DEFINITIONS,
  generateGisScript,
  validateScriptParameters,
  type BoundingBox,
  type GisPlatformId,
  type GisTemplate,
  type LatLngVertex,
  type RegionPreset,
  type SatelliteSensorId,
  type ScriptParameters,
  type SpatialFileSummary,
  type SpectralIndexId,
  type WorkflowCategoryId,
} from './utils/gisEngine';
import { InteractiveAoiMap } from './components/InteractiveAoiMap';
import { SpatialFileImporter } from './components/SpatialFileImporter';
import { SpatialMotionGraph } from './components/SpatialMotionGraph';
import { CodeViewerPanel } from './components/CodeViewerPanel';
import { TutorialsCatalogView } from './components/TutorialsCatalogView';
import { SpectralAndCrsToolbox } from './components/SpectralAndCrsToolbox';
import { SavedScriptsView, type SavedScriptItem } from './components/SavedScriptsView';
import { GeoGeminiChatbot } from './components/GeoGeminiChatbot';
import { CoastalHydroWorkbench } from './components/CoastalHydroWorkbench';
import type { MapVisualizationResult } from './utils/mapVisualizerEngine';
import { loadRealEoGrid, type RealEoGrid } from './utils/realEoGridLoader';
import { Download, SlidersHorizontal, Search } from 'lucide-react';

type ActiveSection = 'studio' | 'tutorials' | 'toolbox' | 'saved';

const INITIAL_PARAMS: ScriptParameters = {
  regionName: REGION_PRESETS[0].name,
  bbox: { ...REGION_PRESETS[0].bbox },
  crsEpsg: REGION_PRESETS[0].recommendedEpsg,
  startDate: '2026-01-01',
  endDate: '2026-10-31',
  maxCloudCover: 20,
  sensor: 'S2_SR',
  spectralIndex: 'NDVI',
  bufferDistanceMeters: 500,
  inputLayerPath: 'data/batas_wilayah_studi.gpkg',
  outputLayerPath: 'output/hasil_pemetaan_spasial.gpkg',
  spatialResolutionMeters: 10,
  thresholdValue: 0.35,
  includeVisualization: true,
  includeExport: true,
  pipelineSteps: ['Cloud Masking', 'Clip AOI', 'Hitung Indeks', 'Hitung Luas (Ha)', 'Ekspor GeoTIFF/GPKG'],
};

const SEEDED_SAVED_SCRIPTS: SavedScriptItem[] = [
  {
    id: 'seed-1',
    title: 'NDVI Sentinel-2 — Ibu Kota Nusantara (IKN) & Teluk Balikpapan',
    templateId: 'spectral-vegetation-monitoring',
    platformId: 'gee-js',
    params: {
      ...INITIAL_PARAMS,
      regionName: REGION_PRESETS[1].name,
      bbox: { ...REGION_PRESETS[1].bbox },
      crsEpsg: REGION_PRESETS[1].recommendedEpsg,
      spectralIndex: 'NDVI',
      sensor: 'S2_SR',
    },
    code: generateGisScript('spectral-vegetation-monitoring', 'gee-js', {
      ...INITIAL_PARAMS,
      regionName: REGION_PRESETS[1].name,
      bbox: { ...REGION_PRESETS[1].bbox },
      crsEpsg: REGION_PRESETS[1].recommendedEpsg,
    }),
    createdAt: '12 Nov 2026',
  },
  {
    id: 'seed-2',
    title: 'Buffer Sempadan Sungai 500m & Luas Hektar — DAS Citarum Hulu',
    templateId: 'vector-buffer-zonal-stats',
    platformId: 'python-gis',
    params: {
      ...INITIAL_PARAMS,
      regionName: REGION_PRESETS[2].name,
      bbox: { ...REGION_PRESETS[2].bbox },
      crsEpsg: REGION_PRESETS[2].recommendedEpsg,
      bufferDistanceMeters: 500,
    },
    code: generateGisScript('vector-buffer-zonal-stats', 'python-gis', {
      ...INITIAL_PARAMS,
      regionName: REGION_PRESETS[2].name,
      bbox: { ...REGION_PRESETS[2].bbox },
      crsEpsg: REGION_PRESETS[2].recommendedEpsg,
    }),
    createdAt: '12 Nov 2026',
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('studio');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(GIS_TEMPLATES[0].id);
  const [selectedPlatform, setSelectedPlatform] = useState<GisPlatformId>('gee-js');
  const [categoryFilter, setCategoryFilter] = useState<WorkflowCategoryId>('all');
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [params, setParams] = useState<ScriptParameters>(INITIAL_PARAMS);
  const [savedScripts, setSavedScripts] = useState<SavedScriptItem[]>(SEEDED_SAVED_SCRIPTS);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [liveVizResult, setLiveVizResult] = useState<MapVisualizationResult | null>(null);
  const [realEoGrid, setRealEoGrid] = useState<RealEoGrid | null>(null);
  const [isRunningViz, setIsRunningViz] = useState<boolean>(false);
  const [vizRunError, setVizRunError] = useState<string | null>(null);
  const [runSignal, setRunSignal] = useState<number>(0);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const coastalSectionRef = useRef<HTMLDivElement | null>(null);
  const eoFetchRequestIdRef = useRef<number>(0);

  // Google Maps Platform Tier 1 Demo Key Quota Exceeded Listener
  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const handleRunVisualization = useCallback(
    async (options?: { scrollToMap?: boolean; forceRefresh?: boolean }) => {
      if (options?.scrollToMap && mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const requestId = ++eoFetchRequestIdRef.current;
      setIsRunningViz(true);
      setVizRunError(null);
      try {
        const grid = await loadRealEoGrid(params.bbox, {
          gridSize: 160,
          forceRefresh: options?.forceRefresh,
        });
        if (requestId === eoFetchRequestIdRef.current) {
          setRealEoGrid(grid);
          setRunSignal((n) => n + 1);
        }
      } catch (err) {
        if (requestId === eoFetchRequestIdRef.current) {
          setVizRunError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat data DEM & optik real untuk area ini.'
          );
        }
      } finally {
        if (requestId === eoFetchRequestIdRef.current) {
          setIsRunningViz(false);
        }
      }
    },
    [params.bbox]
  );

  // Muat grid EO real secara otomatis saat bbox berubah (debounced 220ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleRunVisualization({ forceRefresh: false });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [handleRunVisualization]);

  const activeTemplate = useMemo(
    () => GIS_TEMPLATES.find((t) => t.id === selectedTemplateId) || GIS_TEMPLATES[0],
    [selectedTemplateId]
  );

  const filteredTemplates = useMemo(() => {
    return GIS_TEMPLATES.filter((t) => {
      const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesQuery =
        templateSearch.trim() === '' ||
        t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.subtitle.toLowerCase().includes(templateSearch.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [categoryFilter, templateSearch]);

  const validation = useMemo(() => validateScriptParameters(params), [params]);

  const generatedCode = useMemo(
    () => generateGisScript(activeTemplate.id, selectedPlatform, params),
    [activeTemplate.id, selectedPlatform, params]
  );

  const handleSelectTemplate = (tpl: GisTemplate) => {
    setSelectedTemplateId(tpl.id);
    if (
      tpl.id === 'coastal-wave-swan' ||
      tpl.id === 'uav-agisoft-metashape' ||
      tpl.id === 'uav-pix4d-photogrammetry' ||
      tpl.id === 'tidal-analysis-harmonics' ||
      tpl.id === 'shoreline-slope-erosion' ||
      tpl.id === 'hydrodynamic-2d-current' ||
      tpl.id === 'tss-turbidity-mapping' ||
      tpl.id === 'bathymetry-cross-section' ||
      tpl.id === 'big-tidal-prediction' ||
      tpl.id === 'coastal-abrasion-accretion-dsas' ||
      tpl.id === 'marine-spatial-wpp-conservation'
    ) {
      setSelectedPlatform(tpl.defaultPlatform);
    }
    setParams((prev) => ({
      ...prev,
      ...(tpl.defaultParams.sensor ? { sensor: tpl.defaultParams.sensor } : {}),
      ...(tpl.defaultParams.spectralIndex ? { spectralIndex: tpl.defaultParams.spectralIndex } : {}),
      ...(tpl.defaultParams.maxCloudCover !== undefined
        ? { maxCloudCover: tpl.defaultParams.maxCloudCover }
        : {}),
      ...(tpl.defaultParams.spatialResolutionMeters !== undefined
        ? { spatialResolutionMeters: tpl.defaultParams.spatialResolutionMeters }
        : {}),
      ...(tpl.defaultParams.thresholdValue !== undefined
        ? { thresholdValue: tpl.defaultParams.thresholdValue }
        : {}),
      ...(tpl.defaultParams.bufferDistanceMeters !== undefined
        ? { bufferDistanceMeters: tpl.defaultParams.bufferDistanceMeters }
        : {}),
      ...(tpl.defaultParams.inputLayerPath ? { inputLayerPath: tpl.defaultParams.inputLayerPath } : {}),
      ...(tpl.defaultParams.outputLayerPath ? { outputLayerPath: tpl.defaultParams.outputLayerPath } : {}),
    }));
  };

  const handleSelectRegionPreset = (preset: RegionPreset) => {
    setParams((prev) => ({
      ...prev,
      regionName: preset.name,
      bbox: { ...preset.bbox },
      crsEpsg: preset.recommendedEpsg,
      customPolygon: undefined,
      uploadedFileSummary: undefined,
    }));
  };

  const handleUpdateBbox = (
    newBbox: BoundingBox,
    suggestedEpsg?: string,
    customName?: string
  ) => {
    setParams((prev) => ({
      ...prev,
      bbox: newBbox,
      ...(suggestedEpsg ? { crsEpsg: suggestedEpsg } : {}),
      ...(customName ? { regionName: customName } : {}),
    }));
  };

  const handleUpdateCustomPolygon = (
    vertices: LatLngVertex[] | undefined,
    updatedBbox?: BoundingBox,
    suggestedEpsg?: string,
    customName?: string
  ) => {
    setParams((prev) => ({
      ...prev,
      customPolygon: vertices,
      ...(updatedBbox ? { bbox: updatedBbox } : {}),
      ...(suggestedEpsg ? { crsEpsg: suggestedEpsg } : {}),
      ...(customName ? { regionName: customName } : {}),
    }));
  };

  const handleSpatialFileLoaded = (summary: SpatialFileSummary) => {
    setParams((prev) => ({
      ...prev,
      regionName: `File: ${summary.fileName}`,
      bbox: summary.bbox,
      crsEpsg: summary.recommendedEpsg,
      customPolygon: summary.vertices.length >= 3 ? summary.vertices : undefined,
      inputLayerPath: `data/${summary.fileName}`,
      uploadedFileSummary: summary,
    }));
  };

  const handleClearSpatialFile = () => {
    setParams((prev) => ({
      ...prev,
      customPolygon: undefined,
      uploadedFileSummary: undefined,
    }));
  };

  const handleTogglePipelineStep = (stepName: string) => {
    setParams((prev) => {
      const exists = prev.pipelineSteps.includes(stepName);
      const nextSteps = exists
        ? prev.pipelineSteps.filter((s) => s !== stepName)
        : [...prev.pipelineSteps, stepName];
      return { ...prev, pipelineSteps: nextSteps };
    });
  };

  const triggerDownload = (codeText: string, titleText: string, platformId: GisPlatformId) => {
    const platMeta =
      PLATFORM_DEFINITIONS.find((p) => p.id === platformId) || PLATFORM_DEFINITIONS[0];
    const safeName = titleText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const filename = `geoscript_${safeName}${platMeta.fileExtension}`;
    const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveCurrentScript = () => {
    const newItem: SavedScriptItem = {
      id: `saved-${Date.now()}`,
      title: `${activeTemplate.title} — ${params.regionName}`,
      templateId: activeTemplate.id,
      platformId: selectedPlatform,
      params: {
        ...params,
        bbox: { ...params.bbox },
        pipelineSteps: [...params.pipelineSteps],
        customPolygon: params.customPolygon ? [...params.customPolygon] : undefined,
      },
      code: generatedCode,
      createdAt: 'Baru saja',
    };
    setSavedScripts((prev) => [newItem, ...prev]);
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen flex flex-col text-slate-800">
      {/* Google Maps Platform Tier 1 Demo Key Quota Exceeded Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm flex items-center justify-between">
          <span>
            The shared Google Maps demo key has reached its daily quota. Ask the AI Studio agent to switch to your own Google Cloud project key, or add your key in <b>Settings &rarr; Secrets</b> as <code>GOOGLE_MAPS_PLATFORM_KEY</code>.
          </span>
        </div>
      )}

      {/* Top Bar Contract: Strictly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/75 px-6 py-3.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('studio');
            }}
            className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            GeoScript Studio
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav
            aria-label="Navigasi Utama"
            className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto"
          >
            <a
              href="#studio"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('studio');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'studio'
                  ? 'text-slate-900 font-semibold underline decoration-sky-600 decoration-2 underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Studio Script
            </a>
            <a
              href="#hidrodinamika-pasut"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('studio');
                window.setTimeout(() => {
                  coastalSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }}
              className="py-1 transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 text-teal-700 font-semibold"
            >
              Hidrodinamika & Pasut BIG
            </a>
            <a
              href="#panduan"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('tutorials');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'tutorials'
                  ? 'text-slate-900 font-semibold underline decoration-sky-600 decoration-2 underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Panduan GIS
            </a>
            <a
              href="#kalkulator"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('toolbox');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'toolbox'
                  ? 'text-slate-900 font-semibold underline decoration-sky-600 decoration-2 underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Kalkulator Spektral
            </a>
            <a
              href="#koleksi"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('saved');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'saved'
                  ? 'text-slate-900 font-semibold underline decoration-sky-600 decoration-2 underline-offset-8'
                  : 'hover:text-slate-900'
              }`}
            >
              Koleksi Tersimpan ({savedScripts.length})
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                triggerDownload(
                  generatedCode,
                  `${activeTemplate.id}_${params.regionName}`,
                  selectedPlatform
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Script Aktif
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
        {activeSection === 'studio' && (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Soft Studio Header Banner */}
            <section className="bg-gradient-to-br from-white/95 via-white/90 to-sky-50/60 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-6 shadow-[0_6px_28px_-12px_rgba(15,23,42,0.08)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-teal-700">Geospatial & UAV Workbench</span>
                  <span aria-hidden="true">·</span>
                  <span>Google Maps & Esri Basemap</span>
                  <span aria-hidden="true">·</span>
                  <span>Python / GEE / PyQGIS / ArcPy</span>
                  <span aria-hidden="true">·</span>
                  <span>SWAN · Pasut</span>
                  <span aria-hidden="true">·</span>
                  <span>Agisoft & Pix4D Drone</span>
                  <span aria-hidden="true">·</span>
                  <span>Visualisasi Peta Langsung & Ekspor JPG</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                  Pembuat Script Pemetaan, Visualisasi Peta Langsung & Drone
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Gunakan lokasi GPS saat ini, tampilkan hasil visualisasi indeks & pemodelan langsung di peta website tanpa harus membuka GEE, pantau Motion Graph, hasilkan script GIS/SWAN/Drone, serta ekspor JPG dan laporan teknis.
                </p>
              </div>

              {/* Quick Key Metrics Strip */}
              <div className="grid grid-cols-3 gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200/80 lg:pl-6 shrink-0">
                <div>
                  <div className="text-xs text-slate-500">Platform GIS</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                    {PLATFORM_DEFINITIONS.length} Platform
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Mode Geometri</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-teal-700">
                    {params.customPolygon && params.customPolygon.length >= 3
                      ? `Poligon (${params.customPolygon.length} ttk)`
                      : 'Kotak BBox'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Proyeksi Aktif</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-sky-700">
                    {params.crsEpsg}
                  </div>
                </div>
              </div>
            </section>

            {/* Full-Width Interactive AOI Map Centerpiece (Google Maps & Esri Basemaps + Live Spatial Layer) */}
            <div id="interactive-aoi-map-section" ref={mapSectionRef} className="w-full">
              <InteractiveAoiMap
                activeTemplateId={activeTemplate.id}
                platformId={selectedPlatform}
                params={params}
                regionName={params.regionName}
                bbox={params.bbox}
                crsEpsg={params.crsEpsg}
                bufferDistanceMeters={params.bufferDistanceMeters}
                customPolygon={params.customPolygon}
                realEoGrid={realEoGrid}
                isRunningViz={isRunningViz}
                vizRunError={vizRunError}
                runSignal={runSignal}
                onSelectPreset={handleSelectRegionPreset}
                onUpdateBbox={handleUpdateBbox}
                onUpdateCustomPolygon={handleUpdateCustomPolygon}
                onVisualizationChange={setLiveVizResult}
                onRunVisualization={() => void handleRunVisualization({ forceRefresh: true })}
              />
            </div>

            {/* Full-Width Coastal & Hydro-Oceanography Workbench (BIG Tide, Bathymetry Cross-Section, 2D Current, TSS, DSAS) */}
            <div id="hidrodinamika-pasut" ref={coastalSectionRef} className="w-full">
              <CoastalHydroWorkbench
                params={params}
                realEoGrid={realEoGrid}
                activeTemplateId={activeTemplate.id}
                onActivateCoastalModel={(tplId, platId, nextThreshold) => {
                  const found = GIS_TEMPLATES.find((t) => t.id === tplId);
                  if (found) {
                    handleSelectTemplate(found);
                  } else {
                    setSelectedTemplateId(tplId);
                  }
                  setSelectedPlatform(platId);
                  if (nextThreshold !== undefined) {
                    setParams((prev) => ({ ...prev, thresholdValue: nextThreshold }));
                  }
                  void handleRunVisualization({ scrollToMap: true, forceRefresh: false });
                }}
              />
            </div>

            {/* 2-Column Studio Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Workflow Selector + Spatial File Importer + Parameter Form (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Template Library Selector */}
                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)] space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">
                      01. Pilih Alur Kerja Pemetaan ({filteredTemplates.length})
                    </h2>
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        aria-label="Filter daftar alur kerja"
                        placeholder="Cari modul..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50/90 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/40"
                      />
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Semua' },
                        { id: 'remote-sensing', label: 'Indraja' },
                        { id: 'vector-analysis', label: 'Vektor' },
                        { id: 'hydrology-terrain', label: 'Hidrologi/DEM' },
                        { id: 'cartography-automation', label: 'Kartografi' },
                      ] as { id: WorkflowCategoryId; label: string }[]
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                          categoryFilter === cat.id
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Template List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredTemplates.map((tpl) => {
                      const isSelected = tpl.id === activeTemplate.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-teal-50/75 border-teal-500/60 text-slate-900 shadow-xs'
                              : 'bg-white/80 border-slate-200/80 hover:bg-slate-50/90 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-0.5">
                            <span className="font-medium text-teal-700">{tpl.categoryLabel}</span>
                            <span>
                              {tpl.difficulty} · {tpl.primarySensorOrFormat}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900">{tpl.title}</div>
                          <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                            {tpl.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Spatial File Importer & Sample Dataset Loader */}
                <SpatialFileImporter
                  activeFileSummary={params.uploadedFileSummary}
                  onSpatialFileLoaded={handleSpatialFileLoaded}
                  onClearSpatialFile={handleClearSpatialFile}
                />

                {/* 4. Parameter Configuration Form */}
                <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)] space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-teal-700" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      02. Parameter Pengolahan Data & Sensor
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="param-sensor" className="block text-xs font-medium text-slate-700 mb-1">
                        Sensor Satelit / Dataset
                      </label>
                      <select
                        id="param-sensor"
                        value={params.sensor}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            sensor: e.target.value as SatelliteSensorId,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      >
                        <option value="S2_SR">Sentinel-2 MSI Level-2A (10m)</option>
                        <option value="LANDSAT_8_9">Landsat 8/9 OLI-TIRS C2 L2 (30m)</option>
                        <option value="SENTINEL_1_SAR">Sentinel-1 SAR C-Band GRD (10m)</option>
                        <option value="MODIS_TERRA">MODIS Terra MOD09GA (250m)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="param-index" className="block text-xs font-medium text-slate-700 mb-1">
                        Indeks Spektral / Formula Band
                      </label>
                      <select
                        id="param-index"
                        value={params.spectralIndex}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            spectralIndex: e.target.value as SpectralIndexId,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      >
                        {SPECTRAL_INDEX_DEFINITIONS.map((idxDef) => (
                          <option key={idxDef.id} value={idxDef.id}>
                            {idxDef.id} — {idxDef.indonesianName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="param-start-date" className="block text-xs font-medium text-slate-700 mb-1">
                        Tanggal Mulai Akuisisi
                      </label>
                      <input
                        id="param-start-date"
                        type="date"
                        value={params.startDate}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-end-date" className="block text-xs font-medium text-slate-700 mb-1">
                        Tanggal Akhir Akuisisi
                      </label>
                      <input
                        id="param-end-date"
                        type="date"
                        value={params.endDate}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-crs" className="block text-xs font-medium text-slate-700 mb-1">
                        Sistem Proyeksi (CRS / EPSG)
                      </label>
                      <select
                        id="param-crs"
                        value={params.crsEpsg}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, crsEpsg: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      >
                        <option value="EPSG:4326">EPSG:4326 — WGS 84 Geografis (Derajat)</option>
                        <option value="EPSG:32646">EPSG:32646 — UTM Zone 46N (Aceh)</option>
                        <option value="EPSG:32647">EPSG:32647 — UTM Zone 47N (Sumut/Riau)</option>
                        <option value="EPSG:32747">EPSG:32747 — UTM Zone 47S (Sumbar/Jambi)</option>
                        <option value="EPSG:32748">EPSG:32748 — UTM Zone 48S (Jakarta/Jabar/Sumsel)</option>
                        <option value="EPSG:32749">EPSG:32749 — UTM Zone 49S (Jateng/Jatim/Kalbar)</option>
                        <option value="EPSG:32750">EPSG:32750 — UTM Zone 50S (Bali/IKN Kaltim/Sulsel)</option>
                        <option value="EPSG:32751">EPSG:32751 — UTM Zone 51S (NTT/Sulawesi/Maluku)</option>
                        <option value="EPSG:32752">EPSG:32752 — UTM Zone 52S (Ambon/Raja Ampat)</option>
                        <option value="EPSG:32753">EPSG:32753 — UTM Zone 53S (Papua Barat/Timika)</option>
                        <option value="EPSG:32754">EPSG:32754 — UTM Zone 54S (Jayapura/Wamena/Merauke)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="param-cloud" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                        <span>Batas Tutupan Awan Maks.</span>
                        <span className="font-mono tabular-nums text-sky-700">{params.maxCloudCover}%</span>
                      </label>
                      <input
                        id="param-cloud"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={params.maxCloudCover}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            maxCloudCover: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-sky-600 mt-1.5"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-resolution" className="block text-xs font-medium text-slate-700 mb-1">
                        Resolusi Spasial / Skala (Meter)
                      </label>
                      <input
                        id="param-resolution"
                        type="number"
                        min="1"
                        max="1000"
                        value={params.spatialResolutionMeters}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            spatialResolutionMeters: parseInt(e.target.value, 10) || 10,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-buffer" className="block text-xs font-medium text-slate-700 mb-1">
                        Jarak Buffer Vektor (Meter)
                      </label>
                      <input
                        id="param-buffer"
                        type="number"
                        min="10"
                        max="50000"
                        step="50"
                        value={params.bufferDistanceMeters}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            bufferDistanceMeters: parseInt(e.target.value, 10) || 100,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-threshold" className="block text-xs font-medium text-slate-700 mb-1">
                        Nilai Ambang (Threshold Klasifikasi)
                      </label>
                      <input
                        id="param-threshold"
                        type="number"
                        step="0.05"
                        value={params.thresholdValue}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            thresholdValue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="param-output" className="block text-xs font-medium text-slate-700 mb-1">
                        Path File Output (.gpkg / .tif)
                      </label>
                      <input
                        id="param-output"
                        type="text"
                        value={params.outputLayerPath}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, outputLayerPath: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>

                  {/* Checkboxes for Visualization and Export */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-5 text-xs text-slate-700">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.includeVisualization}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            includeVisualization: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                      />
                      <span>Sertakan Kode Simbologi & Visualisasi Peta</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params.includeExport}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            includeExport: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                      />
                      <span>Sertakan Blok Ekspor (GeoTIFF / Google Drive / GPKG)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Motion Graph + Code Generator & Step-by-Step Guide (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <SpatialMotionGraph
                  template={activeTemplate}
                  platformId={selectedPlatform}
                  params={params}
                />

                <CodeViewerPanel
                  template={activeTemplate}
                  platformId={selectedPlatform}
                  params={params}
                  generatedCode={generatedCode}
                  validationErrors={validation.errors}
                  isRunningViz={isRunningViz}
                  realEoGrid={realEoGrid}
                  onSelectPlatform={setSelectedPlatform}
                  onSaveScript={handleSaveCurrentScript}
                  onDownloadScript={() =>
                    triggerDownload(
                      generatedCode,
                      `${activeTemplate.id}_${params.regionName}`,
                      selectedPlatform
                    )
                  }
                  onTogglePipelineStep={handleTogglePipelineStep}
                  onRunOnMap={() =>
                    void handleRunVisualization({ scrollToMap: true, forceRefresh: true })
                  }
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'tutorials' && (
          <motion.div
            key="tutorials"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <TutorialsCatalogView
              onLoadTemplateIntoStudio={(tpl, platform) => {
                handleSelectTemplate(tpl);
                setSelectedPlatform(platform);
                setActiveSection('studio');
              }}
            />
          </motion.div>
        )}

        {activeSection === 'toolbox' && (
          <motion.div
            key="toolbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <SpectralAndCrsToolbox
              activeSensor={params.sensor}
              activeIndex={params.spectralIndex}
              onApplyIndexAndSensor={(indexId, sensorId) => {
                setParams((prev) => ({
                  ...prev,
                  spectralIndex: indexId,
                  sensor: sensorId,
                }));
                setSelectedTemplateId('spectral-vegetation-monitoring');
                setActiveSection('studio');
              }}
              onApplyCustomCoordinates={(newBbox, epsg, label) => {
                setParams((prev) => ({
                  ...prev,
                  bbox: newBbox,
                  crsEpsg: epsg,
                  regionName: label,
                  customPolygon: undefined,
                }));
                setActiveSection('studio');
              }}
              onApplyShorelineSlope={(slopeDeg, transectMeters) => {
                setSelectedTemplateId('shoreline-slope-erosion');
                setSelectedPlatform('python-gis');
                setParams((prev) => ({
                  ...prev,
                  thresholdValue: slopeDeg,
                  bufferDistanceMeters: Math.max(50, transectMeters),
                  spectralIndex: 'AWEI',
                }));
                setActiveSection('studio');
              }}
            />
          </motion.div>
        )}

        {activeSection === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <SavedScriptsView
              savedScripts={savedScripts}
              onLoadSavedScript={(item) => {
                setSelectedTemplateId(item.templateId);
                setSelectedPlatform(item.platformId);
                setParams({ ...item.params });
                setActiveSection('studio');
              }}
              onDeleteSavedScript={(id) =>
                setSavedScripts((prev) => prev.filter((item) => item.id !== id))
              }
              onDownloadSavedScript={(item) =>
                triggerDownload(item.code, item.title, item.platformId)
              }
              onSwitchToStudio={() => setActiveSection('studio')}
            />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xs px-6 py-4 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            GeoScript Studio — Pembuat Script Pemetaan, Pasang Surut, SWAN, Agisoft Metashape, Pix4Dmapper & Laporan JPG
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('studio')}
              className="hover:text-slate-900 transition-colors"
            >
              Studio Script
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('tutorials')}
              className="hover:text-slate-900 transition-colors"
            >
              Panduan GIS
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('toolbox')}
              className="hover:text-slate-900 transition-colors"
            >
              Kalkulator Spektral & UTM
            </button>
          </div>
        </div>
      </footer>
      {/* Floating Multi-Turn Gemini GIS Chatbot */}
      <GeoGeminiChatbot
        studioContext={{
          regionName: params.regionName,
          templateTitle: activeTemplate.title,
          platformLabel:
            PLATFORM_DEFINITIONS.find((p) => p.id === selectedPlatform)?.label || selectedPlatform,
          crsEpsg: params.crsEpsg,
          spectralIndex: params.spectralIndex,
          sensor: params.sensor,
          thresholdValue: params.thresholdValue,
          vizSummary: liveVizResult
            ? `${liveVizResult.stats.modeTitle} (Min ${liveVizResult.stats.minLabel}, Mean ${liveVizResult.stats.meanLabel}, Max ${liveVizResult.stats.maxLabel}, ${liveVizResult.stats.passingLabel}: ${liveVizResult.stats.passingPercent}% / ${liveVizResult.stats.passingAreaHa} Ha)`
            : undefined,
        }}
      />
    </div>
    </MotionConfig>
  );
}
