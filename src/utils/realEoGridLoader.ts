import type { BoundingBox } from './gisEngine';

export interface MarineProbeData {
  available: boolean;
  waveHeightM: number;
  waveDirDeg: number;
  wavePeriodS: number;
}

export interface RealEoGrid {
  bboxKey: string;
  bbox: BoundingBox;
  gridSize: number;
  zoomUsed: number;
  tileCount: number;
  metersPerPixelX: number;
  metersPerPixelY: number;
  minElevM: number;
  maxElevM: number;
  waterPercent: number;
  elevationGrid: Float32Array;
  rgbGrid: Uint8Array;
  marine: MarineProbeData;
  fetchDurationMs: number;
}

const GRID_CACHE = new Map<string, RealEoGrid>();

export function bboxCacheKey(bbox: BoundingBox): string {
  return `${bbox.minLon.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLon.toFixed(4)},${bbox.maxLat.toFixed(4)}`;
}

// Web Mercator normalized [0..1] helpers (exact alignment with Google Maps GroundOverlay & Esri Slippy Tiles)
export function lonToNormX(lon: number): number {
  return (lon + 180) / 360;
}

export function latToNormY(lat: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
  return 0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI);
}

export function normXToLon(nx: number): number {
  return nx * 360 - 180;
}

export function normYToLat(ny: number): number {
  const n = Math.PI - 2 * Math.PI * ny;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function chooseTileZoom(bbox: BoundingBox): number {
  const x0 = lonToNormX(bbox.minLon);
  const x1 = lonToNormX(bbox.maxLon);
  const y0 = latToNormY(bbox.maxLat);
  const y1 = latToNormY(bbox.minLat);
  const span = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  // Target ~1.5 to 2.5 tiles across the AOI for fast, crisp sampling
  for (let z = 13; z >= 6; z--) {
    const tilesAcross = span * Math.pow(2, z);
    if (tilesAcross <= 2.4) return z;
  }
  return 8;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 9000);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      }
    };
    img.src = src;
  });
}

async function stitchSourceToGrid(
  source: 'dem' | 'sat',
  z: number,
  bbox: BoundingBox,
  gridSize: number
): Promise<{ data: Uint8ClampedArray | null; loadedTiles: number }> {
  const scale = Math.pow(2, z);
  const nxMin = lonToNormX(bbox.minLon);
  const nxMax = lonToNormX(bbox.maxLon);
  const nyMin = latToNormY(bbox.maxLat); // North is smaller Y
  const nyMax = latToNormY(bbox.minLat); // South is larger Y

  const minTx = Math.floor(nxMin * scale);
  const maxTx = Math.floor(nxMax * scale);
  const minTy = Math.floor(nyMin * scale);
  const maxTy = Math.floor(nyMax * scale);

  const tilesX = Math.max(1, maxTx - minTx + 1);
  const tilesY = Math.max(1, maxTy - minTy + 1);

  const stitchCanvas = document.createElement('canvas');
  stitchCanvas.width = tilesX * 256;
  stitchCanvas.height = tilesY * 256;
  const sCtx = stitchCanvas.getContext('2d');
  if (!sCtx) return { data: null, loadedTiles: 0 };

  const jobs: Promise<boolean>[] = [];
  let loadedTiles = 0;

  for (let tx = minTx; tx <= maxTx; tx++) {
    for (let ty = minTy; ty <= maxTy; ty++) {
      if (ty < 0 || ty >= scale) continue;
      const wrappedX = ((tx % scale) + scale) % scale;
      const url = `/api/eo-tile?source=${source}&z=${z}&x=${wrappedX}&y=${ty}`;
      jobs.push(
        loadImage(url).then((img) => {
          if (!img) return false;
          sCtx.drawImage(img, (tx - minTx) * 256, (ty - minTy) * 256, 256, 256);
          loadedTiles++;
          return true;
        })
      );
    }
  }

  await Promise.all(jobs);
  if (loadedTiles === 0) return { data: null, loadedTiles: 0 };

  // Crop exact Web Mercator AOI bounds into a gridSize x gridSize sampling canvas
  const cropX = (nxMin * scale - minTx) * 256;
  const cropY = (nyMin * scale - minTy) * 256;
  const cropW = Math.max(1, (nxMax - nxMin) * scale * 256);
  const cropH = Math.max(1, (nyMax - nyMin) * scale * 256);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = gridSize;
  outCanvas.height = gridSize;
  const oCtx = outCanvas.getContext('2d');
  if (!oCtx) return { data: null, loadedTiles };

  oCtx.drawImage(stitchCanvas, cropX, cropY, cropW, cropH, 0, 0, gridSize, gridSize);
  const imgData = oCtx.getImageData(0, 0, gridSize, gridSize);
  return { data: imgData.data, loadedTiles };
}

export async function loadRealEoGrid(
  bbox: BoundingBox,
  options: { gridSize?: number; forceRefresh?: boolean } = {}
): Promise<RealEoGrid | null> {
  if (typeof document === 'undefined') return null;
  const gridSize = options.gridSize ?? 160;
  const key = `${bboxCacheKey(bbox)}:${gridSize}`;

  if (!options.forceRefresh && GRID_CACHE.has(key)) {
    return GRID_CACHE.get(key)!;
  }

  const t0 = performance.now();
  const z = chooseTileZoom(bbox);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;

  const [demRes, satRes, marineRes] = await Promise.all([
    stitchSourceToGrid('dem', z, bbox, gridSize),
    stitchSourceToGrid('sat', z, bbox, gridSize),
    fetch(`/api/marine-probe?lat=${centerLat.toFixed(4)}&lng=${centerLon.toFixed(4)}`)
      .then((r) => (r.ok ? (r.json() as Promise<MarineProbeData>) : null))
      .catch(() => null),
  ]);

  if (!demRes.data && !satRes.data) {
    return null;
  }

  const totalCells = gridSize * gridSize;
  const elevationGrid = new Float32Array(totalCells);
  const rgbGrid = new Uint8Array(totalCells * 3);

  let minElevM = Infinity;
  let maxElevM = -Infinity;
  let waterCells = 0;

  for (let i = 0; i < totalCells; i++) {
    const p = i * 4;
    let elev = 12;
    if (demRes.data) {
      const r = demRes.data[p];
      const g = demRes.data[p + 1];
      const b = demRes.data[p + 2];
      elev = r * 256 + g + b / 256 - 32768;
      if (!Number.isFinite(elev) || elev < -11000 || elev > 9000) elev = 0;
    }
    elevationGrid[i] = elev;
    if (elev < minElevM) minElevM = elev;
    if (elev > maxElevM) maxElevM = elev;

    let sr = 72;
    let sg = 112;
    let sb = 78;
    if (satRes.data) {
      sr = satRes.data[p];
      sg = satRes.data[p + 1];
      sb = satRes.data[p + 2];
    }
    rgbGrid[i * 3] = sr;
    rgbGrid[i * 3 + 1] = sg;
    rgbGrid[i * 3 + 2] = sb;

    const isWaterOptical = sb > sr + 10 && sb >= sg - 4 && sr < 115;
    if (elev <= 0.25 || isWaterOptical) {
      waterCells++;
    }
  }

  const dLatDeg = Math.max(1e-5, bbox.maxLat - bbox.minLat);
  const dLonDeg = Math.max(1e-5, bbox.maxLon - bbox.minLon);
  const metersSpanX = dLonDeg * 111320 * Math.cos((centerLat * Math.PI) / 180);
  const metersSpanY = dLatDeg * 111132;

  const result: RealEoGrid = {
    bboxKey: key,
    bbox: { ...bbox },
    gridSize,
    zoomUsed: z,
    tileCount: demRes.loadedTiles + satRes.loadedTiles,
    metersPerPixelX: metersSpanX / Math.max(1, gridSize - 1),
    metersPerPixelY: metersSpanY / Math.max(1, gridSize - 1),
    minElevM: Number((isFinite(minElevM) ? minElevM : 0).toFixed(1)),
    maxElevM: Number((isFinite(maxElevM) ? maxElevM : 0).toFixed(1)),
    waterPercent: Math.round((waterCells / totalCells) * 100),
    elevationGrid,
    rgbGrid,
    marine: marineRes || {
      available: false,
      waveHeightM: 1.45,
      waveDirDeg: 215,
      wavePeriodS: 7.2,
    },
    fetchDurationMs: Math.round(performance.now() - t0),
  };

  if (GRID_CACHE.size >= 16) {
    const first = GRID_CACHE.keys().next().value;
    if (first) GRID_CACHE.delete(first);
  }
  GRID_CACHE.set(key, result);
  return result;
}
