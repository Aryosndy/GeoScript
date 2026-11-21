import React, { useMemo, useRef, useState } from 'react';
import {
  BIG_TIDE_STATIONS,
  computeCoastalHydroSummary,
  extractBathymetryCrossSection,
  findNearestBigStation,
  predictBigTideSeries,
} from '../utils/coastalHydroEngine';
import type { BoundingBox, GisPlatformId, ScriptParameters } from '../utils/gisEngine';
import type { RealEoGrid } from '../utils/realEoGridLoader';
import {
  Waves,
  Compass,
  Download,
  Play,
  Activity,
  Droplets,
  TrendingDown,
  Layers,
  MapPin,
} from 'lucide-react';

interface CoastalHydroWorkbenchProps {
  params: ScriptParameters;
  realEoGrid: RealEoGrid | null;
  activeTemplateId: string;
  onActivateCoastalModel: (
    templateId: string,
    platformId: GisPlatformId,
    updatedThreshold?: number,
    updatedBbox?: BoundingBox,
    updatedEpsg?: string,
    updatedRegionName?: string
  ) => void;
}

type WorkbenchTabId = 'big-tide' | 'bathymetry-profile' | 'hydro-tss-wave' | 'abrasion-dsas';

export const CoastalHydroWorkbench: React.FC<CoastalHydroWorkbenchProps> = ({
  params,
  realEoGrid,
  activeTemplateId,
  onActivateCoastalModel,
}) => {
  const cLat = (params.bbox.minLat + params.bbox.maxLat) / 2;
  const cLon = (params.bbox.minLon + params.bbox.maxLon) / 2;
  const nearestStation = useMemo(() => findNearestBigStation(cLat, cLon), [cLat, cLon]);

  const [activeTab, setActiveTab] = useState<WorkbenchTabId>('big-tide');
  const [selectedStationId, setSelectedStationId] = useState<string>(nearestStation.id);
  const [durationHours, setDurationHours] = useState<number>(72);
  const [simulatedTideM, setSimulatedTideM] = useState<number>(0.85);
  const [hoveredProfileIdx, setHoveredProfileIdx] = useState<number | null>(null);
  const tideSvgRef = useRef<SVGSVGElement | null>(null);
  const profileSvgRef = useRef<SVGSVGElement | null>(null);

  const summary = useMemo(
    () =>
      computeCoastalHydroSummary(
        params.bbox,
        realEoGrid,
        selectedStationId,
        simulatedTideM,
        params.startDate
      ),
    [params.bbox, realEoGrid, selectedStationId, simulatedTideM, params.startDate]
  );

  const tidePred = useMemo(
    () =>
      predictBigTideSeries(
        selectedStationId,
        params.startDate,
        durationHours,
        durationHours > 168 ? 2 : 1
      ),
    [selectedStationId, params.startDate, durationHours]
  );

  const crossSection = useMemo(
    () =>
      extractBathymetryCrossSection(
        params.bbox,
        realEoGrid,
        simulatedTideM,
        summary.wave.offshoreHsM,
        25
      ),
    [params.bbox, realEoGrid, simulatedTideM, summary.wave.offshoreHsM]
  );

  const handleDownloadTideCsv = () => {
    const header = 'jam_ke,label_waktu,elevasi_chart_datum_m,elevasi_terhadap_msl_m,arus_pasut_ms,fase_pasut\n';
    const rows = tidePred.series
      .map(
        (p) =>
          `${p.hour},"${p.timestampLabel}",${p.elevationM},${p.elevationAboveMslM},${p.tidalCurrentSpeedMs},"${p.phaseLabel}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prediksi_pasut_${tidePred.station.code.toLowerCase()}_${durationHours}jam.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCrossSectionCsv = () => {
    const header =
      'stasiun,jarak_m,lat,lon,elevasi_topobathy_m,muka_air_m,kedalaman_air_m,kemiringan_deg,tan_beta,hs_lokal_m,arus_2d_ms,tss_mgl,zona_morfologi\n';
    const rows = crossSection.points
      .map(
        (p) =>
          `ST-${String(p.index).padStart(2, '0')},${p.distanceM},${p.lat},${p.lng},${p.elevationM},${p.waterSurfaceM},${p.waterDepthM},${p.slopeDeg},${p.tanBeta},${p.waveHsLocalM},${p.currentSpeedMs},${p.tssMgL},"${p.zoneLabel}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profil_melintang_batimetri_${params.regionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDsasSedimentCsv = () => {
    const header =
      'id_transek,lat_tengah,lon_tengah,sce_m,nsm_m,epr_m_thn,epr_ci95_m_thn,lrr_m_thn,wlr_m_thn,r_squared,lse_m,d50_mm,kelas_sedimen,tau_b_pa,tau_cr_pa,shields_theta,transpor_cerc_m3_thn,neraca_sedimen_m3_thn,rezim_transpor,status_morfologi\n';
    const rows = summary.dsas.transects
      .map(
        (tr) =>
          `${tr.id},${((tr.lat1 + tr.lat2) / 2).toFixed(5)},${tr.lng1.toFixed(5)},${tr.sceMeters},${tr.nsmMeters},${tr.eprMPerYear},${tr.eprUncertaintyMPerYear},${tr.lrrMPerYear},${tr.wlrMPerYear},${tr.rSquared},${tr.lseMeters},${tr.d50Mm},"${tr.sedimentClass}",${tr.localBedShearPa},${tr.criticalShearPa},${tr.shieldsNumber},${tr.longshoreTransportM3PerYr},${tr.sedimentBudgetM3PerYr},"${tr.transportRegime}","${tr.status}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistik_sedimen_dsas_hidrodinamika_${params.regionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tide SVG chart coordinates
  const TIDE_W = 860;
  const TIDE_H = 230;
  const TP_L = 48;
  const TP_R = 24;
  const TP_T = 20;
  const TP_B = 30;
  const tPlotW = TIDE_W - TP_L - TP_R;
  const tPlotH = TIDE_H - TP_T - TP_B;
  const tMinY = Math.min(0, tidePred.latM - 0.25);
  const tMaxY = tidePred.hatM + 0.3;
  const toTideX = (idx: number) =>
    TP_L + (idx / Math.max(1, tidePred.series.length - 1)) * tPlotW;
  const toTideY = (z: number) =>
    TP_T + tPlotH - ((z - tMinY) / Math.max(0.1, tMaxY - tMinY)) * tPlotH;

  const tideLinePath = tidePred.series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toTideX(i).toFixed(1)} ${toTideY(pt.elevationM).toFixed(1)}`)
    .join(' ');
  const tideAreaPath = `${tideLinePath} L ${toTideX(tidePred.series.length - 1).toFixed(1)} ${(TP_T + tPlotH).toFixed(1)} L ${TP_L} ${(TP_T + tPlotH).toFixed(1)} Z`;

  // Bathymetry Cross-Section SVG coordinates
  const PROF_W = 860;
  const PROF_H = 250;
  const PP_L = 52;
  const PP_R = 24;
  const PP_T = 22;
  const PP_B = 32;
  const pPlotW = PROF_W - PP_L - PP_R;
  const pPlotH = PROF_H - PP_T - PP_B;
  const pMinZ = Math.min(-18, crossSection.minBathymetryM - 2.5);
  const pMaxZ = Math.max(8, crossSection.maxElevationM + 2.5);
  const toProfX = (idx: number) =>
    PP_L + (idx / Math.max(1, crossSection.points.length - 1)) * pPlotW;
  const toProfY = (z: number) =>
    PP_T + pPlotH - ((z - pMinZ) / Math.max(0.5, pMaxZ - pMinZ)) * pPlotH;

  const seabedLinePath = crossSection.points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toProfX(i).toFixed(1)} ${toProfY(pt.elevationM).toFixed(1)}`)
    .join(' ');
  const seabedPolygonPath = `${seabedLinePath} L ${toProfX(crossSection.points.length - 1).toFixed(1)} ${(PP_T + pPlotH).toFixed(1)} L ${PP_L} ${(PP_T + pPlotH).toFixed(1)} Z`;
  const waterSurfaceY = toProfY(simulatedTideM);

  const activeProfPt =
    hoveredProfileIdx !== null
      ? crossSection.points[hoveredProfileIdx]
      : crossSection.points[Math.floor(crossSection.points.length * 0.55)];

  return (
    <section
      className="bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] space-y-5"
      aria-label="Workbench Hidrodinamika, Pasut BIG, Batimetri & Abrasi Pesisir"
      data-testid="coastal-hydro-workbench"
    >
      {/* Top Workbench Header & Quick Model Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
            <Waves className="w-4 h-4" />
            <span>Laboratorium Hidrodinamika, Oseanografi & Morfologi Pesisir</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Model Hidrodinamika 2D, Prediksi Pasut BIG, Batimetri Melintang, Sebaran TSS & Abrasi–Akresi (DSAS)
          </h2>
          <p className="text-xs text-slate-600">
            Terintegrasi langsung dengan DEM Terrarium & Citra Satelit wilayah{' '}
            <strong className="text-slate-900">{params.regionName}</strong>. Klik tombol{' '}
            <strong>Run di Peta</strong> pada setiap modul untuk menayangkan layer spasial di kanvas peta utama.
          </p>
        </div>

        {/* 4 Domain Workbench Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/75 shrink-0">
          <button
            type="button"
            data-testid="coastal-tab-big-tide"
            onClick={() => setActiveTab('big-tide')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'big-tide'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Prediksi Pasut BIG
          </button>
          <button
            type="button"
            data-testid="coastal-tab-bathymetry-profile"
            onClick={() => setActiveTab('bathymetry-profile')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'bathymetry-profile'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Batimetri & Profil Melintang
          </button>
          <button
            type="button"
            data-testid="coastal-tab-hydro-tss-wave"
            onClick={() => setActiveTab('hydro-tss-wave')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'hydro-tss-wave'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Hidrodinamika, Sedimen DSAS & TSS
          </button>
          <button
            type="button"
            data-testid="coastal-tab-shoreline-dsas"
            onClick={() => setActiveTab('abrasion-dsas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'abrasion-dsas'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Abrasi–Akresi & Garis Pantai
          </button>
        </div>
      </div>

      {/* TAB 1: PREDIKSI PASANG SURUT STASIUN BIG & SIMULASI PASUT */}
      {activeTab === 'big-tide' && (
        <div className="space-y-4" data-testid="tab-big-tide">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
            <div className="lg:col-span-5">
              <label htmlFor="big-station-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Stasiun Referensi Pasang Surut BIG (Indonesia)
              </label>
              <select
                id="big-station-select"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {BIG_TIDE_STATIONS.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.code} — {st.name} ({st.province})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Durasi Prediksi Harmonik
              </span>
              <div className="flex items-center gap-1">
                {[
                  { hrs: 24, label: '24 Jam' },
                  { hrs: 72, label: '3 Hari' },
                  { hrs: 168, label: '7 Hari' },
                  { hrs: 360, label: '15 Hari' },
                ].map((d) => (
                  <button
                    key={d.hrs}
                    type="button"
                    onClick={() => setDurationHours(d.hrs)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      durationHours === d.hrs
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedStationId(nearestStation.id)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                title="Pilih stasiun BIG terdekat dari koordinat AOI aktif"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-700" />
                Terdekat AOI ({nearestStation.code})
              </button>
              <button
                type="button"
                onClick={handleDownloadTideCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-sky-700" />
                Unduh CSV Pasut
              </button>
              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('big-tidal-prediction', 'python-gis', tidePred.hhwlM)
                }
                data-testid="activate-big-tidal-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Genangan Pasut di Peta
              </button>
            </div>
          </div>

          {/* Vertical Datum Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {[
              { label: 'Formzahl (F)', val: String(tidePred.formzahl), sub: tidePred.tideType.split(' (')[0] },
              { label: 'HAT (Pasang Ekstrem)', val: `${tidePred.hatM} m`, sub: 'Highest Astronomical' },
              { label: 'HHWL (Purnama)', val: `${tidePred.hhwlM} m`, sub: 'Acuan Banjir Rob' },
              { label: 'MHWL (Rerata Pasang)', val: `${tidePred.mhwlM} m`, sub: 'Mean High Water' },
              { label: 'MSL (Duduk Tengah)', val: `${tidePred.mslM} m`, sub: 'Mean Sea Level' },
              { label: 'MLWL (Rerata Surut)', val: `${tidePred.mlwlM} m`, sub: 'Mean Low Water' },
              { label: 'LLWL (Surut Rendah)', val: `${tidePred.llwlM} m`, sub: 'Lowest Low Water' },
              { label: 'Tunggang Pasut', val: `${tidePred.tidalRangeM} m`, sub: 'HHWL − LLWL' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5"
              >
                <div className="text-[11px] text-slate-500 truncate">{item.label}</div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {item.val}
                </div>
                <div className="text-[10px] text-teal-700 font-medium truncate">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Interactive SVG Tidal Prediction Curve */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  Kurva Prediksi Astronomis 9 Komponen Harmonik — {tidePred.station.name}
                </span>
                <span className="font-mono text-sky-400">
                  ({tidePred.station.lat}°, {tidePred.station.lon}°)
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                <span className="text-rose-400">HHWL: {tidePred.hhwlM} m</span>
                <span className="text-emerald-400">MSL: {tidePred.mslM} m</span>
                <span className="text-sky-400">LLWL: {tidePred.llwlM} m</span>
              </div>
            </div>

            <svg
              ref={tideSvgRef}
              viewBox={`0 0 ${TIDE_W} ${TIDE_H}`}
              className="w-full h-48 sm:h-56 block select-none"
              role="img"
              aria-label="Grafik Prediksi Pasang Surut Stasiun BIG"
            >
              <defs>
                <linearGradient id="bigTideGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Datum Reference Lines: HHWL, MSL, LLWL */}
              {[
                { label: `HHWL ${tidePred.hhwlM}m`, z: tidePred.hhwlM, color: '#f43f5e' },
                { label: `MSL ${tidePred.mslM}m`, z: tidePred.mslM, color: '#10b981' },
                { label: `LLWL ${tidePred.llwlM}m`, z: tidePred.llwlM, color: '#38bdf8' },
              ].map((datum) => {
                const y = toTideY(datum.z);
                return (
                  <g key={datum.label}>
                    <line
                      x1={TP_L}
                      y1={y}
                      x2={TIDE_W - TP_R}
                      y2={y}
                      stroke={datum.color}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.75"
                    />
                    <text
                      x={TIDE_W - TP_R - 4}
                      y={y - 4}
                      textAnchor="end"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fill={datum.color}
                    >
                      {datum.label}
                    </text>
                  </g>
                );
              })}

              {/* Tide Area & Curve */}
              <path d={tideAreaPath} fill="url(#bigTideGrad)" />
              <path
                d={tideLinePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* X-axis labels */}
              {tidePred.series
                .filter((_, idx) => idx % Math.max(1, Math.floor(tidePred.series.length / 8)) === 0)
                .map((pt) => {
                  const idx = tidePred.series.indexOf(pt);
                  const x = toTideX(idx);
                  return (
                    <text
                      key={pt.hour}
                      x={x}
                      y={TIDE_H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="monospace"
                      fill="#94a3b8"
                    >
                      +{pt.hour}j
                    </text>
                  );
                })}
            </svg>
          </div>

          {/* 9 Harmonic Constituents Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200/80">
                  <th className="py-2 px-3 font-semibold">Komponen</th>
                  {tidePred.station.constituents.map((c) => (
                    <th key={c.name} className="py-2 px-3 font-mono font-bold text-teal-800">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-mono tabular-nums">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-slate-600">Amplitudo H (m)</td>
                  {tidePred.station.constituents.map((c) => (
                    <td key={c.name} className="py-2 px-3 font-semibold text-slate-900">
                      {c.amplitudeM.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-slate-600">Fase g (°)</td>
                  {tidePred.station.constituents.map((c) => (
                    <td key={c.name} className="py-2 px-3 text-slate-700">
                      {c.phaseDeg.toFixed(1)}°
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium text-slate-600">Kecepatan (°/jam)</td>
                  {tidePred.station.constituents.map((c) => (
                    <td key={c.name} className="py-2 px-3 text-slate-500">
                      {c.speedDegPerHour.toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BATIMETRI SATELIT (SDB / BATNAS) & PROFIL MELINTANG A-B */}
      {activeTab === 'bathymetry-profile' && (
        <div className="space-y-4" data-testid="tab-bathymetry-profile">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-900">
                Penampang Melintang Topobathymetry Pesisir A (Darat) &rarr; B (Laut) [{crossSection.totalLengthM.toLocaleString('id-ID')} m]
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                Titik A ({crossSection.startLat}°, {crossSection.startLng}°) &rarr; Titik B ({crossSection.endLat}°, {crossSection.endLng}°) · Kemiringan Foreshore: {crossSection.meanForeshoreSlopeDeg}° (tan β = {crossSection.meanTanBeta})
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="sim-tide-slider" className="font-medium text-slate-700 whitespace-nowrap">
                  Simulasi Muka Air Pasut:{' '}
                  <strong className="font-mono text-sky-700">
                    {simulatedTideM >= 0 ? `+${simulatedTideM.toFixed(2)}` : simulatedTideM.toFixed(2)} m MSL
                  </strong>
                </label>
                <input
                  id="sim-tide-slider"
                  type="range"
                  min="-1.5"
                  max="2.5"
                  step="0.1"
                  value={simulatedTideM}
                  onChange={(e) => setSimulatedTideM(parseFloat(e.target.value))}
                  className="w-28 accent-sky-600"
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadCrossSectionCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                Unduh CSV Profil A–B
              </button>

              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('bathymetry-cross-section', 'python-gis', -2.0)
                }
                data-testid="activate-bathymetry-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Batimetri & Garis A–B di Peta
              </button>
            </div>
          </div>

          {/* Interactive SVG Cross-Section Profile */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                <span className="text-emerald-400 font-semibold">
                  Stasiun ST-{String(activeProfPt.index).padStart(2, '0')} ({activeProfPt.distanceM} m)
                </span>
                <span>Elevasi/Batimetri: <strong className="text-white">{activeProfPt.elevationM} m</strong></span>
                <span>Kedalaman Air: <strong className="text-sky-300">{activeProfPt.waterDepthM} m</strong></span>
                <span>Slope: <strong className="text-amber-300">{activeProfPt.slopeDeg}°</strong></span>
                <span>Hs Lokal: <strong className="text-cyan-300">{activeProfPt.waveHsLocalM} m</strong></span>
                <span>Arus |V|: <strong className="text-rose-300">{activeProfPt.currentSpeedMs} m/s</strong></span>
              </div>
              <span className="text-[11px] text-teal-300 font-medium">{activeProfPt.zoneLabel}</span>
            </div>

            <svg
              ref={profileSvgRef}
              viewBox={`0 0 ${PROF_W} ${PROF_H}`}
              className="w-full h-52 sm:h-60 block select-none cursor-crosshair"
              role="img"
              aria-label="Penampang Melintang Batimetri dan Topografi Pesisir A ke B"
            >
              {/* Water Surface Fill below simulatedTideM */}
              <rect
                x={PP_L}
                y={Math.max(PP_T, waterSurfaceY)}
                width={pPlotW}
                height={Math.max(0, PP_T + pPlotH - Math.max(PP_T, waterSurfaceY))}
                fill="rgba(14, 165, 233, 0.28)"
              />

              {/* Water Surface Line */}
              <line
                x1={PP_L}
                y1={waterSurfaceY}
                x2={PROF_W - PP_R}
                y2={waterSurfaceY}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <text
                x={PROF_W - PP_R - 6}
                y={waterSurfaceY - 5}
                textAnchor="end"
                fontSize="10"
                fontFamily="monospace"
                fill="#38bdf8"
              >
                Muka Air Pasut ({simulatedTideM >= 0 ? `+${simulatedTideM}` : simulatedTideM} m MSL)
              </text>

              {/* Land / Seabed Polygon */}
              <path d={seabedPolygonPath} fill="#334155" opacity="0.88" />
              <path
                d={seabedLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Interactive Station Dots */}
              {crossSection.points.map((pt, idx) => {
                const cx = toProfX(idx);
                const cy = toProfY(pt.elevationM);
                const isHovered = activeProfPt.index === pt.index;
                return (
                  <g
                    key={pt.index}
                    onMouseEnter={() => setHoveredProfileIdx(idx)}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3}
                      fill={pt.elevationM >= 0 ? '#10b981' : '#38bdf8'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={cx - pPlotW / crossSection.points.length / 2}
                      y={PP_T}
                      width={pPlotW / crossSection.points.length}
                      height={pPlotH}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* Labels A (Darat) and B (Laut) */}
              <text x={PP_L + 6} y={PP_T + 14} fontSize="11" fontWeight="700" fill="#a7f3d0">
                A (Darat: {crossSection.maxElevationM} m)
              </text>
              <text
                x={PROF_W - PP_R - 6}
                y={PROF_H - PP_B - 8}
                textAnchor="end"
                fontSize="11"
                fontWeight="700"
                fill="#7dd3fc"
              >
                B (Laut: {crossSection.minBathymetryM} m)
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* TAB 3: MODEL HIDRODINAMIKA ARUS 2D, ANALISIS STATISTIK SEDIMEN DSAS, SEBARAN TSS & GELOMBANG SWAN */}
      {activeTab === 'hydro-tss-wave' && (
        <div className="space-y-5" data-testid="tab-hydro-tss-wave">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Model Hidrodinamika Arus 2D */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800">
                    01. Model Hidrodinamika 2D
                  </span>
                  <Compass className="w-4 h-4 text-sky-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sirkulasi Arus Pasut & Sejajar Pantai (SWE 2D)
                </h3>
                <p className="text-xs text-slate-600">
                  Distribusi kecepatan arus rata-rata kedalaman <span className="font-mono">(u, v, |V|)</span> dan tegangan geser dasar pemicu transpor sedimen.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Arus Rata-rata |V|</div>
                    <div className="text-sm font-bold text-slate-900">{summary.hydro.meanCurrentMs} m/s</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Arus Maksimum |V|</div>
                    <div className="text-sm font-bold text-teal-700">{summary.hydro.maxCurrentMs} m/s</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Tegangan Geser (τb)</div>
                    <div className="text-sm font-bold text-amber-700">{summary.hydro.bedShearStressPa} Pa</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Arah Dominan</div>
                    <div className="text-sm font-bold text-slate-900">{summary.hydro.dominantCurrentDirDeg}°</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('hydrodynamic-2d-current', 'python-gis', 0.45)
                }
                data-testid="activate-hydro-2d-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Model Hidrodinamika 2D di Peta
              </button>
            </div>

            {/* Card 2: Sebaran TSS (Total Suspended Solid) */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">
                    02. Sebaran TSS & Kekeruhan
                  </span>
                  <Droplets className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Total Suspended Solid (mg/L) & Plume Muara
                </h3>
                <p className="text-xs text-slate-600">
                  Algoritma bio-optik Laili/Budhiman (Band Merah & Hijau) dievaluasi terhadap Baku Mutu Air Laut PP 22/2021 ({summary.tss.bakuMutuLimitMgL} mg/L).
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">TSS Rata-rata</div>
                    <div className="text-sm font-bold text-slate-900">{summary.tss.meanTssMgL} mg/L</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">TSS Maksimum</div>
                    <div className="text-sm font-bold text-rose-700">{summary.tss.maxTssMgL} mg/L</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">&gt; Baku Mutu (80 mg/L)</div>
                    <div className="text-sm font-bold text-amber-700">{summary.tss.exceedancePercent}% Area</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">TSS Minimum</div>
                    <div className="text-sm font-bold text-emerald-700">{summary.tss.minTssMgL} mg/L</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('tss-turbidity-mapping', 'gee-js', 80.0)
                }
                data-testid="activate-tss-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Sebaran TSS (mg/L) di Peta
              </button>
            </div>

            {/* Card 3: Propagasi Gelombang SWAN */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800">
                    03. Propagasi Gelombang SWAN
                  </span>
                  <Activity className="w-4 h-4 text-teal-700" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tinggi Gelombang Signifikan (Hs), Shoaling & Breaking
                </h3>
                <p className="text-xs text-slate-600">
                  Tipe pecah gelombang: <strong>{summary.wave.breakerType}</strong> (Bilangan Iribarren ξ₀ = {summary.wave.iribarrenNumber}).
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono tabular-nums">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Hs Lepas Pantai</div>
                    <div className="text-sm font-bold text-slate-900">{summary.wave.offshoreHsM} m</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Periode Puncak (Tp)</div>
                    <div className="text-sm font-bold text-teal-700">{summary.wave.peakPeriodS} dtk</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Fluks Energi (P)</div>
                    <div className="text-sm font-bold text-sky-700">{summary.wave.wavePowerKwPerM} kW/m</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div className="text-[10px] font-sans text-slate-500">Panjang Gel. (L0)</div>
                    <div className="text-sm font-bold text-slate-900">{summary.wave.waveLengthDeepM} m</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('coastal-wave-swan', 'swan', summary.wave.offshoreHsM)
                }
                data-testid="activate-swan-wave-btn"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Model Gelombang SWAN di Peta
              </button>
            </div>
          </div>

          {/* Card 4: ANALISIS STATISTIK SEDIMEN PESISIR METODE DSAS DI DALAM MODUL HIDRODINAMIKA */}
          <div
            className="bg-slate-50/95 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4"
            data-testid="hydro-dsas-sediment-panel"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-3.5">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
                  <Layers className="w-4 h-4 text-teal-700" />
                  <span>04. Kopling Hidrodinamika 2D & Analisis Statistik Sedimen Pesisir (Metode DSAS v5.1)</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Statistik Regresi DSAS (SCE, NSM, EPR, LRR, WLR, R², LSE) & Transpor Sedimen Sejajar Pantai (CERC / Shields)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mengintegrasikan laju perubahan garis pantai statistik <strong>Digital Shoreline Analysis System (DSAS)</strong> dengan ukuran butir sedimen median (<strong>D50</strong>), parameter mobilitas <strong>Shields (θ)</strong> dari tegangan geser arus–gelombang (<strong>τb vs τcr</strong>), laju angkutan sedimen sejajar pantai <strong>CERC (Ql)</strong>, dan neraca volume sel sedimen (<strong>ΔV</strong> pada kedalaman penutupan Hallermeier <strong>h* = {summary.dsas.activeClosureDepthM} m</strong>).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadDsasSedimentCsv}
                  data-testid="download-dsas-sediment-csv-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  Unduh CSV Statistik Sedimen DSAS
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onActivateCoastalModel('coastal-abrasion-accretion-dsas', 'python-gis', -0.8)
                  }
                  data-testid="activate-hydro-dsas-sediment-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Transek Sedimen DSAS di Peta
                </button>
              </div>
            </div>

            {/* 6 Summary KPI Cards for DSAS & Coastal Sediment Dynamics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono tabular-nums">
              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Regresi LRR / WLR</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {summary.dsas.meanLrrMPerYear} / {summary.dsas.meanWlrMPerYear} m/thn
                </div>
                <div className="text-[10px] font-sans text-teal-700">
                  R² = {summary.dsas.meanRSquared} · LSE ±{summary.dsas.meanLseMeters}m
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Amplop Perubahan (SCE)</div>
                <div className="text-sm font-bold text-sky-800 mt-0.5">
                  {summary.dsas.meanSceMeters} m
                </div>
                <div className="text-[10px] font-sans text-slate-500">
                  EPR Rata-rata: {summary.dsas.meanEprMPerYear} m/thn
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Diameter Butir (D50)</div>
                <div className="text-sm font-bold text-amber-800 mt-0.5">
                  {summary.dsas.meanD50Mm} mm
                </div>
                <div className="text-[10px] font-sans text-slate-600 truncate">
                  {summary.dsas.dominantSedimentClass.split(' (')[0]}
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Kedalaman Tutup (h*)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {summary.dsas.activeClosureDepthM} m MSL
                </div>
                <div className="text-[10px] font-sans text-slate-500">
                  Batas Aktif Transpor Dasar
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Transpor Sejajar (CERC)</div>
                <div className="text-sm font-bold text-teal-800 mt-0.5">
                  {summary.dsas.netLongshoreTransportM3PerYr.toLocaleString('id-ID')} m³/thn
                </div>
                <div className="text-[10px] font-sans text-slate-500">
                  Gross: {summary.dsas.grossLongshoreTransportM3PerYr.toLocaleString('id-ID')} m³/thn
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                <div className="text-[11px] font-sans text-slate-500">Neraca Sedimen (ΔV)</div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    summary.dsas.netSedimentBudgetM3PerYr < 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {summary.dsas.netSedimentBudgetM3PerYr > 0
                    ? `+${summary.dsas.netSedimentBudgetM3PerYr.toLocaleString('id-ID')}`
                    : summary.dsas.netSedimentBudgetM3PerYr.toLocaleString('id-ID')}{' '}
                  m³/thn
                </div>
                <div className="text-[10px] font-sans text-slate-600">
                  {summary.dsas.netSedimentBudgetM3PerYr < 0
                    ? 'Defisit Sedimen (Erosi)'
                    : 'Surplus Sedimen (Akresi)'}
                </div>
              </div>
            </div>

            {/* Interactive SVG DSAS Statistical Rate (EPR/LRR/WLR) & Sediment Transport Profile */}
            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <span className="font-semibold text-white">
                  Profil Spasial Statistik DSAS (EPR, LRR, WLR) & Neraca Transpor Sedimen per Transek (TR-01 s/d TR-07)
                </span>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                  <span className="text-rose-400">■ Abrasi (EPR/WLR &lt; 0)</span>
                  <span className="text-emerald-400">■ Akresi (EPR/WLR &gt; 0)</span>
                  <span className="text-amber-300">● Rasio Tegangan Geser (τb / τcr)</span>
                </div>
              </div>

              <svg
                viewBox="0 0 860 190"
                className="w-full h-44 block select-none"
                role="img"
                aria-label="Grafik Statistik Sedimen Pesisir DSAS per Transek"
              >
                {/* Zero Equilibrium Baseline */}
                <line
                  x1="56"
                  y1="96"
                  x2="830"
                  y2="96"
                  stroke="#64748b"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <text x="50" y="99" textAnchor="end" fontSize="9.5" fontFamily="monospace" fill="#94a3b8">
                  0.0 m/thn
                </text>
                <text x="50" y="38" textAnchor="end" fontSize="9.5" fontFamily="monospace" fill="#34d399">
                  +4.0 m/thn
                </text>
                <text x="50" y="158" textAnchor="end" fontSize="9.5" fontFamily="monospace" fill="#fb7185">
                  -4.0 m/thn
                </text>

                {summary.dsas.transects.map((tr, idx) => {
                  const colX = 110 + idx * 112;
                  const scaleY = 14.5; // px per m/yr
                  const eprH = Math.abs(tr.eprMPerYear) * scaleY;
                  const eprY = tr.eprMPerYear >= 0 ? 96 - eprH : 96;
                  const wlrH = Math.abs(tr.wlrMPerYear) * scaleY;
                  const wlrY = tr.wlrMPerYear >= 0 ? 96 - wlrH : 96;
                  const ciPx = tr.eprUncertaintyMPerYear * scaleY;
                  const tipY = 96 - tr.eprMPerYear * scaleY;
                  const shearRatio = tr.localBedShearPa / Math.max(0.05, tr.criticalShearPa);
                  const shearY = Math.max(22, Math.min(165, 155 - shearRatio * 18));

                  return (
                    <g key={tr.id}>
                      {/* EPR Bar */}
                      <rect
                        x={colX - 18}
                        y={eprY}
                        width="16"
                        height={Math.max(3, eprH)}
                        rx="3"
                        fill={tr.eprMPerYear < 0 ? '#f43f5e' : '#10b981'}
                        opacity="0.88"
                      />
                      {/* WLR Bar */}
                      <rect
                        x={colX + 2}
                        y={wlrY}
                        width="16"
                        height={Math.max(3, wlrH)}
                        rx="3"
                        fill={tr.wlrMPerYear < 0 ? '#fb7185' : '#34d399'}
                        opacity="0.65"
                      />
                      {/* 95% Confidence Interval Whisker on EPR */}
                      <line
                        x1={colX - 10}
                        y1={tipY - ciPx}
                        x2={colX - 10}
                        y2={tipY + ciPx}
                        stroke="#e2e8f0"
                        strokeWidth="1.5"
                      />
                      {/* Shields Shear Stress Ratio Marker */}
                      <circle
                        cx={colX}
                        cy={shearY}
                        r="4"
                        fill="#fbbf24"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <text
                        x={colX}
                        y="178"
                        textAnchor="middle"
                        fontSize="10.5"
                        fontFamily="monospace"
                        fontWeight="700"
                        fill="#e2e8f0"
                      >
                        {tr.id}
                      </text>
                      <text
                        x={colX}
                        y={tr.eprMPerYear >= 0 ? Math.max(16, eprY - 6) : Math.min(164, eprY + eprH + 11)}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="monospace"
                        fill="#cbd5e1"
                      >
                        {tr.wlrMPerYear > 0 ? `+${tr.wlrMPerYear}` : tr.wlrMPerYear}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Full DSAS Coastal Sediment Statistical Table inside Hydrodynamics Module */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/95 text-slate-700 border-b border-slate-200/80">
                    <th className="py-2.5 px-3 font-semibold">Transek</th>
                    <th className="py-2.5 px-3 font-semibold">SCE / NSM (m)</th>
                    <th className="py-2.5 px-3 font-semibold">EPR ± CI95% (m/thn)</th>
                    <th className="py-2.5 px-3 font-semibold">LRR / WLR (m/thn)</th>
                    <th className="py-2.5 px-3 font-semibold">R² & LSE</th>
                    <th className="py-2.5 px-3 font-semibold">Butir D50 (mm)</th>
                    <th className="py-2.5 px-3 font-semibold">τb / τcr (Pa) · θ</th>
                    <th className="py-2.5 px-3 font-semibold">Transpor CERC Ql</th>
                    <th className="py-2.5 px-3 font-semibold">Neraca Sedimen ΔV</th>
                    <th className="py-2.5 px-3 font-semibold">Rezim Hidrodinamika</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-mono tabular-nums">
                  {summary.dsas.transects.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-bold text-slate-900">{tr.id}</td>
                      <td className="py-2 px-3 text-slate-700">
                        <span className="font-semibold text-sky-800">{tr.sceMeters}m</span> /{' '}
                        <span className={tr.nsmMeters < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          {tr.nsmMeters > 0 ? `+${tr.nsmMeters}` : tr.nsmMeters}m
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          tr.eprMPerYear < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {tr.eprMPerYear > 0 ? `+${tr.eprMPerYear}` : tr.eprMPerYear} ±{tr.eprUncertaintyMPerYear}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {tr.lrrMPerYear > 0 ? `+${tr.lrrMPerYear}` : tr.lrrMPerYear} /{' '}
                        <strong>{tr.wlrMPerYear > 0 ? `+${tr.wlrMPerYear}` : tr.wlrMPerYear}</strong>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {tr.rSquared} (±{tr.lseMeters}m)
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        <span className="font-semibold text-amber-800">{tr.d50Mm}</span>{' '}
                        <span className="font-sans text-[10px] text-slate-500">
                          ({tr.sedimentClass.split(' (')[0]})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {tr.localBedShearPa} / {tr.criticalShearPa} ·{' '}
                        <strong className="text-teal-800">θ={tr.shieldsNumber}</strong>
                      </td>
                      <td className="py-2 px-3 text-sky-800 font-semibold">
                        {tr.longshoreTransportM3PerYr > 0
                          ? `+${tr.longshoreTransportM3PerYr.toLocaleString('id-ID')}`
                          : tr.longshoreTransportM3PerYr.toLocaleString('id-ID')}{' '}
                        m³/thn
                      </td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          tr.sedimentBudgetM3PerYr < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {tr.sedimentBudgetM3PerYr > 0
                          ? `+${tr.sedimentBudgetM3PerYr.toLocaleString('id-ID')}`
                          : tr.sedimentBudgetM3PerYr.toLocaleString('id-ID')}{' '}
                        m³/thn
                      </td>
                      <td className="py-2 px-3 font-sans text-[11px] font-medium text-slate-700">
                        {tr.transportRegime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POTENSI ABRASI-AKRESI, INDEKS CVI & PERUBAHAN GARIS PANTAI (DSAS) */}
      {activeTab === 'abrasion-dsas' && (
        <div className="space-y-4" data-testid="tab-abrasion-dsas">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-900">
                Matriks Transek DSAS (SCE, NSM, EPR, LRR, WLR 2016–2026), Anggaran Sedimen & Skor CVI
              </div>
              <div className="text-[11px] text-slate-600">
                Status Kerentanan Wilayah: <strong className="text-rose-700">{summary.dsas.vulnerabilityClass}</strong> (Skor CVI Rata-rata: <strong className="font-mono">{summary.dsas.meanCviScore}/5.0</strong> · R² Regresi: <strong className="font-mono">{summary.dsas.meanRSquared}</strong>)
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                <span className="text-rose-800 font-semibold">
                  Potensi Abrasi: {summary.dsas.estimatedAbrasionHa} Ha ({summary.dsas.maxAbrasionMPerYear} m/thn)
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-800 font-semibold">
                  Potensi Akresi: +{summary.dsas.estimatedAccretionHa} Ha (+{summary.dsas.maxAccretionMPerYear} m/thn)
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onActivateCoastalModel('coastal-abrasion-accretion-dsas', 'gee-js', -0.8)
                }
                data-testid="activate-abrasion-dsas-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors"
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Run Peta Abrasi–Akresi & Transek DSAS
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200/80">
                  <th className="py-2 px-3 font-semibold">ID Transek</th>
                  <th className="py-2 px-3 font-semibold">Koordinat Tengah</th>
                  <th className="py-2 px-3 font-semibold">SCE (m)</th>
                  <th className="py-2 px-3 font-semibold">NSM 10 Thn (m)</th>
                  <th className="py-2 px-3 font-semibold">EPR ± CI (m/thn)</th>
                  <th className="py-2 px-3 font-semibold">LRR / WLR (m/thn)</th>
                  <th className="py-2 px-3 font-semibold">D50 (mm)</th>
                  <th className="py-2 px-3 font-semibold">Neraca ΔV (m³/thn)</th>
                  <th className="py-2 px-3 font-semibold">Skor CVI</th>
                  <th className="py-2 px-3 font-semibold">Status Morfologi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-mono tabular-nums">
                {summary.dsas.transects.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-bold text-slate-900">{tr.id}</td>
                    <td className="py-2 px-3 text-slate-600">
                      {((tr.lat1 + tr.lat2) / 2).toFixed(4)}°, {tr.lng1.toFixed(4)}°
                    </td>
                    <td className="py-2 px-3 text-sky-800 font-semibold">{tr.sceMeters} m</td>
                    <td
                      className={`py-2 px-3 font-semibold ${
                        tr.nsmMeters < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {tr.nsmMeters > 0 ? `+${tr.nsmMeters}` : tr.nsmMeters} m
                    </td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        tr.eprMPerYear < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {tr.eprMPerYear > 0 ? `+${tr.eprMPerYear}` : tr.eprMPerYear} ±{tr.eprUncertaintyMPerYear}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {tr.lrrMPerYear > 0 ? `+${tr.lrrMPerYear}` : tr.lrrMPerYear} /{' '}
                      <strong>{tr.wlrMPerYear > 0 ? `+${tr.wlrMPerYear}` : tr.wlrMPerYear}</strong>
                    </td>
                    <td className="py-2 px-3 text-amber-800">{tr.d50Mm}</td>
                    <td
                      className={`py-2 px-3 font-semibold ${
                        tr.sedimentBudgetM3PerYr < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {tr.sedimentBudgetM3PerYr > 0
                        ? `+${tr.sedimentBudgetM3PerYr.toLocaleString('id-ID')}`
                        : tr.sedimentBudgetM3PerYr.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-amber-800">{tr.cviScore}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                      {tr.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
