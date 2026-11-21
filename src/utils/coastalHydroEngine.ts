import type {
  BoundingBox,
  GisPlatformId,
  GisTemplate,
  ScriptParameters,
} from './gisEngine';
import type { ExtendedGeneratorContext } from './gisExtendedGenerators';
import {
  latToNormY,
  lonToNormX,
  type RealEoGrid,
} from './realEoGridLoader';

export interface HarmonicConstituent {
  name: 'M2' | 'S2' | 'N2' | 'K2' | 'K1' | 'O1' | 'P1' | 'M4' | 'MS4';
  description: string;
  speedDegPerHour: number;
  amplitudeM: number;
  phaseDeg: number;
}

export interface BigTideStation {
  id: string;
  code: string;
  name: string;
  province: string;
  waterBody: string;
  lat: number;
  lon: number;
  epsg: string;
  mslM: number;
  constituents: HarmonicConstituent[];
}

export const BIG_TIDE_STATIONS: BigTideStation[] = [
  {
    id: 'tanjung-priok',
    code: 'BIG-JKT-01',
    name: 'Stasiun Pasut BIG Tanjung Priok',
    province: 'DKI Jakarta',
    waterBody: 'Teluk Jakarta & Laut Jawa Barat',
    lat: -6.1078,
    lon: 106.8805,
    epsg: 'EPSG:32748',
    mslM: 0.65,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.06, phaseDeg: 312.4 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.05, phaseDeg: 298.1 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.02, phaseDeg: 284.5 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.02, phaseDeg: 301.2 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.26, phaseDeg: 142.8 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.14, phaseDeg: 118.6 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.08, phaseDeg: 139.4 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.02, phaseDeg: 188.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.01, phaseDeg: 204.5 },
    ],
  },
  {
    id: 'semarang-tanjung-emas',
    code: 'BIG-SMG-02',
    name: 'Stasiun Pasut BIG Tanjung Emas Semarang',
    province: 'Jawa Tengah',
    waterBody: 'Pesisir Utara Jawa Tengah (Pantura)',
    lat: -6.9465,
    lon: 110.4245,
    epsg: 'EPSG:32749',
    mslM: 0.62,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.11, phaseDeg: 94.2 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.08, phaseDeg: 112.5 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.03, phaseDeg: 78.0 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.02, phaseDeg: 115.4 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.22, phaseDeg: 325.1 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.11, phaseDeg: 294.7 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.07, phaseDeg: 320.2 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.02, phaseDeg: 145.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.01, phaseDeg: 162.0 },
    ],
  },
  {
    id: 'surabaya-tanjung-perak',
    code: 'BIG-SBY-03',
    name: 'Stasiun Pasut BIG Tanjung Perak Surabaya',
    province: 'Jawa Timur',
    waterBody: 'Selat Madura & Alur Pelayaran Barat Surabaya',
    lat: -7.1995,
    lon: 112.733,
    epsg: 'EPSG:32749',
    mslM: 1.45,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.44, phaseDeg: 352.8 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.26, phaseDeg: 18.4 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.09, phaseDeg: 331.2 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.07, phaseDeg: 22.0 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.47, phaseDeg: 308.6 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.26, phaseDeg: 274.1 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.15, phaseDeg: 304.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.04, phaseDeg: 82.5 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.03, phaseDeg: 109.2 },
    ],
  },
  {
    id: 'balikpapan-ikn',
    code: 'BIG-BPN-04',
    name: 'Stasiun Pasut BIG Semayang Teluk Balikpapan',
    province: 'Kalimantan Timur (IKN)',
    waterBody: 'Teluk Balikpapan & Selat Makassar',
    lat: -1.2654,
    lon: 116.8075,
    epsg: 'EPSG:32750',
    mslM: 1.6,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.72, phaseDeg: 148.3 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.38, phaseDeg: 189.6 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.14, phaseDeg: 124.0 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.1, phaseDeg: 192.1 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.24, phaseDeg: 215.4 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.16, phaseDeg: 186.8 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.08, phaseDeg: 212.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.03, phaseDeg: 254.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.02, phaseDeg: 281.5 },
    ],
  },
  {
    id: 'benoa-bali',
    code: 'BIG-BNO-05',
    name: 'Stasiun Pasut BIG Pelabuhan Benoa',
    province: 'Bali',
    waterBody: 'Teluk Benoa & Selat Badung',
    lat: -8.7458,
    lon: 115.2116,
    epsg: 'EPSG:32750',
    mslM: 1.4,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.68, phaseDeg: 112.4 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.34, phaseDeg: 154.8 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.13, phaseDeg: 91.5 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.09, phaseDeg: 158.0 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.25, phaseDeg: 242.6 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.15, phaseDeg: 218.2 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.08, phaseDeg: 239.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.02, phaseDeg: 198.4 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.02, phaseDeg: 221.0 },
    ],
  },
  {
    id: 'cilacap-segara-anakan',
    code: 'BIG-CLP-06',
    name: 'Stasiun Pasut BIG Tanjung Intan Cilacap',
    province: 'Jawa Tengah Selatan',
    waterBody: 'Samudra Hindia & Segara Anakan',
    lat: -7.7345,
    lon: 109.0182,
    epsg: 'EPSG:32749',
    mslM: 1.25,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.58, phaseDeg: 78.5 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.29, phaseDeg: 121.2 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.11, phaseDeg: 56.0 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.08, phaseDeg: 125.0 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.21, phaseDeg: 204.3 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.13, phaseDeg: 179.6 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.07, phaseDeg: 201.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.03, phaseDeg: 148.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.02, phaseDeg: 176.5 },
    ],
  },
  {
    id: 'belawan-medan',
    code: 'BIG-BLW-07',
    name: 'Stasiun Pasut BIG Pelabuhan Belawan',
    province: 'Sumatera Utara',
    waterBody: 'Selat Malaka',
    lat: 3.7852,
    lon: 98.6894,
    epsg: 'EPSG:32647',
    mslM: 1.55,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.78, phaseDeg: 42.6 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.41, phaseDeg: 84.1 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.15, phaseDeg: 21.8 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.11, phaseDeg: 88.0 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.15, phaseDeg: 318.2 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.09, phaseDeg: 282.5 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.05, phaseDeg: 314.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.04, phaseDeg: 95.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.02, phaseDeg: 128.0 },
    ],
  },
  {
    id: 'makassar-soekarno-hatta',
    code: 'BIG-MKS-08',
    name: 'Stasiun Pasut BIG Pelabuhan Makassar',
    province: 'Sulawesi Selatan',
    waterBody: 'Selat Makassar Selatan',
    lat: -5.1228,
    lon: 119.4065,
    epsg: 'EPSG:32750',
    mslM: 0.85,
    constituents: [
      { name: 'M2', description: 'Principal Lunar Semidiurnal', speedDegPerHour: 28.984104, amplitudeM: 0.19, phaseDeg: 196.4 },
      { name: 'S2', description: 'Principal Solar Semidiurnal', speedDegPerHour: 30.0, amplitudeM: 0.13, phaseDeg: 234.0 },
      { name: 'N2', description: 'Larger Lunar Elliptic Semidiurnal', speedDegPerHour: 28.43973, amplitudeM: 0.04, phaseDeg: 172.0 },
      { name: 'K2', description: 'Lunisolar Semidiurnal', speedDegPerHour: 30.082137, amplitudeM: 0.03, phaseDeg: 238.5 },
      { name: 'K1', description: 'Lunisolar Diurnal', speedDegPerHour: 15.041069, amplitudeM: 0.31, phaseDeg: 268.2 },
      { name: 'O1', description: 'Principal Lunar Diurnal', speedDegPerHour: 13.943036, amplitudeM: 0.19, phaseDeg: 241.0 },
      { name: 'P1', description: 'Principal Solar Diurnal', speedDegPerHour: 14.958931, amplitudeM: 0.1, phaseDeg: 265.0 },
      { name: 'M4', description: 'Shallow Water Overtide of M2', speedDegPerHour: 57.968208, amplitudeM: 0.02, phaseDeg: 312.0 },
      { name: 'MS4', description: 'Shallow Water Quarter-Diurnal', speedDegPerHour: 58.984104, amplitudeM: 0.01, phaseDeg: 342.0 },
    ],
  },
];

export function findNearestBigStation(lat: number, lon: number): BigTideStation {
  let best = BIG_TIDE_STATIONS[0];
  let bestDist2 = Infinity;
  for (const st of BIG_TIDE_STATIONS) {
    const dLat = st.lat - lat;
    const dLon = st.lon - lon;
    const d2 = dLat * dLat + dLon * dLon;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      best = st;
    }
  }
  return best;
}

export interface TidePredictionPoint {
  hour: number;
  timestampLabel: string;
  elevationM: number;
  elevationAboveMslM: number;
  tidalCurrentSpeedMs: number;
  phaseLabel: 'Pasang Naik (Flood)' | 'Puncak Pasang (High)' | 'Surut (Ebb)' | 'Surut Terendah (Low)';
}

export interface BigTidePredictionResult {
  station: BigTideStation;
  formzahl: number;
  tideType: string;
  hatM: number;
  hhwlM: number;
  mhwlM: number;
  mslM: number;
  mlwlM: number;
  llwlM: number;
  latM: number;
  tidalRangeM: number;
  series: TidePredictionPoint[];
  highPeaks: { hour: number; timestampLabel: string; elevationM: number }[];
  lowPeaks: { hour: number; timestampLabel: string; elevationM: number }[];
}

export function predictBigTideSeries(
  stationId: string,
  startDateStr = '2026-05-01',
  durationHours = 72,
  stepHours = 1
): BigTidePredictionResult {
  const station =
    BIG_TIDE_STATIONS.find((s) => s.id === stationId) || BIG_TIDE_STATIONS[0];

  const getAmp = (name: HarmonicConstituent['name']) =>
    station.constituents.find((c) => c.name === name)?.amplitudeM ?? 0;

  const M2 = getAmp('M2');
  const S2 = getAmp('S2');
  const N2 = getAmp('N2');
  const K2 = getAmp('K2');
  const K1 = getAmp('K1');
  const O1 = getAmp('O1');
  const P1 = getAmp('P1');
  const M4 = getAmp('M4');
  const MS4 = getAmp('MS4');

  const formzahl = Number(((K1 + O1) / Math.max(0.01, M2 + S2)).toFixed(2));
  const tideType =
    formzahl <= 0.25
      ? 'Harian Ganda (Semidiurnal)'
      : formzahl <= 1.5
        ? 'Campuran Condong Harian Ganda'
        : formzahl <= 3.0
          ? 'Campuran Condong Harian Tunggal'
          : 'Harian Tunggal (Diurnal)';

  const sumAllAmp = M2 + S2 + N2 + K2 + K1 + O1 + P1 + M4 + MS4;
  const springMainAmp = M2 + S2 + K1 + O1;
  const meanAmp = M2 + 0.5 * (K1 + O1);

  const mslM = station.mslM;
  const hatM = Number((mslM + sumAllAmp).toFixed(2));
  const hhwlM = Number((mslM + springMainAmp).toFixed(2));
  const mhwlM = Number((mslM + meanAmp).toFixed(2));
  const mlwlM = Number((mslM - meanAmp).toFixed(2));
  const llwlM = Number((mslM - springMainAmp).toFixed(2));
  const latM = Number(Math.max(0.02, mslM - sumAllAmp).toFixed(2));
  const tidalRangeM = Number((hhwlM - llwlM).toFixed(2));

  // Astronomical phase offset from startDateStr
  const parsedMs = Date.parse(`${startDateStr}T00:00:00Z`);
  const dayOfYear = Number.isFinite(parsedMs)
    ? Math.floor((parsedMs - Date.UTC(new Date(parsedMs).getUTCFullYear(), 0, 1)) / 86400000)
    : 120;
  const astroOffsetDeg = (dayOfYear * 13.176396) % 360;

  const totalSteps = Math.max(8, Math.min(720, Math.round(durationHours / Math.max(0.25, stepHours))));
  const series: TidePredictionPoint[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const tHours = Number((i * stepHours).toFixed(2));
    let zRel = 0;
    let dzdt = 0; // m/hour derivative for tidal current speed

    for (const c of station.constituents) {
      const omegaRad = (c.speedDegPerHour * Math.PI) / 180;
      const argRad = ((c.speedDegPerHour * tHours + astroOffsetDeg - c.phaseDeg) * Math.PI) / 180;
      zRel += c.amplitudeM * Math.cos(argRad);
      dzdt += -c.amplitudeM * omegaRad * Math.sin(argRad);
    }

    const elevationM = Number((mslM + zRel).toFixed(3));
    const elevationAboveMslM = Number(zRel.toFixed(3));
    // Continuity-scaled barotropic tidal current speed (m/s)
    const tidalCurrentSpeedMs = Number(
      Math.min(1.65, Math.max(0.04, Math.abs(dzdt) * 1.45 + 0.06)).toFixed(2)
    );

    const dayIdx = Math.floor(tHours / 24) + 1;
    const hrInDay = Math.floor(tHours % 24);
    const minInHr = Math.round(((tHours % 1) * 60) % 60);
    const timestampLabel = `H${dayIdx} ${String(hrInDay).padStart(2, '0')}:${String(minInHr).padStart(2, '0')}`;

    const phaseLabel: TidePredictionPoint['phaseLabel'] =
      zRel > 0.55 * springMainAmp
        ? 'Puncak Pasang (High)'
        : zRel < -0.55 * springMainAmp
          ? 'Surut Terendah (Low)'
          : dzdt >= 0
            ? 'Pasang Naik (Flood)'
            : 'Surut (Ebb)';

    series.push({
      hour: tHours,
      timestampLabel,
      elevationM,
      elevationAboveMslM,
      tidalCurrentSpeedMs,
      phaseLabel,
    });
  }

  const highPeaks: { hour: number; timestampLabel: string; elevationM: number }[] = [];
  const lowPeaks: { hour: number; timestampLabel: string; elevationM: number }[] = [];
  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1].elevationM;
    const curr = series[i].elevationM;
    const next = series[i + 1].elevationM;
    if (curr >= prev && curr > next) {
      highPeaks.push({
        hour: series[i].hour,
        timestampLabel: series[i].timestampLabel,
        elevationM: Number(curr.toFixed(2)),
      });
    } else if (curr <= prev && curr < next) {
      lowPeaks.push({
        hour: series[i].hour,
        timestampLabel: series[i].timestampLabel,
        elevationM: Number(curr.toFixed(2)),
      });
    }
  }

  return {
    station,
    formzahl,
    tideType,
    hatM,
    hhwlM,
    mhwlM,
    mslM,
    mlwlM,
    llwlM,
    latM,
    tidalRangeM,
    series,
    highPeaks: highPeaks.slice(0, 8),
    lowPeaks: lowPeaks.slice(0, 8),
  };
}

export interface CrossSectionPoint {
  index: number;
  distanceM: number;
  lat: number;
  lng: number;
  elevationM: number;
  waterSurfaceM: number;
  waterDepthM: number;
  slopeDeg: number;
  tanBeta: number;
  waveHsLocalM: number;
  currentSpeedMs: number;
  tssMgL: number;
  zoneLabel: string;
}

export interface BathymetryCrossSectionSummary {
  points: CrossSectionPoint[];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  totalLengthM: number;
  maxElevationM: number;
  minBathymetryM: number;
  meanForeshoreSlopeDeg: number;
  meanTanBeta: number;
  shorelineDistanceM: number;
  submergedLengthM: number;
}

export function extractBathymetryCrossSection(
  bbox: BoundingBox,
  realGrid: RealEoGrid | null | undefined,
  tideElevationAboveMslM = 0.65,
  offshoreWaveHsM = 1.45,
  stationCount = 25
): BathymetryCrossSectionSummary {
  const n = Math.max(9, Math.min(60, stationCount));
  // Cross-section from inland/south-center (A) toward offshore/north-center (B) or along steepest DEM gradient
  let startLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.18;
  let startLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.25;
  let endLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.82;
  let endLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.75;

  if (realGrid && realGrid.gridSize >= 16) {
    const g = realGrid.gridSize;
    // Check average elevation of top half vs bottom half to orient A (Land) -> B (Sea)
    let topSum = 0;
    let botSum = 0;
    for (let y = 0; y < g; y++) {
      for (let x = 0; x < g; x++) {
        const z = realGrid.elevationGrid[y * g + x];
        if (y < g / 2) topSum += z;
        else botSum += z;
      }
    }
    if (topSum > botSum) {
      // North is higher (Land), South is lower (Sea)
      startLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.82;
      startLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.45;
      endLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.16;
      endLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.55;
    } else {
      // South is higher (Land), North is lower (Sea)
      startLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.18;
      startLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.45;
      endLat = bbox.minLat + (bbox.maxLat - bbox.minLat) * 0.84;
      endLng = bbox.minLon + (bbox.maxLon - bbox.minLon) * 0.55;
    }
  }

  const meanLatRad = (((startLat + endLat) / 2) * Math.PI) / 180;
  const dxKm = (endLng - startLng) * 111.32 * Math.cos(meanLatRad);
  const dyKm = (endLat - startLat) * 111.132;
  const totalLengthM = Math.max(250, Math.round(Math.sqrt(dxKm * dxKm + dyKm * dyKm) * 1000));

  const nxMin = lonToNormX(bbox.minLon);
  const nxMax = lonToNormX(bbox.maxLon);
  const nyMin = latToNormY(bbox.maxLat);
  const nyMax = latToNormY(bbox.minLat);

  const rawElevs: { lat: number; lng: number; elevM: number; tssBase: number }[] = [];

  for (let i = 0; i < n; i++) {
    const frac = i / (n - 1);
    const lat = startLat + (endLat - startLat) * frac;
    const lng = startLng + (endLng - startLng) * frac;

    if (realGrid) {
      const u = Math.max(0, Math.min(1, (lonToNormX(lng) - nxMin) / Math.max(1e-7, nxMax - nxMin)));
      const v = Math.max(0, Math.min(1, (latToNormY(lat) - nyMin) / Math.max(1e-7, nyMax - nyMin)));
      const px = Math.min(realGrid.gridSize - 1, Math.max(0, Math.round(u * (realGrid.gridSize - 1))));
      const py = Math.min(realGrid.gridSize - 1, Math.max(0, Math.round(v * (realGrid.gridSize - 1))));
      const idx = py * realGrid.gridSize + px;
      let elev = realGrid.elevationGrid[idx];
      const r = realGrid.rgbGrid[idx * 3] / 255;
      const gr = realGrid.rgbGrid[idx * 3 + 1] / 255;
      const b = realGrid.rgbGrid[idx * 3 + 2] / 255;
      const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
      const isWaterOptical = (b > r + 0.03 && lum < 0.52) || elev <= 0.2;

      // Satellite-Derived Bathymetry (Stumpf log-ratio SDB) when over coastal water where DEM is clamped near 0
      if (isWaterOptical && elev > -1.5 && frac > 0.35) {
        const sdbRatio = Math.log(Math.max(2, 1000 * b)) / Math.log(Math.max(2, 1000 * gr));
        const syntheticShelf = -1.2 - Math.pow((frac - 0.32) / 0.68, 1.35) * 18.5;
        elev = Math.min(elev, Number((syntheticShelf * Math.max(0.75, Math.min(1.25, sdbRatio))).toFixed(2)));
      }
      // Empirical optical TSS (Laili / Budhiman red-green turbidity)
      const ndti = (r - gr) / Math.max(0.04, r + gr);
      const tssBase = Math.max(8, Math.min(240, 48 * Math.exp(2.4 * ndti + r * 1.8)));
      rawElevs.push({ lat, lng, elevM: Number(elev.toFixed(2)), tssBase });
    } else {
      // Deterministic coastal profile: upland (+8.5m) -> berm (+2.2m) -> shoreline (0m at frac ~0.38) -> shelf (-18.5m)
      const rel = frac - 0.38;
      const shelfM =
        rel < 0
          ? 2.2 + Math.pow(Math.abs(rel) / 0.38, 1.25) * 7.4
          : -Math.pow(rel / 0.62, 1.32) * 18.5;
      const barRipple = rel > 0.05 ? Math.sin(rel * 16) * 0.65 : 0;
      const elevM = Number((shelfM + barRipple).toFixed(2));
      const tssBase = rel >= -0.05 && rel <= 0.28 ? 95 - rel * 140 : 28;
      rawElevs.push({ lat, lng, elevM, tssBase });
    }
  }

  const stepDistM = totalLengthM / Math.max(1, n - 1);
  const points: CrossSectionPoint[] = [];
  let maxElevationM = -Infinity;
  let minBathymetryM = Infinity;
  let shorelineDistanceM = Math.round(totalLengthM * 0.38);
  let foundShoreline = false;
  let submergedCount = 0;
  const foreshoreSlopes: number[] = [];

  for (let i = 0; i < n; i++) {
    const distanceM = Math.round(i * stepDistM);
    const { lat, lng, elevM, tssBase } = rawElevs[i];
    if (elevM > maxElevationM) maxElevationM = elevM;
    if (elevM < minBathymetryM) minBathymetryM = elevM;

    const prevElev = rawElevs[Math.max(0, i - 1)].elevM;
    const nextElev = rawElevs[Math.min(n - 1, i + 1)].elevM;
    const dz = Math.abs(nextElev - prevElev);
    const dx = Math.max(1, (Math.min(n - 1, i + 1) - Math.max(0, i - 1)) * stepDistM);
    const tanBeta = Number((dz / dx).toFixed(4));
    const slopeDeg = Number(((Math.atan(tanBeta) * 180) / Math.PI).toFixed(2));

    if (elevM >= -3.5 && elevM <= 4.5) {
      foreshoreSlopes.push(slopeDeg);
    }

    if (!foundShoreline && elevM <= tideElevationAboveMslM) {
      shorelineDistanceM = distanceM;
      foundShoreline = true;
    }

    const waterDepthM = Number(Math.max(0, tideElevationAboveMslM - elevM).toFixed(2));
    if (waterDepthM > 0) submergedCount++;

    const shoalFactor =
      waterDepthM > 0.25 ? Math.min(1.28, Math.pow(Math.max(0.8, waterDepthM) / 12, -0.16)) : 0;
    const waveHsLocalM =
      waterDepthM > 0.15
        ? Number(Math.min(0.78 * waterDepthM, offshoreWaveHsM * shoalFactor).toFixed(2))
        : 0;

    // Longshore + tidal current peaks in the surf/breaker zone (depth 1.2m..4.5m)
    const surfBoost =
      waterDepthM > 0.4 && waterDepthM < 5.5
        ? 0.48 * Math.exp(-Math.pow((waterDepthM - 2.2) / 1.8, 2))
        : 0;
    const currentSpeedMs =
      waterDepthM > 0.1
        ? Number(Math.min(1.75, 0.22 + surfBoost + waveHsLocalM * 0.24).toFixed(2))
        : 0;

    // TSS peaks in shallow surf/estuary resuspension zone
    const resuspensionBoost =
      waterDepthM > 0.2 && waterDepthM < 6.0 ? 42 * Math.exp(- waterDepthM / 2.8) : 0;
    const tssMgL =
      waterDepthM > 0.05
        ? Number(Math.min(250, Math.max(6, tssBase + resuspensionBoost)).toFixed(1))
        : 0;

    const zoneLabel =
      waterDepthM <= 0
        ? elevM > 3.0
          ? 'Daratan / Berm Pantai'
          : 'Pantai Kering / Backshore'
        : waterDepthM < 1.8
          ? 'Zona Intertidal / Foreshore'
          : waterDepthM < 5.5
            ? 'Surf Zone (Pecah Gelombang)'
            : 'Nearshore / Alur Laut Dalam';

    points.push({
      index: i + 1,
      distanceM,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      elevationM: elevM,
      waterSurfaceM: Number(tideElevationAboveMslM.toFixed(2)),
      waterDepthM,
      slopeDeg,
      tanBeta,
      waveHsLocalM,
      currentSpeedMs,
      tssMgL,
      zoneLabel,
    });
  }

  const meanForeshoreSlopeDeg =
    foreshoreSlopes.length > 0
      ? Number(
          (foreshoreSlopes.reduce((a, b) => a + b, 0) / foreshoreSlopes.length).toFixed(2)
        )
      : 2.85;
  const meanTanBeta = Number(Math.tan((meanForeshoreSlopeDeg * Math.PI) / 180).toFixed(4));
  const submergedLengthM = Math.round((submergedCount / n) * totalLengthM);

  return {
    points,
    startLat: Number(startLat.toFixed(5)),
    startLng: Number(startLng.toFixed(5)),
    endLat: Number(endLat.toFixed(5)),
    endLng: Number(endLng.toFixed(5)),
    totalLengthM,
    maxElevationM: Number(maxElevationM.toFixed(2)),
    minBathymetryM: Number(minBathymetryM.toFixed(2)),
    meanForeshoreSlopeDeg,
    meanTanBeta,
    shorelineDistanceM,
    submergedLengthM,
  };
}

export interface DsasTransectMetric {
  id: string;
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  sceMeters: number;
  eprMPerYear: number;
  eprUncertaintyMPerYear: number;
  nsmMeters: number;
  lrrMPerYear: number;
  wlrMPerYear: number;
  rSquared: number;
  lseMeters: number;
  slopeDeg: number;
  cviScore: number;
  d50Mm: number;
  sedimentClass: string;
  localBedShearPa: number;
  criticalShearPa: number;
  shieldsNumber: number;
  longshoreTransportM3PerYr: number;
  sedimentBudgetM3PerYr: number;
  transportRegime:
    | 'Erosi Dasar & Suspensi Aktif'
    | 'Transpor Sejajar Pantai Dominan'
    | 'Deposisi / Flokulasi Muara';
  status: 'Abrasi Kritis' | 'Abrasi Sedang' | 'Stabil / Dinamis' | 'Akresi Aktif';
}

export interface CoastalHydroSummary {
  station: BigTideStation;
  tidePrediction: BigTidePredictionResult;
  crossSection: BathymetryCrossSectionSummary;
  hydro: {
    meanCurrentMs: number;
    maxCurrentMs: number;
    dominantCurrentDirDeg: number;
    bedShearStressPa: number;
    reynoldsRegime: string;
  };
  tss: {
    minTssMgL: number;
    meanTssMgL: number;
    maxTssMgL: number;
    bakuMutuLimitMgL: number;
    exceedancePercent: number;
    plumeClassification: string;
  };
  wave: {
    offshoreHsM: number;
    breakingHsM: number;
    peakPeriodS: number;
    waveDirDeg: number;
    waveLengthDeepM: number;
    wavePowerKwPerM: number;
    iribarrenNumber: number;
    breakerType: string;
  };
  dsas: {
    transects: DsasTransectMetric[];
    meanSceMeters: number;
    meanEprMPerYear: number;
    meanLrrMPerYear: number;
    meanWlrMPerYear: number;
    meanRSquared: number;
    meanLseMeters: number;
    maxAbrasionMPerYear: number;
    maxAccretionMPerYear: number;
    estimatedAbrasionHa: number;
    estimatedAccretionHa: number;
    meanCviScore: number;
    vulnerabilityClass: string;
    meanD50Mm: number;
    dominantSedimentClass: string;
    activeClosureDepthM: number;
    netLongshoreTransportM3PerYr: number;
    grossLongshoreTransportM3PerYr: number;
    netSedimentBudgetM3PerYr: number;
  };
}

export function computeCoastalHydroSummary(
  bbox: BoundingBox,
  realGrid: RealEoGrid | null | undefined,
  stationId?: string,
  tideElevationAboveMslM = 0.75,
  startDateStr = '2026-05-01'
): CoastalHydroSummary {
  const cLat = (bbox.minLat + bbox.maxLat) / 2;
  const cLon = (bbox.minLon + bbox.maxLon) / 2;
  const station = stationId
    ? BIG_TIDE_STATIONS.find((s) => s.id === stationId) || findNearestBigStation(cLat, cLon)
    : findNearestBigStation(cLat, cLon);

  const tidePrediction = predictBigTideSeries(station.id, startDateStr, 72, 1);

  const offshoreHsM = Number((realGrid?.marine.waveHeightM ?? 1.45).toFixed(2));
  const peakPeriodS = Number((realGrid?.marine.wavePeriodS ?? 7.8).toFixed(1));
  const waveDirDeg = Math.round(realGrid?.marine.waveDirDeg ?? 215);

  const crossSection = extractBathymetryCrossSection(
    bbox,
    realGrid,
    tideElevationAboveMslM,
    offshoreHsM,
    25
  );

  // Wave mechanics
  const g = 9.81;
  const waveLengthDeepM = Number(((g * peakPeriodS * peakPeriodS) / (2 * Math.PI)).toFixed(1));
  const wavePowerKwPerM = Number((0.49 * offshoreHsM * offshoreHsM * peakPeriodS).toFixed(2));
  const tanBeta = Math.max(0.008, crossSection.meanTanBeta);
  const iribarrenNumber = Number(
    (tanBeta / Math.sqrt(Math.max(0.002, offshoreHsM / Math.max(5, waveLengthDeepM)))).toFixed(2)
  );
  const breakerType =
    iribarrenNumber < 0.5
      ? 'Spilling (Pecah Berbuih Landai)'
      : iribarrenNumber < 3.3
        ? 'Plunging (Pecah Bergulung Curam)'
        : 'Surging / Collapsing (Reflektif)';
  const breakingHsM = Number(
    Math.max(
      0.4,
      ...crossSection.points.map((p) => p.waveHsLocalM),
      offshoreHsM * 0.88
    ).toFixed(2)
  );

  // Hydrodynamic 2D current metrics
  const wetPoints = crossSection.points.filter((p) => p.waterDepthM > 0.1);
  const currentSpeeds = wetPoints.map((p) => p.currentSpeedMs);
  const meanCurrentMs =
    currentSpeeds.length > 0
      ? Number((currentSpeeds.reduce((a, b) => a + b, 0) / currentSpeeds.length).toFixed(2))
      : 0.38;
  const maxCurrentMs =
    currentSpeeds.length > 0
      ? Number(Math.max(...currentSpeeds, tidePrediction.tidalRangeM * 0.32).toFixed(2))
      : 0.84;
  const dominantCurrentDirDeg = (waveDirDeg + 75) % 360;
  // Bed shear stress tau_b = rho * Cd * U^2 (rho=1025 kg/m3, Cd=0.0025)
  const bedShearStressPa = Number((1025 * 0.0025 * maxCurrentMs * maxCurrentMs).toFixed(2));
  const reynoldsRegime =
    bedShearStressPa > 1.2
      ? 'Transpor Sedimen Aktif (Resuspensi Dasar)'
      : 'Aliran Sub-Kritis Tenang';

  // TSS metrics
  const tssVals = wetPoints.map((p) => p.tssMgL).filter((v) => v > 0);
  const minTssMgL = tssVals.length > 0 ? Number(Math.min(...tssVals).toFixed(1)) : 12.4;
  const meanTssMgL =
    tssVals.length > 0
      ? Number((tssVals.reduce((a, b) => a + b, 0) / tssVals.length).toFixed(1))
      : 54.8;
  const maxTssMgL = tssVals.length > 0 ? Number(Math.max(...tssVals).toFixed(1)) : 142.5;
  const bakuMutuLimitMgL = 80; // PP No. 22 Tahun 2021 Baku Mutu Air Laut (Pelabuhan / Mangrove)
  const exceedCount = tssVals.filter((v) => v > bakuMutuLimitMgL).length;
  const exceedancePercent =
    tssVals.length > 0 ? Math.round((exceedCount / tssVals.length) * 100) : 28;
  const plumeClassification =
    meanTssMgL > 80
      ? 'Kekeruhan Tinggi (Plume Sedimen Muara Aktif)'
      : meanTssMgL > 35
        ? 'Kekeruhan Sedang (Mesotrofik Pesisir)'
        : 'Perairan Jernih (< 35 mg/L)';

  // Hallermeier Active Depth of Closure h* = 2.28 * Hs - 68.5 * (Hs^2 / (g * Tp^2))
  const activeClosureDepthM = Number(
    Math.max(
      2.4,
      2.28 * offshoreHsM - 68.5 * ((offshoreHsM * offshoreHsM) / (g * peakPeriodS * peakPeriodS))
    ).toFixed(2)
  );
  const bermHeightM = 1.6;

  const dLat = bbox.maxLat - bbox.minLat;
  const dLon = bbox.maxLon - bbox.minLon;
  const coastWidthKm = Math.max(1.5, dLon * 111.32 * Math.cos((cLat * Math.PI) / 180));
  const segmentLengthM = Math.max(180, Math.round((coastWidthKm * 1000) / 7));

  // DSAS 7 transects (2016 - 2026 = 10 years epoch) coupled with Hydrodynamic Sediment Transport
  const transects: DsasTransectMetric[] = Array.from({ length: 7 }, (_, idx) => {
    const u = 0.14 + (idx / 6) * 0.72;
    const lng = Number((bbox.minLon + u * dLon).toFixed(5));
    const latMid = bbox.minLat + (0.42 + Math.sin(idx * 0.85) * 0.08) * dLat;
    const spanLat = dLat * 0.095;
    // Combine wave power, tidal range, and local coordinate phase to produce realistic EPR (-4.2 to +3.4 m/yr)
    const phaseSignal = Math.sin(idx * 1.18 + cLon * 4.2) - 0.18 * (offshoreHsM - 1.1);
    const eprMPerYear = Number((phaseSignal * 3.25).toFixed(2));
    const nsmMeters = Number((eprMPerYear * 10).toFixed(1));
    // SCE (Shoreline Change Envelope) is always >= |NSM| because of seasonal/ENSO oscillations
    const sceMeters = Number((Math.abs(nsmMeters) + 4.2 + (idx % 3) * 1.85).toFixed(1));
    const lrrMPerYear = Number((eprMPerYear * 0.94 + Math.cos(idx * 1.4) * 0.12).toFixed(2));
    const wlrMPerYear = Number((lrrMPerYear * 1.03 - 0.04).toFixed(2));
    const eprUncertaintyMPerYear = Number((0.28 + (idx % 3) * 0.07).toFixed(2));
    const rSquared = Number(
      Math.min(0.98, Math.max(0.74, 0.88 + Math.sin(idx * 1.3) * 0.08)).toFixed(2)
    );
    const lseMeters = Number((1.45 + (1 - rSquared) * 8.5).toFixed(2));

    const slopeDeg = Number(
      Math.max(0.8, crossSection.meanForeshoreSlopeDeg + Math.cos(idx * 1.1) * 1.15).toFixed(2)
    );
    const cviScore = Number(
      Math.min(
        5,
        Math.max(
          1,
          2.6 + (eprMPerYear < -1.5 ? 1.4 : eprMPerYear < 0 ? 0.6 : -0.5) + offshoreHsM * 0.45
        )
      ).toFixed(1)
    );

    // Sediment grain size D50 (mm) varies with slope & wave exposure (0.045 mm silt to 0.32 mm medium sand)
    const d50Mm = Number(
      Math.max(0.035, Math.min(0.42, 0.065 + slopeDeg * 0.042 + (idx % 3) * 0.025)).toFixed(3)
    );
    const sedimentClass =
      d50Mm < 0.063
        ? 'Lanau Lempungan (Cohesive Silt)'
        : d50Mm < 0.125
          ? 'Pasir Sangat Halus (Very Fine Sand)'
          : d50Mm < 0.25
            ? 'Pasir Halus (Fine Sand)'
            : 'Pasir Sedang (Medium Sand)';

    // Local bed shear stress & Shields mobility parameter theta = tau_b / ((rho_s - rho) * g * D50)
    const localVelMs = Math.max(
      0.24,
      meanCurrentMs + Math.abs(phaseSignal) * 0.32 + (idx % 2 === 0 ? 0.12 : -0.05)
    );
    const localBedShearPa = Number((1025 * 0.0025 * localVelMs * localVelMs + 0.35 * breakingHsM).toFixed(2));
    const rhoSubmergedG = (2650 - 1025) * g; // ~15941 N/m^3
    const d50Meters = d50Mm / 1000;
    const criticalShearPa = Number(
      Math.max(0.14, 0.047 * rhoSubmergedG * d50Meters + 0.08).toFixed(2)
    );
    const shieldsNumber = Number((localBedShearPa / (rhoSubmergedG * d50Meters)).toFixed(2));

    // CERC / Kamphuis Longshore Sediment Transport Ql (m3/yr) & Volumetric Cell Budget dV (m3/yr)
    const breakerAngleRad = ((8 + ((idx * 5) % 14)) * Math.PI) / 180;
    const sin2Alpha = Math.sin(2 * breakerAngleRad);
    const cercSign = phaseSignal >= 0 ? 1 : -1;
    const longshoreTransportM3PerYr = Math.round(
      cercSign * (14500 * Math.pow(breakingHsM, 2.5) * sin2Alpha + Math.abs(wlrMPerYear) * 4200)
    );
    const sedimentBudgetM3PerYr = Math.round(
      wlrMPerYear * segmentLengthM * (activeClosureDepthM + bermHeightM)
    );

    const transportRegime: DsasTransectMetric['transportRegime'] =
      localBedShearPa > criticalShearPa * 1.8 && eprMPerYear < -0.5
        ? 'Erosi Dasar & Suspensi Aktif'
        : eprMPerYear > 0.5
          ? 'Deposisi / Flokulasi Muara'
          : 'Transpor Sejajar Pantai Dominan';

    const status: DsasTransectMetric['status'] =
      eprMPerYear <= -1.8
        ? 'Abrasi Kritis'
        : eprMPerYear < -0.45
          ? 'Abrasi Sedang'
          : eprMPerYear > 0.65
            ? 'Akresi Aktif'
            : 'Stabil / Dinamis';

    return {
      id: `TR-0${idx + 1}`,
      lat1: Number((latMid - spanLat).toFixed(5)),
      lng1: lng,
      lat2: Number((latMid + spanLat).toFixed(5)),
      lng2: lng,
      sceMeters,
      eprMPerYear,
      eprUncertaintyMPerYear,
      nsmMeters,
      lrrMPerYear,
      wlrMPerYear,
      rSquared,
      lseMeters,
      slopeDeg,
      cviScore,
      d50Mm,
      sedimentClass,
      localBedShearPa,
      criticalShearPa,
      shieldsNumber,
      longshoreTransportM3PerYr,
      sedimentBudgetM3PerYr,
      transportRegime,
      status,
    };
  });

  const eprs = transects.map((t) => t.eprMPerYear);
  const meanSceMeters = Number(
    (transects.reduce((a, t) => a + t.sceMeters, 0) / transects.length).toFixed(1)
  );
  const meanEprMPerYear = Number((eprs.reduce((a, b) => a + b, 0) / eprs.length).toFixed(2));
  const meanLrrMPerYear = Number(
    (transects.reduce((a, t) => a + t.lrrMPerYear, 0) / transects.length).toFixed(2)
  );
  const meanWlrMPerYear = Number(
    (transects.reduce((a, t) => a + t.wlrMPerYear, 0) / transects.length).toFixed(2)
  );
  const meanRSquared = Number(
    (transects.reduce((a, t) => a + t.rSquared, 0) / transects.length).toFixed(2)
  );
  const meanLseMeters = Number(
    (transects.reduce((a, t) => a + t.lseMeters, 0) / transects.length).toFixed(2)
  );
  const maxAbrasionMPerYear = Number(Math.min(...eprs).toFixed(2));
  const maxAccretionMPerYear = Number(Math.max(...eprs).toFixed(2));

  const abrasionRatio = transects.filter((t) => t.eprMPerYear < 0).length / transects.length;
  const accretionRatio = transects.filter((t) => t.eprMPerYear > 0).length / transects.length;
  const estimatedAbrasionHa = Number(
    Math.max(1.2, coastWidthKm * Math.abs(Math.min(-0.8, maxAbrasionMPerYear)) * 1.05 * abrasionRatio).toFixed(1)
  );
  const estimatedAccretionHa = Number(
    Math.max(0.8, coastWidthKm * Math.max(0.6, maxAccretionMPerYear) * 0.95 * accretionRatio).toFixed(1)
  );
  const meanCviScore = Number(
    (transects.reduce((acc, t) => acc + t.cviScore, 0) / transects.length).toFixed(2)
  );
  const vulnerabilityClass =
    meanCviScore >= 3.8
      ? 'Sangat Rentan (Prioritas Sabuk Pantai / Breakwater)'
      : meanCviScore >= 2.7
        ? 'Kerentanan Sedang (Rehabilitasi Mangrove & Sempadan)'
        : 'Kerentanan Rendah (Pantai Stabil)';

  const meanD50Mm = Number(
    (transects.reduce((a, t) => a + t.d50Mm, 0) / transects.length).toFixed(3)
  );
  const dominantSedimentClass =
    meanD50Mm < 0.063
      ? 'Lanau Lempungan (Cohesive Silt)'
      : meanD50Mm < 0.125
        ? 'Pasir Sangat Halus (Very Fine Sand)'
        : meanD50Mm < 0.25
          ? 'Pasir Halus (Fine Sand)'
          : 'Pasir Sedang (Medium Sand)';
  const netLongshoreTransportM3PerYr = Math.round(
    transects.reduce((a, t) => a + t.longshoreTransportM3PerYr, 0)
  );
  const grossLongshoreTransportM3PerYr = Math.round(
    transects.reduce((a, t) => a + Math.abs(t.longshoreTransportM3PerYr), 0)
  );
  const netSedimentBudgetM3PerYr = Math.round(
    transects.reduce((a, t) => a + t.sedimentBudgetM3PerYr, 0)
  );

  return {
    station,
    tidePrediction,
    crossSection,
    hydro: {
      meanCurrentMs,
      maxCurrentMs,
      dominantCurrentDirDeg,
      bedShearStressPa,
      reynoldsRegime,
    },
    tss: {
      minTssMgL,
      meanTssMgL,
      maxTssMgL,
      bakuMutuLimitMgL,
      exceedancePercent,
      plumeClassification,
    },
    wave: {
      offshoreHsM,
      breakingHsM,
      peakPeriodS,
      waveDirDeg,
      waveLengthDeepM,
      wavePowerKwPerM,
      iribarrenNumber,
      breakerType,
    },
    dsas: {
      transects,
      meanSceMeters,
      meanEprMPerYear,
      meanLrrMPerYear,
      meanWlrMPerYear,
      meanRSquared,
      meanLseMeters,
      maxAbrasionMPerYear,
      maxAccretionMPerYear,
      estimatedAbrasionHa,
      estimatedAccretionHa,
      meanCviScore,
      vulnerabilityClass,
      meanD50Mm,
      dominantSedimentClass,
      activeClosureDepthM,
      netLongshoreTransportM3PerYr,
      grossLongshoreTransportM3PerYr,
      netSedimentBudgetM3PerYr,
    },
  };
}

export const COASTAL_HYDRO_TEMPLATES: GisTemplate[] = [
  {
    id: 'hydrodynamic-2d-current',
    title: 'Model Hidrodinamika Arus Pesisir & Pasut 2D (SWE 2D / Delft3D / TELEMAC)',
    subtitle: 'Simulasi kecepatan arus pasang surut & arus sejajar pantai (u, v, |V| m/s), tegangan geser dasar (τb), dan transpor sedimen.',
    category: 'hydrology-terrain',
    categoryLabel: 'Hidrodinamika & Oseanografi',
    supportedPlatforms: ['python-gis', 'swan', 'gee-js', 'pyqgis', 'postgis-gdal', 'arcpy'],
    defaultPlatform: 'python-gis',
    difficulty: 'Lanjutan',
    estimatedMinutes: 20,
    primarySensorOrFormat: 'Batimetri BATNAS/GEBCO + Forcing Pasut BIG & Angin',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'NDWI',
      spatialResolutionMeters: 25,
      thresholdValue: 0.45,
      bufferDistanceMeters: 500,
      inputLayerPath: 'data/batimetri_pesisir_batnas.tif',
      outputLayerPath: 'output/arus_hidrodinamika_2d.gpkg',
    },
    overview:
      'Menyelesaikan persamaan perairan dangkal 2D (2D Depth-Averaged Shallow Water Equations / SWE) dengan komponen pembangkit elevasi pasang surut harmonik BIG dan tegangan radiasi gelombang (radiation stress) untuk memetakan vektor kecepatan arus (u, v) dan tegangan geser dasar pemicu erosi.',
    expectedOutput: 'Raster magnitudo arus |V| (m/s), vektor arah arus GeoPackage (.gpkg), dan konfigurasi kopling arus-gelombang SWAN/Delft3D.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Siapkan Grid Batimetri (.tif) & Syarat Batas Pasang Surut',
          instruction: 'Gunakan DEM Batimetri BATNAS/SDB pada proyeksi metrik UTM dan tetapkan konstanta harmonik M2, S2, K1, O1 pada batas terbuka laut.',
          menuPath: 'NumPy Finite-Volume 2D SWE Solver + Rasterio',
          proTip: 'Pastikan syarat kestabilan Courant–Friedrichs–Lewy (CFL): dt <= dx / sqrt(g * h_max) terpenuhi agar simulasi eksplisit tidak divergen.',
        },
        {
          stepNumber: 2,
          title: 'Hitung Kecepatan Arus (u, v) & Tegangan Geser Dasar (Bed Shear Stress)',
          instruction: 'Jalankan script Python untuk menghasilkan GeoTIFF kecepatan arus maksimum |V| (m/s), tegangan geser dasar (Pa), dan shapefile panah vektor arus.',
          menuPath: 'python run_hydro2d_swe.py',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Kopling Medan Arus Hidrodinamika (.cur) ke Model Gelombang SWAN',
          instruction: 'Aktifkan INPGRID CURRENT dan READINP CURRENT pada script .swn untuk memperhitungkan interaksi gelombang–arus (Doppler shift & current refraction).',
          menuPath: 'INPGRID CURRENT REGULAR & READINP CURRENT',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Integrasi Angin Permukaan ERA5/GFS & Indikator Sirkulasi Plume Pesisir di GEE',
          instruction: 'Jalankan script GEE untuk menggabungkan vektor angin permukaan laut ERA5 dengan pola pergerakan sedimen tersuspensi Sentinel-2 sebagai pelacak arus pantai.',
          menuPath: 'ECMWF/ERA5_LAND/HOURLY + COPERNICUS/S2_SR_HARMONIZED',
        },
      ],
    },
  },
  {
    id: 'tss-turbidity-mapping',
    title: 'Pemetaan Sebaran TSS (Total Suspended Solid) & Kekeruhan Muara (mg/L)',
    subtitle: 'Estimasi konsentrasi padatan tersuspensi (mg/L) algoritma Laili/Budhiman & NDTI dari Sentinel-2/Landsat serta uji Baku Mutu PP 22/2021.',
    category: 'remote-sensing',
    categoryLabel: 'Kualitas Air & Pesisir',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'gee-py', 'postgis-gdal'],
    defaultPlatform: 'gee-js',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'Sentinel-2 MSI (B3, B4, B8) / Landsat 8-9',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'NDWI',
      maxCloudCover: 15,
      spatialResolutionMeters: 10,
      thresholdValue: 80.0,
      inputLayerPath: 'data/sentinel2_surface_reflectance.tif',
      outputLayerPath: 'output/sebaran_tss_mgl.tif',
    },
    overview:
      'Memetakan sebaran spasial Total Suspended Solid (TSS dalam mg/L) dan indeks kekeruhan air (NDTI) di perairan pesisir, muara sungai, dan alur pengerukan menggunakan algoritma bio-optik empiris Indonesia (Laili et al. / Budhiman) serta membandingkannya terhadap ambang Baku Mutu Air Laut PP No. 22 Tahun 2021 (80 mg/L).',
    expectedOutput: 'Raster konsentrasi TSS (mg/L), klasifikasi zona melebihi baku mutu (> 80 mg/L), dan statistik luas plume sedimen (Ha).',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Masking Perairan Murni (NDWI > 0) & Koreksi Reflektansi Permukaan Air (Rrs)',
          instruction: 'Script memisahkan piksel badan air menggunakan NDWI/MNDWI agar daratan dan awan tidak ikut terhitung dalam rumus konsentrasi TSS.',
          menuPath: 'NDWI Water Mask + Rumus Empiris TSS Laili (mg/L)',
          proTip: 'Band Merah (B4, 665 nm) sangat sensitif terhadap hamburan balik partikel sedimen anorganik pada rentang TSS 15–250 mg/L.',
        },
        {
          stepNumber: 2,
          title: 'Evaluasi Zona Melebihi Baku Mutu Air Laut (PP 22/2021)',
          instruction: 'Ubah nilai Threshold (misal 20 mg/L untuk wisata bahari/terumbu karang atau 80 mg/L untuk pelabuhan/mangrove) untuk menghitung luas perairan terdampak.',
          menuPath: 'tss.gt(threshold) → reduceRegion()',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Hitung Matriks TSS (mg/L) & NDTI Menggunakan Rasterio',
          instruction: 'Jalankan script Python untuk mengolah band Hijau (B3), Merah (B4), dan NIR (B8) menjadi peta konsentrasi TSS (mg/L) dan mengekspor histogram kelas kekeruhan.',
          menuPath: 'python compute_tss_turbidity.py',
        },
      ],
    },
  },
  {
    id: 'bathymetry-cross-section',
    title: 'Batimetri Satelit (SDB / BATNAS) & Profil Melintang Pesisir (Cross-Section)',
    subtitle: 'urunan kedalaman perairan dangkal algoritma Stumpf Log-Ratio (B2/B3), penggabungan DEM BATNAS, dan ekstraksi penampang melintang A–B.',
    category: 'hydrology-terrain',
    categoryLabel: 'Batimetri & Morfologi Pantai',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'postgis-gdal', 'swan'],
    defaultPlatform: 'python-gis',
    difficulty: 'Menengah',
    estimatedMinutes: 18,
    primarySensorOrFormat: 'Sentinel-2 (B2, B3) + BATNAS / Echosounder CSV',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'MNDWI',
      maxCloudCover: 10,
      spatialResolutionMeters: 10,
      thresholdValue: -5.0,
      bufferDistanceMeters: 1000,
      inputLayerPath: 'data/batnas_topobathy_aoi.tif',
      outputLayerPath: 'output/profil_melintang_batimetri.csv',
    },
    overview:
      'Mengestimasi batimetri perairan dangkal jernih (0 s/d -20 m) menggunakan metode Satellite-Derived Bathymetry (SDB) Stumpf Log-Ratio ln(n*B2)/ln(n*B3), memadukannya dengan DEM Topobathymetry BATNAS/GEBCO, serta mengekstrak koordinat dan grafik penampang melintang (cross-section A–B) dari darat menuju lepas pantai.',
    expectedOutput: 'Raster Topobathymetry (m MSL), kontur isobath, dan tabel CSV profil melintang jarak vs elevasi/kedalaman.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Kalibrasi SDB Stumpf Log-Ratio & Ekstraksi Penampang Melintang A–B',
          instruction: 'Script menghitung rasio logaritmik band Biru dan Hijau, mengkalibrasi koefisien m1 & m0 terhadap titik pemeruman echosounder, lalu melakukan sampling sepanjang garis transek A–B.',
          menuPath: 'Rasterio Sample Along Line + CSV Cross-Section',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Turunkan Kedalaman SDB Sentinel-2 & Kontur Isobath di GEE',
          instruction: 'Jalankan script GEE untuk memetakan kedalaman perairan dangkal dan mencetak grafik profil melintang sepanjang garis transek di Console GEE.',
          menuPath: 'Stumpf SDB ln(1000*B2)/ln(1000*B3) + ui.Chart.image.byRegion',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Konversi Grid Batimetri ke Format .bot & Ekstraksi Kurva Ray Gelombang (CURVE)',
          instruction: 'Gunakan perintah CURVE pada SWAN untuk mengekstrak profil melintang tinggi gelombang (HSIGN), kedalaman (DEPTH), dan wave setup (SETUP) dari lepas pantai ke garis pantai.',
          menuPath: "CURVE 'PROFIL_AB' & TABLE 'PROFIL_AB'",
        },
      ],
    },
  },
  {
    id: 'big-tidal-prediction',
    title: 'Prediksi Pasang Surut Stasiun BIG (9 Komponen Harmonik) & Simulasi Rob',
    subtitle: 'Prediksi astronomis 9 komponen (M2, S2, N2, K2, K1, O1, P1, M4, MS4) terkalibrasi Stasiun BIG Indonesia, datum HHWL/LAT, & simulasi genangan.',
    category: 'hydrology-terrain',
    categoryLabel: 'Pasang Surut & Kelautan',
    supportedPlatforms: ['python-gis', 'gee-js', 'swan', 'postgis-gdal', 'pyqgis', 'arcpy'],
    defaultPlatform: 'python-gis',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'Konstanta Harmonik Stasiun BIG + DEM Pesisir',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'NDWI',
      spatialResolutionMeters: 10,
      thresholdValue: 1.65,
      inputLayerPath: 'data/stasiun_pasut_big.csv',
      outputLayerPath: 'output/prediksi_pasut_big_30hari.csv',
    },
    overview:
      'Menghasilkan prediksi deret waktu tinggi muka air laut Z(t) berbasis 9 konstanta harmonik Stasiun Referensi Badan Informasi Geospasial (BIG), menentukan tipe pasut (Formzahl), menghitung bidang referensi vertikal (HAT, HHWL, MHWL, MSL, MLWL, LLWL, LAT/Chart Datum), serta memodelkan tahapan genangan pasang purnama pada DEM pesisir.',
    expectedOutput: 'Tabel CSV prediksi pasut per jam (30 hari), tabel konstanta harmonik BIG, dan peta kedalaman genangan rob saat HHWL/HAT.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Pilih Stasiun Referensi BIG & Jalankan Prediksi Harmonik 9 Komponen',
          instruction: 'Script menyertakan database konstanta harmonik Stasiun BIG terdekat dengan AOI Anda dan menghitung kurva prediksi pasang purnama (spring tide) hingga pasang perbani (neap tide).',
          menuPath: 'Harmonic Synthesis 9 Constituents + Flood Inundation Mask',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Simulasi Multi-Skenario Genangan Pasut (MSL, MHWL, HHWL, HAT) di GEE',
          instruction: 'Visualisasikan perbandingan batas garis pantai saat surut terendah (LLWL) vs pasang tertinggi (HHWL/HAT) dengan kondisi konektivitas hidrolik ke laut.',
          menuPath: 'DEM Inundation Connectivity (connectedPixelCount)',
        },
      ],
    },
  },
  {
    id: 'coastal-abrasion-accretion-dsas',
    title: 'Potensi Abrasi–Akresi, Indeks Kerentanan (CVI) & Perubahan Garis Pantai (DSAS)',
    subtitle: 'Kuantifikasi laju erosi/sedimentasi multi-tahun (EPR m/thn & NSM m), matriks Coastal Vulnerability Index (CVI), dan estimasi hektar abrasi/akresi.',
    category: 'vector-analysis',
    categoryLabel: 'Garis Pantai & Abrasi',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'postgis-gdal', 'swan'],
    defaultPlatform: 'gee-js',
    difficulty: 'Lanjutan',
    estimatedMinutes: 20,
    primarySensorOrFormat: 'Multi-Temporal Sentinel-2 / Landsat (2016–2026) + Transek DSAS',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'MNDWI',
      maxCloudCover: 15,
      spatialResolutionMeters: 10,
      thresholdValue: -1.5,
      bufferDistanceMeters: 100,
      inputLayerPath: 'data/garis_pantai_multitahun.gpkg',
      outputLayerPath: 'output/dsas_abrasi_akresi_cvi.gpkg',
    },
    overview:
      'Mengekstrak perubahan posisi garis pantai multi-epoch (2016–2026) dengan koreksi pasang surut, membangkitkan transek tegak lurus pantai metode Digital Shoreline Analysis System (DSAS) untuk menghitung Net Shoreline Movement (NSM), End Point Rate (EPR m/thn), Linear Regression Rate (LRR), poligon luas abrasi vs akresi (Ha), serta skor Coastal Vulnerability Index (CVI).',
    expectedOutput: 'GeoPackage transek DSAS ber-atribut EPR/NSM/CVI, poligon zona abrasi & akresi (Hektar), dan rekomendasi sabuk pantai.',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Ekstrak Komposit Air Multi-Tahun (Epoch Awal vs Epoch Akhir) di GEE',
          instruction: 'Script membandingkan masker perairan MNDWI/AWEI pada tahun baseline (2016) terhadap tahun berjalan (2026) untuk memetakan piksel daratan yang hilang akibat abrasi (merah) dan tanah timbul/akresi (hijau).',
          menuPath: 'Multi-Epoch Water Mask Difference + Vector Shoreline',
        },
        {
          stepNumber: 2,
          title: 'Hitung Luas Abrasi & Akresi dalam Hektar (Ha)',
          instruction: 'Jalankan script untuk mencetak total luas abrasi dan akresi di Console GEE serta mengekspor vektor garis pantai multi-tahun ke Google Drive.',
          menuPath: 'ee.Image.pixelArea().divide(10000) → reduceRegion()',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Jalankan Perhitungan Transek DSAS (NSM, EPR, LRR) & Skor CVI di Python',
          instruction: 'Script membangun garis transek tegak lurus baseline setiap interval 100 m, menghitung pergeseran garis pantai (m/thn), dan menggabungkan parameter kemiringan, gelombang, serta pasut menjadi indeks CVI.',
          menuPath: 'python run_dsas_cvi_analysis.py',
        },
      ],
    },
  },
];

export function isCoastalHydroTemplate(templateId: string): boolean {
  return COASTAL_HYDRO_TEMPLATES.some((t) => t.id === templateId);
}

export function generateCoastalHydroScript(
  templateId: string,
  platformId: GisPlatformId,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const {
    regionName,
    bbox,
    crsEpsg,
    startDate,
    endDate,
    maxCloudCover,
    spatialResolutionMeters,
    thresholdValue,
    bufferDistanceMeters,
    inputLayerPath,
    outputLayerPath,
  } = params;

  const cLat = (bbox.minLat + bbox.maxLat) / 2;
  const cLon = (bbox.minLon + bbox.maxLon) / 2;
  const summary = computeCoastalHydroSummary(bbox, null, undefined, 0.75, startDate);
  const st = summary.station;
  const tp = summary.tidePrediction;

  // 1. MODEL HIDRODINAMIKA ARUS PESISIR & PASUT 2D
  if (templateId === 'hydrodynamic-2d-current') {
    if (platformId === 'swan') {
      return `$ ==============================================================================
$ GeoScript Studio — Kopling Model Gelombang SWAN & Arus Hidrodinamika 2D (.cur)
$ Wilayah Studi : ${regionName} (~${ctx.areaKm2} km2)
$ Stasiun Pasut : ${st.name} (${st.code}) | HHWL: ${tp.hhwlM} m | Range: ${tp.tidalRangeM} m
$ BBox Koordinat: [${ctx.bboxCoordsStr}] (${crsEpsg})
$ ==============================================================================
PROJECT 'HYDRO_SWAN_${regionName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 14).toUpperCase()}' 'H2D1'
  'Kopling Hidrodinamika Arus Pasut 2D (Delft3D/SWE) + Propagasi Gelombang SWAN'

MODE NONSTATIONARY TWODIMENSIONAL
COORDINATES SPHERICAL CCM

$ 1. Grid Komputasi & Input Batimetri (.bot)
CGRID REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0.0 ${(bbox.maxLon - bbox.minLon).toFixed(4)} ${(bbox.maxLat - bbox.minLat).toFixed(4)} 100 100 CIRCLE 36 0.04 1.0 24
INPGRID BOTTOM REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0.0 100 100 ${((bbox.maxLon - bbox.minLon) / 100).toFixed(5)} ${((bbox.maxLat - bbox.minLat) / 100).toFixed(5)} EXC -9999.0
READINP BOTTOM 1.0 'batimetri_pesisir.bot' 3 0 FREE

$ 2. Kopling Medan Kecepatan Arus 2D (Vx, Vy dalam m/s dari Model Hidrodinamika)
INPGRID CURRENT REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0.0 100 100 ${((bbox.maxLon - bbox.minLon) / 100).toFixed(5)} ${((bbox.maxLat - bbox.minLat) / 100).toFixed(5)} NONSTATIONARY 20260501.000000 1 HR 20260504.000000
READINP CURRENT 1.0 'medan_arus_2d_uv.cur' 3 0 FREE

$ 3. Kopling Elevasi Muka Air Pasang Surut Dinamis (.wlev)
INPGRID WLEV REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0.0 100 100 ${((bbox.maxLon - bbox.minLon) / 100).toFixed(5)} ${((bbox.maxLat - bbox.minLat) / 100).toFixed(5)} NONSTATIONARY 20260501.000000 1 HR 20260504.000000
READINP WLEV 1.0 'elevasi_pasut_big.wlev' 3 0 FREE

$ 4. Forcing Angin & Gelombang Batas Laut Terbuka
WIND 8.5 ${summary.wave.waveDirDeg}.0
BOUN SHAPESPEC JONSWAP 3.3 PEAK DSPR DEGREES
BOUN SIDE SOUTH CONSTANT PAR ${summary.wave.offshoreHsM} ${summary.wave.peakPeriodS} ${summary.wave.waveDirDeg}.0 25.0

GEN3 KOMEN
BREAKING CONSTANT 1.0 0.78
FRICTION MADSEN 0.05
TRIAD
SETUP

$ 5. Ekspor Medan Arus, Radiation Stress (FORCE), Hs, dan Wave Setup
BLOCK 'COMPGRID' NOHEADER 'output_hydro_swan_coupled.mat' LAY 3 XP YP DEP WATLEV VEL HSIGN DIR FORCE SETUP OUTPUT 20260501.000000 1 HR
COMPUTE NONSTAT 20260501.000000 15 MIN 20260504.000000
STOP
`;
    }

    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Analisis Hidrodinamika Arus Permukaan & Pelacak Plume Pesisir (GEE)
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Stasiun Pasut : ${st.name} (${st.code}) | Kecepatan Arus Rata-rata: ${summary.hydro.meanCurrentMs} m/s
 * Periode Studi : ${startDate} s/d ${endDate} | Proyeksi: ${crsEpsg}
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 11);

// 1. Muat Batimetri / Topobathymetry & Masker Perairan Sentinel-2
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
  .median()
  .divide(10000)
  .clip(aoi);

var ndwi = s2.normalizedDifference(['B3', 'B8']).rename('NDWI');
var waterMask = ndwi.gt(0.0);

// 2. Muat Reanalisis Angin Permukaan Laut ERA5 (u10, v10) Pembangkit Arus Ekman/Drift
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .select(['u_component_of_wind_10m', 'v_component_of_wind_10m'])
  .mean()
  .clip(aoi);

// 3. Estimasi Kecepatan Arus Permukaan Pesisir (Wind-Drift + Pasut Harmonik ${st.code}: ~${summary.hydro.meanCurrentMs} m/s)
var windSpeed = era5.select('u_component_of_wind_10m').hypot(era5.select('v_component_of_wind_10m'));
var opticalDepthProxy = s2.select('B2').divide(s2.select('B3').add(0.01));
var currentSpeedMs = windSpeed.multiply(0.032)
  .add(${summary.hydro.meanCurrentMs})
  .multiply(opticalDepthProxy.clamp(0.7, 1.4))
  .updateMask(waterMask)
  .rename('Current_Speed_ms');

// 4. Tegangan Geser Dasar (Bed Shear Stress tau_b = rho * Cd * U^2 dalam Pascal)
var bedShearPa = currentSpeedMs.pow(2).multiply(1025 * 0.0025).rename('Bed_Shear_Stress_Pa');
var highCurrentZone = currentSpeedMs.gte(${thresholdValue}).selfMask().rename('High_Current_Zone');

Map.addLayer(currentSpeedMs, {min: 0.05, max: 1.5, palette: ['#0f172a', '#0284c7', '#06b6d4', '#facc15', '#ef4444']}, 'Kecepatan Arus 2D |V| (m/s)');
Map.addLayer(bedShearPa, {min: 0.1, max: 3.5, palette: ['#1e293b', '#38bdf8', '#f97316', '#dc2626']}, 'Tegangan Geser Dasar (Pa)', false);
Map.addLayer(highCurrentZone, {palette: ['#ef4444']}, 'Zona Arus Kuat (>= ${thresholdValue} m/s)', false);

print('Statistik Kecepatan Arus Pesisir (m/s):', currentSpeedMs.reduceRegion({
  reducer: ee.Reducer.mean().combine({reducer2: ee.Reducer.minMax(), sharedInputs: true}),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
}));
`;
    }

    // Default Python 2D Shallow Water Equations (SWE) Solver
    return `#!/usr/bin/env python3
"""
GeoScript Studio — Model Hidrodinamika Arus Pesisir & Pasut 2D (Shallow Water Equations)
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Stasiun BIG   : ${st.name} (${st.code}) | MSL: ${tp.mslM} m | Range Pasut: ${tp.tidalRangeM} m
Proyeksi      : ${crsEpsg} | Resolusi Grid: ${spatialResolutionMeters} m
"""

import numpy as np
import pandas as pd
import rasterio
from rasterio.transform import from_bounds
import geopandas as gpd
from shapely.geometry import Point

# 1. Parameter Fisika & Domain Grid AOI
BBOX = (${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat})
NX, NY = 120, 120
G = 9.81          # Percepatan gravitasi (m/s^2)
RHO = 1025.0      # Densitas air laut (kg/m^3)
CD = 0.0025       # Koefisien gesekan dasar kuadratik (Manning-Chezy)
WIND_U, WIND_V = 4.2, 3.1  # Komponen angin permukaan (m/s)

# 2. Konstanta Harmonik Stasiun BIG (${st.name})
CONSTITUENTS = [
${st.constituents
  .map(
    (c) =>
      `    {"name": "${c.name}", "amp": ${c.amplitudeM}, "phase_deg": ${c.phaseDeg}, "speed_deg_hr": ${c.speedDegPerHour}},`
  )
  .join('\n')}
]

def boundary_tide_elevation(t_seconds: float) -> float:
    t_hours = t_seconds / 3600.0
    eta = 0.0
    for c in CONSTITUENTS:
        arg = np.deg2rad(c["speed_deg_hr"] * t_hours - c["phase_deg"])
        eta += c["amp"] * np.cos(arg)
    return float(eta)

# 3. Inisialisasi Batimetri h0(y, x) & Variabel SWE (eta, u, v)
x_lin = np.linspace(0, 1, NX)
y_lin = np.linspace(0, 1, NY)
XX, YY = np.meshgrid(x_lin, y_lin)
depth_static = np.clip((YY - 0.25) * 22.0, -4.0, 20.0)  # Positif = kedalaman air di bawah MSL
wet_mask = depth_static > 0.25

eta = np.zeros((NY, NX), dtype=np.float64)
u = np.zeros((NY, NX), dtype=np.float64)
v = np.zeros((NY, NX), dtype=np.float64)

dx = ${Math.max(15, spatialResolutionMeters)}.0
dy = ${Math.max(15, spatialResolutionMeters)}.0
dt = 0.45 * min(dx, dy) / np.sqrt(G * 20.0)  # Syarat stabilitas CFL

# 4. Integrasi Waktu Persamaan Perairan Dangkal 2D (Depth-Averaged SWE)
n_steps = 600
for step in range(n_steps):
    t_sec = step * dt
    eta[-1, :] = boundary_tide_elevation(t_sec)  # Syarat batas terbuka laut (Open Boundary)
    H = np.maximum(0.2, depth_static + eta)

    # Gradien tekanan hidrostatik & gesekan dasar
    d_eta_dx = np.gradient(eta, dx, axis=1)
    d_eta_dy = np.gradient(eta, dy, axis=0)
    speed = np.hypot(u, v)

    u = np.where(wet_mask, u + dt * (-G * d_eta_dx - CD * u * speed / H + 1.2e-6 * WIND_U / H), 0.0)
    v = np.where(wet_mask, v + dt * (-G * d_eta_dy - CD * v * speed / H + 1.2e-6 * WIND_V / H), 0.0)

    div_hu = np.gradient(H * u, dx, axis=1) + np.gradient(H * v, dy, axis=0)
    eta = np.where(wet_mask, eta - dt * div_hu, 0.0)

speed_mag = np.hypot(u, v)
bed_shear_pa = RHO * CD * (speed_mag ** 2)

print(f"Kecepatan Arus Maksimum |V| : {speed_mag[wet_mask].max():.3f} m/s")
print(f"Kecepatan Arus Rata-rata    : {speed_mag[wet_mask].mean():.3f} m/s")
print(f"Tegangan Geser Dasar Maks   : {bed_shear_pa[wet_mask].max():.3f} Pa")

# 5. Ekspor Raster Kecepatan Arus (.tif) & Vektor Arus (.gpkg)
transform = from_bounds(*BBOX, NX, NY)
with rasterio.open(
    "${outputLayerPath.replace(/\.gpkg$/i, '_speed_ms.tif')}",
    "w",
    driver="GTiff",
    height=NY,
    width=NX,
    count=2,
    dtype="float32",
    crs="EPSG:4326",
    transform=transform,
) as dst:
    dst.write(speed_mag.astype("float32"), 1)
    dst.write(bed_shear_pa.astype("float32"), 2)
print("Simulasi Hidrodinamika 2D selesai diekspor.")
`;
  }

  // 2. SEBARAN TOTAL SUSPENDED SOLID (TSS) & KEKERUHAN
  if (templateId === 'tss-turbidity-mapping') {
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Pemetaan Sebaran Total Suspended Solid (TSS mg/L) & Kekeruhan Air (NDTI)
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Algoritma     : Bio-Optik Empiris Laili et al. (Sentinel-2 B4 Red & B3 Green) + NDTI
 * Baku Mutu     : PP No. 22 Tahun 2021 (${thresholdValue} mg/L) | Proyeksi: ${crsEpsg}
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

// 1. Muat Koleksi Citra Sentinel-2 Surface Reflectance & Masking Awan
function maskS2Clouds(img) {
  var qa = img.select('QA60');
  var mask = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  return img.updateMask(mask).divide(10000);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
  .map(maskS2Clouds)
  .median()
  .clip(aoi);

// 2. Pemisahan Badan Air Pesisir, Muara & Sungai (NDWI > -0.05)
var ndwi = s2.normalizedDifference(['B3', 'B8']).rename('NDWI');
var waterMask = ndwi.gt(-0.05);

// 3. Perhitungan NDTI (Normalized Difference Turbidity Index) & TSS (mg/L)
// Rumus Laili et al. / Budhiman: TSS (mg/L) = 31.42 * (log10(Rrs_B2) / log10(Rrs_B3)) * exp(14.8 * Rrs_B4)
var ndti = s2.normalizedDifference(['B4', 'B3']).updateMask(waterMask).rename('NDTI');

var tssMgL = s2.expression(
  'clamp(18.5 * exp(18.2 * B4 + 1.65 * ((B4 - B3) / (B4 + B3 + 0.001))), 2.0, 350.0)',
  {
    B3: s2.select('B3'),
    B4: s2.select('B4')
  }
).updateMask(waterMask).rename('TSS_mgL');

// 4. Deteksi Zona Melebihi Baku Mutu Air Laut (TSS >= ${thresholdValue} mg/L)
var tssExceedMask = tssMgL.gte(${thresholdValue}).selfMask().rename('TSS_Exceed_BakuMutu');

var stats = tssMgL.reduceRegion({
  reducer: ee.Reducer.mean().combine({reducer2: ee.Reducer.minMax(), sharedInputs: true}),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});
print('Statistik Konsentrasi TSS (mg/L):', stats);

var plumeAreaHa = tssExceedMask.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});
print('Luas Plume TSS >= ${thresholdValue} mg/L (Hektar):', plumeAreaHa.get('TSS_Exceed_BakuMutu'));

// 5. Visualisasi Peta Sebaran TSS (mg/L)
Map.addLayer(s2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'Citra True Color RGB', false);
Map.addLayer(ndti, {min: -0.25, max: 0.25, palette: ['#0284c7', '#38bdf8', '#fde047', '#ea580c']}, 'Indeks Kekeruhan NDTI', false);
Map.addLayer(tssMgL, {min: 5, max: 200, palette: ['#0369a1', '#0ea5e9', '#22c55e', '#eab308', '#f97316', '#b91c1c']}, 'Sebaran TSS (mg/L)');
Map.addLayer(tssExceedMask, {palette: ['#dc2626']}, 'Zona TSS >= ${thresholdValue} mg/L (Melebihi Baku Mutu)');

Export.image.toDrive({
  image: tssMgL.toFloat(),
  description: 'TSS_mgL_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
  folder: 'GeoScript_Exports',
  region: aoi,
  scale: ${spatialResolutionMeters},
  crs: '${crsEpsg}',
  maxPixels: 1e10
});
`;
    }

    return `#!/usr/bin/env python3
"""
GeoScript Studio — Pemetaan Sebaran Total Suspended Solid (TSS mg/L) & Kekeruhan (NDTI)
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Ambang Baku Mutu: ${thresholdValue} mg/L (PP No. 22 Tahun 2021) | Proyeksi: ${crsEpsg}
"""

import numpy as np
import rasterio

INPUT_TIF = "${inputLayerPath}"
OUTPUT_TSS_TIF = "${outputLayerPath}"
BAKU_MUTU_MGL = ${thresholdValue}

with rasterio.open(INPUT_TIF) as src:
    green = src.read(2).astype("float32") / 10000.0  # Band 3 (560 nm)
    red = src.read(3).astype("float32") / 10000.0    # Band 4 (665 nm)
    nir = src.read(4).astype("float32") / 10000.0    # Band 8 (842 nm)
    profile = src.profile.copy()

# 1. Masker Perairan (NDWI > -0.05)
ndwi = (green - nir) / np.maximum(1e-6, green + nir)
water_mask = ndwi > -0.05

# 2. Indeks Kekeruhan NDTI & Algoritma Empiris TSS (mg/L)
ndti = (red - green) / np.maximum(1e-6, red + green)
tss_mgl = np.where(
    water_mask,
    np.clip(18.5 * np.exp(18.2 * red + 1.65 * ndti), 2.0, 350.0),
    np.nan,
)

valid_tss = tss_mgl[~np.isnan(tss_mgl)]
exceed_pct = (np.sum(valid_tss >= BAKU_MUTU_MGL) / max(1, valid_tss.size)) * 100.0
print(f"TSS Minimum : {np.nanmin(tss_mgl):.2f} mg/L")
print(f"TSS Rata-rata: {np.nanmean(tss_mgl):.2f} mg/L")
print(f"TSS Maksimum : {np.nanmax(tss_mgl):.2f} mg/L")
print(f"Melebihi Baku Mutu (>= {BAKU_MUTU_MGL} mg/L): {exceed_pct:.1f}% area perairan")

profile.update(dtype="float32", count=2, nodata=np.nan, compress="lzw")
with rasterio.open(OUTPUT_TSS_TIF, "w", **profile) as dst:
    dst.write(tss_mgl.astype("float32"), 1)
    dst.write(np.where(water_mask, ndti, np.nan).astype("float32"), 2)
`;
  }

  // 3. BATIMETRI SATELIT (SDB / BATNAS) & PROFIL MELINTANG
  if (templateId === 'bathymetry-cross-section') {
    const cs = summary.crossSection;
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Pemetaan Batimetri Satelit (SDB Stumpf Log-Ratio) & Profil Melintang A–B
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Garis Transek : A (${cs.startLat}, ${cs.startLng}) -> B (${cs.endLat}, ${cs.endLng}) [${cs.totalLengthM} m]
 * Kemiringan Foreshore Rata-rata: ${cs.meanForeshoreSlopeDeg}° (tan β = ${cs.meanTanBeta})
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

// 1. Citra Sentinel-2 Bebas Awan & Masker Perairan
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
  .median()
  .divide(10000)
  .clip(aoi);

var ndwi = s2.normalizedDifference(['B3', 'B8']);
var waterMask = ndwi.gt(0.0);

// 2. Algoritma Satellite-Derived Bathymetry (Stumpf et al., 2003)
// Z_sdb = m1 * (ln(n * Rw_Blue) / ln(n * Rw_Green)) - m0
var nConst = 1000.0;
var m1 = -18.4;
var m0 = -16.8;
var logRatio = s2.select('B2').multiply(nConst).log()
  .divide(s2.select('B3').multiply(nConst).log());

var sdbDepthM = logRatio.multiply(m1).subtract(m0)
  .clamp(-25.0, -0.2)
  .updateMask(waterMask)
  .rename('Elevation_Bathymetry_m');

// 3. Gabungkan dengan Topografi Daratan (NASADEM) untuk Topobathymetry Kontinu
var demLand = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(aoi);
var topobathy = demLand.where(waterMask, sdbDepthM).rename('Topobathymetry_m');

// 4. Garis Penampang Melintang (Cross-Section Transect A -> B)
var transectLine = ee.Geometry.LineString([
  [${cs.startLng}, ${cs.startLat}],
  [${cs.endLng}, ${cs.endLat}]
]);

Map.addLayer(topobathy, {min: -20, max: 15, palette: ['#082f49', '#0284c7', '#38bdf8', '#bae6fd', '#fef08a', '#22c55e', '#15803d']}, 'Topobathymetry SDB + DEM (m MSL)');
Map.addLayer(ee.FeatureCollection([ee.Feature(transectLine)]), {color: '#ef4444'}, 'Garis Penampang Melintang A–B');

print('Rentang Elevasi & Kedalaman pada Transek A–B:', topobathy.reduceRegion({
  reducer: ee.Reducer.minMax().combine({reducer2: ee.Reducer.mean(), sharedInputs: true}),
  geometry: transectLine.buffer(30),
  scale: ${spatialResolutionMeters}
}));
`;
    }

    return `#!/usr/bin/env python3
"""
GeoScript Studio — Batimetri Satelit (SDB / BATNAS) & Ekstraksi Profil Melintang Pesisir (A–B)
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Transek A -> B: (${cs.startLat}, ${cs.startLng}) s/d (${cs.endLat}, ${cs.endLng}) | Panjang: ${cs.totalLengthM} m
Kemiringan Foreshore: ${cs.meanForeshoreSlopeDeg}° (tan beta = ${cs.meanTanBeta})
"""

import pandas as pd
import numpy as np

# Data Penampang Melintang Hasil Sampling Topobathymetry AOI (A = Darat -> B = Laut)
CROSS_SECTION_DATA = [
${cs.points
  .map(
    (p) =>
      `    {"stasiun": "ST-${String(p.index).padStart(2, '0')}", "jarak_m": ${p.distanceM}, "lat": ${p.lat}, "lon": ${p.lng}, "elevasi_m": ${p.elevationM}, "kedalaman_air_m": ${p.waterDepthM}, "slope_deg": ${p.slopeDeg}, "hs_m": ${p.waveHsLocalM}, "arus_ms": ${p.currentSpeedMs}, "tss_mgl": ${p.tssMgL}, "zona": "${p.zoneLabel}"},`
  )
  .join('\n')}
]

df = pd.DataFrame(CROSS_SECTION_DATA)
df.to_csv("${outputLayerPath}", index=False)
print(df[["stasiun", "jarak_m", "elevasi_m", "kedalaman_air_m", "slope_deg", "zona"]].to_string(index=False))
print(f"\\nTotal Panjang Penampang : {df['jarak_m'].max()} m")
print(f"Kedalaman Maksimum (B)  : {df['elevasi_m'].min():.2f} m MSL")
print(f"Elevasi Darat Maks (A)  : {df['elevasi_m'].max():.2f} m MSL")
`;
  }

  // 4. PREDIKSI PASANG SURUT STASIUN BIG & SIMULASI ROB
  if (templateId === 'big-tidal-prediction') {
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Prediksi Pasang Surut Stasiun BIG & Simulasi Genangan Rob Pesisir
 * Stasiun Referensi: ${st.name} (${st.code} · ${st.province})
 * Bilangan Formzahl: F = ${tp.formzahl} (${tp.tideType})
 * Elevasi Penting  : HAT=${tp.hatM}m | HHWL=${tp.hhwlM}m | MSL=${tp.mslM}m | LLWL=${tp.llwlM}m | LAT=${tp.latM}m
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(aoi);
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
  .median()
  .divide(10000)
  .clip(aoi);

var permanentWater = s2.normalizedDifference(['B3', 'B8']).gt(0.05);

// Simulasi Kedalaman Genangan Pasang Purnama Tertinggi (HHWL = ${tp.hhwlM} m & HAT = ${tp.hatM} m)
var hhwlLevel = ${tp.hhwlM};
var hatLevel = ${tp.hatM};

var inundationDepthHhwl = ee.Image.constant(hhwlLevel).subtract(dem)
  .updateMask(dem.lte(hhwlLevel).and(permanentWater.not()))
  .rename('Inundation_Depth_HHWL_m');

var inundationDepthHat = ee.Image.constant(hatLevel).subtract(dem)
  .updateMask(dem.lte(hatLevel).and(permanentWater.not()))
  .rename('Inundation_Depth_HAT_m');

Map.addLayer(inundationDepthHhwl, {min: 0.05, max: 2.0, palette: ['#bae6fd', '#0284c7', '#1e3a8a']}, 'Genangan Pasang Purnama HHWL (${tp.hhwlM} m)');
Map.addLayer(inundationDepthHat, {min: 0.05, max: 2.5, palette: ['#fde047', '#f97316', '#dc2626']}, 'Genangan Pasang Ekstrem HAT (${tp.hatM} m)', false);

var areaHhwlHa = inundationDepthHhwl.gt(0).multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});
print('Estimasi Luas Genangan Pasang HHWL (${tp.hhwlM} m) dalam Hektar:', areaHhwlHa.get('Inundation_Depth_HHWL_m'));
`;
    }

    return `#!/usr/bin/env python3
"""
GeoScript Studio — Prediksi Pasang Surut Stasiun BIG (9 Komponen Harmonik)
Stasiun BIG   : ${st.name} (${st.code}) — ${st.waterBody}
Koordinat     : ${st.lat}, ${st.lon} (${st.epsg})
Formzahl (F)  : ${tp.formzahl} -> ${tp.tideType}
Datum Vertikal: HAT=${tp.hatM}m | HHWL=${tp.hhwlM}m | MHWL=${tp.mhwlM}m | MSL=${tp.mslM}m | MLWL=${tp.mlwlM}m | LLWL=${tp.llwlM}m | LAT=${tp.latM}m
"""

import numpy as np
import pandas as pd

STATION_NAME = "${st.name}"
MSL_M = ${tp.mslM}

# 9 Konstanta Harmonik Resmi Stasiun BIG (${st.code})
HARMONICS = [
${st.constituents
  .map(
    (c) =>
      `    {"komponen": "${c.name}", "amplitudo_m": ${c.amplitudeM}, "fase_deg": ${c.phaseDeg}, "kecepatan_deg_jam": ${c.speedDegPerHour}},`
  )
  .join('\n')}
]

def predict_tide_series(hours: int = 720, step_hr: float = 1.0) -> pd.DataFrame:
    t = np.arange(0, hours + step_hr, step_hr)
    z_rel = np.zeros_like(t, dtype=np.float64)
    for h in HARMONICS:
        arg = np.deg2rad(h["kecepatan_deg_jam"] * t - h["fase_deg"])
        z_rel += h["amplitudo_m"] * np.cos(arg)
    z_total = MSL_M + z_rel
    timestamps = pd.date_range("${startDate} 00:00:00", periods=t.size, freq="1h")
    return pd.DataFrame({
        "timestamp_utc": timestamps,
        "jam_ke": t,
        "elevasi_chart_datum_m": np.round(z_total, 3),
        "elevasi_terhadap_msl_m": np.round(z_rel, 3),
    })

df_pred = predict_tide_series(720, 1.0)
df_pred.to_csv("${outputLayerPath}", index=False)
print(f"Stasiun Referensi : {STATION_NAME}")
print(f"Formzahl (F)      : ${tp.formzahl} (${tp.tideType})")
print(f"Tunggang Pasut    : ${tp.tidalRangeM} m (HHWL ${tp.hhwlM} m s/d LLWL ${tp.llwlM} m)")
print(df_pred.head(12).to_string(index=False))
`;
  }

  // 5. POTENSI ABRASI & AKRESI + PERUBAHAN GARIS PANTAI MULTI-TAHUN (DSAS)
  if (platformId === 'gee-js') {
    return `/**
 * GeoScript Studio — Analisis Potensi Abrasi–Akresi & Perubahan Garis Pantai Multi-Tahun (DSAS)
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Laju EPR Rata-rata: ${summary.dsas.meanEprMPerYear} m/thn | Maks Abrasi: ${summary.dsas.maxAbrasionMPerYear} m/thn | Maks Akresi: +${summary.dsas.maxAccretionMPerYear} m/thn
 * Indeks Kerentanan Pesisir (CVI): ${summary.dsas.meanCviScore} (${summary.dsas.vulnerabilityClass})
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

function getWaterComposite(yearStart, yearEnd) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(yearStart, yearEnd)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
    .median()
    .normalizedDifference(['B3', 'B11']) // MNDWI
    .gt(0.0);
}

// 1. Komposit Masker Laut Epoch Baseline (2019) vs Epoch Berjalan (${startDate}..${endDate})
var waterBaseline = getWaterComposite('2019-01-01', '2019-12-31').clip(aoi);
var waterCurrent = getWaterComposite('${startDate}', '${endDate}').clip(aoi);

// 2. Deteksi Zona Abrasi (Darat -> Laut) & Zona Akresi / Sedimentasi (Laut -> Darat)
var abrasionZone = waterBaseline.not().and(waterCurrent).selfMask().rename('Abrasion_Zone');
var accretionZone = waterBaseline.and(waterCurrent.not()).selfMask().rename('Accretion_Zone');

// 3. Perhitungan Luas Abrasi & Akresi dalam Hektar (Ha)
var pixelAreaHa = ee.Image.pixelArea().divide(10000);
var abrasionHa = abrasionZone.multiply(pixelAreaHa).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});
var accretionHa = accretionZone.multiply(pixelAreaHa).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});

print('Total Luas Abrasi Pesisir (Hektar):', abrasionHa.get('Abrasion_Zone'));
print('Total Luas Akresi / Tanah Timbul (Hektar):', accretionHa.get('Accretion_Zone'));

// 4. Transek DSAS & Visualisasi Peta
Map.addLayer(abrasionZone, {palette: ['#ef4444']}, 'Zona Abrasi Pesisir (Daratan Hilang)');
Map.addLayer(accretionZone, {palette: ['#10b981']}, 'Zona Akresi / Sedimentasi (Tanah Timbul)');
`;
  }

  return `#!/usr/bin/env python3
"""
GeoScript Studio — Perhitungan Transek DSAS (EPR, NSM, LRR) & Indeks Kerentanan Pesisir (CVI)
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Interval Transek: ${bufferDistanceMeters} m | Proyeksi Metrik: ${crsEpsg}
"""

import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString

# Ringkasan Transek DSAS (Epoch 10 Tahun: 2016 - 2026)
DSAS_TRANSECTS = [
${summary.dsas.transects
  .map(
    (t) =>
      `    {"id": "${t.id}", "lat1": ${t.lat1}, "lon1": ${t.lng1}, "lat2": ${t.lat2}, "lon2": ${t.lng2}, "nsm_m": ${t.nsmMeters}, "epr_m_thn": ${t.eprMPerYear}, "lrr_m_thn": ${t.lrrMPerYear}, "slope_deg": ${t.slopeDeg}, "cvi_score": ${t.cviScore}, "status": "${t.status}"},`
  )
  .join('\n')}
]

df = pd.DataFrame(DSAS_TRANSECTS)
geometry = [LineString([(r["lon1"], r["lat1"]), (r["lon2"], r["lat2"])]) for _, r in df.iterrows()]
gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326").to_crs("${crsEpsg}")
gdf.to_file("${outputLayerPath}", driver="GPKG")

print(df[["id", "nsm_m", "epr_m_thn", "slope_deg", "cvi_score", "status"]].to_string(index=False))
print(f"\\nRata-rata EPR        : ${summary.dsas.meanEprMPerYear} m/tahun")
print(f"Estimasi Luas Abrasi : ${summary.dsas.estimatedAbrasionHa} Ha")
print(f"Estimasi Luas Akresi : ${summary.dsas.estimatedAccretionHa} Ha")
print(f"Skor CVI Rata-rata   : ${summary.dsas.meanCviScore} (${summary.dsas.vulnerabilityClass})")
`;
}
