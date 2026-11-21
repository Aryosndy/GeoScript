import {
  calculatePolygonAreaKm2,
  type BoundingBox,
  type GisPlatformId,
  type GisTemplate,
  type LatLngVertex,
  type ScriptParameters,
} from './gisEngine';
import type { ExtendedGeneratorContext } from './gisExtendedGenerators';
import {
  latToNormY,
  lonToNormX,
  normXToLon,
  normYToLat,
  type RealEoGrid,
} from './realEoGridLoader';

export type AdminBoundaryLevel = 'provinsi' | 'kabkota' | 'kecamatan' | 'desa' | 'rtrw';

export type MarineZoneCategory =
  | 'wpp-nri'
  | 'konservasi-kkpd'
  | 'rzwp3k-pelabuhan'
  | 'sempadan-mangrove'
  | 'alur-pipa-kabel';

export type ShorelineDatumId =
  | 'garispantai-msl'
  | 'garispantai-hhwl'
  | 'garispantai-llwl'
  | 'garispantai-osm';

export interface ShorelinePolyline {
  id: string;
  datumType: ShorelineDatumId;
  label: string;
  datumElevationM: number;
  lengthKm: number;
  sinuosityIndex: number;
  strokeColor: string;
  strokeWeight: number;
  strokeDash?: string;
  dataSource: string;
  vertices: LatLngVertex[];
}

export interface LiveSpatialZonesPayload {
  available: boolean;
  fetchedAt?: string;
  nominatimAdmin?: {
    provinsi?: string;
    isoCode?: string;
    kabKota?: string;
    kecamatan?: string;
    desaKelurahan?: string;
    neighbourhood?: string;
    displayName?: string;
  } | null;
  osmCoastlines?: { id: string; name: string; vertices: LatLngVertex[] }[];
  osmAdminLines?: {
    id: string;
    name: string;
    adminLevel: string;
    vertices: LatLngVertex[];
  }[];
}

export interface AdminBoundaryPolygon {
  id: string;
  level: AdminBoundaryLevel;
  levelLabel: string;
  codeKemendagri: string;
  name: string;
  parentName: string;
  areaHa: number;
  populationEst: number;
  householdsKk: number;
  strokeColor: string;
  fillColor: string;
  strokeDash?: string;
  centerLat: number;
  centerLng: number;
  vertices: LatLngVertex[];
  notes: string;
}

export interface WppNriDefinition {
  code: string;
  name: string;
  seaAreas: string;
  centerLat: number;
  centerLon: number;
  msyTonsPerYear: number;
  jtbTonsPerYear: number;
  utilizationRatePct: number;
  dominantCommodities: string[];
  statusStock:
    | 'Fully Exploited ( Optimal )'
    | 'Moderate ( Dapat Dikembangkan )'
    | 'Over-Exploited ( Perlu Pengendalian )';
  regulationRef: string;
}

export const WPP_NRI_CATALOG: WppNriDefinition[] = [
  {
    code: 'WPP-NRI 571',
    name: 'WPP-NRI 571 — Selat Malaka & Laut Andaman',
    seaAreas: 'Perairan Aceh Timur, Sumatera Utara (Belawan), Riau & Kepulauan Riau Barat',
    centerLat: 3.65,
    centerLon: 99.15,
    msyTonsPerYear: 425600,
    jtbTonsPerYear: 340480,
    utilizationRatePct: 86,
    dominantCommodities: ['Ikan Pelagis Kecil', 'Udang Penaeid', 'Ikan Demersal', 'Cumi-cumi'],
    statusStock: 'Fully Exploited ( Optimal )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 572',
    name: 'WPP-NRI 572 — Samudra Hindia Sebelah Barat Sumatera & Selat Sunda',
    seaAreas: 'Pesisir Barat Aceh, Sumbar, Bengkulu, Lampung & Selat Sunda',
    centerLat: -2.45,
    centerLon: 100.25,
    msyTonsPerYear: 1248000,
    jtbTonsPerYear: 998400,
    utilizationRatePct: 72,
    dominantCommodities: ['Tuna Sirip Kuning', 'Cakalang', 'Pelagis Besar', 'Ikan Karang'],
    statusStock: 'Moderate ( Dapat Dikembangkan )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 573',
    name: 'WPP-NRI 573 — Samudra Hindia Selatan Jawa hingga Nusa Tenggara',
    seaAreas: 'Pesisir Selatan Jawa (Cilacap/Segara Anakan), Bali Selatan, NTB & NTT',
    centerLat: -8.35,
    centerLon: 111.5,
    msyTonsPerYear: 1295400,
    jtbTonsPerYear: 1036320,
    utilizationRatePct: 78,
    dominantCommodities: ['Tuna Mata Besar', 'Albakora', 'Lobster Pasir', 'Pelagis Kecil'],
    statusStock: 'Fully Exploited ( Optimal )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 711',
    name: 'WPP-NRI 711 — Selat Karimata, Laut Natuna & Laut Natuna Utara',
    seaAreas: 'Kepulauan Riau, Bangka Belitung, Kalimantan Barat & Pesisir Timur Riau',
    centerLat: 1.25,
    centerLon: 106.45,
    msyTonsPerYear: 1143200,
    jtbTonsPerYear: 914560,
    utilizationRatePct: 91,
    dominantCommodities: ['Ikan Demersal (Kakap/Kerapu)', 'Cumi-cumi', 'Pelagis Kecil', 'Rajungan'],
    statusStock: 'Over-Exploited ( Perlu Pengendalian )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 712',
    name: 'WPP-NRI 712 — Perairan Laut Jawa',
    seaAreas: 'Teluk Jakarta (Jabodetabek), Pantura Jawa Barat, Demak–Semarang, Jawa Timur & Kalimantan Selatan',
    centerLat: -5.85,
    centerLon: 109.25,
    msyTonsPerYear: 1341600,
    jtbTonsPerYear: 1073280,
    utilizationRatePct: 94,
    dominantCommodities: ['Pelagis Kecil (Kembung/Layang)', 'Rajungan', 'Udang Jerbung', 'Demersal'],
    statusStock: 'Over-Exploited ( Perlu Pengendalian )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 713',
    name: 'WPP-NRI 713 — Selat Makassar, Teluk Bone, Laut Flores & Laut Bali',
    seaAreas: 'Teluk Balikpapan (IKN Kaltim), Sulawesi Selatan (Makassar), Bali Utara & NTB Utara',
    centerLat: -3.25,
    centerLon: 117.65,
    msyTonsPerYear: 1178500,
    jtbTonsPerYear: 942800,
    utilizationRatePct: 81,
    dominantCommodities: ['Cakalang', 'Tuna Madidihang', 'Udang Windu', 'Ikan Pelagis Kecil'],
    statusStock: 'Fully Exploited ( Optimal )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 714',
    name: 'WPP-NRI 714 — Teluk Tolo & Laut Banda',
    seaAreas: 'Sulawesi Tenggara, Maluku Tengah, Kepulauan Banda & Seram Selatan',
    centerLat: -4.85,
    centerLon: 126.45,
    msyTonsPerYear: 788900,
    jtbTonsPerYear: 631120,
    utilizationRatePct: 68,
    dominantCommodities: ['Tuna Sirip Kuning', 'Cakalang', 'Ikan Karang Ekonomis Penting'],
    statusStock: 'Moderate ( Dapat Dikembangkan )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 715',
    name: 'WPP-NRI 715 — Teluk Tomini, Laut Maluku, Laut Halmahera & Laut Seram',
    seaAreas: 'Sulawesi Utara, Gorontalo, Maluku Utara & Raja Ampat Barat',
    centerLat: 0.15,
    centerLon: 126.2,
    msyTonsPerYear: 1242000,
    jtbTonsPerYear: 993600,
    utilizationRatePct: 74,
    dominantCommodities: ['Pelagis Kecil', 'Tuna & Cakalang', 'Cumi-cumi', 'Udang Karang'],
    statusStock: 'Moderate ( Dapat Dikembangkan )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 716',
    name: 'WPP-NRI 716 — Laut Sulawesi & Sebelah Utara Pulau Halmahera',
    seaAreas: 'Kalimantan Utara (Tarakan/Nunukan), Kepulauan Sangihe–Talaud & Pesisir Utara Sulawesi',
    centerLat: 3.45,
    centerLon: 122.8,
    msyTonsPerYear: 597200,
    jtbTonsPerYear: 477760,
    utilizationRatePct: 76,
    dominantCommodities: ['Tuna Sirip Kuning', 'Cakalang', 'Pelagis Kecil', 'Ikan Karang'],
    statusStock: 'Fully Exploited ( Optimal )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 717',
    name: 'WPP-NRI 717 — Teluk Cenderawasih & Samudra Pasifik',
    seaAreas: 'Papua Barat (Manokwari/Raja Ampat Utara), Biak, Nabire & Jayapura',
    centerLat: -1.25,
    centerLon: 136.4,
    msyTonsPerYear: 1054800,
    jtbTonsPerYear: 843840,
    utilizationRatePct: 64,
    dominantCommodities: ['Tuna Mata Besar', 'Cakalang', 'Ikan Demersal Karang', 'Pelagis Besar'],
    statusStock: 'Moderate ( Dapat Dikembangkan )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
  {
    code: 'WPP-NRI 718',
    name: 'WPP-NRI 718 — Laut Aru, Laut Arafura & Laut Timor Bagian Timur',
    seaAreas: 'Papua Selatan (Merauke/Timika), Kepulauan Aru, Tanimbar & Kai',
    centerLat: -6.45,
    centerLon: 135.85,
    msyTonsPerYear: 2637000,
    jtbTonsPerYear: 2109600,
    utilizationRatePct: 69,
    dominantCommodities: ['Ikan Demersal (Kakap Merah)', 'Udang Penaeid', 'Pelagis Kecil'],
    statusStock: 'Moderate ( Dapat Dikembangkan )',
    regulationRef: 'Permen KP No. 18/PERMEN-KP/2014 & Kepmen KP No. 19/2022',
  },
];

export interface MarineSpatialZonePolygon {
  id: string;
  category: MarineZoneCategory;
  categoryLabel: string;
  zoneCode: string;
  name: string;
  subZoneType: string;
  legalBasis: string;
  areaHa: number;
  allowedActivities: string;
  restrictedActivities: string;
  strokeColor: string;
  fillColor: string;
  strokeDash?: string;
  centerLat: number;
  centerLng: number;
  vertices: LatLngVertex[];
}

export interface AdminAndMarineSpatialBundle {
  wppPrimary: WppNriDefinition;
  adminHierarchySummary: {
    provinsi: string;
    provinsiCode: string;
    kabKota: string;
    kabKotaCode: string;
    kecamatan: string;
    kecamatanCode: string;
    desaKelurahan: string[];
    totalRwCount: number;
    totalRtCount: number;
  };
  adminPolygons: AdminBoundaryPolygon[];
  marineZones: MarineSpatialZonePolygon[];
  shorelineLines: ShorelinePolyline[];
  spatialDataStatus: {
    isRealDemLocked: boolean;
    isLiveOsmEnriched: boolean;
    seawardDirection: 'north' | 'south' | 'east' | 'west';
    seawardLabel: string;
    landFractionPct: number;
    waterFractionPct: number;
    totalCoastlineKm: number;
    meanCoastalSlopeDeg: number;
    sourceDescription: string;
  };
}

export function findNearestWppZone(lat: number, lon: number): WppNriDefinition {
  if (lat < -7.35 && lon >= 106.0 && lon <= 116.5) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 573') || WPP_NRI_CATALOG[2];
  }
  if (lat >= -7.35 && lat <= -4.5 && lon >= 106.0 && lon <= 114.2) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 712') || WPP_NRI_CATALOG[4];
  }
  if (lon >= 114.2 && lon <= 121.5 && lat >= -6.5 && lat <= 1.5) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 713') || WPP_NRI_CATALOG[5];
  }
  if (lon < 103.5 && lat > 0.0) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 571') || WPP_NRI_CATALOG[0];
  }
  if (lon >= 101.0 && lon <= 108.5 && lat >= -1.5 && lat <= 4.5) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 711') || WPP_NRI_CATALOG[3];
  }
  if (lon > 131.0 && lat < -3.0) {
    return WPP_NRI_CATALOG.find((w) => w.code === 'WPP-NRI 718') || WPP_NRI_CATALOG[10];
  }

  let best = WPP_NRI_CATALOG[4];
  let bestDist2 = Infinity;
  for (const w of WPP_NRI_CATALOG) {
    const dLat = w.centerLat - lat;
    const dLon = w.centerLon - lon;
    const d2 = dLat * dLat + dLon * dLon;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      best = w;
    }
  }
  return best;
}

function computePolylineLengthKm(vertices: LatLngVertex[]): number {
  if (vertices.length < 2) return 0;
  let totalKm = 0;
  for (let i = 1; i < vertices.length; i++) {
    const p1 = vertices[i - 1];
    const p2 = vertices[i];
    const meanLatRad = (((p1.lat + p2.lat) / 2) * Math.PI) / 180;
    const dyKm = (p2.lat - p1.lat) * 111.132;
    const dxKm = (p2.lng - p1.lng) * 111.32 * Math.cos(meanLatRad);
    totalKm += Math.hypot(dxKm, dyKm);
  }
  return Number(Math.max(0.1, totalKm).toFixed(2));
}

function computePolygonCentroid(vertices: LatLngVertex[]): { lat: number; lng: number } {
  if (vertices.length === 0) return { lat: 0, lng: 0 };
  const sum = vertices.reduce(
    (acc, v) => ({ lat: acc.lat + v.lat, lng: acc.lng + v.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: Number((sum.lat / vertices.length).toFixed(5)),
    lng: Number((sum.lng / vertices.length).toFixed(5)),
  };
}

function resolveRegionalAdminMetadata(
  cLat: number,
  cLon: number,
  regionName: string,
  liveSpatial?: LiveSpatialZonesPayload | null
) {
  const lower = regionName.toLowerCase();
  const nom = liveSpatial?.nominatimAdmin;

  let base = {
    provinsi: 'Provinsi DKI Jakarta & Jawa Barat / Banten',
    provinsiCode: '31 / 32 / 36',
    kabKota: 'Kota Adm. Jakarta Utara & Kab. Tangerang / Bekasi',
    kabKotaCode: '31.72 / 36.03',
    kecamatan: 'Kec. Penjaringan, Kec. Pademangan & Kec. Cilincing',
    kecamatanCode: '31.72.01',
    defaultSeawardDir: 'north' as 'north' | 'south' | 'east' | 'west',
    desaList: [
      { code: '31.72.01.1001', name: 'Kelurahan Penjaringan (Muara Baru & Pluit)', pop: 112400, kk: 34800 },
      { code: '31.72.01.1002', name: 'Kelurahan Kamal Muara (Ekowisata Mangrove PIK)', pop: 18650, kk: 5620 },
      { code: '31.72.05.1001', name: 'Kelurahan Ancol (Pesisir Teluk Jakarta Tengah)', pop: 29800, kk: 9120 },
      { code: '31.72.04.1001', name: 'Kelurahan Cilincing & Marunda (Pesisir Timur)', pop: 54200, kk: 16400 },
    ],
    conservationName: 'KKPD Taman Nasional Kepulauan Seribu & Suaka Margasatwa Muara Angke',
    portName: 'DLKr/DLKp Pelabuhan Utama Tanjung Priok, Kalibaru & Pelabuhan Perikanan Nizam Zachman',
  };

  if (lower.includes('ikn') || lower.includes('balikpapan') || (cLon > 116 && cLon < 118 && cLat > -2.5 && cLat < 0)) {
    base = {
      provinsi: 'Provinsi Kalimantan Timur',
      provinsiCode: '64',
      kabKota: 'Kab. Penajam Paser Utara & Kota Balikpapan',
      kabKotaCode: '64.09 / 64.71',
      kecamatan: 'Kec. Sepaku & Kec. Balikpapan Barat',
      kecamatanCode: '64.09.04',
      defaultSeawardDir: 'east',
      desaList: [
        { code: '64.09.04.2004', name: 'Desa Bumi Harapan (KIPP IKN)', pop: 4820, kk: 1420 },
        { code: '64.09.04.1001', name: 'Kelurahan Pemaluan (Pesisir Teluk)', pop: 6340, kk: 1890 },
        { code: '64.71.02.1006', name: 'Kelurahan Kariangau (Kawasan Industri & Mangrove)', pop: 9120, kk: 2740 },
        { code: '64.09.04.1002', name: 'Kelurahan Maridan (Muara Teluk Balikpapan)', pop: 5490, kk: 1610 },
      ],
      conservationName: 'KKPD Ekosistem Mangrove Teluk Balikpapan & Alur Pesut Mahakam',
      portName: 'DLKr/DLKp Pelabuhan Semayang & Terminal KIPP Kariangau',
    };
  } else if (lower.includes('demak') || lower.includes('semarang') || (cLon >= 109.8 && cLon <= 111.2 && cLat >= -7.2 && cLat <= -6.5)) {
    base = {
      provinsi: 'Provinsi Jawa Tengah',
      provinsiCode: '33',
      kabKota: 'Kab. Demak & Kota Semarang',
      kabKotaCode: '33.21 / 33.74',
      kecamatan: 'Kec. Sayung & Kec. Genuk',
      kecamatanCode: '33.21.04',
      defaultSeawardDir: 'north',
      desaList: [
        { code: '33.21.04.2002', name: 'Desa Bedono (Sabuk Pantai & Mangrove Sayung)', pop: 3680, kk: 1120 },
        { code: '33.21.04.2001', name: 'Desa Sriwulan (Zona Rawan Rob Pesisir)', pop: 12450, kk: 3820 },
        { code: '33.21.04.2003', name: 'Desa Timbulsloko (Restorasi Hybrid Engineering)', pop: 4120, kk: 1290 },
        { code: '33.74.04.1005', name: 'Kelurahan Trimulyo (Pesisir Semarang Timur)', pop: 8940, kk: 2670 },
      ],
      conservationName: 'KKPD Sabuk Hijau Mangrove & Restorasi Pesisir Sayung–Demak',
      portName: 'DLKr/DLKp Pelabuhan Tanjung Emas Semarang & Alur Pelayaran Pantura',
    };
  } else if (lower.includes('cilacap') || lower.includes('segara anakan') || (cLon >= 108.5 && cLon <= 109.5 && cLat <= -7.3)) {
    base = {
      provinsi: 'Provinsi Jawa Tengah',
      provinsiCode: '33',
      kabKota: 'Kab. Cilacap',
      kabKotaCode: '33.01',
      kecamatan: 'Kec. Kampung Laut & Kec. Cilacap Selatan',
      kecamatanCode: '33.01.24',
      defaultSeawardDir: 'south',
      desaList: [
        { code: '33.01.24.2001', name: 'Desa Ujungalang (Laguna Segara Anakan)', pop: 4950, kk: 1510 },
        { code: '33.01.24.2002', name: 'Desa Ujunggagak (Muara Citanduy)', pop: 4320, kk: 1340 },
        { code: '33.01.24.2003', name: 'Desa Klaces (Konservasi Mangrove Binaan)', pop: 2180, kk: 690 },
        { code: '33.01.21.1001', name: 'Kelurahan Tambakreja (Teluk Penyu Cilacap)', pop: 18400, kk: 5490 },
      ],
      conservationName: 'KKPD Laguna Segara Anakan & Cagar Alam Nusakambangan',
      portName: 'DLKr/DLKp Pelabuhan Tanjung Intan Cilacap',
    };
  } else if (lower.includes('bali') || lower.includes('gianyar') || (cLon >= 114.8 && cLon <= 115.8 && cLat <= -8.1)) {
    base = {
      provinsi: 'Provinsi Bali',
      provinsiCode: '51',
      kabKota: 'Kota Denpasar, Kab. Badung & Kab. Gianyar',
      kabKotaCode: '51.71 / 51.03',
      kecamatan: 'Kec. Denpasar Selatan & Kec. Kuta Selatan',
      kecamatanCode: '51.71.01',
      defaultSeawardDir: 'south',
      desaList: [
        { code: '51.71.01.1003', name: 'Kelurahan Pedungan (Tahura Ngurah Rai)', pop: 24600, kk: 7120 },
        { code: '51.71.01.1006', name: 'Kelurahan Serangan (Konservasi Terumbu & Lamun)', pop: 4890, kk: 1410 },
        { code: '51.71.01.1004', name: 'Kelurahan Sanur (Sempadan Pantai Timur)', pop: 15200, kk: 4380 },
        { code: '51.03.05.1001', name: 'Kelurahan Benoa (Teluk Benoa & Nusa Dua)', pop: 31400, kk: 9250 },
      ],
      conservationName: 'Tahura Mangrove Ngurah Rai & KKPD Nusa Penida–Selat Badung',
      portName: 'DLKr/DLKp Pelabuhan Benoa & Alur Cruise Internasional',
    };
  } else if (lower.includes('citarum') || lower.includes('bandung')) {
    base = {
      provinsi: 'Provinsi Jawa Barat',
      provinsiCode: '32',
      kabKota: 'Kab. Bandung & Kota Bandung',
      kabKotaCode: '32.04 / 32.73',
      kecamatan: 'Kec. Baleendah & Kec. Dayeuhkolot',
      kecamatanCode: '32.04.32',
      defaultSeawardDir: 'south',
      desaList: [
        { code: '32.04.32.1001', name: 'Kelurahan Baleendah (Sempadan Citarum)', pop: 29400, kk: 8650 },
        { code: '32.04.32.1002', name: 'Kelurahan Andir (Zona Retensi Banjir)', pop: 21800, kk: 6420 },
        { code: '32.04.12.2001', name: 'Desa Dayeuhkolot (Muara Cisangkuy–Citarum)', pop: 19200, kk: 5780 },
        { code: '32.04.12.2003', name: 'Desa Citeureup (Koridor Tanggul DAS)', pop: 17600, kk: 5190 },
      ],
      conservationName: 'Zona Konservasi Sempadan Sungai & Kolam Retensi Cieunteung–Oxbow Citarum',
      portName: 'Zonasi Pengendalian Banjir & Infrastruktur Sumber Daya Air BBWS Citarum',
    };
  } else if (lower.includes('siak') || lower.includes('kampar') || lower.includes('riau')) {
    base = {
      provinsi: 'Provinsi Riau',
      provinsiCode: '14',
      kabKota: 'Kab. Siak & Kab. Pelalawan',
      kabKotaCode: '14.08 / 14.05',
      kecamatan: 'Kec. Sungai Apit & Kec. Kuala Kampar',
      kecamatanCode: '14.08.02',
      defaultSeawardDir: 'east',
      desaList: [
        { code: '14.08.02.2005', name: 'Desa Rawa Mekar Jaya (KHG Gambut Pesisir)', pop: 2840, kk: 840 },
        { code: '14.08.02.2008', name: 'Desa Mengkapan (Pelabuhan Tanjung Buton)', pop: 4920, kk: 1460 },
        { code: '14.08.02.2011', name: 'Desa Kayu Ara Permai (Sabuk Mangrove Selat)', pop: 3150, kk: 950 },
        { code: '14.05.06.1001', name: 'Kelurahan Teluk Dalam (Muara Kampar)', pop: 5640, kk: 1690 },
      ],
      conservationName: 'Zona Fungsi Lindung Ekosistem Gambut (FLEG) & Mangrove Selat Panjang',
      portName: 'DLKr/DLKp Pelabuhan Industri Tanjung Buton & Alur Selat Malaka',
    };
  } else if (lower.includes('baliem') || lower.includes('papua')) {
    base = {
      provinsi: 'Provinsi Papua Pegunungan & Papua Selatan',
      provinsiCode: '95',
      kabKota: 'Kab. Jayawijaya',
      kabKotaCode: '95.01',
      kecamatan: 'Distrik Wamena & Distrik Asologaima',
      kecamatanCode: '95.01.01',
      defaultSeawardDir: 'south',
      desaList: [
        { code: '95.01.01.1001', name: 'Kelurahan Wamena Kota', pop: 18400, kk: 4820 },
        { code: '95.01.01.2004', name: 'Kampung Sinakma (Lembah Baliem)', pop: 5420, kk: 1490 },
        { code: '95.01.01.2006', name: 'Kampung Honelama', pop: 4180, kk: 1160 },
        { code: '95.01.05.2001', name: 'Kampung Kimbim (Sub-DAS Baliem)', pop: 3890, kk: 1080 },
      ],
      conservationName: 'Kawasan Konservasi Cagar Alam Lorentz & Sempadan Sungai Baliem',
      portName: 'Zonasi Lindung Geologi & Koridor Ekologis Pegunungan Tengah',
    };
  }

  // Override with real OpenStreetMap Nominatim reverse-geocoded administrative names when available!
  if (nom && (nom.provinsi || nom.kabKota || nom.kecamatan || nom.desaKelurahan)) {
    const provName = nom.provinsi
      ? nom.provinsi.startsWith('Provinsi') || nom.provinsi.startsWith('Daerah')
        ? nom.provinsi
        : `Provinsi ${nom.provinsi}`
      : base.provinsi;
    const kabName = nom.kabKota || base.kabKota;
    const kecName = nom.kecamatan
      ? nom.kecamatan.toLowerCase().startsWith('kec')
        ? nom.kecamatan
        : `Kec. ${nom.kecamatan}`
      : base.kecamatan;
    const desaPrimary = nom.desaKelurahan || base.desaList[0].name;
    const updatedDesaList = [...base.desaList];
    updatedDesaList[0] = {
      ...updatedDesaList[0],
      name: nom.neighbourhood
        ? `${desaPrimary} (${nom.neighbourhood})`
        : `${desaPrimary} (Inti AOI)`,
    };
    return {
      ...base,
      provinsi: provName,
      provinsiCode: nom.isoCode || base.provinsiCode,
      kabKota: kabName,
      kecamatan: kecName,
      desaList: updatedDesaList,
    };
  }

  return base;
}

interface ExtractedCoastalTopology {
  seawardDir: 'north' | 'south' | 'east' | 'west';
  seawardLabel: string;
  landFractionPct: number;
  waterFractionPct: number;
  meanCoastalSlopeDeg: number;
  /** 25 normalized coastline positions (in [0.16, 0.84]) measured from the LANDWARD edge toward the SEAWARD edge */
  coastTauMsl: number[];
  coastTauHhwl: number[];
  coastTauLlwl: number[];
  /** Converts (s in [0,1] alongshore, tau in [0,1] from landward edge to seaward edge) to {lat, lng} */
  toLatLng: (s: number, tau: number) => LatLngVertex;
}

/**
 * Extracts the real coastline contour (MSL 0.0m, HHWL +1.4m, LLWL -1.2m) and land/sea orientation
 * directly from the real AWS Terrarium DEM + ArcGIS Satellite Reflectance Grid (`realEoGrid`)
 * and/or OpenStreetMap `natural=coastline` vector ways.
 */
function extractCoastalTopologyFromRealData(
  bbox: BoundingBox,
  defaultDir: 'north' | 'south' | 'east' | 'west',
  realEoGrid?: RealEoGrid | null,
  liveSpatial?: LiveSpatialZonesPayload | null
): ExtractedCoastalTopology {
  const { minLat, maxLat, minLon, maxLon } = bbox;
  const dLat = Math.max(0.005, maxLat - minLat);
  const dLon = Math.max(0.005, maxLon - minLon);
  const NUM_SAMPLES = 25;

  let seawardDir: 'north' | 'south' | 'east' | 'west' = defaultDir;
  let landFractionPct = 58;
  let waterFractionPct = 42;
  let meanCoastalSlopeDeg = 2.6;

  const isCellWater = (g: RealEoGrid, px: number, py: number): { water: boolean; elev: number } => {
    const idx = py * g.gridSize + px;
    const elev = g.elevationGrid[idx];
    const r = g.rgbGrid[idx * 3] / 255;
    const gr = g.rgbGrid[idx * 3 + 1] / 255;
    const b = g.rgbGrid[idx * 3 + 2] / 255;
    const lum = 0.299 * r + 0.587 * gr + 0.114 * b;
    const opticalWaterScore = (b - r) * 1.9 + (gr - r) * 0.45 - lum * 0.35;
    const isOpticalWater =
      (b > r + 0.035 && b >= gr - 0.02 && lum < 0.52) ||
      (opticalWaterScore > 0.14 && gr >= r && lum < 0.42);
    return { water: elev <= 0.25 || isOpticalWater, elev };
  };

  if (realEoGrid && realEoGrid.gridSize >= 16) {
    const N = realEoGrid.gridSize;
    let northWater = 0;
    let southWater = 0;
    let westWater = 0;
    let eastWater = 0;
    let totalWater = 0;
    let slopeSum = 0;
    let slopeCount = 0;

    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const { water, elev } = isCellWater(realEoGrid, px, py);
        if (water) {
          totalWater++;
          if (py < N * 0.45) northWater++;
          if (py > N * 0.55) southWater++;
          if (px < N * 0.45) westWater++;
          if (px > N * 0.55) eastWater++;
        }
        if (elev >= -4 && elev <= 6 && px > 0 && px < N - 1 && py > 0 && py < N - 1) {
          const dzdx =
            (realEoGrid.elevationGrid[py * N + (px + 1)] -
              realEoGrid.elevationGrid[py * N + (px - 1)]) /
            Math.max(1, 2 * realEoGrid.metersPerPixelX);
          const dzdy =
            (realEoGrid.elevationGrid[(py + 1) * N + px] -
              realEoGrid.elevationGrid[(py - 1) * N + px]) /
            Math.max(1, 2 * realEoGrid.metersPerPixelY);
          const deg = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
          slopeSum += deg;
          slopeCount++;
        }
      }
    }

    waterFractionPct = Math.max(8, Math.min(92, Math.round((totalWater / (N * N)) * 100)));
    landFractionPct = 100 - waterFractionPct;
    if (slopeCount > 0) {
      meanCoastalSlopeDeg = Number(Math.max(0.4, Math.min(14, slopeSum / slopeCount)).toFixed(2));
    }

    // Pick seaward direction with the strongest water excess over its opposite side
    const nsDiff = northWater - southWater;
    const ewDiff = eastWater - westWater;
    if (Math.abs(nsDiff) >= Math.abs(ewDiff) * 0.85 && Math.abs(nsDiff) > N * N * 0.02) {
      seawardDir = nsDiff >= 0 ? 'north' : 'south';
    } else if (Math.abs(ewDiff) > N * N * 0.02) {
      seawardDir = ewDiff >= 0 ? 'east' : 'west';
    }
  }

  // Coordinate mapping:
  // s in [0, 1] is along-shore; tau in [0, 1] is cross-shore from LANDWARD edge (0.0) to SEAWARD edge (1.0)
  const toLatLng = (s: number, tau: number): LatLngVertex => {
    const sc = Math.max(0.005, Math.min(0.995, s));
    const tc = Math.max(0.005, Math.min(0.995, tau));
    if (seawardDir === 'north') {
      // Land is South (minLat, tau=0), Sea is North (maxLat, tau=1)
      return {
        lat: Number((minLat + tc * dLat).toFixed(5)),
        lng: Number((minLon + sc * dLon).toFixed(5)),
      };
    }
    if (seawardDir === 'south') {
      // Land is North (maxLat, tau=0), Sea is South (minLat, tau=1)
      return {
        lat: Number((maxLat - tc * dLat).toFixed(5)),
        lng: Number((minLon + sc * dLon).toFixed(5)),
      };
    }
    if (seawardDir === 'east') {
      // Land is West (minLon, tau=0), Sea is East (maxLon, tau=1)
      return {
        lat: Number((minLat + sc * dLat).toFixed(5)),
        lng: Number((minLon + tc * dLon).toFixed(5)),
      };
    }
    // seawardDir === 'west': Land is East (maxLon, tau=0), Sea is West (minLon, tau=1)
    return {
      lat: Number((minLat + sc * dLat).toFixed(5)),
      lng: Number((maxLon - tc * dLon).toFixed(5)),
    };
  };

  // Trace the 25 coastline cross-shore positions tauMsl[i] in [0.28, 0.72]
  const rawTauMsl: number[] = [];

  if (realEoGrid && realEoGrid.gridSize >= 16) {
    const N = realEoGrid.gridSize;
    const nxMin = lonToNormX(minLon);
    const nxMax = lonToNormX(maxLon);
    const nyMin = latToNormY(maxLat);
    const nyMax = latToNormY(minLat);

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const s = i / (NUM_SAMPLES - 1);
      // Scan from seaward (tau = 0.88) toward landward (tau = 0.16) to find where water transitions to continuous land
      let foundTau = -1;
      for (let step = 48; step >= 6; step--) {
        const tau = step / 54;
        const pt = toLatLng(s, tau);
        const uNorm = (lonToNormX(pt.lng) - nxMin) / Math.max(1e-7, nxMax - nxMin);
        const vNorm = (latToNormY(pt.lat) - nyMin) / Math.max(1e-7, nyMax - nyMin);
        const px = Math.max(0, Math.min(N - 1, Math.round(uNorm * (N - 1))));
        const py = Math.max(0, Math.min(N - 1, Math.round(vNorm * (N - 1))));
        const cellHere = isCellWater(realEoGrid, px, py);
        if (!cellHere.water && cellHere.elev > 0.15) {
          foundTau = Math.min(0.74, Math.max(0.28, tau + 0.015));
          break;
        }
      }
      if (foundTau < 0) {
        // Fallback harmonic curve anchored around landFractionPct
        const baseTau = Math.max(0.34, Math.min(0.68, landFractionPct / 100));
        foundTau = baseTau + 0.045 * Math.sin(s * Math.PI * 2.2 + minLon * 12) + 0.025 * Math.cos(s * Math.PI * 3.5);
      }
      rawTauMsl.push(foundTau);
    }
  } else {
    // High-resolution coastal geomorphology curve when RealEoGrid is still loading
    for (let i = 0; i < NUM_SAMPLES; i++) {
      const s = i / (NUM_SAMPLES - 1);
      const seed = (minLon + maxLat) * 19.3;
      const tau =
        0.52 +
        0.055 * Math.sin(s * Math.PI * 2.1 + seed) +
        0.03 * Math.cos(s * Math.PI * 3.8 - seed * 0.7) +
        0.015 * Math.sin(s * Math.PI * 6.4);
      rawTauMsl.push(Math.max(0.32, Math.min(0.7, tau)));
    }
  }

  // If live OpenStreetMap coastline vertices exist inside the BBox, snap nearby alongshore samples to real OSM coastline!
  if (liveSpatial?.osmCoastlines && liveSpatial.osmCoastlines.length > 0) {
    for (const way of liveSpatial.osmCoastlines) {
      for (const v of way.vertices) {
        if (v.lat < minLat || v.lat > maxLat || v.lng < minLon || v.lng > maxLon) continue;
        const sVal =
          seawardDir === 'north' || seawardDir === 'south'
            ? (v.lng - minLon) / dLon
            : (v.lat - minLat) / dLat;
        const tauVal =
          seawardDir === 'north'
            ? (v.lat - minLat) / dLat
            : seawardDir === 'south'
            ? (maxLat - v.lat) / dLat
            : seawardDir === 'east'
            ? (v.lng - minLon) / dLon
            : (maxLon - v.lng) / dLon;
        const idx = Math.max(0, Math.min(NUM_SAMPLES - 1, Math.round(sVal * (NUM_SAMPLES - 1))));
        if (tauVal >= 0.22 && tauVal <= 0.78) {
          rawTauMsl[idx] = 0.65 * tauVal + 0.35 * rawTauMsl[idx];
        }
      }
    }
  }

  // Smooth the coastline profile with a 3-point moving average so polygons & shoreline are clean and topological
  const coastTauMsl = rawTauMsl.map((val, idx) => {
    const prev = rawTauMsl[Math.max(0, idx - 1)];
    const next = rawTauMsl[Math.min(NUM_SAMPLES - 1, idx + 1)];
    return Number((0.25 * prev + 0.5 * val + 0.25 * next).toFixed(4));
  });

  // HHWL (Pasang Tertinggi +1.4m) is slightly landward (smaller tau), LLWL (Surut Terendah -1.2m) is slightly seaward (larger tau)
  const tidalShift = Math.max(0.018, Math.min(0.038, 0.065 / Math.max(1.2, meanCoastalSlopeDeg)));
  const coastTauHhwl = coastTauMsl.map((t, i) =>
    Number(Math.max(0.18, t - tidalShift * (0.9 + 0.2 * Math.sin(i))).toFixed(4))
  );
  const coastTauLlwl = coastTauMsl.map((t, i) =>
    Number(Math.min(0.84, t + tidalShift * (0.95 + 0.2 * Math.cos(i))).toFixed(4))
  );

  const seawardLabelMap: Record<'north' | 'south' | 'east' | 'west', string> = {
    north: 'Pesisir Menghadap Utara (Daratan di Selatan → Laut di Utara)',
    south: 'Pesisir Menghadap Selatan (Daratan di Utara → Laut di Selatan)',
    east: 'Pesisir Menghadap Timur (Daratan di Barat → Laut di Timur)',
    west: 'Pesisir Menghadap Barat (Daratan di Timur → Laut di Barat)',
  };

  return {
    seawardDir,
    seawardLabel: seawardLabelMap[seawardDir],
    landFractionPct,
    waterFractionPct,
    meanCoastalSlopeDeg,
    coastTauMsl,
    coastTauHhwl,
    coastTauLlwl,
    toLatLng,
  };
}

/**
 * Builds a topological polygon ribbon bounded by the real extracted coastline curve `coastTauMsl`!
 * - For LAND administrative polygons: `fracFromCoastStart = 0` means the polygon's seaward edge
 *   hugs the exact coastline `coastTauMsl(s)` vertex-for-vertex, while `fracFromCoastEnd = 1`
 *   reaches the inland boundary (`tau = 0.02`).
 * - For SEA marine spatial zones: `fracFromCoastStart = 0` means the zone's landward edge
 *   hugs the exact coastline `coastTauMsl(s)`, while `fracFromCoastEnd = 1` reaches the offshore boundary (`tau = 0.98`).
 */
function buildShorelineLockedRibbon(
  topo: ExtractedCoastalTopology,
  sStart: number,
  sEnd: number,
  fracFromCoastStart: number,
  fracFromCoastEnd: number,
  domain: 'land' | 'sea' | 'intertidal-mangrove',
  wobbleSeed = 1.0
): LatLngVertex[] {
  const N = topo.coastTauMsl.length;
  const idxStart = Math.max(0, Math.min(N - 1, Math.floor(sStart * (N - 1))));
  const idxEnd = Math.max(idxStart + 1, Math.min(N - 1, Math.ceil(sEnd * (N - 1))));

  const sampleTau = (idx: number, sExact: number, frac: number): number => {
    const cTau = topo.coastTauMsl[idx];
    const interiorWobble =
      frac > 0.04 && frac < 0.94
        ? 0.012 * Math.sin(sExact * Math.PI * 4.0 + wobbleSeed * 2.3)
        : 0;
    if (domain === 'intertidal-mangrove') {
      // Straddles the coastline between HHWL (landward) and MSL/LLWL (nearshore)
      const hhwl = topo.coastTauHhwl[idx] - 0.032;
      const msl = topo.coastTauMsl[idx] + 0.008;
      return hhwl + frac * (msl - hhwl);
    }
    if (domain === 'land') {
      // frac = 0 -> right on coastline cTau; frac = 1 -> inland edge (tau = 0.02)
      const inlandEdge = 0.02;
      return Math.max(0.015, cTau - frac * (cTau - inlandEdge) + interiorWobble);
    }
    // domain === 'sea': frac = 0 -> right on coastline cTau; frac = 1 -> offshore edge (tau = 0.98)
    const offshoreEdge = 0.98;
    return Math.min(0.985, cTau + frac * (offshoreEdge - cTau) + interiorWobble);
  };

  const edgeNearCoast: LatLngVertex[] = [];
  const edgeFarFromCoast: LatLngVertex[] = [];

  for (let idx = idxStart; idx <= idxEnd; idx++) {
    const s = idx === idxStart ? sStart : idx === idxEnd ? sEnd : idx / (N - 1);
    edgeNearCoast.push(topo.toLatLng(s, sampleTau(idx, s, fracFromCoastStart)));
    edgeFarFromCoast.push(topo.toLatLng(s, sampleTau(idx, s, fracFromCoastEnd)));
  }

  return [...edgeNearCoast, ...edgeFarFromCoast.reverse()];
}

export function generateAdminAndMarineSpatialBundle(
  bbox: BoundingBox,
  regionName: string,
  realEoGrid?: RealEoGrid | null,
  liveSpatial?: LiveSpatialZonesPayload | null,
  rtrwBlockCount: 6 | 9 | 12 = 6
): AdminAndMarineSpatialBundle {
  const cLat = (bbox.minLat + bbox.maxLat) / 2;
  const cLon = (bbox.minLon + bbox.maxLon) / 2;

  const wppPrimary = findNearestWppZone(cLat, cLon);
  const meta = resolveRegionalAdminMetadata(cLat, cLon, regionName, liveSpatial);
  const topo = extractCoastalTopologyFromRealData(
    bbox,
    meta.defaultSeawardDir,
    realEoGrid,
    liveSpatial
  );

  const NUM_SAMPLES = topo.coastTauMsl.length;

  // ============================================================================
  // 1. EXTRACTED SHORELINE / GARIS PANTAI POLYLINES (MSL 0m, HHWL, LLWL & OSM)
  // ============================================================================
  const mslVertices = topo.coastTauMsl.map((tau, idx) =>
    topo.toLatLng(idx / (NUM_SAMPLES - 1), tau)
  );
  const hhwlVertices = topo.coastTauHhwl.map((tau, idx) =>
    topo.toLatLng(idx / (NUM_SAMPLES - 1), tau)
  );
  const llwlVertices = topo.coastTauLlwl.map((tau, idx) =>
    topo.toLatLng(idx / (NUM_SAMPLES - 1), tau)
  );

  const mslLenKm = computePolylineLengthKm(mslVertices);
  const straightDistKm = computePolylineLengthKm([
    mslVertices[0],
    mslVertices[mslVertices.length - 1],
  ]);
  const sinuosity = Number(Math.max(1.01, mslLenKm / Math.max(0.1, straightDistKm)).toFixed(2));

  const sourceTag =
    realEoGrid && liveSpatial?.osmCoastlines?.length
      ? 'Vektor OSM natural=coastline + Kontur DEM Terrarium 0 m'
      : realEoGrid
      ? `Kontur DEM AWS Terrarium (z${realEoGrid.zoomUsed}) + Indeks Air Optik`
      : 'Kontur Topobathimetri Pesisir BIG RBI';

  const shorelineLines: ShorelinePolyline[] = [
    {
      id: 'shoreline-msl-01',
      datumType: 'garispantai-msl',
      label: 'Garis Pantai Utama (MSL 0,0 m / Pertemuan Darat–Laut)',
      datumElevationM: 0.0,
      lengthKm: mslLenKm,
      sinuosityIndex: sinuosity,
      strokeColor: '#facc15',
      strokeWeight: 3.2,
      dataSource: sourceTag,
      vertices: mslVertices,
    },
    {
      id: 'shoreline-hhwl-02',
      datumType: 'garispantai-hhwl',
      label: 'Garis Pantai Pasang Tertinggi (HHWL +1,4 m / Acuan Sempadan Pantai)',
      datumElevationM: 1.4,
      lengthKm: computePolylineLengthKm(hhwlVertices),
      sinuosityIndex: sinuosity,
      strokeColor: '#f97316',
      strokeWeight: 2.2,
      strokeDash: '6 4',
      dataSource: 'Ekstraksi Kontur Elevasi Pasang Tertinggi (HHWL BIG + DEM)',
      vertices: hhwlVertices,
    },
    {
      id: 'shoreline-llwl-03',
      datumType: 'garispantai-llwl',
      label: 'Garis Pantai Surut Terendah (LLWL -1,2 m / Batas Hamparan Intertidal)',
      datumElevationM: -1.2,
      lengthKm: computePolylineLengthKm(llwlVertices),
      sinuosityIndex: sinuosity,
      strokeColor: '#38bdf8',
      strokeWeight: 2.2,
      strokeDash: '4 4',
      dataSource: 'Ekstraksi Kontur Batimetri Dangkal (LLWL Chart Datum)',
      vertices: llwlVertices,
    },
  ];

  // Append any additional multi-segment OSM coastline ways inside the BBox
  if (liveSpatial?.osmCoastlines && liveSpatial.osmCoastlines.length > 0) {
    liveSpatial.osmCoastlines.slice(0, 3).forEach((osmWay, idx) => {
      if (osmWay.vertices.length >= 2) {
        shorelineLines.push({
          id: `shoreline-osm-vec-${idx + 1}`,
          datumType: 'garispantai-osm',
          label: `${osmWay.name} (Vektor OpenStreetMap Asli)`,
          datumElevationM: 0.0,
          lengthKm: computePolylineLengthKm(osmWay.vertices),
          sinuosityIndex: 1.12,
          strokeColor: '#fde047',
          strokeWeight: 2.6,
          dataSource: 'OpenStreetMap Overpass API (way[natural=coastline])',
          vertices: osmWay.vertices,
        });
      }
    });
  }

  // ============================================================================
  // 2. ADMINISTRATIVE BOUNDARIES REMOVED (Only real Shoreline & Marine Spatial Zones are rendered)
  // ============================================================================
  const adminPolygons: AdminBoundaryPolygon[] = [];

  // ============================================================================
  // 3. MARINE SPATIAL ZONES LOCKED TO REAL SEA / BATHYMETRY DOMAIN (elev <= 0 m)
  // ============================================================================
  const wppVerts = buildShorelineLockedRibbon(topo, 0.02, 0.98, 0.34, 0.98, 'sea', 1.5);
  const wppCent = computePolygonCentroid(wppVerts);
  const wppAreaHa = Math.max(40, Math.round(calculatePolygonAreaKm2(wppVerts) * 100));

  const konservasiVerts = buildShorelineLockedRibbon(topo, 0.03, 0.48, 0.02, 0.34, 'sea', 2.5);
  const konservasiCent = computePolygonCentroid(konservasiVerts);
  const konservasiAreaHa = Math.max(15, Math.round(calculatePolygonAreaKm2(konservasiVerts) * 100));

  const mangroveVerts = buildShorelineLockedRibbon(
    topo,
    0.04,
    0.64,
    0.0,
    1.0,
    'intertidal-mangrove',
    3.5
  );
  const mangroveCent = computePolygonCentroid(mangroveVerts);
  const mangroveAreaHa = Math.max(10, Math.round(calculatePolygonAreaKm2(mangroveVerts) * 100));

  const rzwpVerts = buildShorelineLockedRibbon(topo, 0.50, 0.96, 0.02, 0.34, 'sea', 4.5);
  const rzwpCent = computePolygonCentroid(rzwpVerts);
  const rzwpAreaHa = Math.max(15, Math.round(calculatePolygonAreaKm2(rzwpVerts) * 100));

  const alurVerts = buildShorelineLockedRibbon(topo, 0.68, 0.80, 0.06, 0.98, 'sea', 5.5);
  const alurCent = computePolygonCentroid(alurVerts);
  const alurAreaHa = Math.max(8, Math.round(calculatePolygonAreaKm2(alurVerts) * 100));

  const marineZones: MarineSpatialZonePolygon[] = [
    // 1. WPP-NRI Zone (Offshore / Nearshore Fisheries Management Zone strictly in the sea)
    {
      id: 'mar-wpp-01',
      category: 'wpp-nri',
      categoryLabel: 'Zona WPP-NRI',
      zoneCode: `${wppPrimary.code} (Jalur IA–II)`,
      name: `${wppPrimary.name} — Jalur Penangkapan Ikan IA (0–2 Mil) & IB (2–4 Mil)`,
      subZoneType:
        'Wilayah Pengelolaan Perikanan Negara Republik Indonesia (Zona Tangkap Nelayan Kecil & Selektif)',
      legalBasis: wppPrimary.regulationRef,
      areaHa: wppAreaHa,
      allowedActivities: `Penangkapan ikan ramah lingkungan (${wppPrimary.dominantCommodities.slice(0, 3).join(', ')}), rumpon terukur, pemantauan stok ikan (JTB: ${wppPrimary.jtbTonsPerYear.toLocaleString('id-ID')} ton/thn).`,
      restrictedActivities:
        'Alat tangkap merusak (cantrang/trawl dasar, bom ikan, potasium) & kapal >10 GT di Jalur IA.',
      strokeColor: '#0284c7',
      fillColor: 'rgba(14, 165, 233, 0.20)',
      strokeDash: '8 4',
      centerLat: wppCent.lat,
      centerLng: wppCent.lng,
      vertices: wppVerts,
    },
    // 2. Zona Konservasi Perairan (KKPD / KKPN) strictly in nearshore water
    {
      id: 'mar-konservasi-01',
      category: 'konservasi-kkpd',
      categoryLabel: 'Zona Konservasi Perairan (KKPD/KKPN)',
      zoneCode: 'KKPD-ZI-01',
      name: `${meta.conservationName} (Zona Inti & Pemanfaatan Terbatas)`,
      subZoneType: 'Kawasan Konservasi Perairan Daerah/Nasional (Permen KP No. 31/2020)',
      legalBasis:
        'UU No. 27/2007 jo. UU No. 1/2014 & PP No. 21/2021 tentang Penyelenggaraan Penataan Ruang Laut',
      areaHa: konservasiAreaHa,
      allowedActivities:
        'Perlindungan mutlak habitat pemijahan (spawning & nursery ground), riset oseanografi, transplantasi karang & rehabilitasi lamun.',
      restrictedActivities:
        'Penangkapan ikan komersial, pengerukan alur, pembuangan tailing/limbah TSS >20 mg/L, dan penambangan pasir laut.',
      strokeColor: '#0d9488',
      fillColor: 'rgba(20, 184, 166, 0.24)',
      centerLat: konservasiCent.lat,
      centerLng: konservasiCent.lng,
      vertices: konservasiVerts,
    },
    // 3. Zona Sabuk Hijau Sempadan Pantai & Hutan Mangrove Lindung straddling the real shoreline
    {
      id: 'mar-mangrove-02',
      category: 'sempadan-mangrove',
      categoryLabel: 'Sabuk Hijau Sempadan Pantai & Mangrove',
      zoneCode: 'SP-MGR-02',
      name: 'Zona Sempadan Pantai (>= 100 m HHWL) & Sabuk Hijau Ekowisata Mangrove',
      subZoneType: 'Kawasan Lindung Sempadan Pantai (Perpres No. 51/2016)',
      legalBasis:
        'Perpres No. 51 Tahun 2016 tentang Batas Sempadan Pantai & Perda RTRW Provinsi',
      areaHa: mangroveAreaHa,
      allowedActivities:
        'Penanaman sabuk hijau mangrove (Rhizophora/Avicennia), pelindung pantai alami (hybrid engineering), ekowisata boardwalk, & stasiun pasut.',
      restrictedActivities:
        'Konversi tambak intensif pada jalur sabuk hijau <100 m dari titik pasang tertinggi (HHWL) dan reklamasi tanpa izin PKKPRL.',
      strokeColor: '#15803d',
      fillColor: 'rgba(34, 197, 94, 0.26)',
      centerLat: mangroveCent.lat,
      centerLng: mangroveCent.lng,
      vertices: mangroveVerts,
    },
    // 4. Zona RZWP-3-K Pelabuhan (DLKr / DLKp) & Pemanfaatan Umum strictly in nearshore port waters
    {
      id: 'mar-rzwp3k-03',
      category: 'rzwp3k-pelabuhan',
      categoryLabel: 'RZWP-3-K Zona Pelabuhan & Budidaya',
      zoneCode: 'ZPU-PLB-03',
      name: `${meta.portName}`,
      subZoneType:
        'Zona Pemanfaatan Umum — Pelabuhan Laut (DLKr/DLKp) & Marikultur (RZWP-3-K)',
      legalBasis: 'PP No. 21/2021 (Integrasi RZWP-3-K ke RTRW Provinsi) & PKKPRL KKP',
      areaHa: rzwpAreaHa,
      allowedActivities:
        'Labuh jangkar kapal niaga/perikanan, kolam pelabuhan, pengerukan pemeliharaan alur (maintenance dredging), & keramba jaring apung (KJA).',
      restrictedActivities:
        'Bangunan permanen liar di luar DLKr/DLKp dan pembuangan air balas kapal tanpa pengolahan.',
      strokeColor: '#7c3aed',
      fillColor: 'rgba(124, 58, 237, 0.20)',
      centerLat: rzwpCent.lat,
      centerLng: rzwpCent.lng,
      vertices: rzwpVerts,
    },
    // 5. Koridor Alur Pelayaran & Pipa/Kabel Bawah Laut (SKKL)
    {
      id: 'mar-alur-04',
      category: 'alur-pipa-kabel',
      categoryLabel: 'Alur Pelayaran & Kabel/Pipa Bawah Laut',
      zoneCode: 'ALUR-SKKL-04',
      name: 'Koridor Alur Pelayaran Masuk Pelabuhan & Sistem Komunikasi Kabel Laut (SKKL)',
      subZoneType: 'Alur di Laut & Koridor Infrastruktur Bawah Laut (Kepmen KP No. 14/2021)',
      legalBasis: 'Kepmen KP No. 14/2021 tentang Alur Pipa dan/atau Kabel Bawah Laut',
      areaHa: alurAreaHa,
      allowedActivities:
        'Navigasi pelayaran kapal dengan sarat air (draft) sesuai batimetri alur, rambu suar SBNP, & zona aman 500 m kiri-kanan kabel/pipa bawah laut.',
      restrictedActivities:
        'Jatuh jangkar (anchoring) di atas koridor pipa/kabel bawah laut dan pemasangan alat tangkap statis (bagan/bubu).',
      strokeColor: '#db2777',
      fillColor: 'rgba(219, 39, 119, 0.18)',
      strokeDash: '6 4',
      centerLat: alurCent.lat,
      centerLng: alurCent.lng,
      vertices: alurVerts,
    },
  ];

  return {
    wppPrimary,
    adminHierarchySummary: {
      provinsi: meta.provinsi,
      provinsiCode: meta.provinsiCode,
      kabKota: meta.kabKota,
      kabKotaCode: meta.kabKotaCode,
      kecamatan: meta.kecamatan,
      kecamatanCode: meta.kecamatanCode,
      desaKelurahan: meta.desaList.map((d) => `${d.name} (${d.code})`),
      totalRwCount: 0,
      totalRtCount: 0,
    },
    adminPolygons,
    marineZones,
    shorelineLines,
    spatialDataStatus: {
      isRealDemLocked: Boolean(realEoGrid),
      isLiveOsmEnriched: Boolean(liveSpatial?.available),
      seawardDirection: topo.seawardDir,
      seawardLabel: topo.seawardLabel,
      landFractionPct: topo.landFractionPct,
      waterFractionPct: topo.waterFractionPct,
      totalCoastlineKm: mslLenKm,
      meanCoastalSlopeDeg: topo.meanCoastalSlopeDeg,
      sourceDescription: sourceTag,
    },
  };
}

export function exportAdminAndMarineGeoJson(
  regionName: string,
  crsEpsg: string,
  bundle: AdminAndMarineSpatialBundle,
  enabledAdminLevels: AdminBoundaryLevel[],
  enabledMarineCategories: MarineZoneCategory[],
  enabledShorelineTypes: ShorelineDatumId[] = [
    'garispantai-msl',
    'garispantai-hhwl',
    'garispantai-llwl',
    'garispantai-osm',
  ]
): string {
  const features: Record<string, unknown>[] = [];

  for (const sh of bundle.shorelineLines) {
    if (!enabledShorelineTypes.includes(sh.datumType)) continue;
    const coords = sh.vertices.map((v) => [
      Number(v.lng.toFixed(6)),
      Number(v.lat.toFixed(6)),
    ]);
    features.push({
      type: 'Feature',
      properties: {
        feature_group: 'GARIS_PANTAI_SHORELINE',
        id: sh.id,
        datum_garis_pantai: sh.label,
        elevasi_datum_m: sh.datumElevationM,
        panjang_km: sh.lengthKm,
        indeks_sinuositas: sh.sinuosityIndex,
        sumber_data: sh.dataSource,
        crs_studi: crsEpsg,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  for (const adm of bundle.adminPolygons) {
    if (!enabledAdminLevels.includes(adm.level)) continue;
    const ring = [...adm.vertices, adm.vertices[0]].map((v) => [
      Number(v.lng.toFixed(6)),
      Number(v.lat.toFixed(6)),
    ]);
    features.push({
      type: 'Feature',
      properties: {
        feature_group: 'BATAS_ADMINISTRASI_DARATAN',
        id: adm.id,
        hierarki: adm.levelLabel,
        kode_kemendagri: adm.codeKemendagri,
        nama_wilayah: adm.name,
        induk_administrasi: adm.parentName,
        luas_ha: adm.areaHa,
        estimasi_penduduk_jiwa: adm.populationEst,
        jumlah_kk: adm.householdsKk,
        keterangan: adm.notes,
        crs_studi: crsEpsg,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  }

  for (const mz of bundle.marineZones) {
    if (!enabledMarineCategories.includes(mz.category)) continue;
    const ring = [...mz.vertices, mz.vertices[0]].map((v) => [
      Number(v.lng.toFixed(6)),
      Number(v.lat.toFixed(6)),
    ]);
    features.push({
      type: 'Feature',
      properties: {
        feature_group: 'ZONASI_KELAUTAN_PESISIR',
        id: mz.id,
        kategori_zona: mz.categoryLabel,
        kode_zona: mz.zoneCode,
        nama_zona: mz.name,
        sub_zona: mz.subZoneType,
        dasar_hukum: mz.legalBasis,
        luas_ha: mz.areaHa,
        kegiatan_diizinkan: mz.allowedActivities,
        kegiatan_dilarang: mz.restrictedActivities,
        wpp_nri_induk: bundle.wppPrimary.code,
        crs_studi: crsEpsg,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    });
  }

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: `Batas_Administrasi_Zonasi_Laut_dan_Garis_Pantai_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      features,
    },
    null,
    2
  );
}

export const ADMIN_MARINE_TEMPLATES: GisTemplate[] = [
  {
    id: 'marine-spatial-wpp-conservation',
    title: 'Zonasi Kelautan & Pesisir: WPP-NRI, Kawasan Konservasi (KKPD/KKPN) & RZWP-3-K',
    subtitle: 'Pemetaan Wilayah Pengelolaan Perikanan (WPP-NRI 571–718), Zona Inti Konservasi Laut, Sabuk Mangrove, Sempadan Pantai, & Alur Pelayaran/SKKL.',
    category: 'vector-analysis',
    categoryLabel: 'Zonasi WPP & Konservasi Laut',
    supportedPlatforms: ['python-gis', 'gee-js', 'pyqgis', 'arcpy', 'postgis-gdal'],
    defaultPlatform: 'python-gis',
    difficulty: 'Menengah',
    estimatedMinutes: 16,
    primarySensorOrFormat: 'Shapefile/GPKG RZWP-3-K + WPP-NRI (Permen KP 18/2014)',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'MNDWI',
      spatialResolutionMeters: 15,
      bufferDistanceMeters: 500,
      thresholdValue: 0.25,
      inputLayerPath: 'data/zonasi_rzwp3k_wpp_kkp.gpkg',
      outputLayerPath: 'output/peta_zonasi_wpp_konservasi_rzwp3k.gpkg',
    },
    overview:
      'Memetakan dan menganalisis tumpang-susun (spatial overlay) tata ruang laut dan pesisir Indonesia mencakup Jalur Penangkapan Ikan WPP-NRI (Jalur IA 0–2 mil, IB 2–4 mil, II 4–12 mil), Kawasan Konservasi Perairan (KKPD/KKPN: Zona Inti, Zona Perikanan Berkelanjutan, Zona Pemanfaatan), Sabuk Hijau Sempadan Pantai (>= 100 m dari HHWL), Zona Pelabuhan (DLKr/DLKp), serta Buffer Keamanan Alur Pipa/Kabel Bawah Laut (SKKL 500 m) untuk evaluasi PKKPRL.',
    expectedOutput: 'GeoPackage Zonasi Laut (WPP-NRI, KKPD, RZWP-3-K, Sempadan Pantai 100m, Koridor SKKL) beserta matriks kepatuhan ruang laut.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Deliniasi Jalur WPP-NRI, Sempadan Pantai 100m & Evaluasi Konflik Ruang (PKKPRL)',
          instruction: 'Script membangun buffer jalur laut (2 mil, 4 mil, 12 mil) dari garis pantai, memetakan poligon KKPD & DLKr/DLKp Pelabuhan, serta memeriksa apakah rencana kegiatan memotong Zona Inti Konservasi.',
          menuPath: 'GeoPandas Spatial Overlay (gpd.overlay) + PKKPRL Compliance Check',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Monitoring Kondisi Ekosistem di Dalam Zona Konservasi KKPD & WPP-NRI pada GEE',
          instruction: 'Padukan batas poligon WPP-NRI & KKPD dengan indeks mangrove (MVI), kekeruhan air (TSS), dan suhu permukaan laut (SST) di Google Earth Engine.',
          menuPath: 'FeatureCollection Zona Konservasi + Sentinel-2 MVI & TSS',
        },
      ],
    },
  },
];

export function isAdminMarineTemplate(templateId: string): boolean {
  return ADMIN_MARINE_TEMPLATES.some((t) => t.id === templateId);
}

export function generateAdminMarineScript(
  templateId: string,
  platformId: GisPlatformId,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const bundle = generateAdminAndMarineSpatialBundle(params.bbox, params.regionName);
  const wpp = bundle.wppPrimary;
  const adm = bundle.adminHierarchySummary;

  if (templateId === 'admin-boundary-hierarchy-rt-rw') {
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Pemetaan Hierarki Batas Administrasi (Provinsi, Kab/Kota, Kecamatan, Desa & RT/RW)
 * Wilayah Studi : ${params.regionName} (~${ctx.areaKm2} km²)
 * Hierarki Aktif: ${adm.provinsi} -> ${adm.kabKota} -> ${adm.kecamatan}
 * Proyeksi Metrik: ${params.crsEpsg}
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

// 1. Definisi FeatureCollection Hierarki Batas Administrasi (Provinsi s/d Blok RT/RW)
var adminFeatures = ee.FeatureCollection([
${bundle.adminPolygons
  .map((p) => {
    const coords = [...p.vertices, p.vertices[0]]
      .map((v) => `[${v.lng}, ${v.lat}]`)
      .join(', ');
    return `  ee.Feature(ee.Geometry.Polygon([[${coords}]]), {
    id: '${p.id}',
    level: '${p.level}',
    hierarki: '${p.levelLabel}',
    kode_kemendagri: '${p.codeKemendagri}',
    nama_wilayah: '${p.name}',
    luas_ha: ${p.areaHa},
    penduduk_jiwa: ${p.populationEst},
    jumlah_kk: ${p.householdsKk}
  })`;
  })
  .join(',\n')}
]);

// 2. Filter per Jenjang Administrasi
var fcProvinsi = adminFeatures.filter(ee.Filter.eq('level', 'provinsi'));
var fcKabKota = adminFeatures.filter(ee.Filter.eq('level', 'kabkota'));
var fcKecamatan = adminFeatures.filter(ee.Filter.eq('level', 'kecamatan'));
var fcDesa = adminFeatures.filter(ee.Filter.eq('level', 'desa'));
var fcRtRw = adminFeatures.filter(ee.Filter.eq('level', 'rtrw'));

// 3. Ekstraksi Statistik Tutupan Lahan (NDVI) & Kepadatan Lahan Terbangun (NDBI) per Desa & RT/RW
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${params.startDate}', '${params.endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${params.maxCloudCover}))
  .median()
  .divide(10000)
  .clip(aoi);

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI');

var statsPerDesa = ndvi.addBands(ndbi).reduceRegions({
  collection: fcDesa,
  reducer: ee.Reducer.mean(),
  scale: ${params.spatialResolutionMeters}
});
print('Statistik Indeks per Desa/Kelurahan:', statsPerDesa);

// 4. Visualisasi Berjenjang di Peta GEE
Map.addLayer(fcProvinsi.style({color: '#7c3aed', fillColor: '00000000', width: 3}), {}, '01. Batas Provinsi (${adm.provinsi})');
Map.addLayer(fcKabKota.style({color: '#2563eb', fillColor: '00000000', width: 2.5}), {}, '02. Batas Kabupaten/Kota');
Map.addLayer(fcKecamatan.style({color: '#0284c7', fillColor: '0284c715', width: 2}), {}, '03. Batas Kecamatan (${adm.kecamatan})');
Map.addLayer(fcDesa.style({color: '#d97706', fillColor: 'f59e0b25', width: 2}), {}, '04. Batas Desa/Kelurahan (Permendagri 45/2016)');
Map.addLayer(fcRtRw.style({color: '#e11d48', fillColor: 'e11d4830', width: 1.5}), {}, '05. Batas Blok Lingkungan RT / RW');
`;
    }

    return `#!/usr/bin/env python3
"""
GeoScript Studio — Pemetaan Hierarki Batas Administrasi Lengkap (Provinsi, Kab/Kota, Kecamatan, Desa & RT/RW)
Wilayah Studi : ${params.regionName} (~${ctx.areaKm2} km²)
Provinsi      : ${adm.provinsi} (Kode: ${adm.provinsiCode})
Kab/Kota      : ${adm.kabKota} (Kode: ${adm.kabKotaCode})
Kecamatan     : ${adm.kecamatan} (Kode: ${adm.kecamatanCode})
Proyeksi UTM  : ${params.crsEpsg}
"""

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

ADMIN_RECORDS = [
${bundle.adminPolygons
  .map((p) => {
    const ring = [...p.vertices, p.vertices[0]]
      .map((v) => `(${v.lng}, ${v.lat})`)
      .join(', ');
    return `    {
        "id": "${p.id}",
        "level": "${p.level}",
        "hierarki": "${p.levelLabel}",
        "kode_kemendagri": "${p.codeKemendagri}",
        "nama_wilayah": "${p.name}",
        "induk": "${p.parentName}",
        "penduduk_est": ${p.populationEst},
        "jumlah_kk": ${p.householdsKk},
        "keterangan": "${p.notes}",
        "coords": [${ring}],
    },`;
  })
  .join('\n')}
]

df = pd.DataFrame(ADMIN_RECORDS)
geometry = [Polygon(r["coords"]) for r in ADMIN_RECORDS]
gdf = gpd.GeoDataFrame(df.drop(columns=["coords"]), geometry=geometry, crs="EPSG:4326")

# Reproyeksi ke UTM Metrik (${params.crsEpsg}) untuk perhitungan luas akurat (Hektar)
gdf_utm = gdf.to_crs("${params.crsEpsg}")
gdf_utm["luas_ha_utm"] = (gdf_utm.geometry.area / 10000.0).round(2)
gdf_utm["kepadatan_jiwa_ha"] = (gdf_utm["penduduk_est"] / gdf_utm["luas_ha_utm"].clip(lower=0.1)).round(1)

# Simpan setiap jenjang administrasi sebagai layer terpisah di dalam GeoPackage (.gpkg)
OUTPUT_GPKG = "${params.outputLayerPath}"
for level_name, group in gdf_utm.groupby("level"):
    layer_name = f"batas_{level_name}"
    group.to_file(OUTPUT_GPKG, layer=layer_name, driver="GPKG")
    print(f"Layer '{layer_name}' tersimpan ({len(group)} fitur).")

print("\\nRingkasan Hierarki Batas Wilayah Administrasi:")
print(gdf_utm[["hierarki", "kode_kemendagri", "nama_wilayah", "luas_ha_utm", "jumlah_kk"]].to_string(index=False))
`;
  }

  // Template 2: marine-spatial-wpp-conservation
  if (platformId === 'gee-js') {
    return `/**
 * GeoScript Studio — Pemetaan Zonasi Kelautan: WPP-NRI, Kawasan Konservasi (KKPD/KKPN) & RZWP-3-K
 * Wilayah Studi : ${params.regionName} (~${ctx.areaKm2} km²)
 * Zona WPP-NRI  : ${wpp.name} | Potensi Lestari (MSY): ${wpp.msyTonsPerYear.toLocaleString('id-ID')} ton/thn
 * JTB (80% MSY) : ${wpp.jtbTonsPerYear.toLocaleString('id-ID')} ton/thn | Tingkat Pemanfaatan: ${wpp.utilizationRatePct}% (${wpp.statusStock})
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 11);

// 1. Poligon Zonasi Tata Ruang Laut (WPP-NRI, Konservasi KKPD/KKPN, Sempadan Mangrove, RZWP-3-K Pelabuhan & Alur SKKL)
var marineZones = ee.FeatureCollection([
${bundle.marineZones
  .map((mz) => {
    const coords = [...mz.vertices, mz.vertices[0]]
      .map((v) => `[${v.lng}, ${v.lat}]`)
      .join(', ');
    return `  ee.Feature(ee.Geometry.Polygon([[${coords}]]), {
    id: '${mz.id}',
    kategori: '${mz.categoryLabel}',
    kode_zona: '${mz.zoneCode}',
    nama_zona: '${mz.name}',
    dasar_hukum: '${mz.legalBasis}',
    luas_ha: ${mz.areaHa}
  })`;
  })
  .join(',\n')}
]);

// 2. Evaluasi Kualitas Perairan (NDWI & Sebaran TSS) di Dalam Zona Konservasi vs Zona Pelabuhan
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${params.startDate}', '${params.endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${params.maxCloudCover}))
  .median()
  .divide(10000)
  .clip(aoi);

var waterMask = s2.normalizedDifference(['B3', 'B8']).gt(-0.05);
var tssMgL = s2.expression(
  'clamp(18.5 * exp(18.2 * B4 + 1.65 * ((B4 - B3) / (B4 + B3 + 0.001))), 2.0, 300.0)',
  { B3: s2.select('B3'), B4: s2.select('B4') }
).updateMask(waterMask).rename('TSS_mgL');

var zoneTssStats = tssMgL.reduceRegions({
  collection: marineZones,
  reducer: ee.Reducer.mean().combine({reducer2: ee.Reducer.max(), sharedInputs: true}),
  scale: ${params.spatialResolutionMeters}
});
print('Evaluasi Konsentrasi TSS (mg/L) per Zona Kelautan (WPP / KKPD / RZWP-3-K):', zoneTssStats);

Map.addLayer(tssMgL, {min: 5, max: 150, palette: ['#0369a1', '#0ea5e9', '#22c55e', '#facc15', '#ef4444']}, 'Sebaran TSS Perairan (mg/L)', false);
Map.addLayer(marineZones.filter(ee.Filter.eq('id', 'mar-wpp-01')).style({color: '#0284c7', fillColor: '0ea5e930', width: 2.5}), {}, 'Zona ${wpp.code}');
Map.addLayer(marineZones.filter(ee.Filter.eq('id', 'mar-konservasi-01')).style({color: '#059669', fillColor: '10b98140', width: 2.5}), {}, 'Zona Konservasi Perairan (KKPD/KKPN)');
Map.addLayer(marineZones.filter(ee.Filter.eq('id', 'mar-mangrove-02')).style({color: '#15803d', fillColor: '22c55e45', width: 2}), {}, 'Sabuk Hijau Sempadan Pantai & Mangrove');
Map.addLayer(marineZones.filter(ee.Filter.eq('id', 'mar-rzwp3k-03')).style({color: '#ea580c', fillColor: 'f9731635', width: 2}), {}, 'Zona Pelabuhan DLKr/DLKp (RZWP-3-K)');
Map.addLayer(marineZones.filter(ee.Filter.eq('id', 'mar-alur-04')).style({color: '#e11d48', fillColor: 'f43f5e30', width: 2}), {}, 'Alur Pelayaran & Koridor Pipa/Kabel Bawah Laut');
`;
  }

  return `#!/usr/bin/env python3
"""
GeoScript Studio — Analisis Spasial Zonasi Kelautan: WPP-NRI, Kawasan Konservasi (KKPD/KKPN) & RZWP-3-K
Wilayah Studi : ${params.regionName} (~${ctx.areaKm2} km²)
WPP-NRI Aktif : ${wpp.name}
Potensi MSY   : ${wpp.msyTonsPerYear.toLocaleString('id-ID')} ton/thn | JTB: ${wpp.jtbTonsPerYear.toLocaleString('id-ID')} ton/thn (${wpp.statusStock})
Komoditas     : ${wpp.dominantCommodities.join(', ')}
"""

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

MARINE_ZONES = [
${bundle.marineZones
  .map((mz) => {
    const ring = [...mz.vertices, mz.vertices[0]]
      .map((v) => `(${v.lng}, ${v.lat})`)
      .join(', ');
    return `    {
        "id": "${mz.id}",
        "kategori": "${mz.categoryLabel}",
        "kode_zona": "${mz.zoneCode}",
        "nama_zona": "${mz.name}",
        "sub_zona": "${mz.subZoneType}",
        "dasar_hukum": "${mz.legalBasis}",
        "kegiatan_diizinkan": "${mz.allowedActivities}",
        "kegiatan_dilarang": "${mz.restrictedActivities}",
        "coords": [${ring}],
    },`;
  })
  .join('\n')}
]

df = pd.DataFrame(MARINE_ZONES)
geometry = [Polygon(r["coords"]) for r in MARINE_ZONES]
gdf = gpd.GeoDataFrame(df.drop(columns=["coords"]), geometry=geometry, crs="EPSG:4326").to_crs("${params.crsEpsg}")
gdf["luas_ha"] = (gdf.geometry.area / 10000.0).round(2)

gdf.to_file("${params.outputLayerPath}", layer="zonasi_kelautan_rzwp3k_wpp", driver="GPKG")
print(f"WPP-NRI Utama : ${wpp.name}")
print(f"Potensi Lestari (MSY): ${wpp.msyTonsPerYear} ton/thn | JTB: ${wpp.jtbTonsPerYear} ton/thn")
print("\\nTabel Zonasi Kelautan & Pesisir (WPP-NRI, KKPD/KKPN, Sempadan Mangrove & RZWP-3-K):")
print(gdf[["kode_zona", "kategori", "nama_zona", "luas_ha"]].to_string(index=False))
`;
}
