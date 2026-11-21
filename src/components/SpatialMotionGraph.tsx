import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SPECTRAL_INDEX_DEFINITIONS,
  calculateBboxAreaKm2,
  calculatePolygonAreaKm2,
  type GisPlatformId,
  type GisTemplate,
  type ScriptParameters,
} from '../utils/gisEngine';
import { Activity, Pause, Play, Waves, BarChart3, Sparkles, FileImage } from 'lucide-react';

interface SpatialMotionGraphProps {
  template: GisTemplate;
  platformId: GisPlatformId;
  params: ScriptParameters;
}

type GraphTabId = 'temporal' | 'spectral-profile' | 'grid-budget';

interface GraphPoint {
  label: string;
  subLabel: string;
  primary: number;
  secondary: number;
}

export const SpatialMotionGraph: React.FC<SpatialMotionGraphProps> = ({
  template,
  platformId,
  params,
}) => {
  const [activeTab, setActiveTab] = useState<GraphTabId>('temporal');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phaseTick, setPhaseTick] = useState<number>(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isSwanMode = platformId === 'swan' || template.id === 'coastal-wave-swan';
  const isHydroCurrentMode = template.id === 'hydrodynamic-2d-current';
  const isTssMode = template.id === 'tss-turbidity-mapping';
  const isBathymetryMode = template.id === 'bathymetry-cross-section';
  const isTidalMode =
    template.id === 'tidal-analysis-harmonics' || template.id === 'big-tidal-prediction';
  const isShorelineSlopeMode =
    template.id === 'shoreline-slope-erosion' ||
    template.id === 'coastal-abrasion-accretion-dsas';
  const isLandCoverMode = template.id === 'land-cover-classification';
  const isUavMode =
    platformId === 'agisoft-py' ||
    platformId === 'pix4d-cli' ||
    template.id === 'uav-agisoft-metashape' ||
    template.id === 'uav-pix4d-photogrammetry';
  const isThermalMode = template.id === 'lst-thermal-landsat';

  const indexDef =
    SPECTRAL_INDEX_DEFINITIONS.find((i) => i.id === params.spectralIndex) ||
    SPECTRAL_INDEX_DEFINITIONS[0];

  const hasCustomPolygon = Boolean(params.customPolygon && params.customPolygon.length >= 3);
  const areaKm2 = hasCustomPolygon
    ? calculatePolygonAreaKm2(params.customPolygon!)
    : calculateBboxAreaKm2(params.bbox);

  // Smooth temporal ticker (~18fps) for fluid oscillation when Play is active
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setPhaseTick((prev) => (prev + 0.5) % 360);
    }, 55);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  // Compute deterministic domain-authentic time-series points reacting to params
  const temporalData = useMemo<GraphPoint[]>(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const phaseShift = isPlaying ? (phaseTick * Math.PI) / 45 : 0;

    if (isTidalMode) {
      // 13 titik kurva pasang surut semidiurnal campuran 24 jam (0j - 24j)
      const hours = Array.from({ length: 13 }, (_, idx) => idx * 2);
      const msl = 1.25;
      const ampM2 = Math.max(0.25, Math.min(1.4, Math.abs(params.thresholdValue) * 0.35));
      const ampK1 = ampM2 * 0.45;
      return hours.map((hr) => {
        const wM2 = (2 * Math.PI) / 12.42;
        const wK1 = (2 * Math.PI) / 23.93;
        const t = hr + phaseShift * 1.8;
        const h = Number(
          (msl + ampM2 * Math.cos(wM2 * t) + ampK1 * Math.cos(wK1 * t - 0.6)).toFixed(2)
        );
        return {
          label: `${hr}j`,
          subLabel: `Pasut Jam ke-${hr}`,
          primary: h,
          secondary: Number((h - msl).toFixed(2)),
        };
      });
    }

    if (isHydroCurrentMode) {
      const hours = Array.from({ length: 13 }, (_, idx) => idx * 2);
      return hours.map((hr, i) => {
        const t = hr + phaseShift * 1.5;
        const speedMs = Number(
          Math.max(
            0.08,
            0.48 + 0.38 * Math.abs(Math.sin((2 * Math.PI * t) / 12.42)) + 0.08 * Math.cos(i)
          ).toFixed(2)
        );
        const shearPa = Number((1025 * 0.0025 * speedMs * speedMs).toFixed(2));
        return {
          label: `${hr}j`,
          subLabel: `Arus 2D Jam ke-${hr}`,
          primary: speedMs,
          secondary: shearPa,
        };
      });
    }

    if (isTssMode) {
      return months.map((m, i) => {
        const wetSeasonPlume = Math.cos(((i - 1) / 12) * Math.PI * 2) * 38;
        const osc = Math.sin(phaseShift + i * 0.7) * 6.5;
        const tss = Number(Math.max(12, Math.min(240, 74 + wetSeasonPlume + osc)).toFixed(1));
        const ndti = Number(((tss - 60) / 280).toFixed(2));
        return {
          label: m,
          subLabel: `TSS ${m}`,
          primary: tss,
          secondary: ndti,
        };
      });
    }

    if (isBathymetryMode) {
      return Array.from({ length: 11 }, (_, i) => {
        const frac = i / 10;
        const distM = i * 100;
        const z = Number(
          (frac < 0.35
            ? 5.8 - (frac / 0.35) * 5.8
            : -Math.pow((frac - 0.35) / 0.65, 1.3) * 16.5 + Math.sin(phaseShift + i) * 0.25
          ).toFixed(2)
        );
        const depth = Number(Math.max(0, 0.75 - z).toFixed(2));
        return {
          label: `${distM}m`,
          subLabel: `Stasiun ${distM}m`,
          primary: z,
          secondary: depth,
        };
      });
    }

    if (isShorelineSlopeMode) {
      // Laju perubahan garis pantai (EPR m/thn) antar segmen transek P1..P10
      return Array.from({ length: 10 }, (_, i) => {
        const osc = Math.sin(phaseShift + i * 0.7) * 0.45;
        const epr = Number((-2.8 + Math.sin(i * 0.85) * 3.1 + osc).toFixed(2));
        const slopeDeg = Number(
          Math.max(0.8, params.thresholdValue + Math.cos(i * 0.65) * 1.4).toFixed(2)
        );
        return {
          label: `T${i + 1}`,
          subLabel: `Transek #${i + 1}`,
          primary: epr,
          secondary: slopeDeg,
        };
      });
    }

    if (isUavMode) {
      // Profil ketinggian permukaan (DSM vs DTM) sepanjang jalur terbang UAV
      return Array.from({ length: 10 }, (_, i) => {
        const ripple = Math.sin(phaseShift + i * 0.6) * 0.6;
        const dsm = Number((18 + Math.sin(i * 0.75) * 8 + ripple).toFixed(1));
        const overlap = Math.min(92, Math.max(72, Math.round(80 + Math.cos(i * 0.8) * 6)));
        return {
          label: `WP${i + 1}`,
          subLabel: `Waypoint Foto #${i + 1}`,
          primary: dsm,
          secondary: overlap,
        };
      });
    }

    if (isSwanMode) {
      const baseHs = Math.max(0.6, Math.min(3.2, Math.abs(params.thresholdValue) * 0.95));
      return months.map((m, i) => {
        const seasonal = Math.cos(((i - 6) / 12) * Math.PI * 2) * 0.45;
        const ripple = Math.sin(phaseShift + i * 0.65) * 0.14;
        const hs = Number(Math.max(0.35, baseHs + seasonal + ripple).toFixed(2));
        const tp = Number((5.8 + hs * 1.65 + Math.cos(phaseShift + i * 0.4) * 0.35).toFixed(1));
        return {
          label: m,
          subLabel: `Gelombang ${m}`,
          primary: hs,
          secondary: tp,
        };
      });
    }

    if (isThermalMode) {
      const baseTemp = Math.max(24, Math.min(38, params.thresholdValue - 1.5));
      return months.map((m, i) => {
        const drySeasonBoost = Math.sin(((i - 4) / 12) * Math.PI * 2) * 2.4;
        const micro = Math.sin(phaseShift + i * 0.5) * 0.35;
        const lst = Number((baseTemp + drySeasonBoost + micro).toFixed(1));
        const cloudPenalty = Number(
          Math.max(5, params.maxCloudCover * (0.65 + 0.35 * Math.cos(i * 0.7))).toFixed(0)
        );
        return {
          label: m,
          subLabel: `Suhu ${m}`,
          primary: lst,
          secondary: cloudPenalty,
        };
      });
    }

    // Spectral index seasonal profile (NDVI/NDWI/NDBI/BSI/MVI/AWEI/etc.)
    const seedOffset = ((params.bbox.minLon + Math.abs(params.bbox.minLat)) % 1) * 0.12;
    const baseLevel =
      params.spectralIndex === 'NDWI' || params.spectralIndex === 'MNDWI' || params.spectralIndex === 'AWEI'
        ? 0.18
        : params.spectralIndex === 'NDBI' || params.spectralIndex === 'BSI'
          ? 0.14
          : params.spectralIndex === 'MVI'
            ? 4.2
            : 0.48;

    return months.map((m, i) => {
      const amp = params.spectralIndex === 'MVI' ? 1.4 : 0.16;
      const monsoon = Math.cos(((i - 1) / 12) * Math.PI * 2) * amp;
      const pulse = Math.sin(phaseShift + i * 0.6) * (params.spectralIndex === 'MVI' ? 0.25 : 0.025);
      const raw = baseLevel + monsoon + seedOffset + pulse;
      const val =
        params.spectralIndex === 'MVI'
          ? Number(Math.max(0.5, Math.min(18, raw)).toFixed(2))
          : Number(Math.max(-0.45, Math.min(0.92, raw)).toFixed(3));
      const clearPixels = Number(
        Math.max(15, Math.min(99, 100 - params.maxCloudCover * (0.7 + 0.35 * Math.cos(i * 0.8)))).toFixed(0)
      );
      return {
        label: m,
        subLabel: `${params.spectralIndex} ${m}`,
        primary: val,
        secondary: clearPixels,
      };
    });
  }, [
    isTidalMode,
    isHydroCurrentMode,
    isTssMode,
    isBathymetryMode,
    isShorelineSlopeMode,
    isUavMode,
    isSwanMode,
    isThermalMode,
    params.thresholdValue,
    params.maxCloudCover,
    params.spectralIndex,
    params.bbox.minLon,
    params.bbox.minLat,
    isPlaying,
    phaseTick,
  ]);

  // Spectral signature / bathymetric / tidal harmonics / foreshore profile points
  const profileData = useMemo<GraphPoint[]>(() => {
    const waveOffset = isPlaying ? Math.sin((phaseTick * Math.PI) / 30) * 0.03 : 0;

    if (isTidalMode) {
      const comps = [
        { label: 'M2 (12.4j)', amp: 0.52, phase: 42 },
        { label: 'S2 (12.0j)', amp: 0.24, phase: 78 },
        { label: 'K1 (23.9j)', amp: 0.28, phase: 115 },
        { label: 'O1 (25.8j)', amp: 0.17, phase: 148 },
        { label: 'N2 (12.7j)', amp: 0.11, phase: 62 },
      ];
      return comps.map((c, idx) => ({
        label: c.label,
        subLabel: `Konstanta ${c.label}`,
        primary: Number((c.amp + waveOffset * (idx % 2 === 0 ? 1 : -1)).toFixed(3)),
        secondary: c.phase,
      }));
    }

    if (isShorelineSlopeMode) {
      const profile = [
        { label: 'Darat (+80m)', z: 4.6, slope: 2.1 },
        { label: 'Berm (+30m)', z: 2.3, slope: 3.8 },
        { label: 'Foreshore (0m)', z: 0.4, slope: Math.max(1.5, params.thresholdValue) },
        { label: 'Surf (-40m)', z: -1.4, slope: 2.5 },
        { label: 'Nearshore (-100m)', z: -3.8, slope: 1.9 },
      ];
      return profile.map((p, i) => ({
        label: p.label,
        subLabel: `Elevasi ${p.label}`,
        primary: Number((p.z + waveOffset * (i + 1)).toFixed(2)),
        secondary: Number(p.slope.toFixed(2)),
      }));
    }

    if (isLandCoverMode) {
      const classes = [
        { label: 'Air', share: 14, ndvi: -0.25 },
        { label: 'Mangrove', share: 18, ndvi: 0.62 },
        { label: 'Hutan', share: 26, ndvi: 0.76 },
        { label: 'Terbangun', share: 16, ndvi: 0.08 },
        { label: 'Terbuka', share: 11, ndvi: 0.12 },
        { label: 'Pertanian', share: 15, ndvi: 0.44 },
      ];
      return classes.map((c, i) => ({
        label: c.label,
        subLabel: `Kelas ${c.label}`,
        primary: Number((c.share + waveOffset * 15 * Math.cos(i)).toFixed(1)),
        secondary: c.ndvi,
      }));
    }

    if (isUavMode) {
      const gsd = Math.max(1.5, params.spatialResolutionMeters <= 5 ? params.spatialResolutionMeters * 2 : 3.5);
      const stages = [
        { label: 'Align Photos', rmse: Number((gsd * 0.45).toFixed(2)), pts: 420 },
        { label: 'GCP Optim.', rmse: Number((gsd * 0.32).toFixed(2)), pts: 480 },
        { label: 'Point Cloud', rmse: Number((gsd * 0.40).toFixed(2)), pts: 920 },
        { label: 'DEM/DSM', rmse: Number((gsd * 0.55).toFixed(2)), pts: 880 },
        { label: 'Orthomosaic', rmse: Number((gsd * 0.48).toFixed(2)), pts: 960 },
      ];
      return stages.map((s) => ({
        label: s.label,
        subLabel: `Tahap ${s.label}`,
        primary: s.rmse,
        secondary: s.pts,
      }));
    }

    if (isSwanMode) {
      const zones = [
        { label: 'Laut Dalam', depth: 45, hs: 2.15 },
        { label: 'Lereng Paparan', depth: 24, hs: 2.02 },
        { label: 'Shoaling Zone', depth: 11, hs: 2.28 },
        { label: 'Surf / Breaking', depth: 3.5, hs: 1.54 },
        { label: 'Swash Pantai', depth: 0.8, hs: 0.62 },
      ];
      const scale = Math.max(0.6, Math.abs(params.thresholdValue) / 1.5);
      return zones.map((z, idx) => ({
        label: z.label,
        subLabel: `Kedalaman ${z.depth}m`,
        primary: Number((z.hs * scale + waveOffset * (idx + 1)).toFixed(2)),
        secondary: z.depth,
      }));
    }

    const bands = [
      { label: 'Blue', veg: 0.05, water: 0.11 },
      { label: 'Green', veg: 0.09, water: 0.15 },
      { label: 'Red', veg: 0.06, water: 0.07 },
      { label: 'NIR', veg: 0.52, water: 0.03 },
      { label: 'SWIR1', veg: 0.21, water: 0.01 },
      { label: 'SWIR2', veg: 0.09, water: 0.01 },
    ];
    return bands.map((b, i) => ({
      label: b.label,
      subLabel: `Reflektansi ${b.label}`,
      primary: Number(Math.max(0.01, b.veg + waveOffset * Math.cos(i)).toFixed(3)),
      secondary: Number(Math.max(0.01, b.water + waveOffset * Math.sin(i)).toFixed(3)),
    }));
  }, [
    isTidalMode,
    isShorelineSlopeMode,
    isLandCoverMode,
    isUavMode,
    isSwanMode,
    params.thresholdValue,
    params.spatialResolutionMeters,
    isPlaying,
    phaseTick,
  ]);

  // Grid & Resolution budget
  const gridBudget = useMemo(() => {
    const areaM2 = Math.max(10000, areaKm2 * 1_000_000);
    const cellM2 = Math.max(1, params.spatialResolutionMeters * params.spatialResolutionMeters);
    const totalCells = Math.round(areaM2 / cellM2);
    const estActiveRatio = Math.max(
      18,
      Math.min(82, Math.round(68 - Math.abs(params.thresholdValue) * 14))
    );
    const activeHa = Math.round(areaKm2 * 100 * (estActiveRatio / 100));
    return {
      totalCells,
      estActiveRatio,
      activeHa,
      totalHa: Math.round(areaKm2 * 100),
    };
  }, [areaKm2, params.spatialResolutionMeters, params.thresholdValue]);

  // SVG chart geometry calculations
  const chartData = activeTab === 'temporal' ? temporalData : profileData;
  const W = 680;
  const H = 188;
  const PAD_L = 44;
  const PAD_R = 18;
  const PAD_T = 18;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const isDualReflectanceProfile =
    activeTab === 'spectral-profile' &&
    !isSwanMode &&
    !isTidalMode &&
    !isShorelineSlopeMode &&
    !isLandCoverMode &&
    !isUavMode;

  const allValues = chartData.flatMap((d) =>
    isDualReflectanceProfile ? [d.primary, d.secondary] : [d.primary]
  );
  const rawMin = Math.min(...allValues, activeTab === 'temporal' && !isShorelineSlopeMode && !isUavMode ? params.thresholdValue : Infinity);
  const rawMax = Math.max(...allValues, activeTab === 'temporal' && !isShorelineSlopeMode && !isUavMode ? params.thresholdValue : -Infinity);
  const padSpan = Math.max(0.1, (rawMax - rawMin) * 0.18);
  const yMin = rawMin - padSpan;
  const yMax = rawMax + padSpan;

  const xFor = (i: number) =>
    PAD_L + (chartData.length <= 1 ? plotW / 2 : (i / (chartData.length - 1)) * plotW);
  const yFor = (val: number) =>
    PAD_T + plotH - ((val - yMin) / Math.max(0.001, yMax - yMin)) * plotH;

  // Build smooth Catmull-Rom cubic bezier path
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = Math.min(pts.length - 1, i + 2);
      const p3pt = pts[p3];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3pt.x - p1.x) / 6;
      const cp2y = p2.y - (p3pt.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const primaryCoords = chartData.map((d, i) => ({ x: xFor(i), y: yFor(d.primary) }));
  const secondaryCoords = chartData.map((d, i) => ({ x: xFor(i), y: yFor(d.secondary) }));
  const primaryLinePath = buildSmoothPath(primaryCoords);
  const primaryAreaPath =
    primaryCoords.length > 1
      ? `${primaryLinePath} L ${primaryCoords[primaryCoords.length - 1].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} L ${primaryCoords[0].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} Z`
      : '';
  const secondaryLinePath = buildSmoothPath(secondaryCoords);

  const thresholdY = yFor(params.thresholdValue);
  const activePointIdx =
    hoveredIdx !== null
      ? hoveredIdx
      : isPlaying
        ? Math.floor((phaseTick / 15) % chartData.length)
        : chartData.length - 1;
  const activePoint = chartData[activePointIdx] || chartData[0];

  const primaryUnit = isTidalMode
    ? 'm'
    : isHydroCurrentMode
      ? activeTab === 'temporal'
        ? ' m/s'
        : 'm'
      : isTssMode
        ? ' mg/L'
        : isBathymetryMode
          ? 'm'
          : isShorelineSlopeMode
            ? activeTab === 'temporal'
              ? ' m/thn'
              : 'm'
            : isUavMode
              ? activeTab === 'temporal'
                ? 'm'
                : ' cm'
              : isSwanMode
                ? 'm'
                : isThermalMode
                  ? '°C'
                  : isLandCoverMode && activeTab === 'spectral-profile'
                    ? '%'
                    : '';

  const chartHeadline = isTidalMode
    ? 'Kurva Prediksi Pasang Surut BIG & Konstanta Harmonik'
    : isHydroCurrentMode
      ? 'Model Hidrodinamika Kecepatan Arus 2D (|V| m/s) & Geser Dasar'
      : isTssMode
        ? 'Dinamika Sebaran Total Suspended Solid (TSS mg/L) & Kekeruhan'
        : isBathymetryMode
          ? 'Penampang Melintang Batimetri (SDB / BATNAS) Darat → Laut (A–B)'
          : isShorelineSlopeMode
            ? 'Potensi Abrasi–Akresi (DSAS EPR m/thn) & Kemiringan Pantai'
            : isUavMode
              ? `Profil Fotogrametri Drone UAV (${platformId === 'pix4d-cli' ? 'Pix4Dmapper' : 'Agisoft Metashape'})`
              : isLandCoverMode
                ? `Dinamika Tutupan Lahan & Indeks (${indexDef.id})`
                : isSwanMode
                  ? 'Dinamika Tinggi Gelombang Signifikan (Hs)'
                  : isThermalMode
                    ? 'Profil Suhu Permukaan Daratan (LST °C)'
                    : `Dinamika ${indexDef.id} (${params.sensor === 'S2_SR' ? 'Sentinel-2' : params.sensor})`;

  // Ekspor Grafik SVG Aktif Langsung ke Gambar JPG (1360x520)
  const handleDownloadGraphJpg = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(W * 2));
    clone.setAttribute('height', String(H * 2));

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1360;
      canvas.height = 520;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f766e';
        ctx.fillRect(0, 0, canvas.width, 64);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText(chartHeadline, 28, 40);

        ctx.fillStyle = '#334155';
        ctx.font = '16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          `Wilayah: ${params.regionName}  |  Proyeksi: ${params.crsEpsg}  |  Resolusi: ${params.spatialResolutionMeters}m`,
          28,
          96
        );

        ctx.drawImage(img, 0, 118, 1360, 376);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText(`GeoScript Studio · ${new Date().toLocaleDateString('id-ID')}`, 28, 506);

        const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = jpgUrl;
        const slug = template.id.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
        link.download = `grafik_${slug}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.07)] space-y-3.5"
      aria-label="Motion Graph Dinamika Spasial"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {isSwanMode || isTidalMode || isShorelineSlopeMode ? (
              <Waves className="w-4 h-4 text-teal-600 shrink-0" />
            ) : (
              <Activity className="w-4 h-4 text-teal-600 shrink-0" />
            )}
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
              {chartHeadline}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Grafik responsif real-time mengikuti AOI <span className="font-medium text-slate-700">{params.regionName}</span>, ambang batas ({params.thresholdValue}), & resolusi {params.spatialResolutionMeters}m.
          </p>
        </div>

        {/* Graph Mode Tabs + Play/Pause Motion + Direct JPG Export */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('temporal')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'temporal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isTidalMode ? 'Kurva Pasut 24j' : isShorelineSlopeMode ? 'Laju Abrasi (EPR)' : 'Kurva Temporal'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('spectral-profile')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'spectral-profile'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isTidalMode
                ? 'Amplitudo Harmonik'
                : isShorelineSlopeMode
                  ? 'Profil Kemiringan'
                  : isLandCoverMode
                    ? 'Proporsi LULC'
                    : isUavMode
                      ? 'Akurasi RMSE UAV'
                      : isSwanMode
                        ? 'Profil Kedalaman'
                        : 'Spektrum Band'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grid-budget')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'grid-budget'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Statistik AOI
            </button>
          </div>

          {activeTab !== 'grid-budget' && (
            <>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Jeda animasi grafik' : 'Putar animasi grafik'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                  isPlaying
                    ? 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Jeda Motion
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Putar Motion
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadGraphJpg}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <FileImage className="w-3.5 h-3.5 text-teal-700" />
                Ekspor .JPG
              </button>
            </>
          )}
        </div>
      </div>

      {/* Motion Graph Body */}
      <AnimatePresence mode="wait">
        {activeTab !== 'grid-budget' ? (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-b from-slate-50/80 to-sky-50/35 border border-slate-200/70 rounded-xl p-3 space-y-2"
          >
            {/* Live Readout Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-3 text-slate-600">
                <span className="font-medium text-slate-900">{activePoint.subLabel}:</span>
                <span className="font-mono font-semibold text-teal-700 tabular-nums">
                  {activePoint.primary}
                  {primaryUnit}
                </span>
                {activeTab === 'temporal' && (
                  <span className="text-slate-500 font-mono tabular-nums">
                    {isTidalMode
                      ? `Anomali MSL: ${activePoint.secondary >= 0 ? '+' : ''}${activePoint.secondary}m`
                      : isShorelineSlopeMode
                        ? `Slope: ${activePoint.secondary}°`
                        : isUavMode
                          ? `Overlap: ${activePoint.secondary}%`
                          : isSwanMode
                            ? `Tp: ${activePoint.secondary} dtk`
                            : isThermalMode
                              ? `Awan: ${activePoint.secondary}%`
                              : `Piksel Bersih: ${activePoint.secondary}%`}
                  </span>
                )}
                {activeTab === 'spectral-profile' && (
                  <span className="text-slate-500 font-mono tabular-nums">
                    {isTidalMode
                      ? `Fase: ${activePoint.secondary}°`
                      : isShorelineSlopeMode
                        ? `Kemiringan: ${activePoint.secondary}°`
                        : isLandCoverMode
                          ? `Rata NDVI: ${activePoint.secondary}`
                          : isUavMode
                            ? `Tie/Pts: ${activePoint.secondary}k`
                            : isSwanMode
                              ? `Batimetri: -${activePoint.secondary}m`
                              : `Air: ${activePoint.secondary}`}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {activeTab === 'temporal'
                  ? `Ambang Konfigurasi: ${params.thresholdValue}`
                  : isTidalMode
                    ? 'Spektrum Konstanta Harmonik Utama'
                    : isShorelineSlopeMode
                      ? 'Potongan Melintang Darat → Laut'
                      : isLandCoverMode
                        ? 'Distribusi Kelas Tutupan Lahan (%)'
                        : isUavMode
                          ? 'Estimasi Akurasi Planimetrik (cm)'
                          : isSwanMode
                            ? 'Transisi Laut Dalam → Pantai'
                            : 'Kurva Reflektansi Vegetasi vs Air'}
              </div>
            </div>

            {/* Interactive Animated SVG Motion Chart */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-44 overflow-visible select-none"
              role="img"
              aria-label="Grafik Motion Spasial"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                <linearGradient id="softWaveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Subtle Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const gy = PAD_T + t * plotH;
                const val = yMax - t * (yMax - yMin);
                return (
                  <g key={t}>
                    <line
                      x1={PAD_L}
                      y1={gy}
                      x2={W - PAD_R}
                      y2={gy}
                      stroke="rgba(148, 163, 184, 0.22)"
                      strokeDasharray="3 4"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD_L - 8}
                      y={gy + 3.5}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {val.toFixed(isThermalMode || isUavMode ? 0 : 2)}
                    </text>
                  </g>
                );
              })}

              {/* Threshold Reference Line in Temporal Tab */}
              {activeTab === 'temporal' &&
                !isShorelineSlopeMode &&
                !isUavMode &&
                thresholdY >= PAD_T &&
                thresholdY <= PAD_T + plotH && (
                  <g>
                    <line
                      x1={PAD_L}
                      y1={thresholdY}
                      x2={W - PAD_R}
                      y2={thresholdY}
                      stroke="#f59e0b"
                      strokeWidth="1.4"
                      strokeDasharray="5 4"
                    />
                    <text
                      x={W - PAD_R - 4}
                      y={thresholdY - 5}
                      textAnchor="end"
                      fill="#b45309"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Ambang {params.thresholdValue}
                    </text>
                  </g>
                )}

              {/* Area Fill under Primary Curve */}
              {primaryAreaPath && (
                <path d={primaryAreaPath} fill="url(#softWaveFill)" />
              )}

              {/* Secondary Comparison Line (Water Reflectance in Spectral Profile) */}
              {isDualReflectanceProfile && secondaryLinePath && (
                <path
                  d={secondaryLinePath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              )}

              {/* Primary Smooth Motion Curve */}
              {primaryLinePath && (
                <path
                  d={primaryLinePath}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Data Nodes & X Labels */}
              {chartData.map((d, i) => {
                const cx = xFor(i);
                const cy = yFor(d.primary);
                const isActive = i === activePointIdx;
                return (
                  <g
                    key={d.label}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                  >
                    {isActive && (
                      <line
                        x1={cx}
                        y1={PAD_T}
                        x2={cx}
                        y2={PAD_T + plotH}
                        stroke="rgba(15, 118, 110, 0.25)"
                        strokeWidth="1.2"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isActive ? 5.5 : 3.5}
                      fill={isActive ? '#0f766e' : '#ffffff'}
                      stroke="#0f766e"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <rect
                      x={cx - 18}
                      y={PAD_T}
                      width="36"
                      height={plotH + 22}
                      fill="transparent"
                    />
                    <text
                      x={cx}
                      y={H - 6}
                      textAnchor="middle"
                      fill={isActive ? '#0f172a' : '#64748b'}
                      fontWeight={isActive ? '600' : '400'}
                      fontSize="10"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="grid-budget"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-b from-slate-50/80 to-teal-50/30 border border-slate-200/70 rounded-xl p-4 space-y-3.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/85 border border-slate-200/70 rounded-xl p-3">
                <div className="text-[11px] text-slate-500">Total Luas AOI</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {areaKm2.toLocaleString('id-ID')} km²
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {gridBudget.totalHa.toLocaleString('id-ID')} Hektar
                </div>
              </div>
              <div className="bg-white/85 border border-slate-200/70 rounded-xl p-3">
                <div className="text-[11px] text-slate-500">Estimasi Sel / Piksel Grid</div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-700 mt-0.5">
                  {gridBudget.totalCells.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  Resolusi {params.spatialResolutionMeters}m × {params.spatialResolutionMeters}m
                </div>
              </div>
              <div className="bg-white/85 border border-slate-200/70 rounded-xl p-3">
                <div className="text-[11px] text-slate-500">Estimasi Zona Terklasifikasi</div>
                <div className="text-base font-bold font-mono tabular-nums text-teal-700 mt-0.5">
                  {gridBudget.estActiveRatio}% ({gridBudget.activeHa.toLocaleString('id-ID')} Ha)
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  Ambang ≥ {params.thresholdValue}
                </div>
              </div>
            </div>

            {/* Animated Progress Ratio Bars */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                  Proporsi Zona Memenuhi Ambang Batas
                </span>
                <span className="font-mono tabular-nums font-semibold text-teal-700">
                  {gridBudget.estActiveRatio}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-600 to-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${gridBudget.estActiveRatio}%` }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                  Kejernihan Citra / Konvergensi Simulasi
                </span>
                <span className="font-mono tabular-nums font-semibold text-sky-700">
                  {100 - params.maxCloudCover}% bebas awan
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - params.maxCloudCover}%` }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
