import {
  generateAgisoftMetashapeScript,
  generateLandCoverScript,
  generatePix4dScript,
  generateShorelineSlopeScript,
  generateTidalScript,
} from './gisExtendedGenerators';
import {
  COASTAL_HYDRO_TEMPLATES,
  generateCoastalHydroScript,
  isCoastalHydroTemplate,
} from './coastalHydroEngine';
import {
  ADMIN_MARINE_TEMPLATES,
  generateAdminMarineScript,
  isAdminMarineTemplate,
} from './adminAndMarineZonesEngine';

export type GisPlatformId =
  | 'gee-js'
  | 'gee-py'
  | 'python-gis'
  | 'pyqgis'
  | 'arcpy'
  | 'postgis-gdal'
  | 'swan'
  | 'agisoft-py'
  | 'pix4d-cli';

export type WorkflowCategoryId =
  | 'all'
  | 'remote-sensing'
  | 'vector-analysis'
  | 'hydrology-terrain'
  | 'cartography-automation'
  | 'spatial-database';

export type SatelliteSensorId = 'S2_SR' | 'LANDSAT_8_9' | 'SENTINEL_1_SAR' | 'MODIS_TERRA';

export type SpectralIndexId =
  | 'NDVI'
  | 'NDWI'
  | 'NDBI'
  | 'EVI'
  | 'SAVI'
  | 'MNDWI'
  | 'NBR'
  | 'BSI'
  | 'NDMI'
  | 'AWEI'
  | 'MVI'
  | 'NDBaI';

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface LatLngVertex {
  lat: number;
  lng: number;
}

export interface SpatialFileSummary {
  fileName: string;
  formatLabel: 'GeoJSON' | 'KML' | 'CSV Koordinat' | 'WKT Geometry';
  featureCount: number;
  geometryType: string;
  attributeColumns: string[];
  bbox: BoundingBox;
  vertices: LatLngVertex[];
  recommendedEpsg: string;
  sampleRows: Record<string, string | number>[];
}

export interface RegionPreset {
  id: string;
  name: string;
  province: string;
  bbox: BoundingBox;
  recommendedEpsg: string;
  utmZoneLabel: string;
  description: string;
}

export interface ScriptParameters {
  regionName: string;
  bbox: BoundingBox;
  crsEpsg: string;
  startDate: string;
  endDate: string;
  maxCloudCover: number;
  sensor: SatelliteSensorId;
  spectralIndex: SpectralIndexId;
  bufferDistanceMeters: number;
  inputLayerPath: string;
  outputLayerPath: string;
  spatialResolutionMeters: number;
  thresholdValue: number;
  includeVisualization: boolean;
  includeExport: boolean;
  pipelineSteps: string[];
  customPolygon?: LatLngVertex[];
  uploadedFileSummary?: SpatialFileSummary | null;
}

export interface TutorialStep {
  stepNumber: number;
  title: string;
  instruction: string;
  menuPath?: string;
  proTip?: string;
}

export interface GisTemplate {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<WorkflowCategoryId, 'all'>;
  categoryLabel: string;
  supportedPlatforms: GisPlatformId[];
  defaultPlatform: GisPlatformId;
  difficulty: 'Pemula' | 'Menengah' | 'Lanjutan';
  estimatedMinutes: number;
  primarySensorOrFormat: string;
  defaultParams: Partial<ScriptParameters>;
  overview: string;
  expectedOutput: string;
  tutorialsByPlatform: Partial<Record<GisPlatformId, TutorialStep[]>>;
}

export interface SpectralIndexDefinition {
  id: SpectralIndexId;
  name: string;
  indonesianName: string;
  purpose: string;
  generalFormula: string;
  bandsBySensor: Record<
    SatelliteSensorId,
    {
      expression: string;
      geeBands: [string, string];
      bandDescription: string;
    }
  >;
  typicalRange: string;
  thresholdGuide: string;
  paletteHex: string[];
}

export const PLATFORM_DEFINITIONS: {
  id: GisPlatformId;
  label: string;
  shortLabel: string;
  language: string;
  fileExtension: string;
  environment: string;
}[] = [
  {
    id: 'gee-js',
    label: 'Google Earth Engine (JavaScript)',
    shortLabel: 'GEE JavaScript',
    language: 'javascript',
    fileExtension: '.js',
    environment: 'code.earthengine.google.com',
  },
  {
    id: 'python-gis',
    label: 'Python (GeoPandas & Rasterio)',
    shortLabel: 'Python Spasial',
    language: 'python',
    fileExtension: '.py',
    environment: 'JupyterLab / Conda env (geopandas, rasterio, rioxarray)',
  },
  {
    id: 'pyqgis',
    label: 'QGIS (PyQGIS & Processing)',
    shortLabel: 'PyQGIS + Tutorial QGIS',
    language: 'python',
    fileExtension: '.py',
    environment: 'QGIS 3.34+ Python Console / Processing Script Runner',
  },
  {
    id: 'arcpy',
    label: 'ArcGIS Pro (ArcPy & ModelBuilder)',
    shortLabel: 'ArcGIS (ArcPy)',
    language: 'python',
    fileExtension: '.py',
    environment: 'ArcGIS Pro 3.x Python Notebook / Geoprocessing Toolbox',
  },
  {
    id: 'gee-py',
    label: 'Google Earth Engine (Python API / geemap)',
    shortLabel: 'GEE Python (geemap)',
    language: 'python',
    fileExtension: '.py',
    environment: 'Google Colab / Jupyter (earthengine-api, geemap)',
  },
  {
    id: 'postgis-gdal',
    label: 'PostGIS SQL & GDAL/OGR CLI',
    shortLabel: 'PostGIS & GDAL',
    language: 'sql',
    fileExtension: '.sql',
    environment: 'PostgreSQL 16 + PostGIS 3.4 / OSGeo4W Shell',
  },
  {
    id: 'swan',
    label: 'SWAN Wave Model (Simulating WAves Nearshore)',
    shortLabel: 'SWAN (.swn)',
    language: 'swan',
    fileExtension: '.swn',
    environment: 'SWAN 41.45+ CLI (swanrun / swan.exe) + Batimetri (.bot) & Angin (.wnd)',
  },
  {
    id: 'agisoft-py',
    label: 'Agisoft Metashape Pro (Python API)',
    shortLabel: 'Agisoft Metashape',
    language: 'python',
    fileExtension: '.py',
    environment: 'Agisoft Metashape Professional 2.x (Tools -> Run Script / metashape.sh)',
  },
  {
    id: 'pix4d-cli',
    label: 'Pix4Dmapper / Pix4Dengine (Python + CLI)',
    shortLabel: 'Pix4Dmapper CLI',
    language: 'python',
    fileExtension: '.py',
    environment: 'Pix4Dmapper Batch CLI (pix4dmapper.exe) + GDAL Cloud-Optimized GeoTIFF',
  },
];

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'jabodetabek',
    name: 'Kawasan Metropolitan Jabodetabek',
    province: 'DKI Jakarta, Jawa Barat, Banten',
    bbox: { minLon: 106.55, minLat: -6.65, maxLon: 107.15, maxLat: -6.08 },
    recommendedEpsg: 'EPSG:32748',
    utmZoneLabel: 'WGS 84 / UTM Zone 48S',
    description: 'Analisis urban heat island (UHI), perubahan tutupan lahan terbangun, dan banjir perkotaan.',
  },
  {
    id: 'ikn-nusantara',
    name: 'Ibu Kota Nusantara (IKN) & Teluk Balikpapan',
    province: 'Kalimantan Timur',
    bbox: { minLon: 116.62, minLat: -1.18, maxLon: 117.12, maxLat: -0.78 },
    recommendedEpsg: 'EPSG:32750',
    utmZoneLabel: 'WGS 84 / UTM Zone 50S',
    description: 'Pemantauan pembukaan lahan, kerapatan tajuk hutan hujan tropis, dan ekosistem mangrove.',
  },
  {
    id: 'das-citarum',
    name: 'DAS Citarum Hulu (Cekungan Bandung)',
    province: 'Jawa Barat',
    bbox: { minLon: 107.42, minLat: -7.22, maxLon: 107.92, maxLat: -6.82 },
    recommendedEpsg: 'EPSG:32748',
    utmZoneLabel: 'WGS 84 / UTM Zone 48S',
    description: 'Pemodelan hidrologi, kemiringan lereng DEMNAS/SRTM, erosi lahan, dan genangan banjir.',
  },
  {
    id: 'bali-selatan',
    name: 'Bali Selatan & Kawasan Subak Gianyar',
    province: 'Bali',
    bbox: { minLon: 115.08, minLat: -8.84, maxLon: 115.42, maxLat: -8.42 },
    recommendedEpsg: 'EPSG:32750',
    utmZoneLabel: 'WGS 84 / UTM Zone 50S',
    description: 'Klasifikasi fase tumbuh padi sawah, indeks kelembaban air (NDWI), dan tata ruang pesisir.',
  },
  {
    id: 'gambut-riau',
    name: 'Kesatuan Hidrologis Gambut (KHG) Siak-Kampar',
    province: 'Riau',
    bbox: { minLon: 101.65, minLat: 0.25, maxLon: 102.45, maxLat: 0.95 },
    recommendedEpsg: 'EPSG:32647',
    utmZoneLabel: 'WGS 84 / UTM Zone 47N',
    description: 'Deteksi kerentanan kebakaran hutan dan lahan (NBR), kebasahan gambut, dan restorasi kanal.',
  },
  {
    id: 'pegunungan-jayawijaya',
    name: 'Lembah Baliem & Pegunungan Tengah',
    province: 'Papua Pegunungan',
    bbox: { minLon: 138.75, minLat: -4.25, maxLon: 139.25, maxLat: -3.85 },
    recommendedEpsg: 'EPSG:32754',
    utmZoneLabel: 'WGS 84 / UTM Zone 54S',
    description: 'Koreksi topografi citra satelit, pemetaan geomorfologi, dan pembukaan aksesibilitas wilayah.',
  },
  {
    id: 'pantura-demak',
    name: 'Pesisir Demak–Semarang (Garis Pantai)',
    province: 'Jawa Tengah',
    bbox: { minLon: 110.35, minLat: -7.02, maxLon: 110.68, maxLat: -6.78 },
    recommendedEpsg: 'EPSG:32749',
    utmZoneLabel: 'WGS 84 / UTM Zone 49S',
    description: 'Analisis kemiringan garis pantai, abrasi pesisir Pantura, rob, dan restorasi sabuk pantai.',
  },
  {
    id: 'segara-anakan',
    name: 'Segara Anakan & Pesisir Cilacap',
    province: 'Jawa Tengah',
    bbox: { minLon: 108.75, minLat: -7.78, maxLon: 109.08, maxLat: -7.62 },
    recommendedEpsg: 'EPSG:32749',
    utmZoneLabel: 'WGS 84 / UTM Zone 49S',
    description: 'Pemetaan indeks mangrove (MVI), sedimentasi estuari, dan tutupan lahan pesisir selatan.',
  },
];

export const SPECTRAL_INDEX_DEFINITIONS: SpectralIndexDefinition[] = [
  {
    id: 'NDVI',
    name: 'Normalized Difference Vegetation Index',
    indonesianName: 'Indeks Kerapatan Vegetasi (NDVI)',
    purpose: 'Mengukur kehijauan, biomassa, dan kesehatan tajuk vegetasi.',
    generalFormula: '(NIR - Red) / (NIR + Red)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B8 - B4) / (B8 + B4)',
        geeBands: ['B8', 'B4'],
        bandDescription: 'Band 8 (NIR 842nm, 10m) & Band 4 (Red 665nm, 10m)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B5 - SR_B4) / (SR_B5 + SR_B4)',
        geeBands: ['SR_B5', 'SR_B4'],
        bandDescription: 'Band 5 (NIR 865nm, 30m) & Band 4 (Red 655nm, 30m)',
      },
      SENTINEL_1_SAR: {
        expression: '(4 * VH) / (VV + VH)',
        geeBands: ['VH', 'VV'],
        bandDescription: 'Radar Vegetation Index (RVI) pendekatan polarisasi VH & VV',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b02 - sur_refl_b01) / (sur_refl_b02 + sur_refl_b01)',
        geeBands: ['sur_refl_b02', 'sur_refl_b01'],
        bandDescription: 'Band 2 (NIR 250m) & Band 1 (Red 250m)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '< 0.1 Lahan Terbuka/Air · 0.2–0.4 Semak/Pertanian · > 0.5 Hutan Rapat',
    paletteHex: ['#d73027', '#fdae61', '#ffffbf', '#a6d96a', '#1a9850'],
  },
  {
    id: 'NDWI',
    name: 'Normalized Difference Water Index',
    indonesianName: 'Indeks Badan Air & Kelembaban (NDWI)',
    purpose: 'Deliniasi batas badan air permukaan, danau, sungai, dan genangan banjir.',
    generalFormula: '(Green - NIR) / (Green + NIR)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B3 - B8) / (B3 + B8)',
        geeBands: ['B3', 'B8'],
        bandDescription: 'Band 3 (Green 560nm, 10m) & Band 8 (NIR 842nm, 10m)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B3 - SR_B5) / (SR_B3 + SR_B5)',
        geeBands: ['SR_B3', 'SR_B5'],
        bandDescription: 'Band 3 (Green 560nm, 30m) & Band 5 (NIR 865nm, 30m)',
      },
      SENTINEL_1_SAR: {
        expression: 'VV < -16 dB (Backscatter Threshold)',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Hamburan balik specular air tenang pada polarisasi VV',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b04 - sur_refl_b02) / (sur_refl_b04 + sur_refl_b02)',
        geeBands: ['sur_refl_b04', 'sur_refl_b02'],
        bandDescription: 'Band 4 (Green 500m) & Band 2 (NIR 250m)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.0 hingga > 0.2 mengindikasikan permukaan air terbuka atau lahan tergenang',
    paletteHex: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
  },
  {
    id: 'NDBI',
    name: 'Normalized Difference Built-Up Index',
    indonesianName: 'Indeks Kerapatan Lahan Terbangun (NDBI)',
    purpose: 'Identifikasi area permukiman, kawasan industri, dan ekspansi perkotaan.',
    generalFormula: '(SWIR1 - NIR) / (SWIR1 + NIR)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B11 - B8) / (B11 + B8)',
        geeBands: ['B11', 'B8'],
        bandDescription: 'Band 11 (SWIR1 1610nm, 20m) & Band 8 (NIR 842nm, 10m)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B6 - SR_B5) / (SR_B6 + SR_B5)',
        geeBands: ['SR_B6', 'SR_B5'],
        bandDescription: 'Band 6 (SWIR1 1610nm, 30m) & Band 5 (NIR 865nm, 30m)',
      },
      SENTINEL_1_SAR: {
        expression: '(VV - VH) / (VV + VH)',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Double-bounce pantulan bangunan perkotaan pada VV',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b06 - sur_refl_b02) / (sur_refl_b06 + sur_refl_b02)',
        geeBands: ['sur_refl_b06', 'sur_refl_b02'],
        bandDescription: 'Band 6 (SWIR 500m) & Band 2 (NIR 250m)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.05 umumnya berasosiasi dengan permukaan kedap air (atap/beton/aspal)',
    paletteHex: ['#f7f7f7', '#cccccc', '#fdae61', '#f46d43', '#a50026'],
  },
  {
    id: 'EVI',
    name: 'Enhanced Vegetation Index',
    indonesianName: 'Indeks Vegetasi Terkoreksi Atmosfer (EVI)',
    purpose: 'Mengurangi saturasi pada hutan hujan tropis lebat dan koreksi latar tanah/aerosol.',
    generalFormula: '2.5 * ((NIR - Red) / (NIR + 6 * Red - 7.5 * Blue + 1))',
    bandsBySensor: {
      S2_SR: {
        expression: '2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))',
        geeBands: ['B8', 'B4'],
        bandDescription: 'Band 8 (NIR), Band 4 (Red), & Band 2 (Blue)',
      },
      LANDSAT_8_9: {
        expression: '2.5 * ((SR_B5 - SR_B4) / (SR_B5 + 6 * SR_B4 - 7.5 * SR_B2 + 1))',
        geeBands: ['SR_B5', 'SR_B4'],
        bandDescription: 'Band 5 (NIR), Band 4 (Red), & Band 2 (Blue)',
      },
      SENTINEL_1_SAR: {
        expression: '(4 * VH) / (VV + VH)',
        geeBands: ['VH', 'VV'],
        bandDescription: 'RVI SAR fallback untuk kanopi tertutup awan',
      },
      MODIS_TERRA: {
        expression: '2.5 * ((sur_refl_b02 - sur_refl_b01) / (sur_refl_b02 + 6 * sur_refl_b01 - 7.5 * sur_refl_b03 + 1))',
        geeBands: ['sur_refl_b02', 'sur_refl_b01'],
        bandDescription: 'Band 2 (NIR), Band 1 (Red), Band 3 (Blue)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '0.2–0.8 untuk vegetasi sehat tanpa saturasi pada biomassa tinggi',
    paletteHex: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'],
  },
  {
    id: 'SAVI',
    name: 'Soil Adjusted Vegetation Index',
    indonesianName: 'Indeks Vegetasi Terkoreksi Latar Tanah (SAVI)',
    purpose: 'Optimal untuk area pertanian awal tanam, lahan kering, atau kerapatan tajuk jarang (L = 0.5).',
    generalFormula: '((NIR - Red) / (NIR + Red + 0.5)) * 1.5',
    bandsBySensor: {
      S2_SR: {
        expression: '((B8 - B4) / (B8 + B4 + 0.5)) * 1.5',
        geeBands: ['B8', 'B4'],
        bandDescription: 'Band 8 (NIR) & Band 4 (Red) dengan faktor koreksi tanah L=0.5',
      },
      LANDSAT_8_9: {
        expression: '((SR_B5 - SR_B4) / (SR_B5 + SR_B4 + 0.5)) * 1.5',
        geeBands: ['SR_B5', 'SR_B4'],
        bandDescription: 'Band 5 (NIR) & Band 4 (Red) dengan L=0.5',
      },
      SENTINEL_1_SAR: {
        expression: '(VH - VV) / (VH + VV)',
        geeBands: ['VH', 'VV'],
        bandDescription: 'Rasio depolarisasi kelembaban tanah/vegetasi jarang',
      },
      MODIS_TERRA: {
        expression: '((sur_refl_b02 - sur_refl_b01) / (sur_refl_b02 + sur_refl_b01 + 0.5)) * 1.5',
        geeBands: ['sur_refl_b02', 'sur_refl_b01'],
        bandDescription: 'Band 2 (NIR) & Band 1 (Red) dengan L=0.5',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.25 menandakan pertumbuhan tanaman muda di atas tanah terbuka',
    paletteHex: ['#f6e8c3', '#d8b365', '#c7eae5', '#5ab4ac', '#01665e'],
  },
  {
    id: 'MNDWI',
    name: 'Modified Normalized Difference Water Index',
    indonesianName: 'Indeks Air Termodifikasi Perkotaan (MNDWI)',
    purpose: 'Memisahkan badan air dari bayangan gedung dan lahan terbangun secara akurat menggunakan SWIR.',
    generalFormula: '(Green - SWIR1) / (Green + SWIR1)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B3 - B11) / (B3 + B11)',
        geeBands: ['B3', 'B11'],
        bandDescription: 'Band 3 (Green 10m) & Band 11 (SWIR1 20m)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B3 - SR_B6) / (SR_B3 + SR_B6)',
        geeBands: ['SR_B3', 'SR_B6'],
        bandDescription: 'Band 3 (Green 30m) & Band 6 (SWIR1 30m)',
      },
      SENTINEL_1_SAR: {
        expression: 'VV < -17 dB',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Deteksi air bebas awan dengan ambang batas dB SAR',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b04 - sur_refl_b06) / (sur_refl_b04 + sur_refl_b06)',
        geeBands: ['sur_refl_b04', 'sur_refl_b06'],
        bandDescription: 'Band 4 (Green) & Band 6 (SWIR)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.1 memisahkan badan air dari noise bangunan perkotaan',
    paletteHex: ['#fff7fb', '#d0d1e6', '#74a9cf', '#0570b0', '#023858'],
  },
  {
    id: 'NBR',
    name: 'Normalized Burn Ratio',
    indonesianName: 'Indeks Area Terbakar & Karhutla (NBR)',
    purpose: 'Memetakan tingkat keparahan kebakaran hutan/lahan (dNBR) menggunakan reflektansi NIR dan SWIR2.',
    generalFormula: '(NIR - SWIR2) / (NIR + SWIR2)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B8 - B12) / (B8 + B12)',
        geeBands: ['B8', 'B12'],
        bandDescription: 'Band 8 (NIR 842nm) & Band 12 (SWIR2 2190nm)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B5 - SR_B7) / (SR_B5 + SR_B7)',
        geeBands: ['SR_B5', 'SR_B7'],
        bandDescription: 'Band 5 (NIR 865nm) & Band 7 (SWIR2 2200nm)',
      },
      SENTINEL_1_SAR: {
        expression: 'VH_post - VH_pre',
        geeBands: ['VH', 'VV'],
        bandDescription: 'Penurunan hamburan volumetrik tajuk pasca-kebakaran',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b02 - sur_refl_b07) / (sur_refl_b02 + sur_refl_b07)',
        geeBands: ['sur_refl_b02', 'sur_refl_b07'],
        bandDescription: 'Band 2 (NIR) & Band 7 (SWIR2)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: 'Nilai NBR negatif tajam (< -0.25) menandakan bekas luka bakar baru (burn scar)',
    paletteHex: ['#2b0000', '#a50026', '#f46d43', '#fee08b', '#66bd63'],
  },
  {
    id: 'BSI',
    name: 'Bare Soil Index',
    indonesianName: 'Indeks Lahan Terbuka & Tanah Kosong (BSI)',
    purpose: 'Memisahkan tanah kosong, pasir pantai, dan pembukaan lahan baru dari vegetasi dan badan air.',
    generalFormula: '((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))',
    bandsBySensor: {
      S2_SR: {
        expression: '((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))',
        geeBands: ['B11', 'B8'],
        bandDescription: 'Band 11 (SWIR1), Band 4 (Red), Band 8 (NIR), & Band 2 (Blue)',
      },
      LANDSAT_8_9: {
        expression: '((SR_B6 + SR_B4) - (SR_B5 + SR_B2)) / ((SR_B6 + SR_B4) + (SR_B5 + SR_B2))',
        geeBands: ['SR_B6', 'SR_B5'],
        bandDescription: 'Band 6 (SWIR1), Band 4 (Red), Band 5 (NIR), & Band 2 (Blue)',
      },
      SENTINEL_1_SAR: {
        expression: '(VV - VH) / (VV + VH)',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Rasio hamburan permukaan datar/tanah terbuka',
      },
      MODIS_TERRA: {
        expression: '((sur_refl_b06 + sur_refl_b01) - (sur_refl_b02 + sur_refl_b03)) / ((sur_refl_b06 + sur_refl_b01) + (sur_refl_b02 + sur_refl_b03))',
        geeBands: ['sur_refl_b06', 'sur_refl_b02'],
        bandDescription: 'Band 6 (SWIR1), Band 1 (Red), Band 2 (NIR), Band 3 (Blue)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.05 menandakan lahan terbuka, tanah gundul, pasir pantai, atau tambang',
    paletteHex: ['#1a9850', '#a6d96a', '#ffffbf', '#e08214', '#8c510a'],
  },
  {
    id: 'NDMI',
    name: 'Normalized Difference Moisture Index',
    indonesianName: 'Indeks Kelembaban Tajuk & Lahan (NDMI)',
    purpose: 'Mendeteksi kadar air vegetasi, stres kekeringan tanaman, serta kebasahan lahan gambut.',
    generalFormula: '(NIR - SWIR1) / (NIR + SWIR1)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B8 - B11) / (B8 + B11)',
        geeBands: ['B8', 'B11'],
        bandDescription: 'Band 8 (NIR 10m) & Band 11 (SWIR1 20m)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B5 - SR_B6) / (SR_B5 + SR_B6)',
        geeBands: ['SR_B5', 'SR_B6'],
        bandDescription: 'Band 5 (NIR 30m) & Band 6 (SWIR1 30m)',
      },
      SENTINEL_1_SAR: {
        expression: '(VH - VV) / (VH + VV)',
        geeBands: ['VH', 'VV'],
        bandDescription: 'Sensitivitas dielektrik kelembaban kanopi/tanah SAR',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b02 - sur_refl_b06) / (sur_refl_b02 + sur_refl_b06)',
        geeBands: ['sur_refl_b02', 'sur_refl_b06'],
        bandDescription: 'Band 2 (NIR) & Band 6 (SWIR1)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.2 vegetasi lembab sehat · < -0.1 stres kekeringan atau lahan kering',
    paletteHex: ['#a50026', '#fdae61', '#ffffbf', '#74add1', '#313695'],
  },
  {
    id: 'AWEI',
    name: 'Automated Water Extraction Index',
    indonesianName: 'Indeks Ekstraksi Garis Pantai & Air Akurat (AWEI)',
    purpose: 'Ekstraksi garis pantai (shoreline) dan badan air dengan penekanan bayangan gedung/bukit.',
    generalFormula: '4 * (Green - SWIR1) - (0.25 * NIR + 2.75 * SWIR2)',
    bandsBySensor: {
      S2_SR: {
        expression: '4 * (B3 - B11) - (0.25 * B8 + 2.75 * B12)',
        geeBands: ['B3', 'B11'],
        bandDescription: 'Band 3 (Green), Band 11 (SWIR1), Band 8 (NIR), & Band 12 (SWIR2)',
      },
      LANDSAT_8_9: {
        expression: '4 * (SR_B3 - SR_B6) - (0.25 * SR_B5 + 2.75 * SR_B7)',
        geeBands: ['SR_B3', 'SR_B6'],
        bandDescription: 'Band 3 (Green), Band 6 (SWIR1), Band 5 (NIR), & Band 7 (SWIR2)',
      },
      SENTINEL_1_SAR: {
        expression: 'VV < -16.5 dB',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Batas darat–laut berbasis ambang backscatter SAR VV',
      },
      MODIS_TERRA: {
        expression: '4 * (sur_refl_b04 - sur_refl_b06) - (0.25 * sur_refl_b02 + 2.75 * sur_refl_b07)',
        geeBands: ['sur_refl_b04', 'sur_refl_b06'],
        bandDescription: 'Band 4 (Green), Band 6 (SWIR1), Band 2 (NIR), & Band 7 (SWIR2)',
      },
    },
    typicalRange: '-2.5 hingga +1.5',
    thresholdGuide: '> 0.0 memisahkan piksel laut/air dan daratan secara tajam untuk vektorisasi garis pantai',
    paletteHex: ['#f4e3c1', '#cbd5e1', '#67e8f9', '#0284c7', '#0c4a6e'],
  },
  {
    id: 'MVI',
    name: 'Mangrove Vegetation Index',
    indonesianName: 'Indeks Tutupan Mangrove Pesisir (MVI)',
    purpose: 'Mengisolasi ekosistem mangrove dari vegetasi daratan non-mangrove dan tambak pesisir.',
    generalFormula: '(NIR - Green) / (SWIR1 - Green)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B8 - B3) / (B11 - B3)',
        geeBands: ['B8', 'B11'],
        bandDescription: 'Band 8 (NIR 842nm), Band 3 (Green 560nm), & Band 11 (SWIR1 1610nm)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B5 - SR_B3) / (SR_B6 - SR_B3)',
        geeBands: ['SR_B5', 'SR_B6'],
        bandDescription: 'Band 5 (NIR), Band 3 (Green), & Band 6 (SWIR1)',
      },
      SENTINEL_1_SAR: {
        expression: '(4 * VH) / (VV + VH)',
        geeBands: ['VH', 'VV'],
        bandDescription: 'RVI struktur kanopi mangrove zona intertidal',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b02 - sur_refl_b04) / (sur_refl_b06 - sur_refl_b04)',
        geeBands: ['sur_refl_b02', 'sur_refl_b06'],
        bandDescription: 'Band 2 (NIR), Band 4 (Green), & Band 6 (SWIR1)',
      },
    },
    typicalRange: '0.0 hingga +20.0 (Ambang 4.0–15.0)',
    thresholdGuide: 'Nilai MVI antara 4.0 hingga 18.0 efektif mengisolasi tegakan mangrove pesisir (Baloloy et al.)',
    paletteHex: ['#fef9c3', '#bef264', '#4ade80', '#0d9488', '#064e3b'],
  },
  {
    id: 'NDBaI',
    name: 'Normalized Difference Bareness Index',
    indonesianName: 'Indeks Tanah Kering & Lahan Kritis (NDBaI)',
    purpose: 'Mengidentifikasi zona tanah terbuka kering, lahan kritis, dan area galian/tambang.',
    generalFormula: '(SWIR1 - SWIR2) / (SWIR1 + SWIR2)',
    bandsBySensor: {
      S2_SR: {
        expression: '(B11 - B12) / (B11 + B12)',
        geeBands: ['B11', 'B12'],
        bandDescription: 'Band 11 (SWIR1 1610nm) & Band 12 (SWIR2 2190nm)',
      },
      LANDSAT_8_9: {
        expression: '(SR_B6 - SR_B7) / (SR_B6 + SR_B7)',
        geeBands: ['SR_B6', 'SR_B7'],
        bandDescription: 'Band 6 (SWIR1 1610nm) & Band 7 (SWIR2 2200nm)',
      },
      SENTINEL_1_SAR: {
        expression: '(VV - VH) / (VV + VH)',
        geeBands: ['VV', 'VH'],
        bandDescription: 'Kontras permukaan keras/gersang pada polarisasi VV',
      },
      MODIS_TERRA: {
        expression: '(sur_refl_b06 - sur_refl_b07) / (sur_refl_b06 + sur_refl_b07)',
        geeBands: ['sur_refl_b06', 'sur_refl_b07'],
        bandDescription: 'Band 6 (SWIR1) & Band 7 (SWIR2)',
      },
    },
    typicalRange: '-1.0 hingga +1.0',
    thresholdGuide: '> 0.08 mengindikasikan tanah terbuka kering atau material galian berbatu',
    paletteHex: ['#e2e8f0', '#fde68a', '#f59e0b', '#b45309', '#78350f'],
  },
];

export const GIS_TEMPLATES: GisTemplate[] = [
  {
    id: 'spectral-vegetation-monitoring',
    title: 'Analisis Indeks Spektral & Cloud Masking Multi-Sensor',
    subtitle: 'Perhitungan NDVI, NDWI, NDBI, EVI, SAVI, atau NBR dengan pembersihan awan otomatis dan ekspor GeoTIFF.',
    category: 'remote-sensing',
    categoryLabel: 'Penginderaan Jauh',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'gee-py', 'postgis-gdal', 'swan'],
    defaultPlatform: 'gee-js',
    difficulty: 'Pemula',
    estimatedMinutes: 10,
    primarySensorOrFormat: 'Sentinel-2 L2A / Landsat 8-9',
    defaultParams: {
      spectralIndex: 'NDVI',
      sensor: 'S2_SR',
      maxCloudCover: 20,
      spatialResolutionMeters: 10,
      thresholdValue: 0.35,
    },
    overview:
      'Menyusun komposit median bebas awan pada Area of Interest (AOI), menghitung indeks spektral terpilih, melakukan reklasifikasi ambang batas, dan mengekspor raster hasil olahan.',
    expectedOutput: 'Raster GeoTIFF 32-bit float indeks spektral + layer klasifikasi threshold terproyeksi.',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Buka Google Earth Engine Code Editor',
          instruction: 'Masuk ke code.earthengine.google.com menggunakan akun Google yang telah terdaftar di GEE, lalu buat file baru pada tab Scripts.',
          menuPath: 'Scripts Panel → New → File',
          proTip: 'Gunakan Inspector tab di kanan atas untuk mengecek nilai piksel indeks secara langsung di peta.',
        },
        {
          stepNumber: 2,
          title: 'Tempel & Jalankan Script Komposit',
          instruction: 'Salin kode dari panel kanan lalu klik tombol Run. Layer AOI dan hasil perhitungan indeks akan otomatis dimuat ke peta bawah.',
          menuPath: 'Code Editor Toolbar → Run (Ctrl+Enter)',
        },
        {
          stepNumber: 3,
          title: 'Ekspor GeoTIFF ke Google Drive',
          instruction: 'Buka tab Tasks di pojok kanan atas, temukan task Export yang berwarna biru, lalu klik Run untuk menyimpan GeoTIFF ke folder Google Drive Anda.',
          menuPath: 'Tasks Tab → Run Export Task → Confirm CRS & Scale',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Siapkan Lingkungan Conda / Virtualenv',
          instruction: 'Instal pustaka rasterio, geopandas, dan numpy pada environment Python 3.10+ Anda.',
          menuPath: 'conda install -c conda-forge rasterio geopandas numpy matplotlib',
          proTip: 'Selalu gunakan blok "with rasterio.open(...)" agar file handle otomatis tertutup setelah penulisan GeoTIFF.',
        },
        {
          stepNumber: 2,
          title: 'Sesuaikan Path Band Citra Input',
          instruction: 'Pastikan path file raster mengarah ke band NIR dan Red/SWIR hasil unduhan Copernicus Browser atau USGS EarthExplorer.',
          menuPath: 'Variabel INPUT_RASTER_PATH & OUTPUT_RASTER_PATH',
        },
        {
          stepNumber: 3,
          title: 'Eksekusi Script & Validasi CRS',
          instruction: 'Jalankan script melalui terminal atau Jupyter Notebook. Script otomatis memotong (clip) sesuai BBox AOI dan menyimpan hasilnya.',
          menuPath: 'python run_spectral_analysis.py',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Buka Python Console di QGIS 3.34+',
          instruction: 'Buka aplikasi QGIS Desktop, lalu aktifkan konsol Python dan klik ikon Show Editor untuk membuka panel editor script.',
          menuPath: 'Plugins → Python Console (Ctrl+Alt+P) → Show Editor',
          proTip: 'Anda juga dapat menggunakan menu Raster → Raster Calculator secara visual jika hanya ingin menguji ekspresi satu kali.',
        },
        {
          stepNumber: 2,
          title: 'Muat Layer Citra ke Canvas QGIS',
          instruction: 'Pastikan citra komposit atau band tunggal sudah dimuat di panel Layers atau sesuaikan path file di variabel script.',
          menuPath: 'Layer → Add Layer → Add Raster Layer',
        },
        {
          stepNumber: 3,
          title: 'Klik Run Script di Editor PyQGIS',
          instruction: 'Klik tombol Run Script (ikon segitiga hijau). Hasil perhitungan QgsRasterCalculator dan pemotongan BBox akan langsung tampil di Map Canvas.',
          menuPath: 'PyQGIS Editor → Run Script (F5)',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Buka Python Window atau Notebook di ArcGIS Pro',
          instruction: 'Di dalam proyek ArcGIS Pro (.aprx), buka tab Analysis lalu pilih Python → Python Window atau Insert → New Notebook.',
          menuPath: 'Analysis Tab → Geoprocessing → Python Window',
          proTip: 'Pastikan ekstensi Spatial Analyst sudah aktif (arcpy.CheckOutExtension("Spatial")).',
        },
        {
          stepNumber: 2,
          title: 'Konfigurasi Geodatabase Workspace',
          instruction: 'Tetapkan arcpy.env.workspace ke File Geodatabase (.gdb) atau folder kerja Anda beserta sistem proyeksi output.',
          menuPath: 'arcpy.env.outputCoordinateSystem = arcpy.SpatialReference(EPSG)',
        },
        {
          stepNumber: 3,
          title: 'Jalankan Raster Algebra & Export',
          instruction: 'Eksekusi sel kode untuk memproses Raster Calculator via modul arcpy.sa dan memuat layer hasilnya ke Contents pane.',
          menuPath: 'Run Cell (Shift+Enter)',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Autentikasi Earth Engine di Google Colab / Jupyter',
          instruction: 'Instal paket geemap dan earthengine-api, kemudian jalankan ee.Authenticate() dan ee.Initialize(project="nama-project").',
          menuPath: 'pip install geemap earthengine-api',
        },
        {
          stepNumber: 2,
          title: 'Visualisasi Peta Interaktif geemap.Map()',
          instruction: 'Jalankan kode untuk menampilkan widget peta interaktif dengan layer indeks spektral dan colorbar langsung di notebook.',
          menuPath: 'Map.addLayer(indexImage, visParams, "Hasil Indeks")',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Buka OSGeo4W Shell atau Terminal GDAL',
          instruction: 'Gunakan gdalwarp untuk memotong (clip) dan mereproyeksikan citra ke EPSG tujuan, lalu gdal_calc.py untuk aljabar band.',
          menuPath: 'OSGeo4W Shell / Terminal Linux',
        },
        {
          stepNumber: 2,
          title: 'Jalankan Perintah gdal_calc.py',
          instruction: 'Eksekusi perintah CLI dengan opsi --calc dan --co COMPRESS=LZW untuk menghasilkan GeoTIFF terkompresi.',
          menuPath: 'gdal_calc.py -A nir.tif -B red.tif --outfile=result.tif',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Siapkan Batimetri (.bot) & Ekstrak Garis Pantai dari Citra/NDWI',
          instruction: 'Gunakan hasil klasifikasi air (NDWI/MNDWI) dari Sentinel-2 untuk memperbarui garis pantai pada grid batimetri BATNAS/GEBCO sebelum menjalankan model SWAN.',
          menuPath: 'INPGRID BOTTOM REGULAR & READINP BOTTOM',
          proTip: 'Kedalaman daratan pada file .bot diberi nilai negatif (atau flag exception) agar sel darat tidak dihitung sebagai perairan.',
        },
        {
          stepNumber: 2,
          title: 'Jalankan Simulasi SWAN dengan File .swn Ini',
          instruction: 'Simpan script sebagai INPUT atau nama_kasus.swn di folder yang sama dengan file .bot dan .wnd, lalu jalankan perintah swanrun dari terminal.',
          menuPath: 'swanrun -input nama_kasus.swn',
        },
      ],
    },
  },
  {
    id: 'vector-buffer-zonal-stats',
    title: 'Analisis Buffer Koridor & Zonal Statistics Kawasan',
    subtitle: 'Pembuatan zona penyangga (buffer) dalam meter pada proyeksi UTM, clip batas administrasi, dan ekstraksi statistik per poligon.',
    category: 'vector-analysis',
    categoryLabel: 'Analisis Vektor & Overlay',
    supportedPlatforms: ['python-gis', 'pyqgis', 'arcpy', 'postgis-gdal', 'gee-js', 'gee-py'],
    defaultPlatform: 'python-gis',
    difficulty: 'Pemula',
    estimatedMinutes: 12,
    primarySensorOrFormat: 'GeoPackage (.gpkg) / Shapefile (.shp)',
    defaultParams: {
      bufferDistanceMeters: 500,
      spatialResolutionMeters: 10,
      inputLayerPath: 'data/jaringan_sungai_utama.gpkg',
      outputLayerPath: 'output/zonal_buffer_analisis.gpkg',
    },
    overview:
      'Mereproyeksikan fitur vektor ke sistem koordinat metrik (UTM Indonesia), membangun poligon buffer dengan dissolve otomatis, dan menghitung statistik spasial (rata-rata, luas hektar, jumlah fitur) di setiap zona.',
    expectedOutput: 'File GeoPackage (.gpkg) / Shapefile berproyeksi UTM + tabel ringkasan CSV luas per zona.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Reproyeksi ke EPSG Metrik (UTM)',
          instruction: 'Pastikan GeoDataFrame direproyeksikan dari EPSG:4326 (derajat) ke EPSG UTM lokal menggunakan gdf.to_crs() sebelum menjalankan .buffer().',
          menuPath: 'gdf_utm = gdf.to_crs(epsg_code)',
          proTip: 'Jangan pernah melakukan operasi .buffer(500) pada EPSG:4326 karena angkanya akan dihitung sebagai 500 derajat, bukan 500 meter.',
        },
        {
          stepNumber: 2,
          title: 'Hitung Luas dalam Hektar & Zonal Join',
          instruction: 'Gunakan gdf_utm.geometry.area / 10000 untuk mendapatkan luas akurat dalam satuan Hektar (Ha), lalu simpan ke GeoPackage.',
          menuPath: 'gdf_utm.to_file("output.gpkg", driver="GPKG")',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Gunakan Processing Toolbox atau Script PyQGIS',
          instruction: 'Untuk langkah manual di GUI QGIS: buka Processing Toolbox (Ctrl+Alt+T), cari "Reproject layer", lalu lanjutkan dengan "Buffer" dan "Zonal Statistics".',
          menuPath: 'Vector → Geoprocessing Tools → Buffer',
          proTip: 'Centang opsi "Dissolve result" pada dialog Buffer agar poligon yang bertampalan menyatu menjadi satu koridor utuh.',
        },
        {
          stepNumber: 2,
          title: 'Otomatisasi dengan processing.run() di PyQGIS',
          instruction: 'Jalankan script PyQGIS di samping untuk merangkai Reproject → Buffer → Field Calculator Luas Hektar dalam satu kali klik.',
          menuPath: 'processing.run("native:buffer", params)',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Jalankan Pairwise Buffer & Zonal Statistics as Table',
          instruction: 'Di ArcGIS Pro, gunakan tool Pairwise Buffer (lebih cepat & presisi dibanding Buffer klasik) dengan metode Geodesic atau Planar UTM.',
          menuPath: 'Analysis → Tools → Pairwise Buffer (Analysis)',
        },
        {
          stepNumber: 2,
          title: 'Gabungkan Tabel Statistik ke Poligon',
          instruction: 'Jalankan ZonalStatisticsAsTable lalu gunakan JoinField_management untuk menyematkan kolom MEAN, MIN, dan MAX ke feature class utama.',
          menuPath: 'Spatial Analyst Tools → Zonal → Zonal Statistics as Table',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Jalankan Query Spasial ST_Buffer & ST_Transform',
          instruction: 'Eksekusi query SQL di pgAdmin 4 atau DBeaver. Fungsi ST_Transform mengubah geometri ke SRID UTM agar ST_Buffer bekerja dalam satuan meter.',
          menuPath: 'ST_Buffer(ST_Transform(geom, SRID), distance_m)',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Terapkan .buffer() dan reduceRegions() di GEE',
          instruction: 'Gunakan fungsi feature.buffer(distance) pada FeatureCollection lalu ekstrak nilai rata-rata piksel menggunakan image.reduceRegions().',
          menuPath: 'image.reduceRegions({ collection: bufferedFC, reducer: ee.Reducer.mean() })',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Ekstrak Statistik Zona ke Pandas DataFrame',
          instruction: 'Gunakan geemap.zonal_stats() untuk langsung mengekspor statistik raster pada area buffer menjadi file CSV atau DataFrame.',
          menuPath: 'geemap.zonal_stats(in_value_raster, in_zone_vector, out_csv)',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Ekstrak Titik Kontrol Buffer/Pelabuhan ke Tabel SWAN',
          instruction: 'Gunakan koordinat titik atau poligon batas wilayah (POINTS) untuk mengekstrak statistik tinggi gelombang signifikan (HSIGN) dan periode (TPS) pada koridor pantai tertentu.',
          menuPath: "POINTS 'BUOY_AOI' & TABLE 'BUOY_AOI'",
        },
      ],
    },
  },
  {
    id: 'flood-sar-sentinel1',
    title: 'Pemetaan Genangan Banjir Bebas Awan (Sentinel-1 SAR)',
    subtitle: 'Deteksi banjir menggunakan radar gelombang mikro Sentinel-1 GRD (polarisasi VV/VH) sebelum dan saat puncak banjir.',
    category: 'hydrology-terrain',
    categoryLabel: 'Hidrologi & Kebencanaan',
    supportedPlatforms: ['gee-js', 'gee-py', 'python-gis', 'pyqgis', 'arcpy', 'postgis-gdal'],
    defaultPlatform: 'gee-js',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'Sentinel-1 C-Band SAR GRD',
    defaultParams: {
      sensor: 'SENTINEL_1_SAR',
      thresholdValue: -16.5,
      spatialResolutionMeters: 10,
      bufferDistanceMeters: 250,
    },
    overview:
      'Membandingkan citra radar Sentinel-1 sebelum kejadian (baseline kering) dan saat kejadian banjir, menerapkan speckle filter focal median, mengeliminasi lereng curam (>5°) menggunakan DEM, serta menghitung estimasi luas area terdampak.',
    expectedOutput: 'Peta biner ekstensi genangan banjir (1 = Banjir, 0 = Non-Banjir) + perhitungan luas terdampak (Hektar).',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Tentukan Rentang Tanggal Sebelum & Saat Banjir',
          instruction: 'Atur parameter tanggal kejadian banjir dan ambang batas backscatter dB (umumnya -16 dB atau rasio perubahan > 1.25).',
          menuPath: 'COPERNICUS/S1_GRD · Polarisasi VV · IW Mode',
          proTip: 'Filter menggunakan lereng SRTM/NASADEM < 5 derajat sangat penting agar bayangan bukit (radar shadow) tidak salah terdeteksi sebagai air banjir.',
        },
        {
          stepNumber: 2,
          title: 'Terapkan Speckle Filtering & Hitung Luas',
          instruction: 'Jalankan script untuk menghaluskan bintik radar (speckle noise) dengan focal_median(50, "circle", "meters") dan mencetak total hektar banjir di Console.',
          menuPath: 'Console Tab → Total Luas Genangan (Ha)',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Jalankan Pipeline SAR di Jupyter / Colab',
          instruction: 'Eksekusi script geemap untuk memvisualisasikan perbandingan citra SAR Pre-Flood vs Post-Flood secara berdampingan (split-panel map).',
          menuPath: 'Map.split_map(left_layer, right_layer)',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Baca Citra Backscatter Sigma0 (dB) dengan Rasterio',
          instruction: 'Pastikan citra Sentinel-1 telah dikalibrasi ke desibel (dB), lalu terapkan median filter menggunakan scipy.ndimage dan thresholding.',
          menuPath: 'scipy.ndimage.median_filter(sar_db, size=5)',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Reklasifikasi Backscatter SAR & Sieve Filter di QGIS',
          instruction: 'Gunakan Raster Calculator untuk memisahkan piksel < ambang dB, lalu jalankan GDAL Sieve untuk menghapus bercak piksel kecil (< 10 piksel).',
          menuPath: 'Raster → Analysis → Sieve',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Focal Statistics & Con() di ArcGIS Spatial Analyst',
          instruction: 'Gunakan FocalStatistics untuk menghaluskan speckle, lalu fungsi Con(sar_raster < threshold_db, 1, 0) dan RasterToPolygon.',
          menuPath: 'Spatial Analyst → Conditional → Con',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Thresholding & Polygonize dengan GDAL CLI',
          instruction: 'Gunakan gdal_calc.py untuk membuat mask biner genangan lalu konversi ke poligon vektor menggunakan gdal_polygonize.py.',
          menuPath: 'gdal_polygonize.py flood_mask.tif flood_polygons.gpkg',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Analisis Rob Pesisir & Wave Setup dengan SWAN',
          instruction: 'Atur parameter muka air pasang (SET LEVEL) serta forcing angin badai pada file .swn untuk memodelkan tinggi gelombang ekstrem pemicu limpasan pantai (overtopping).',
          menuPath: 'SET LEVEL & WIND / BOUN SIDE',
        },
      ],
    },
  },
  {
    id: 'lst-thermal-landsat',
    title: 'Suhu Permukaan Daratan (Land Surface Temperature / LST)',
    subtitle: 'Konversi band termal Landsat 8/9 Collection 2 Level-2 ke derajat Celcius (°C) dengan koreksi emisivitas vegetasi (Pv).',
    category: 'remote-sensing',
    categoryLabel: 'Penginderaan Jauh',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'gee-py', 'postgis-gdal'],
    defaultPlatform: 'gee-js',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'Landsat 8/9 OLI-TIRS (ST_B10)',
    defaultParams: {
      sensor: 'LANDSAT_8_9',
      spectralIndex: 'NDVI',
      maxCloudCover: 15,
      spatialResolutionMeters: 30,
      thresholdValue: 32.0,
    },
    overview:
      'Menerapkan faktor skala resmi USGS Collection 2 Level-2 pada band termal ST_B10 (0.00341802 * DN + 149.0 - 273.15) serta menghitung proporsi vegetasi (Fractional Vegetation Cover) untuk analisis Urban Heat Island.',
    expectedOutput: 'Peta sebaran suhu permukaan dalam satuan derajat Celcius (°C) + identifikasi zona pulau bahang perkotaan.',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Terapkan Scale Factor USGS Collection 2',
          instruction: 'Pada Landsat 8/9 Collection 2 Level-2, band ST_B10 sudah dikoreksi atmosfer. Kalikan dengan 0.00341802, tambah 149.0 (Kelvin), lalu kurangi 273.15 untuk Celcius.',
          menuPath: 'LANDSAT/LC08/C02/T1_L2 · Band ST_B10',
          proTip: 'Hindari menggunakan rumus lama Collection 1 (0.1 scale factor) karena akan menghasilkan suhu yang keliru pada katalog Collection 2.',
        },
        {
          stepNumber: 2,
          title: 'Identifikasi Zona Hotspot Suhu Tinggi',
          instruction: 'Gunakan nilai ambang suhu (misal > 32°C) untuk menyoroti kawasan industri atau permukiman padat yang mengalami Urban Heat Island.',
          menuPath: 'lstCelsius.gt(32.0)',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Konversi Band ST_B10 GeoTIFF ke Celcius',
          instruction: 'Baca file *_ST_B10.TIF dan *_SR_B4/B5.TIF menggunakan rasterio, terapkan rumus kalibrasi termal, dan mask nilai NoData (0).',
          menuPath: 'lst_c = (st_b10 * 0.00341802 + 149.0) - 273.15',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Hitung LST di QGIS Raster Calculator',
          instruction: 'Jalankan ekspresi ("ST_B10@1" * 0.00341802 + 149.0) - 273.15 melalui PyQGIS atau dialog Raster Calculator, lalu terapkan simbologi Singleband Pseudocolor (palet Spectral terbalik).',
          menuPath: 'Layer Properties → Symbology → Singleband Pseudocolor',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Map Algebra Termal di ArcGIS Pro',
          instruction: 'Gunakan arcpy.sa.Raster("ST_B10.TIF") untuk menghitung suhu permukaan dalam Celcius dan jalankan Hot Spot Analysis (Getis-Ord Gi*).',
          menuPath: 'Spatial Statistics Tools → Mapping Clusters → Hot Spot Analysis',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Analisis Time-Series Suhu Perkotaan dengan geemap',
          instruction: 'Eksekusi script untuk menghasilkan grafik rata-rata suhu permukaan bulanan pada AOI dan mengekspor raster LST.',
          menuPath: 'geemap.image_stats(lst_image, region=aoi)',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Kalibrasi Band Termal via gdal_calc.py',
          instruction: 'Jalankan gdal_calc.py dengan argumen --calc="(A*0.00341802+149.0)-273.15" dan --NoDataValue=-9999.',
          menuPath: 'gdal_calc.py -A LC08_ST_B10.TIF --outfile=lst_celsius.tif',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Konfigurasi Grid Spasial SWAN pada AOI Terpilih',
          instruction: 'Gunakan file .swn ini sebagai dasar grid komputasi SWAN untuk simulasi gelombang di perairan pesisir sekitar AOI.',
          menuPath: 'CGRID REGULAR & COMPUTE NONSTAT',
        },
      ],
    },
  },
  {
    id: 'automated-map-layout-batch',
    title: 'Otomatisasi Layout Peta & Batch Export Atlas (PDF/PNG)',
    subtitle: 'Pembuatan peta seri otomatis per wilayah/kecamatan lengkap dengan judul dinamis, skala, legenda, dan ekspor PDF/PNG resolusi tinggi.',
    category: 'cartography-automation',
    categoryLabel: 'Kartografi & Otomasi Layout',
    supportedPlatforms: ['pyqgis', 'arcpy', 'python-gis', 'postgis-gdal', 'gee-js', 'gee-py'],
    defaultPlatform: 'pyqgis',
    difficulty: 'Lanjutan',
    estimatedMinutes: 20,
    primarySensorOrFormat: 'QGIS Print Layout / ArcGIS MapSeries',
    defaultParams: {
      inputLayerPath: 'data/batas_kecamatan.gpkg',
      outputLayerPath: 'output/peta_atlas_wilayah.pdf',
      spatialResolutionMeters: 300,
    },
    overview:
      'Mengotomatiskan pembuatan puluhan peta tematik (Atlas di QGIS atau Map Series di ArcGIS Pro) dengan melakukan zoom otomatis ke setiap fitur poligon di dalam AOI, memperbarui label judul peta, dan mengekspor ke PDF/PNG 300 DPI.',
    expectedOutput: 'Kumpulan peta tematik siap cetak (PDF/PNG 300 DPI) untuk setiap unit wilayah di dalam AOI.',
    tutorialsByPlatform: {
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Siapkan Print Layout & Map Item di QGIS',
          instruction: 'Buka Project → New Print Layout, tambahkan Map Item (berikan Item ID "PetaUtama") dan Label Judul (berikan Item ID "JudulPeta").',
          menuPath: 'Project → Layout Manager → Print Layout',
          proTip: 'Gunakan ekspresi [% "NAMA_KEC" %] pada label teks jika menggunakan fitur Atlas bawaan QGIS.',
        },
        {
          stepNumber: 2,
          title: 'Jalankan Script Batch Exporter PyQGIS',
          instruction: 'Eksekusi script di Python Console. Script akan melakukan iterasi pada setiap fitur di AOI, mengatur extent peta, dan mengekspor PDF 300 DPI.',
          menuPath: 'QgsLayoutExporter(layout).exportToPdf()',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Akses Modul arcpy.mp pada Proyek ArcGIS Pro',
          instruction: 'Gunakan arcpy.mp.ArcGISProject("CURRENT") untuk mengakses Layout dan MapFrame, lalu iterasi setiap baris menggunakan SearchCursor.',
          menuPath: 'mf.camera.setExtent(mf.getLayerExtent(lyr, True))',
        },
        {
          stepNumber: 2,
          title: 'Ekspor ke PDF Resolusi 300 DPI',
          instruction: 'Panggil layout.exportToPDF() di dalam loop untuk menghasilkan peta per wilayah secara otomatis.',
          menuPath: 'lyt.exportToPDF(out_pdf, resolution=300)',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Plot Peta Kartografi dengan GeoPandas & Matplotlib',
          instruction: 'Jalankan script Python untuk merender poligon bertema, grid koordinat, skala bar, dan panah utara ke file PNG/PDF 300 DPI.',
          menuPath: 'fig.savefig(output_path, dpi=300, bbox_inches="tight")',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Render & Konversi Raster/Vektor ke Georeferenced PDF',
          instruction: 'Gunakan gdal_translate -of PDF dengan opsi OGR_DATASOURCE untuk menggabungkan layer dasar raster dan batas vektor ke Georeferenced PDF.',
          menuPath: 'gdal_translate -of PDF input.tif output_map.pdf',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Buat Thumbnail Kartografi & Legend Panel di GEE',
          instruction: 'Gunakan image.getThumbURL() dengan dimensi dan bbox presisi serta ui.Panel() untuk menyusun legenda dan judul peta di kanvas GEE.',
          menuPath: 'print(image.getThumbURL(thumbParams))',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Render Peta Publikasi dengan geemap.cartoee',
          instruction: 'Gunakan modul cartoee di geemap untuk menambahkan grid lintang/bujur, north arrow, scale bar, dan colorbar secara otomatis.',
          menuPath: 'from geemap import cartoee',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Ekspor Output Grid Matriks (.mat / .tab) untuk Atlas Peta',
          instruction: 'Blok OUTPUT BLOCK menghasilkan matriks HSIGN, TPS, dan DIR berkala tiap 3 jam yang siap di-plot menjadi seri peta gelombang di QGIS atau Python Matplotlib.',
          menuPath: "BLOCK 'DOMAIN' NOHEADER ... HSIGN TPS DIR",
        },
      ],
    },
  },
  {
    id: 'terrain-slope-watershed',
    title: 'Analisis Kemiringan Lereng (Slope), Kontur & Deliniasi DAS',
    subtitle: 'Pengolahan Digital Elevation Model (DEMNAS / SRTM / FABDEM) untuk klasifikasi kelerengan SK Mentan dan ekstraksi jaringan aliran.',
    category: 'hydrology-terrain',
    categoryLabel: 'Hidrologi & Kebencanaan',
    supportedPlatforms: ['pyqgis', 'arcpy', 'python-gis', 'gee-js', 'postgis-gdal', 'gee-py'],
    defaultPlatform: 'pyqgis',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'DEMNAS (8m) / SRTM (30m)',
    defaultParams: {
      spatialResolutionMeters: 30,
      thresholdValue: 15.0,
      inputLayerPath: 'data/demnas_aoi.tif',
      outputLayerPath: 'output/klasifikasi_lereng_kontur.gpkg',
    },
    overview:
      'Menghitung kemiringan lereng dalam persen/derajat dari data DEM, mengklasifikasikan ke 5 kelas kemiringan lereng standar Indonesia (0-8%, 8-15%, 15-25%, 25-45%, >45%), serta mengekstrak garis kontur.',
    expectedOutput: 'Raster kelas kemiringan lereng + Vektor garis kontur dengan atribut elevasi.',
    tutorialsByPlatform: {
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Reproyeksi DEM ke UTM Sebelum Hitung Lereng',
          instruction: 'Pastikan layer DEM sudah berada dalam sistem koordinat metrik (UTM) agar satuan vertikal (Z meter) dan horizontal (X,Y meter) konsisten.',
          menuPath: 'Raster → Projections → Warp (Reproject)',
          proTip: 'Jika DEM masih dalam EPSG:4326 (derajat), gunakan Z-factor = 0.000009 (1/111320) agar kemiringan lereng tidak melonjak menjadi 89 derajat.',
        },
        {
          stepNumber: 2,
          title: 'Jalankan Slope, Reclassify by Table & Contour',
          instruction: 'Gunakan script PyQGIS untuk memanggil gdal:slope, native:reclassifybytable (5 kelas lereng), dan gdal:contour secara berurutan.',
          menuPath: 'Raster → Extraction → Contour',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Jalankan Fill, Flow Direction, Slope & Reclassify',
          instruction: 'Gunakan modul arcpy.sa.Slope(dem, "PERCENT_RISE") diikuti oleh arcpy.sa.Reclassify() sesuai klasifikasi lereng 5 kelas.',
          menuPath: 'Spatial Analyst Tools → Surface → Slope',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Hitung Gradien Elevasi dengan NumPy & Rasterio',
          instruction: 'Gunakan np.gradient() dengan resolusi piksel DEM (pixel_size_x, pixel_size_y) untuk menghitung persen lereng dan mengklasifikasikan array.',
          menuPath: 'dz_dy, dz_dx = np.gradient(dem_array, res_y, res_x)',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Gunakan ee.Terrain.products() pada NASADEM / SRTM',
          instruction: 'Panggil ee.Terrain.slope() dan ee.Terrain.aspect() pada dataset NASA/NASADEM_HGT/001 lalu terapkan .where() untuk 5 kelas lereng.',
          menuPath: 'ee.Terrain.products(dem).select("slope")',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Visualisasi Topografi & Hillshade di geemap',
          instruction: 'Kombinasikan layer Hillshade semi-transparan dengan klasifikasi kemiringan lereng untuk peta morfologi yang informatif.',
          menuPath: 'ee.Terrain.hillshade(dem)',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Ekstrak Slope, Hillshade & Kontur dengan gdaldem',
          instruction: 'Jalankan gdaldem slope -p untuk kemiringan dalam persen, diikuti gdal_contour -a elev -i 25.0 untuk kontur interval 25 meter.',
          menuPath: 'gdaldem slope dem_utm.tif slope_pct.tif -p',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Gunakan Data Batimetri (DEM Bawah Laut) pada INPGRID BOTTOM',
          instruction: 'Konversikan DEM batimetri (BATNAS/GEBCO) menjadi ASCII grid .bot lalu muat dengan INPGRID BOTTOM dan READINP BOTTOM pada SWAN.',
          menuPath: "READINP BOTTOM -1. 'batimetri.bot' 3 0 FREE",
        },
      ],
    },
  },
  {
    id: 'coastal-wave-swan',
    title: 'Pemodelan Gelombang Pesisir & Batimetri (SWAN Nearshore)',
    subtitle: 'Simulasi tinggi gelombang signifikan (Hs), periode puncak (Tp), dan arah rambatan gelombang laut dangkal beserta ekspor grid GIS.',
    category: 'hydrology-terrain',
    categoryLabel: 'Hidrologi & Kelautan',
    supportedPlatforms: ['swan', 'python-gis', 'pyqgis', 'arcpy', 'postgis-gdal', 'gee-js', 'gee-py'],
    defaultPlatform: 'swan',
    difficulty: 'Menengah',
    estimatedMinutes: 18,
    primarySensorOrFormat: 'SWAN 41.45 (.swn) / BATNAS & ERA5',
    defaultParams: {
      spatialResolutionMeters: 100,
      bufferDistanceMeters: 500,
      thresholdValue: 1.5,
      inputLayerPath: 'data/batimetri_batnas.bot',
      outputLayerPath: 'output/gelombang_swan_hs.mat',
    },
    overview:
      'Membangun skrip input SWAN (.swn) lengkap untuk simulasi gelombang non-stasioner meliputi definisi grid komputasi (CGRID), input batimetri (INPGRID BOTTOM), input angin (INPGRID WIND), kondisi batas spektrum JONSWAP, fisika perairan dangkal (shoaling, refraction, breaking, friction), serta ekspor output grid.',
    expectedOutput: 'File skrip SWAN (.swn) siap jalankan + output matriks HSIGN, TPS, DIR (.mat / .tab) untuk visualisasi GIS.',
    tutorialsByPlatform: {
      swan: [
        {
          stepNumber: 1,
          title: 'Siapkan Data Batimetri (.bot) & Angin (.wnd)',
          instruction: 'Unduh data batimetri BATNAS/GEBCO (.tif) lalu konversikan ke format ASCII grid (.bot) dengan urutan baris dari selatan-ke-utara atau utara-ke-selatan sesuai flag idla di READINP BOTTOM.',
          menuPath: 'gdal_translate -of AAIGrid batimetri.tif batimetri.bot',
          proTip: 'Pastikan nilai kedalaman laut bertanda positif di file .bot jika menggunakan pengali fac = -1. (atau negatif jika fac = 1.) karena SWAN menganggap kedalaman air bernilai positif ke bawah.',
        },
        {
          stepNumber: 2,
          title: 'Sesuaikan Kondisi Batas Terbuka (BOUN SIDE)',
          instruction: 'Tentukan sisi laut terbuka tempat gelombang datang (N/S/E/W) pada perintah BOUN SIDE dengan parameter tinggi gelombang (Hs), periode (Tp), arah datang (nautical degrees), dan penyebaran arah.',
          menuPath: 'BOUN SIDE S CONSTANT PAR 1.8 8.0 180. 25.',
        },
        {
          stepNumber: 3,
          title: 'Eksekusi SWAN & Konversi Output ke QGIS/Python',
          instruction: 'Jalankan model via terminal dengan perintah swanrun, lalu impor file hasil .mat atau .tab ke Python/QGIS untuk membuat peta kontur Hs dan vektor arah gelombang.',
          menuPath: 'swanrun -input simulasi_gelombang.swn',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Konversi Output SWAN (.mat / .tab) ke GeoTIFF',
          instruction: 'Gunakan scipy.io.loadmat() dan rasterio di Python untuk mengubah matriks HSIGN hasil SWAN menjadi raster GeoTIFF georeferensi siap muat di QGIS.',
          menuPath: 'scipy.io.loadmat() → rasterio.open(..., "w")',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Visualisasi Tinggi Gelombang & Vektor Arah di QGIS',
          instruction: 'Muat raster HSIGN hasil konversi SWAN atau layer Mesh/NetCDF langsung di QGIS menggunakan Mesh Layer & simbologi panah arah gelombang.',
          menuPath: 'Layer → Add Layer → Add Mesh Layer',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Buat Peta Kontur Gelombang & Zona Bahaya Abrasi',
          instruction: 'Impor grid tinggi gelombang SWAN ke ArcGIS Pro lalu gunakan RasterToPolygon / Contour untuk memetakan zona gelombang > 1.5m di sekitar garis pantai.',
          menuPath: 'Spatial Analyst → Surface → Contour',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Konversi & Reproyeksi Output Grid ke UTM via GDAL',
          instruction: 'Gunakan gdal_translate dan gdalwarp untuk mengonversi grid keluaran SWAN dari koordinat geografis ke proyeksi UTM lokal.',
          menuPath: 'gdalwarp -t_srs EPSG:32748 swan_hs.tif swan_hs_utm.tif',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Ekstrak Garis Pantai & Mangrove Terkini sebagai Input SWAN',
          instruction: 'Gunakan GEE untuk mengekspor garis pantai (NDWI/MNDWI) serta tutupan mangrove sebagai zona redaman gelombang (vegetation damping) pada model SWAN.',
          menuPath: 'Export.table.toDrive() → Coastline GeoJSON',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Sinkronisasi Batas Pesisir & Angin ERA5 untuk SWAN',
          instruction: 'Gunakan geemap untuk mengunduh komponen angin u10/v10 ERA5-Land atau citra Sentinel-2 pesisir di dalam AOI yang sama.',
          menuPath: 'ECMWF/ERA5/HOURLY · u_component_of_wind_10m',
        },
      ],
    },
  },
  {
    id: 'land-cover-classification',
    title: 'Klasifikasi Tutupan Lahan Multi-Indeks (LULC 6 Kelas)',
    subtitle: 'Pemetaan hutan, mangrove, pertanian, lahan terbangun, tanah terbuka (BSI), & badan air berbasis kombinasi indeks.',
    category: 'remote-sensing',
    categoryLabel: 'Tutupan Lahan (LULC)',
    supportedPlatforms: ['gee-js', 'python-gis', 'pyqgis', 'arcpy', 'gee-py', 'postgis-gdal', 'swan'],
    defaultPlatform: 'gee-js',
    difficulty: 'Menengah',
    estimatedMinutes: 16,
    primarySensorOrFormat: 'Sentinel-2 L2A (NDVI + NDBI + MNDWI + BSI + MVI)',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'BSI',
      maxCloudCover: 20,
      spatialResolutionMeters: 10,
      thresholdValue: 0.05,
      inputLayerPath: 'data/komposit_sentinel2_aoi.tif',
      outputLayerPath: 'output/peta_tutupan_lahan_lulc.gpkg',
    },
    overview:
      'Mengombinasikan indeks tutupan lahan (NDVI, MVI, MNDWI, NDBI, BSI) ke dalam pohon keputusan hierarkis dan klasifikasi terbimbing 6 kelas tutupan lahan lengkap dengan neraca luas (Hektar) tiap kelas.',
    expectedOutput: 'Raster klasifikasi tutupan lahan 6 kelas (GeoTIFF) + statistik luas Hektar per kelas.',
    tutorialsByPlatform: {
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Hitung Stack Indeks Tutupan Lahan (NDVI, MNDWI, NDBI, BSI, MVI)',
          instruction: 'Script otomatis menyusun komposit bebas awan Sentinel-2 lalu menghitung 5 indeks spektral kunci sekaligus sebagai lapisan pembeda kelas.',
          menuPath: 'NDVI + MNDWI + NDBI + BSI + MVI Stack',
          proTip: 'Pisahkan badan air (MNDWI > 0) dan mangrove (MVI > 4.0) terlebih dahulu sebelum memisahkan lahan terbangun dan tanah terbuka (BSI).',
        },
        {
          stepNumber: 2,
          title: 'Ekstrak Neraca Luas Tutupan Lahan (Hektar)',
          instruction: 'Gunakan ee.Reducer.sum().group() untuk menghitung luas otomatis seluruh 6 kelas tutupan lahan dan ekspor ke Google Drive.',
          menuPath: 'Console Tab → Tabel Luas LULC (Ha)',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Bangun Klasifikasi Decision Tree dengan NumPy & Rasterio',
          instruction: 'Muat band Blue, Green, Red, NIR, SWIR1 dalam satu array NumPy untuk menghitung NDVI, MNDWI, NDBI, dan BSI lalu klasifikasikan menjadi kelas 1–6.',
          menuPath: 'python run_lulc_classification.py',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Gabungkan Indeks & Terapkan Symbology Paletted/Unique Values',
          instruction: 'Jalankan script PyQGIS untuk menghitung peta kelas LULC dan langsung mewarnai tiap kelas tutupan lahan di QGIS Map Canvas.',
          menuPath: 'Plugins → Python Console → Run Script',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Klasifikasi Tutupan Lahan dengan Con() Berjenjang di ArcPy',
          instruction: 'Gunakan fungsi Con() bersarang pada raster indeks spektral lalu hitung tabel atribut luas tiap kelas menggunakan BuildRasterAttributeTable.',
          menuPath: 'Spatial Analyst → Conditional → Con',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Klasifikasi & Legenda Interaktif LULC di geemap',
          instruction: 'Tampilkan peta tutupan lahan 6 kelas beserta built-in legend geemap di Google Colab/Jupyter dan hitung luas tiap kelas ke Pandas DataFrame.',
          menuPath: 'm.add_legend(builtin_legend="ESA_WorldCover")',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Reklasifikasi Multi-Band & Polygonize Kelas LULC via GDAL',
          instruction: 'Jalankan gdal_calc.py untuk klasifikasi logika boolean multi-raster lalu gdal_polygonize.py dan agregasi ST_Area di PostGIS.',
          menuPath: 'gdal_calc.py → gdal_polygonize.py → PostGIS GROUP BY kelas',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Petakan Koefisien Gesekan Dasar (Friction) dari Kelas Tutupan Lahan',
          instruction: 'Gunakan peta tutupan lahan pesisir (hutan mangrove, tambak, terumbu, pasir) untuk menurunkan grid koefisien redaman energi gelombang di SWAN.',
          menuPath: 'FRICTION JONSWAP / VEGETATION',
        },
      ],
    },
  },
  {
    id: 'shoreline-slope-erosion',
    title: 'Analisis Kemiringan Garis Pantai & Perubahan Pesisir (Slope & DSAS)',
    subtitle: 'Ekstraksi garis pantai (AWEI/MNDWI), kemiringan foreshore (tan β) dari DEM/Batimetri, serta laju abrasi-akresi.',
    category: 'hydrology-terrain',
    categoryLabel: 'Pesisir & Garis Pantai',
    supportedPlatforms: ['python-gis', 'gee-js', 'pyqgis', 'arcpy', 'postgis-gdal', 'gee-py', 'swan'],
    defaultPlatform: 'python-gis',
    difficulty: 'Menengah',
    estimatedMinutes: 20,
    primarySensorOrFormat: 'AWEI / MNDWI + DEMNAS/BATNAS + Transek DSAS',
    defaultParams: {
      sensor: 'S2_SR',
      spectralIndex: 'AWEI',
      maxCloudCover: 15,
      spatialResolutionMeters: 10,
      bufferDistanceMeters: 200,
      thresholdValue: 3.5,
      inputLayerPath: 'data/dem_pesisir_batnas.tif',
      outputLayerPath: 'output/kemiringan_garis_pantai.gpkg',
    },
    overview:
      'Mengekstrak batas garis pantai dari citra optik (AWEI/MNDWI), menghasilkan transek tegak lurus garis pantai (shore-normal transects), menghitung kemiringan garis pantai / foreshore slope (derajat, persen, & tan β), serta mengevaluasi laju abrasi/akresi (NSM & EPR m/tahun).',
    expectedOutput: 'Vektor transek & garis pantai dengan atribut kemiringan (°/%/tan β) dan laju perubahan (m/thn) + raster kemiringan pesisir.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Siapkan Garis Pantai Baseline & DEM Pesisir (DEMNAS/BATNAS)',
          instruction: 'Pastikan garis pantai t1/t2 (hasil vektorisasi AWEI/MNDWI) serta DEM pesisir berada di folder data/. Script otomatis memproyeksikan ke UTM metrik.',
          menuPath: 'GeoPandas + Shapely Transek Tegak Lurus + Rasterio',
          proTip: 'Gunakan jarak transek 50–100m dan panjang transek melintasi zona foreshore–berm (~200m) agar kemiringan pantai terukur stabil.',
        },
        {
          stepNumber: 2,
          title: 'Hitung Kemiringan Garis Pantai (tan β) & Laju Abrasi (EPR)',
          instruction: 'Script mengekstrak elevasi ujung darat dan ujung laut setiap transek untuk menghitung sudut kemiringan pantai (slope_deg) sekaligus NSM & EPR (m/tahun).',
          menuPath: 'python run_shoreline_slope.py',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Ekstrak Garis Pantai t1 vs t2 (AWEI/MNDWI) & Slope Pesisir di GEE',
          instruction: 'Script membandingkan batas darat–laut periode awal vs akhir, menghitung kemiringan zona pantai dari DEM/SRTM, serta mengekspor vektor garis pantai ke Google Drive.',
          menuPath: 'AWEI > 0 → reduceToVectors() + ee.Terrain.slope()',
        },
      ],
      pyqgis: [
        {
          stepNumber: 1,
          title: 'Buat Transek Otomatis & Sampling DEM di QGIS',
          instruction: 'Jalankan script PyQGIS untuk memanggil native:transect tegak lurus garis pantai, gdal:slope pada DEM pesisir, dan native:rastersampling.',
          menuPath: 'Processing → Vector Creation → Transects',
        },
      ],
      arcpy: [
        {
          stepNumber: 1,
          title: 'Generate Transects & Hitung Slope Pesisir di ArcGIS Pro',
          instruction: 'Gunakan arcpy.management.GenerateTransectsAlongLines dan arcpy.sa.Slope untuk mengkuantifikasi kemiringan pantai dan pergeseran garis pantai.',
          menuPath: 'Data Management → Sampling → Generate Transects Along Lines',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Hitung Pergeseran Garis Pantai (ST_ShortestLine) & Slope GDAL',
          instruction: 'Query SQL PostGIS menghitung jarak pergeseran tegak lurus antar garis pantai t1 dan t2 per segmen, dipadukan dengan gdaldem slope pada DEM topobathy.',
          menuPath: 'ST_LineInterpolatePoint + ST_ShortestLine + gdaldem slope',
        },
      ],
      'gee-py': [
        {
          stepNumber: 1,
          title: 'Ekstrak Vektor Garis Pantai & Kemiringan Zona Pesisir via geemap',
          instruction: 'Jalankan notebook Python Earth Engine untuk memvisualisasikan pergeseran garis pantai multi-tahun dan profil kemiringan lereng pantai.',
          menuPath: 'geemap.ee_to_gdf() & ee.Terrain.slope()',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Kalibrasi Wave Breaking & Runup Pantai Berbasis Kemiringan (tan β)',
          instruction: 'File .swn ini menyertakan parameter pecah gelombang (BREAKING) dan titik kontrol tepat di sepanjang garis pantai untuk mengevaluasi energi gelombang penyebab abrasi (bilangan Iribarren).',
          menuPath: "BREAKING & POINTS 'GARIS_PANTAI'",
          proTip: 'Pantai curam (tan β > 0.08) cenderung memantulkan gelombang (plunging/surging breaker) sehingga parameter gamma BREAKING dapat dinaikkan hingga 0.78–0.85.',
        },
      ],
    },
  },
  {
    id: 'tidal-analysis-harmonics',
    title: 'Pengolahan Data Pasang Surut & Konstanta Harmonik (Admiralty / UTide)',
    subtitle: 'Analisis kuadrat terkecil komponen M2, S2, K1, O1, bilangan Formzahl, elevasi HHWL/MSL/LLWL, dan integrasi SWAN.',
    category: 'hydrology-terrain',
    categoryLabel: 'Pasang Surut & Kelautan',
    supportedPlatforms: ['python-gis', 'swan', 'postgis-gdal', 'gee-js', 'pyqgis', 'arcpy'],
    defaultPlatform: 'python-gis',
    difficulty: 'Menengah',
    estimatedMinutes: 15,
    primarySensorOrFormat: 'CSV Time-Series Pasut BIG/IOC (.csv) + DEM Pesisir',
    defaultParams: {
      spatialResolutionMeters: 10,
      thresholdValue: 1.85,
      inputLayerPath: 'data/data_pasang_surut_jam.csv',
      outputLayerPath: 'output/hasil_analisis_pasut.csv',
    },
    overview:
      'Mengolah rekaman tinggi muka air laut per jam menjadi konstanta harmonik utama (M2, S2, K1, O1), menentukan tipe pasang surut via bilangan Formzahl, menghitung Chart Datum (HHWL, MHWL, MSL, MLWL, LLWL), serta memetakan zona genangan pasang maksimum.',
    expectedOutput: 'Tabel CSV konstanta harmonik & elevasi HHWL/MSL/LLWL + skrip pasang surut SWAN/GEE.',
    tutorialsByPlatform: {
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Siapkan CSV Time-Series Pasang Surut (timestamp_utc, elevasi_m)',
          instruction: 'Gunakan format waktu UTC per 1 jam selama minimal 15–29 piantan (atau biarkan script menggunakan simulasi sintetis jika file belum ada).',
          menuPath: 'data/data_pasang_surut_jam.csv',
          proTip: 'Pastikan celah data (gap) sudah diisi atau dibersihkan terlebih dahulu agar solusi matriks least-squares stabil.',
        },
        {
          stepNumber: 2,
          title: 'Eksekusi Script Regresi Harmonik & Bilangan Formzahl',
          instruction: 'Jalankan script Python untuk memperoleh amplitudo & fase M2, S2, K1, O1, nilai HHWL/MSL/LLWL, serta ekspor ringkasan CSV.',
          menuPath: 'python analyze_tides.py',
        },
      ],
      swan: [
        {
          stepNumber: 1,
          title: 'Masukkan Elevasi HHWL (SET LEVEL) atau Grid Pasut (.wlev) ke SWAN',
          instruction: 'Gunakan nilai HHWL hasil pengolahan pasang surut ke dalam perintah SET LEVEL atau aktifkan INPGRID WLEV NONSTAT untuk skenario pasang purnama + badai.',
          menuPath: 'SET LEVEL & INPGRID WLEV NONSTAT',
        },
      ],
      'gee-js': [
        {
          stepNumber: 1,
          title: 'Petakan Zona Genangan Rob (Elevasi DEM <= HHWL)',
          instruction: 'Gunakan GEE untuk mengoverlay elevasi HHWL pada NASADEM/FABDEM dan membandingkan indeks air MNDWI saat pasang vs surut.',
          menuPath: 'dem.lte(HHWL) & MNDWI Sentinel-2',
        },
      ],
      'postgis-gdal': [
        {
          stepNumber: 1,
          title: 'Agregasi Statistik Stasiun Pasut & Masking Rob GDAL',
          instruction: 'Jalankan query PostgreSQL untuk persentil MHWL/MLWL serta gdal_calc.py untuk mengekstrak area terdampak rob.',
          menuPath: 'PERCENTILE_CONT & gdal_calc.py',
        },
      ],
    },
  },
  {
    id: 'uav-agisoft-metashape',
    title: 'Fotogrametri Citra Drone UAV (Agisoft Metashape Python API)',
    subtitle: 'Otomasi Align Photos, GCP UTM, Dense Point Cloud, DEM/DSM, Orthomosaic GeoTIFF, dan ekspor laporan kualitas PDF.',
    category: 'remote-sensing',
    categoryLabel: 'Fotogrametri Drone UAV',
    supportedPlatforms: ['agisoft-py', 'python-gis', 'pyqgis', 'arcpy'],
    defaultPlatform: 'agisoft-py',
    difficulty: 'Menengah',
    estimatedMinutes: 25,
    primarySensorOrFormat: 'Foto Drone RGB/Multispektral (.jpg/.tif) + GCP CSV',
    defaultParams: {
      spatialResolutionMeters: 2,
      thresholdValue: 0.05,
      inputLayerPath: 'data/foto_drone_uav',
      outputLayerPath: 'output_metashape/orthomosaic_uav.tif',
    },
    overview:
      'Mengotomatiskan alur kerja Agisoft Metashape Professional dari awal hingga akhir: pemuatan foto UAV, transformasi koordinat kamera ke UTM, impor titik ikat GCP, MatchPhotos, AlignCameras, Dense Point Cloud, Ground Classification, pembuatan DEM & Orthomosaic GeoTIFF, hingga exportReport PDF.',
    expectedOutput: 'Proyek .psx, Orthomosaic & DEM GeoTIFF (LZW), serta Laporan PDF Kualitas Metashape.',
    tutorialsByPlatform: {
      'agisoft-py': [
        {
          stepNumber: 1,
          title: 'Siapkan Folder Foto Drone & File GCP (Opsional)',
          instruction: 'Tempatkan seluruh foto drone (.jpg/.tif) di folder PHOTO_DIR dan siapkan file CSV koordinat GCP dalam proyeksi UTM jika menggunakan titik ikat tanah.',
          menuPath: 'PHOTO_DIR & GCP_CSV_PATH',
          proTip: 'Untuk drone RTK (DJI Mavic 3E / Phantom 4 RTK), atur downscale=1 (High) saat matchPhotos agar akurasi aerotriangulasi optimal.',
        },
        {
          stepNumber: 2,
          title: 'Jalankan Script Python API di Agisoft Metashape Pro',
          instruction: 'Buka Metashape Pro -> Tools -> Run Script (Ctrl+R) dan pilih file .py yang dihasilkan, atau jalankan headless via terminal metashape.sh -r.',
          menuPath: 'Tools → Run Script (Ctrl+R)',
        },
      ],
      'python-gis': [
        {
          stepNumber: 1,
          title: 'Pasca-Pengolahan Orthomosaic & DEM dengan Rasterio/GDAL',
          instruction: 'Gunakan Python Rasterio untuk melakukan pemotongan AOI (clip) dan ekstraksi indeks multispektral dari hasil orthomosaic drone.',
          menuPath: 'rasterio.mask() → Orthomosaic Clip',
        },
      ],
    },
  },
  {
    id: 'uav-pix4d-photogrammetry',
    title: 'Otomasi Citra Drone & Orthomosaic (Pix4Dmapper CLI/Batch)',
    subtitle: 'Eksekusi headless 3 tahap Pix4D (--initial, --point-cloud, --dsm, --orthomosaic) + optimasi COG untuk QGIS.',
    category: 'remote-sensing',
    categoryLabel: 'Fotogrametri Drone UAV',
    supportedPlatforms: ['pix4d-cli', 'python-gis', 'pyqgis', 'arcpy'],
    defaultPlatform: 'pix4d-cli',
    difficulty: 'Menengah',
    estimatedMinutes: 25,
    primarySensorOrFormat: 'Citra Drone UAV (.jpg/.tif) → Pix4Dmapper CLI + COG',
    defaultParams: {
      spatialResolutionMeters: 2,
      thresholdValue: 0.05,
      inputLayerPath: 'data/foto_drone_uav',
      outputLayerPath: 'output_pix4d/orthomosaic_pix4d.tif',
    },
    overview:
      'Menjalankan pemrosesan batch Pix4Dmapper secara otomatis melalui Command Line Interface (CLI) dan Python subprocess untuk menghasilkan Initial Quality Report (.pdf), Point Cloud (.las), DSM GeoTIFF, Orthomosaic, serta kompresi Cloud-Optimized GeoTIFF (COG).',
    expectedOutput: 'File proyek .p4d, Quality Report PDF, Point Cloud (.las), DSM & Orthomosaic COG GeoTIFF.',
    tutorialsByPlatform: {
      'pix4d-cli': [
        {
          stepNumber: 1,
          title: 'Verifikasi Path Instalasi Pix4Dmapper & Folder Citra',
          instruction: 'Pastikan lokasi executable pix4dmapper.exe sesuai dengan mesin Anda dan seluruh foto drone memiliki EXIF GPS lengkap.',
          menuPath: 'PIX4D_EXE = "C:\\Program Files\\Pix4Dmapper\\pix4dmapper.exe"',
          proTip: 'Flag -c -r memerintahkan Pix4Dmapper langsung memproses seluruh 3 tahap lalu menutup aplikasi otomatis setelah selesai.',
        },
        {
          stepNumber: 2,
          title: 'Eksekusi Otomasi Batch & Optimasi Orthomosaic COG',
          instruction: 'Jalankan script Python dari Command Prompt / Anaconda. Output Quality Report PDF, .las, DSM, dan Orthomosaic COG otomatis diverifikasi.',
          menuPath: 'python run_pix4d_batch.py',
        },
      ],
    },
  },
  ...COASTAL_HYDRO_TEMPLATES,
  ...ADMIN_MARINE_TEMPLATES,
];

/**
 * Menghitung luas perkiraan Bounding Box dalam km² menggunakan pendekatan geodesik lintang.
 */
export function calculateBboxAreaKm2(bbox: BoundingBox): number {
  const dLon = Math.abs(bbox.maxLon - bbox.minLon);
  const dLat = Math.abs(bbox.maxLat - bbox.minLat);
  if (dLon === 0 || dLat === 0) return 0;

  const meanLatRad = (((bbox.minLat + bbox.maxLat) / 2) * Math.PI) / 180;
  const kmPerDegLat = 111.132;
  const kmPerDegLon = 111.32 * Math.cos(meanLatRad);

  const widthKm = dLon * kmPerDegLon;
  const heightKm = dLat * kmPerDegLat;
  return Math.round(widthKm * heightKm * 10) / 10;
}

/**
 * Menentukan kode EPSG UTM dan nama zona secara otomatis berdasarkan koordinat tengah (Bujur & Lintang).
 */
export function recommendUtmEpsg(lon: number, lat: number): {
  epsg: string;
  zoneNumber: number;
  hemisphere: 'N' | 'S';
  label: string;
} {
  const clampedLon = Math.max(-180, Math.min(179.9999, lon));
  const zoneNumber = Math.floor((clampedLon + 180) / 6) + 1;
  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';
  const epsgPrefix = hemisphere === 'N' ? '326' : '327';
  const zoneStr = String(zoneNumber).padStart(2, '0');
  const epsg = `EPSG:${epsgPrefix}${zoneStr}`;
  const label = `WGS 84 / UTM Zone ${zoneNumber}${hemisphere}`;

  return { epsg, zoneNumber, hemisphere, label };
}

/**
 * Konversi Derajat Desimal (DD) ke Derajat Menit Detik (DMS) yang rapi tanpa detik 60.0".
 */
export function decimalToDms(decimal: number, isLongitude: boolean): string {
  const dir = isLongitude
    ? decimal >= 0
      ? 'BT'
      : 'BB'
    : decimal >= 0
      ? 'LU'
      : 'LS';
  const totalSeconds = Math.round(Math.abs(decimal) * 3600 * 10) / 10;
  const deg = Math.floor(totalSeconds / 3600);
  const remAfterDeg = totalSeconds - deg * 3600;
  const min = Math.floor(remAfterDeg / 60);
  const sec = Math.max(0, remAfterDeg - min * 60).toFixed(1);
  return `${deg}° ${String(min).padStart(2, '0')}' ${sec}" ${dir}`;
}

/**
 * Validasi parameter input script agar tidak ada nilai yang tidak valid.
 */
export function validateScriptParameters(params: ScriptParameters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (params.bbox.minLon >= params.bbox.maxLon) {
    errors.push('Bujur Barat (minLon) harus lebih kecil dari Bujur Timur (maxLon).');
  }
  if (params.bbox.minLat >= params.bbox.maxLat) {
    errors.push('Lintang Selatan (minLat) harus lebih kecil dari Lintang Utara (maxLat).');
  }
  if (params.maxCloudCover < 0 || params.maxCloudCover > 100) {
    errors.push('Persentase tutupan awan harus berada di antara 0% dan 100%.');
  }
  if (params.startDate > params.endDate) {
    errors.push('Tanggal mulai (Start Date) tidak boleh melebihi tanggal akhir (End Date).');
  }
  if (params.spatialResolutionMeters <= 0) {
    errors.push('Resolusi spasial harus lebih besar dari 0 meter.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Menghitung luas poligon kustom (km²) menggunakan rumus Shoelace pada proyeksi metrik lokal.
 */
export function calculatePolygonAreaKm2(vertices: LatLngVertex[]): number {
  if (!vertices || vertices.length < 3) return 0;
  const meanLatRad =
    (vertices.reduce((acc, v) => acc + v.lat, 0) / vertices.length) * (Math.PI / 180);
  const kmPerDegLat = 111.132;
  const kmPerDegLon = 111.32 * Math.cos(meanLatRad);

  let area2 = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const x1 = vertices[i].lng * kmPerDegLon;
    const y1 = vertices[i].lat * kmPerDegLat;
    const x2 = vertices[j].lng * kmPerDegLon;
    const y2 = vertices[j].lat * kmPerDegLat;
    area2 += x1 * y2 - x2 * y1;
  }
  return Math.round(Math.abs(area2 / 2) * 100) / 100;
}

/**
 * Menghitung keliling (perimeter) poligon dalam km.
 */
export function calculatePolygonPerimeterKm(vertices: LatLngVertex[]): number {
  if (!vertices || vertices.length < 2) return 0;
  const meanLatRad =
    (vertices.reduce((acc, v) => acc + v.lat, 0) / vertices.length) * (Math.PI / 180);
  const kmPerDegLat = 111.132;
  const kmPerDegLon = 111.32 * Math.cos(meanLatRad);

  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const dx = (vertices[j].lng - vertices[i].lng) * kmPerDegLon;
    const dy = (vertices[j].lat - vertices[i].lat) * kmPerDegLat;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.round(perimeter * 100) / 100;
}

/**
 * Mengonversi daftar titik poligon menjadi BoundingBox.
 */
export function verticesToBbox(vertices: LatLngVertex[]): BoundingBox {
  if (!vertices || vertices.length === 0) {
    return { minLon: 106.55, minLat: -6.65, maxLon: 107.15, maxLat: -6.08 };
  }
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const v of vertices) {
    if (v.lng < minLon) minLon = v.lng;
    if (v.lng > maxLon) maxLon = v.lng;
    if (v.lat < minLat) minLat = v.lat;
    if (v.lat > maxLat) maxLat = v.lat;
  }
  // Jika hanya 1 titik, beri buffer kecil 0.05 derajat
  if (minLon === maxLon) {
    minLon -= 0.05;
    maxLon += 0.05;
  }
  if (minLat === maxLat) {
    minLat -= 0.05;
    maxLat += 0.05;
  }
  return {
    minLon: Number(minLon.toFixed(5)),
    minLat: Number(minLat.toFixed(5)),
    maxLon: Number(maxLon.toFixed(5)),
    maxLat: Number(maxLat.toFixed(5)),
  };
}

/**
 * Mengekspor AOI aktif (BBox atau Poligon Kustom) ke string WKT (Well-Known Text).
 */
export function exportAoiToWkt(bbox: BoundingBox, customVertices?: LatLngVertex[]): string {
  if (customVertices && customVertices.length >= 3) {
    const ring = [...customVertices, customVertices[0]]
      .map((v) => `${v.lng.toFixed(5)} ${v.lat.toFixed(5)}`)
      .join(', ');
    return `POLYGON((${ring}))`;
  }
  const { minLon, minLat, maxLon, maxLat } = bbox;
  return `POLYGON((${minLon.toFixed(5)} ${minLat.toFixed(5)}, ${maxLon.toFixed(5)} ${minLat.toFixed(5)}, ${maxLon.toFixed(5)} ${maxLat.toFixed(5)}, ${minLon.toFixed(5)} ${maxLat.toFixed(5)}, ${minLon.toFixed(5)} ${minLat.toFixed(5)}))`;
}

/**
 * Mengekspor AOI aktif ke format standar GeoJSON FeatureCollection.
 */
export function exportAoiToGeoJson(
  regionName: string,
  bbox: BoundingBox,
  crsEpsg: string,
  customVertices?: LatLngVertex[]
): string {
  const coords =
    customVertices && customVertices.length >= 3
      ? [
          [...customVertices, customVertices[0]].map((v) => [
            Number(v.lng.toFixed(5)),
            Number(v.lat.toFixed(5)),
          ]),
        ]
      : [
          [
            [bbox.minLon, bbox.minLat],
            [bbox.maxLon, bbox.minLat],
            [bbox.maxLon, bbox.maxLat],
            [bbox.minLon, bbox.maxLat],
            [bbox.minLon, bbox.minLat],
          ],
        ];

  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          nama_aoi: regionName,
          target_epsg: crsEpsg,
          luas_km2:
            customVertices && customVertices.length >= 3
              ? calculatePolygonAreaKm2(customVertices)
              : calculateBboxAreaKm2(bbox),
          source: 'GeoScript Studio',
        },
        geometry: {
          type: 'Polygon',
          coordinates: coords,
        },
      },
    ],
  };
  return JSON.stringify(geojson, null, 2);
}

/**
 * Mem-parsing file spasial yang diunggah pengguna (.geojson, .json, .kml, .csv, .wkt)
 * untuk mengekstrak koordinat AOI, daftar kolom atribut, dan rekomendasi zona UTM.
 */
export function parseUploadedSpatialFile(
  fileName: string,
  rawContent: string
): SpatialFileSummary {
  const lower = fileName.toLowerCase();
  const trimmed = rawContent.trim();

  // 1. GeoJSON / JSON
  if (lower.endsWith('.geojson') || lower.endsWith('.json') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    const features =
      parsed.type === 'FeatureCollection'
        ? parsed.features || []
        : parsed.type === 'Feature'
          ? [parsed]
          : [{ type: 'Feature', properties: {}, geometry: parsed }];

    const vertices: LatLngVertex[] = [];
    const attrSet = new Set<string>();
    const sampleRows: Record<string, string | number>[] = [];
    let geomType = 'Polygon';

    const collectCoords = (coordArr: any) => {
      if (!Array.isArray(coordArr)) return;
      if (typeof coordArr[0] === 'number' && typeof coordArr[1] === 'number') {
        vertices.push({ lng: Number(coordArr[0]), lat: Number(coordArr[1]) });
      } else {
        for (const item of coordArr) collectCoords(item);
      }
    };

    for (const feat of features) {
      if (feat.geometry) {
        geomType = feat.geometry.type || geomType;
        collectCoords(feat.geometry.coordinates);
      }
      if (feat.properties && typeof feat.properties === 'object') {
        const row: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(feat.properties)) {
          attrSet.add(k);
          if (typeof v === 'string' || typeof v === 'number') {
            row[k] = v;
          }
        }
        if (sampleRows.length < 3) sampleRows.push(row);
      }
    }

    // Hapus titik duplikat penutup ring jika ada
    const cleanVertices =
      vertices.length > 3 &&
      vertices[0].lat === vertices[vertices.length - 1].lat &&
      vertices[0].lng === vertices[vertices.length - 1].lng
        ? vertices.slice(0, -1)
        : vertices;

    const bbox = verticesToBbox(cleanVertices);
    const utm = recommendUtmEpsg((bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2);

    return {
      fileName,
      formatLabel: 'GeoJSON',
      featureCount: features.length,
      geometryType: geomType,
      attributeColumns: Array.from(attrSet),
      bbox,
      vertices: cleanVertices.slice(0, 60),
      recommendedEpsg: utm.epsg,
      sampleRows,
    };
  }

  // 2. KML
  if (lower.endsWith('.kml') || trimmed.includes('<kml') || trimmed.includes('<coordinates>')) {
    const coordMatch = trimmed.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    const vertices: LatLngVertex[] = [];
    if (coordMatch && coordMatch[1]) {
      const tuples = coordMatch[1].trim().split(/\s+/);
      for (const t of tuples) {
        const parts = t.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
            vertices.push({ lng, lat });
          }
        }
      }
    }
    const cleanVertices =
      vertices.length > 3 &&
      vertices[0].lat === vertices[vertices.length - 1].lat &&
      vertices[0].lng === vertices[vertices.length - 1].lng
        ? vertices.slice(0, -1)
        : vertices;
    const bbox = verticesToBbox(cleanVertices);
    const utm = recommendUtmEpsg((bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2);
    return {
      fileName,
      formatLabel: 'KML',
      featureCount: 1,
      geometryType: cleanVertices.length >= 3 ? 'Polygon' : 'Point',
      attributeColumns: ['Name', 'Description'],
      bbox,
      vertices: cleanVertices,
      recommendedEpsg: utm.epsg,
      sampleRows: [{ Name: fileName.replace(/\.kml$/i, '') }],
    };
  }

  // 3. WKT (POLYGON / LINESTRING / POINT)
  if (lower.endsWith('.wkt') || /^(POLYGON|MULTIPOLYGON|LINESTRING|POINT)\s*\(/i.test(trimmed)) {
    const inner = trimmed.replace(/^[A-Z]+\s*\(+/i, '').replace(/\)+$/, '');
    const pairs = inner.split(',');
    const vertices: LatLngVertex[] = [];
    for (const p of pairs) {
      const nums = p.trim().split(/\s+/);
      if (nums.length >= 2) {
        const lng = parseFloat(nums[0]);
        const lat = parseFloat(nums[1]);
        if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
          vertices.push({ lng, lat });
        }
      }
    }
    const cleanVertices =
      vertices.length > 3 &&
      vertices[0].lat === vertices[vertices.length - 1].lat &&
      vertices[0].lng === vertices[vertices.length - 1].lng
        ? vertices.slice(0, -1)
        : vertices;
    const bbox = verticesToBbox(cleanVertices);
    const utm = recommendUtmEpsg((bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2);
    return {
      fileName,
      formatLabel: 'WKT Geometry',
      featureCount: 1,
      geometryType: 'Polygon',
      attributeColumns: ['wkt_id'],
      bbox,
      vertices: cleanVertices,
      recommendedEpsg: utm.epsg,
      sampleRows: [],
    };
  }

  // 4. CSV Koordinat (lat, lon, ...)
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = (lines[0] || '').split(',').map((h) => h.trim());
  const lonIdx = headers.findIndex((h) => /^(lon|lng|longitude|bujur|x)$/i.test(h));
  const latIdx = headers.findIndex((h) => /^(lat|latitude|lintang|y)$/i.test(h));

  const vertices: LatLngVertex[] = [];
  const sampleRows: Record<string, string | number>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (lonIdx >= 0 && latIdx >= 0 && cols[lonIdx] && cols[latIdx]) {
      const lng = parseFloat(cols[lonIdx]);
      const lat = parseFloat(cols[latIdx]);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        vertices.push({ lng, lat });
      }
    }
    if (sampleRows.length < 3) {
      const row: Record<string, string | number> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? '';
      });
      sampleRows.push(row);
    }
  }

  const bbox = verticesToBbox(vertices);
  const utm = recommendUtmEpsg((bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2);

  return {
    fileName,
    formatLabel: 'CSV Koordinat',
    featureCount: Math.max(1, lines.length - 1),
    geometryType: 'Point / Multipoint',
    attributeColumns: headers,
    bbox,
    vertices,
    recommendedEpsg: utm.epsg,
    sampleRows,
  };
}

export const SAMPLE_SPATIAL_FILES: {
  id: string;
  label: string;
  fileName: string;
  description: string;
  content: string;
}[] = [
  {
    id: 'ikn-kipp-geojson',
    label: 'GeoJSON Poligon KIPP IKN Nusantara',
    fileName: 'batas_kipp_ikn_nusantara.geojson',
    description: 'Poligon batas Kawasan Inti Pusat Pemerintahan (KIPP) IKN Kalimantan Timur dengan atribut zona tata ruang.',
    content: JSON.stringify(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              KODE_WP: 'WP-KIPP-01',
              NAMA_ZONA: 'Kawasan Inti Pusat Pemerintahan IKN',
              FUNGSI_LAHAN: 'Perkantoran & Hijau Rapat',
              TARGET_TUTUPAN_HIJAU_PERSEN: 75,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [116.685, -0.995],
                  [116.755, -0.995],
                  [116.772, -0.935],
                  [116.715, -0.905],
                  [116.672, -0.942],
                  [116.685, -0.995],
                ],
              ],
            },
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: 'citarum-water-csv',
    label: 'CSV Titik Stasiun Kualitas Air DAS Citarum',
    fileName: 'stasiun_pemantauan_citarum.csv',
    description: 'Tabel koordinat stasiun pemantauan kualitas air sungai dengan kolom ID_STASIUN, NAMA_SUNGAI, dan INDEKS_PENCEMARAN.',
    content: `ID_STASIUN,NAMA_LOKASI,lat,lon,KELAS_AIR,DEBIT_M3S
CTR-01,Hulu Situ Cisanti,-7.2085,107.6582,Kelas I,4.2
CTR-02,Majalaya Tengah,-7.0512,107.7545,Kelas III,18.7
CTR-03,Dayeuhkolot Hilir,-6.9894,107.6258,Kelas IV,42.5
CTR-04,Inlet Waduk Saguling,-6.9125,107.4812,Kelas III,64.1`,
  },
  {
    id: 'bali-subak-wkt',
    label: 'WKT Poligon Lanskap Subak Gianyar Bali',
    fileName: 'subak_pulagan_gianyar.wkt',
    description: 'Geometri Well-Known Text (WKT) poligon persawahan Subak di Kabupaten Gianyar, Bali untuk analisis NDWI & SAVI.',
    content: `POLYGON((115.2450 -8.4850, 115.3250 -8.4850, 115.3350 -8.4120, 115.2520 -8.4080, 115.2450 -8.4850))`,
  },
];

/**
 * Generator Script Multi-Platform berdasarkan Template, Platform, dan Parameter Spasial.
 */
export function generateGisScript(
  templateId: string,
  platformId: GisPlatformId,
  params: ScriptParameters
): string {
  const {
    regionName,
    bbox,
    crsEpsg,
    startDate,
    endDate,
    maxCloudCover,
    sensor,
    spectralIndex,
    bufferDistanceMeters,
    inputLayerPath,
    outputLayerPath,
    spatialResolutionMeters,
    thresholdValue,
    includeVisualization,
    includeExport,
    pipelineSteps,
    customPolygon,
    uploadedFileSummary,
  } = params;

  const indexDef =
    SPECTRAL_INDEX_DEFINITIONS.find((idx) => idx.id === spectralIndex) ||
    SPECTRAL_INDEX_DEFINITIONS[0];
  const sensorBands = indexDef.bandsBySensor[sensor] || indexDef.bandsBySensor.S2_SR;
  const hasCustomPolygon = Boolean(customPolygon && customPolygon.length >= 3);
  const areaKm2 = hasCustomPolygon
    ? calculatePolygonAreaKm2(customPolygon!)
    : calculateBboxAreaKm2(bbox);
  const bboxCoordsStr = `${bbox.minLon.toFixed(4)}, ${bbox.minLat.toFixed(4)}, ${bbox.maxLon.toFixed(4)}, ${bbox.maxLat.toFixed(4)}`;
  const epsgNumberOnly = crsEpsg.replace('EPSG:', '');

  // Format koordinat poligon kustom untuk GEE, Python, dan WKT
  const geePolygonCoords = hasCustomPolygon
    ? JSON.stringify([
        [...customPolygon!, customPolygon![0]].map((v) => [
          Number(v.lng.toFixed(5)),
          Number(v.lat.toFixed(5)),
        ]),
      ])
    : '';
  const pyPolygonCoords = hasCustomPolygon
    ? [...customPolygon!, customPolygon![0]]
        .map((v) => `(${v.lng.toFixed(5)}, ${v.lat.toFixed(5)})`)
        .join(', ')
    : '';
  const wktPolygonStr = exportAoiToWkt(bbox, customPolygon);

  const uploadedAttrComment =
    uploadedFileSummary && uploadedFileSummary.attributeColumns.length > 0
      ? `File Spasial: ${uploadedFileSummary.fileName} (${uploadedFileSummary.formatLabel}, ${uploadedFileSummary.featureCount} fitur) · Atribut: [${uploadedFileSummary.attributeColumns.join(', ')}]`
      : '';

  const geeCollectionId =
    sensor === 'S2_SR'
      ? 'COPERNICUS/S2_SR_HARMONIZED'
      : sensor === 'LANDSAT_8_9'
        ? 'LANDSAT/LC08/C02/T1_L2'
        : sensor === 'SENTINEL_1_SAR'
          ? 'COPERNICUS/S1_GRD'
          : 'MODIS/061/MOD09GA';

  const activePipelineComment =
    pipelineSteps && pipelineSteps.length > 0
      ? `Alur Pipeline Aktif: ${pipelineSteps.join(' -> ')}`
      : 'Alur Pipeline Standar';

  const geeAoiDeclaration = hasCustomPolygon
    ? `var aoi = ee.Geometry.Polygon(${geePolygonCoords});`
    : `var aoi = ee.Geometry.Rectangle([${bboxCoordsStr}]);`;

  const extCtx = {
    areaKm2,
    bboxCoordsStr,
    epsgNumberOnly,
    hasCustomPolygon,
    geeAoiDeclaration,
    pyPolygonCoords,
    wktPolygonStr,
    activePipelineComment,
    uploadedAttrComment,
  };

  if (isCoastalHydroTemplate(templateId)) {
    return generateCoastalHydroScript(templateId, platformId, params, extCtx);
  }
  if (isAdminMarineTemplate(templateId)) {
    return generateAdminMarineScript(templateId, platformId, params, extCtx);
  }
  if (platformId === 'agisoft-py') {
    return generateAgisoftMetashapeScript(templateId, params, extCtx);
  }
  if (platformId === 'pix4d-cli') {
    return generatePix4dScript(templateId, params, extCtx);
  }
  if (templateId === 'tidal-analysis-harmonics') {
    return generateTidalScript(platformId, params, extCtx);
  }
  if (templateId === 'shoreline-slope-erosion') {
    return generateShorelineSlopeScript(platformId, params, extCtx);
  }
  if (templateId === 'land-cover-classification') {
    return generateLandCoverScript(platformId, params, extCtx);
  }

  // 1. GOOGLE EARTH ENGINE (JAVASCRIPT)
  if (platformId === 'gee-js') {
    if (templateId === 'flood-sar-sentinel1') {
      return `/**
 * GeoScript Studio — Pemetaan Banjir Radar Sentinel-1 SAR
 * Wilayah Studi : ${regionName} (~${areaKm2} km²)
 * Proyeksi Output: ${crsEpsg} | Resolusi: ${spatialResolutionMeters}m
 * ${activePipelineComment}
 */

// 1. Definisi Area of Interest (AOI) Bounding Box
var aoi = ee.Geometry.Rectangle([${bboxCoordsStr}]);
Map.centerObject(aoi, 11);

// 2. Muat Koleksi Citra Sentinel-1 C-Band SAR GRD (Polarisasi VV)
var s1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .select('VV');

// Periode Baseline (Sebelum Banjir) & Periode Kejadian (${startDate} s/d ${endDate})
var preFlood = s1Collection.filterDate('2026-01-01', '${startDate}').median().clip(aoi);
var postFlood = s1Collection.filterDate('${startDate}', '${endDate}').median().clip(aoi);

// 3. Speckle Filtering (Focal Median 50m) & Masking Kemiringan Lereng DEM < 5 Derajat
var smoothPre = preFlood.focal_median(50, 'circle', 'meters');
var smoothPost = postFlood.focal_median(50, 'circle', 'meters');

var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(aoi);
var slope = ee.Terrain.slope(dem);

// 4. Deteksi Genangan Banjir (Ambang Backscatter < ${thresholdValue} dB & Beda > 3 dB)
var diffSar = smoothPost.subtract(smoothPre);
var floodMask = smoothPost.lt(${thresholdValue})
  .and(diffSar.lt(-2.5))
  .and(slope.lt(5))
  .selfMask()
  .rename('flood_extent');

// 5. Perhitungan Luas Genangan Banjir dalam Hektar (Ha)
var floodAreaHa = floodMask.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e10
});
print('Estimasi Luas Genangan Banjir (Hektar):', floodAreaHa.get('flood_extent'));

${
  includeVisualization
    ? `// 6. Visualisasi Layer di Peta GEE
Map.addLayer(smoothPre, {min: -25, max: 0}, 'SAR VV Sebelum Banjir (dB)', false);
Map.addLayer(smoothPost, {min: -25, max: 0}, 'SAR VV Saat Banjir (dB)');
Map.addLayer(floodMask, {palette: ['#0284c7']}, 'Genangan Banjir Terdeteksi');`
    : '// Visualisasi peta dinonaktifkan sesuai konfigurasi.'
}

${
  includeExport
    ? `// 7. Ekspor Hasil Peta Banjir ke Google Drive (${crsEpsg})
Export.image.toDrive({
  image: floodMask.unmask(0).toByte(),
  description: 'Flood_SAR_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
  folder: 'GeoScript_Exports',
  region: aoi,
  scale: ${spatialResolutionMeters},
  crs: '${crsEpsg}',
  maxPixels: 1e10
});`
    : '// Ekspor Google Drive dinonaktifkan.'
}
`;
    }

    if (templateId === 'lst-thermal-landsat') {
      return `/**
 * GeoScript Studio — Analisis Land Surface Temperature (LST) Landsat 8/9 C2 L2
 * Wilayah Studi : ${regionName} (~${areaKm2} km²)
 * Rentang Waktu : ${startDate} s/d ${endDate} (Awan Maks: ${maxCloudCover}%)
 * Proyeksi      : ${crsEpsg} | Ambang Hotspot: ${thresholdValue} °C
 */

var aoi = ee.Geometry.Rectangle([${bboxCoordsStr}]);
Map.centerObject(aoi, 11);

// 1. Fungsi Cloud Masking & Faktor Skala Resmi USGS Collection 2 Level-2
function prepLandsatC2L2(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  var optical = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalCelsius = image.select('ST_B10')
    .multiply(0.00341802)
    .add(149.0)
    .subtract(273.15)
    .rename('LST_Celsius');
  return image.addBands(optical, null, true)
    .addBands(thermalCelsius)
    .updateMask(mask);
}

// 2. Filter Koleksi Landsat 8 & 9 dan Hitung Komposit Median
var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUD_COVER', ${maxCloudCover}))
  .map(prepLandsatC2L2);

var medianImg = col.median().clip(aoi);
var lstCelsius = medianImg.select('LST_Celsius');
var ndvi = medianImg.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var uhiHotspot = lstCelsius.gt(${thresholdValue}).selfMask().rename('UHI_Hotspot');

// 3. Statistik Suhu Rata-Rata, Minimum & Maksimum di AOI
var stats = lstCelsius.reduceRegion({
  reducer: ee.Reducer.mean().combine({reducer2: ee.Reducer.minMax(), sharedInputs: true}),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e9
});
print('Statistik Suhu Permukaan (°C):', stats);

${
  includeVisualization
    ? `Map.addLayer(ndvi, {min: 0, max: 0.8, palette: ['#f7fcb9', '#addd8e', '#31a354']}, 'Kerapatan Vegetasi (NDVI)', false);
Map.addLayer(lstCelsius, {min: 22, max: 38, palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']}, 'Suhu Permukaan LST (°C)');
Map.addLayer(uhiHotspot, {palette: ['#dc2626']}, 'Zona Hotspot > ${thresholdValue} °C');`
    : ''
}

${
  includeExport
    ? `Export.image.toDrive({
  image: lstCelsius.toFloat(),
  description: 'LST_Celsius_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
  folder: 'GeoScript_Exports',
  region: aoi,
  scale: ${spatialResolutionMeters},
  crs: '${crsEpsg}',
  maxPixels: 1e10
});`
    : ''
}
`;
    }

    // Default GEE JS (Spectral Index / Buffer / Terrain)
    return `/**
 * GeoScript Studio — Pengolahan Citra & Analisis Spasial Google Earth Engine
 * Wilayah Studi : ${regionName} (~${areaKm2} km²)
 * Koordinat BBox: [${bboxCoordsStr}]${hasCustomPolygon ? ` (Poligon Kustom ${customPolygon!.length} Titik)` : ''}
 * Indeks & Sensor: ${indexDef.id} (${indexDef.indonesianName}) · ${geeCollectionId}
 * Periode Akuisisi: ${startDate} s/d ${endDate} | Tutupan Awan Maks: ${maxCloudCover}%
 * Proyeksi & Skala: ${crsEpsg} (${spatialResolutionMeters} meter)
 * ${activePipelineComment}${uploadedAttrComment ? `\n * ${uploadedAttrComment}` : ''}
 */

// 1. Definisi Geometri Area of Interest (AOI)
${geeAoiDeclaration}
Map.centerObject(aoi, 11);

// 2. Fungsi Pembersihan Awan (Cloud & Cirrus Masking)
function maskClouds(img) {
  var qa = img.select('${sensor === 'S2_SR' ? 'QA60' : 'QA_PIXEL'}');
  var mask = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  return img.updateMask(mask).divide(10000)
    .copyProperties(img, ['system:time_start']);
}

// 3. Penyaringan Koleksi Citra & Komposit Median
var collection = ee.ImageCollection('${geeCollectionId}')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('${sensor === 'S2_SR' ? 'CLOUDY_PIXEL_PERCENTAGE' : 'CLOUD_COVER'}', ${maxCloudCover}))${sensor === 'S2_SR' ? '\n  .map(maskClouds)' : ''};

print('Jumlah Citra Tersedia di AOI:', collection.size());
var composite = collection.median().clip(aoi);

// 4. Perhitungan ${indexDef.name} (${indexDef.id})
// Rumus Band: ${sensorBands.expression} (${sensorBands.bandDescription})
${
  indexDef.id === 'BSI' && sensor === 'S2_SR'
    ? `var spectralIndex = composite.expression('((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))', {
  B11: composite.select('B11'), B4: composite.select('B4'), B8: composite.select('B8'), B2: composite.select('B2')
}).rename('${indexDef.id}');`
    : indexDef.id === 'MVI' && sensor === 'S2_SR'
      ? `var spectralIndex = composite.expression('(B8 - B3) / (B11 - B3 + 1e-6)', {
  B8: composite.select('B8'), B3: composite.select('B3'), B11: composite.select('B11')
}).rename('${indexDef.id}');`
      : indexDef.id === 'AWEI' && sensor === 'S2_SR'
        ? `var spectralIndex = composite.expression('4 * (B3 - B11) - (0.25 * B8 + 2.75 * B12)', {
  B3: composite.select('B3'), B11: composite.select('B11'), B8: composite.select('B8'), B12: composite.select('B12')
}).rename('${indexDef.id}');`
        : indexDef.id === 'EVI' && sensor === 'S2_SR'
          ? `var spectralIndex = composite.expression('2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))', {
  B8: composite.select('B8'), B4: composite.select('B4'), B2: composite.select('B2')
}).rename('${indexDef.id}');`
          : indexDef.id === 'SAVI' && sensor === 'S2_SR'
            ? `var spectralIndex = composite.expression('((B8 - B4) / (B8 + B4 + 0.5)) * 1.5', {
  B8: composite.select('B8'), B4: composite.select('B4')
}).rename('${indexDef.id}');`
            : `var spectralIndex = composite.normalizedDifference(['${sensorBands.geeBands[0]}', '${sensorBands.geeBands[1]}'])
  .rename('${indexDef.id}');`
}

// Klasifikasi Ambang Batas (${indexDef.id} >= ${thresholdValue})
var thresholdMask = spectralIndex.gte(${thresholdValue}).selfMask().rename('${indexDef.id}_High');

// 5. Perhitungan Luas Kelas Terpilih dalam Hektar (Ha)
var areaHa = thresholdMask.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e10
});
print('Luas Area ${indexDef.id} >= ${thresholdValue} (Hektar):', areaHa.get('${indexDef.id}_High'));

${
  includeVisualization
    ? `// 6. Visualisasi Peta & Palet Warna Kartografi
var visIndex = {
  min: -0.2,
  max: 0.85,
  palette: ${JSON.stringify(indexDef.paletteHex)}
};
Map.addLayer(composite, {bands: ['${sensor === 'S2_SR' ? 'B4' : 'SR_B4'}', '${sensor === 'S2_SR' ? 'B3' : 'SR_B3'}', '${sensor === 'S2_SR' ? 'B2' : 'SR_B2'}'], min: 0, max: 0.3}, 'Komposit True Color RGB', false);
Map.addLayer(spectralIndex, visIndex, 'Indeks ${indexDef.id} — ${regionName}');
Map.addLayer(thresholdMask, {palette: ['#0d9488']}, 'Kelas ${indexDef.id} >= ${thresholdValue}', false);`
    : '// Visualisasi layer peta dilewati.'
}

${
  includeExport
    ? `// 7. Ekspor Raster GeoTIFF ke Google Drive
Export.image.toDrive({
  image: spectralIndex.toFloat(),
  description: 'Export_${indexDef.id}_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
  folder: 'GeoScript_Exports',
  region: aoi,
  scale: ${spatialResolutionMeters},
  crs: '${crsEpsg}',
  maxPixels: 1e10
});`
    : '// Ekspor Google Drive dilewati.'
}
`;
  }

  // 2. PYTHON (GEOPANDAS & RASTERIO)
  if (platformId === 'python-gis') {
    if (templateId === 'vector-buffer-zonal-stats') {
      return `"""
GeoScript Studio — Analisis Vektor Buffer & Perhitungan Luas Hektar (GeoPandas)
Wilayah Studi  : ${regionName} (~${areaKm2} km²)
Bounding Box   : [${bboxCoordsStr}]
Proyeksi Metrik: ${crsEpsg} | Jarak Buffer: ${bufferDistanceMeters} meter
${activePipelineComment}${uploadedAttrComment ? `\n${uploadedAttrComment}` : ''}
"""

from pathlib import Path
import geopandas as gpd
from shapely.geometry import box, Polygon
import pandas as pd

# 1. Konfigurasi Parameter & Path Data Spasial
INPUT_VECTOR = Path("${uploadedFileSummary ? uploadedFileSummary.fileName : inputLayerPath}")
OUTPUT_VECTOR = Path("${outputLayerPath}")
TARGET_CRS = "${crsEpsg}"
BUFFER_METERS = ${bufferDistanceMeters}
${
  uploadedFileSummary && uploadedFileSummary.attributeColumns.length > 0
    ? `ATTRIBUTE_COLUMNS = ${JSON.stringify(uploadedFileSummary.attributeColumns)}`
    : ''
}

# 2. Definisi Geometri AOI (WGS 84 -> ${crsEpsg})
aoi_geom = ${hasCustomPolygon ? `Polygon([${pyPolygonCoords}])` : `box(${bboxCoordsStr})`}
aoi_gdf = gpd.GeoDataFrame({"region": ["${regionName}"]}, geometry=[aoi_geom], crs="EPSG:4326")
aoi_utm = aoi_gdf.to_crs(TARGET_CRS)

def run_vector_buffer_pipeline():
    print(f"[1/4] Memuat layer vektor dari: {INPUT_VECTOR}")
    gdf = gpd.read_file(INPUT_VECTOR)

    # Potong (Clip) fitur berdasarkan AOI dan reproyeksikan ke koordinat metrik UTM
    print(f"[2/4] Memotong layer ke AOI dan mereproyeksikan ke {TARGET_CRS}...")
    gdf_utm = gdf.to_crs(TARGET_CRS)
    gdf_clipped = gpd.clip(gdf_utm, aoi_utm)

    # Buat poligon penyangga (Buffer) dalam satuan meter
    print(f"[3/4] Membuat zona buffer {BUFFER_METERS} meter...")
    gdf_clipped["geometry"] = gdf_clipped.geometry.buffer(BUFFER_METERS)

    # Hitung luas geometri dalam satuan Hektar (Ha) dan km²
    gdf_clipped["luas_ha"] = (gdf_clipped.geometry.area / 10_000).round(3)
    gdf_clipped["luas_km2"] = (gdf_clipped.geometry.area / 1_000_000).round(4)

    # Ringkasan statistik spasial
    total_ha = gdf_clipped["luas_ha"].sum()
    print(f"Total Fitur Terproses : {len(gdf_clipped)}")
    print(f"Total Luas Buffer (Ha): {total_ha:,.2f} Ha")

    # Ekspor ke GeoPackage (.gpkg) dan ringkasan CSV
    OUTPUT_VECTOR.parent.mkdir(parents=True, exist_ok=True)
    gdf_clipped.to_file(OUTPUT_VECTOR, driver="GPKG", layer="buffer_${bufferDistanceMeters}m")
    gdf_clipped.drop(columns="geometry").to_csv(OUTPUT_VECTOR.with_suffix(".csv"), index=False)
    print(f"[4/4] Berhasil menyimpan output ke: {OUTPUT_VECTOR}")

if __name__ == "__main__":
    run_vector_buffer_pipeline()
`;
    }

    return `"""
GeoScript Studio — Pengolahan Raster & Indeks Spektral ${indexDef.id} (Rasterio & NumPy)
Wilayah Studi : ${regionName} (~${areaKm2} km²)
Bounding Box  : [${bboxCoordsStr}]
Indeks & Rumus: ${indexDef.id} = ${sensorBands.expression}
Proyeksi & Res: ${crsEpsg} (${spatialResolutionMeters}m) | Threshold: ${thresholdValue}
${activePipelineComment}
"""

from pathlib import Path
import numpy as np
import rasterio
from rasterio.mask import mask
from shapely.geometry import box, mapping
import geopandas as gpd

# 1. Konfigurasi Parameter Spasial
BAND_A_PATH = Path("data/${sensorBands.geeBands[0]}.tif")  # Band Pertama (${sensorBands.geeBands[0]})
BAND_B_PATH = Path("data/${sensorBands.geeBands[1]}.tif")  # Band Kedua (${sensorBands.geeBands[1]})
OUTPUT_TIF = Path("${outputLayerPath.replace('.gpkg', '.tif')}")
THRESHOLD_VAL = ${thresholdValue}

# Geometri AOI Bounding Box
aoi_wgs84 = gpd.GeoDataFrame(geometry=[box(${bboxCoordsStr})], crs="EPSG:4326")

def compute_spectral_index():
    with rasterio.open(BAND_A_PATH) as src_a, rasterio.open(BAND_B_PATH) as src_b:
        # Sesuaikan sistem koordinat AOI dengan CRS raster input
        aoi_projected = aoi_wgs84.to_crs(src_a.crs)
        geoms = [mapping(geom) for geom in aoi_projected.geometry]

        # Crop (Clip) kedua band menggunakan geometri AOI
        band_a_crop, out_transform = mask(src_a, geoms, crop=True)
        band_b_crop, _ = mask(src_b, geoms, crop=True)

        band_a = band_a_crop[0].astype("float32")
        band_b = band_b_crop[0].astype("float32")

        # Hindari pembagian dengan nol (ZeroDivisionError)
        np.seterr(divide="ignore", invalid="ignore")
        numerator = band_a - band_b
        denominator = band_a + band_b
        index_arr = np.where(denominator != 0, numerator / denominator, np.nan)

        # Klasifikasi biner berdasarkan ambang batas (${thresholdValue})
        classified = np.where(index_arr >= THRESHOLD_VAL, 1, 0).astype("uint8")
        pixel_area_ha = (${spatialResolutionMeters} * ${spatialResolutionMeters}) / 10_000
        high_area_ha = float(np.nansum(classified == 1) * pixel_area_ha)
        print(f"Estimasi Luas ${indexDef.id} >= {THRESHOLD_VAL}: {high_area_ha:,.2f} Hektar")

        # Simpan hasil indeks ke GeoTIFF 32-bit terkompresi LZW
        out_meta = src_a.meta.copy()
        out_meta.update({
            "driver": "GTiff",
            "height": index_arr.shape[0],
            "width": index_arr.shape[1],
            "transform": out_transform,
            "dtype": "float32",
            "count": 1,
            "nodata": -9999.0,
            "compress": "lzw"
        })

        OUTPUT_TIF.parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(OUTPUT_TIF, "w", **out_meta) as dst:
            dst.write(np.nan_to_num(index_arr, nan=-9999.0), 1)
        print(f"GeoTIFF berhasil disimpan di: {OUTPUT_TIF}")

if __name__ == "__main__":
    compute_spectral_index()
`;
  }

  // 3. PYQGIS (QGIS 3.34+ PYTHON CONSOLE & PROCESSING)
  if (platformId === 'pyqgis') {
    if (templateId === 'automated-map-layout-batch') {
      return `# ==============================================================================
# GeoScript Studio — Otomatisasi Print Layout & Batch Atlas Export (PyQGIS 3.34+)
# Wilayah Studi : ${regionName} (~${areaKm2} km²)
# Proyeksi Peta : ${crsEpsg} | Resolusi Cetak: 300 DPI
# Cara Pakai    : Buka QGIS -> Plugins -> Python Console -> Show Editor -> Run
# ==============================================================================

import os
from qgis.core import (
    QgsProject,
    QgsLayoutExporter,
    QgsVectorLayer,
    QgsCoordinateReferenceSystem
)

# 1. Parameter Input Layer Wilayah & Folder Output
LAYER_NAME_OR_PATH = "${inputLayerPath}"
LAYOUT_NAME = "Layout_Pemetaan_Utama"
OUTPUT_DIR = os.path.dirname("${outputLayerPath}") or "output_atlas"
os.makedirs(OUTPUT_DIR, exist_ok=True)

project = QgsProject.instance()
project.setCrs(QgsCoordinateReferenceSystem("${crsEpsg}"))

# 2. Ambil Print Layout dari Layout Manager QGIS
manager = project.layoutManager()
layout = manager.layoutByName(LAYOUT_NAME)

if not layout:
    raise RuntimeError(f"Print Layout '{LAYOUT_NAME}' belum dibuat di Project -> Layout Manager.")

map_item = layout.itemById("PetaUtama")
title_label = layout.itemById("JudulPeta")

# 3. Iterasi Setiap Fitur di Dalam Bounding Box AOI & Ekspor PDF 300 DPI
layer = QgsVectorLayer(LAYER_NAME_OR_PATH, "Unit_Wilayah", "ogr")
exporter = QgsLayoutExporter(layout)
pdf_settings = QgsLayoutExporter.PdfExportSettings()
pdf_settings.dpi = 300

for idx, feat in enumerate(layer.getFeatures(), start=1):
    geom_bbox = feat.geometry().boundingBox()
    geom_bbox.scale(1.15)  # Beri margin 15% di sekeliling poligon
    if map_item:
        map_item.zoomToExtent(geom_bbox)
    if title_label:
        title_label.setText(f"Peta Tematik ${regionName} — Unit #{idx}")

    layout.refresh()
    out_pdf = os.path.join(OUTPUT_DIR, f"Peta_Unit_{idx:03d}.pdf")
    result = exporter.exportToPdf(out_pdf, pdf_settings)
    print(f"[{idx}] Ekspor PDF selesai: {out_pdf} (Status: {result})")
`;
    }

    return `# ==============================================================================
# GeoScript Studio — Script PyQGIS & Processing Framework (QGIS 3.34+)
# Wilayah Studi : ${regionName} (~${areaKm2} km²)
# Bounding Box  : [${bboxCoordsStr}] (${crsEpsg})
# Analisis      : ${indexDef.indonesianName} | Jarak Buffer: ${bufferDistanceMeters}m
# Cara Pakai    : Buka QGIS -> Plugins -> Python Console (Ctrl+Alt+P) -> Run
# ==============================================================================

import processing
from qgis.core import (
    QgsProject,
    QgsRasterLayer,
    QgsVectorLayer,
    QgsCoordinateReferenceSystem,
    QgsRectangle
)
from qgis.utils import iface

# 1. Atur Sistem Koordinat Proyek QGIS ke ${crsEpsg}
project = QgsProject.instance()
target_crs = QgsCoordinateReferenceSystem("${crsEpsg}")
project.setCrs(target_crs)

# 2. Definisi Extent AOI (${regionName})
aoi_extent = "${bbox.minLon},${bbox.maxLon},${bbox.minLat},${bbox.maxLat} [EPSG:4326]"
input_path = "${inputLayerPath}"
output_path = "${outputLayerPath}"

# 3. Reproyeksi Layer & Pemotongan (Clip) sesuai Bounding Box AOI
reprojected = processing.run("native:reprojectlayer", {
    "INPUT": input_path,
    "TARGET_CRS": target_crs,
    "OUTPUT": "memory:layer_utm"
})["OUTPUT"]

buffered = processing.run("native:buffer", {
    "INPUT": reprojected,
    "DISTANCE": ${bufferDistanceMeters},
    "SEGMENTS": 8,
    "DISSOLVE": False,
    "OUTPUT": "memory:layer_buffered"
})["OUTPUT"]

# 4. Tambahkan Kolom Perhitungan Luas Hektar (luas_ha) secara Otomatis
final_res = processing.run("native:fieldcalculator", {
    "INPUT": buffered,
    "FIELD_NAME": "luas_ha",
    "FIELD_TYPE": 0,  # Float / Decimal
    "FIELD_LENGTH": 12,
    "FIELD_PRECISION": 3,
    "FORMULA": "$area / 10000.0",
    "OUTPUT": output_path
})["OUTPUT"]

# 5. Muat Hasil Olahan ke Map Canvas QGIS & Zoom ke AOI
result_layer = QgsVectorLayer(final_res, "Hasil_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}", "ogr")
if result_layer.isValid():
    project.addMapLayer(result_layer)
    iface.mapCanvas().setExtent(result_layer.extent())
    iface.mapCanvas().refresh()
    print(f"Sukses! Layer dimuat ke QGIS Canvas: {final_res}")
`;
  }

  // 4. ARCGIS PRO (ARCPY)
  if (platformId === 'arcpy') {
    return `# ==============================================================================
# GeoScript Studio — Otomasi Geoprocessing ArcGIS Pro (ArcPy 3.x)
# Wilayah Studi : ${regionName} (~${areaKm2} km²)
# Bounding Box  : [${bboxCoordsStr}]
# Sistem Proyeksi: ${crsEpsg} (WKID: ${epsgNumberOnly})
# ==============================================================================

import arcpy
from arcpy.sa import *

# 1. Pemeriksaan Lisensi Spatial Analyst & Pengaturan Environment
arcpy.CheckOutExtension("Spatial")
arcpy.env.overwriteOutput = True
arcpy.env.outputCoordinateSystem = arcpy.SpatialReference(${epsgNumberOnly})
arcpy.env.extent = arcpy.Extent(${bbox.minLon}, ${bbox.minLat}, ${bbox.maxLon}, ${bbox.maxLat})
arcpy.env.cellSize = ${spatialResolutionMeters}

input_data = r"${inputLayerPath}"
output_data = r"${outputLayerPath}"

print(f"Memulai geoprocessing ArcPy untuk wilayah: ${regionName} (${crsEpsg})...")

# 2. Eksekusi Analisis Spasial (Indeks Spektral ${indexDef.id} & Pairwise Buffer ${bufferDistanceMeters}m)
if input_data.lower().endswith((".tif", ".img")):
    band_nir = Raster(r"data/${sensorBands.geeBands[0]}.tif")
    band_red = Raster(r"data/${sensorBands.geeBands[1]}.tif")
    index_raster = Float(band_nir - band_red) / Float(band_nir + band_red)
    threshold_raster = Con(index_raster >= ${thresholdValue}, 1, 0)
    index_raster.save(output_data.replace(".gpkg", "_${indexDef.id}.tif"))
    print(f"Raster ${indexDef.id} tersimpan: {output_data}")
else:
    # Pairwise Buffer Geodesik & Perhitungan Luas Hektar
    arcpy.analysis.PairwiseBuffer(
        in_features=input_data,
        out_feature_class=output_data,
        buffer_distance_or_field="${bufferDistanceMeters} Meters",
        dissolve_option="NONE",
        method="GEODESIC"
    )
    arcpy.management.CalculateGeometryAttributes(
        in_features=output_data,
        geometry_property=[["LUAS_HA", "AREA_GEODESIC"]],
        area_unit="HECTARES",
        coordinate_system=arcpy.SpatialReference(${epsgNumberOnly})
    )
    print(f"Feature class berhasil dibuat dengan atribut LUAS_HA: {output_data}")
`;
  }

  // 5. GOOGLE EARTH ENGINE PYTHON API (GEEMAP)
  if (platformId === 'gee-py') {
    return `"""
GeoScript Studio — Google Earth Engine Python API & geemap
Wilayah Studi : ${regionName} (~${areaKm2} km²)
Indeks & Sensor: ${indexDef.id} (${geeCollectionId}) | Proyeksi: ${crsEpsg}
"""

import ee
import geemap

# 1. Autentikasi & Inisialisasi Earth Engine
ee.Initialize()

# 2. Buat Peta Interaktif geemap & Geometri AOI
m = geemap.Map(center=[${((bbox.minLat + bbox.maxLat) / 2).toFixed(4)}, ${((bbox.minLon + bbox.maxLon) / 2).toFixed(4)}], zoom=11)
aoi = ee.Geometry.BBox(${bboxCoordsStr})

# 3. Query Koleksi Citra & Hitung Komposit Median
collection = (
    ee.ImageCollection("${geeCollectionId}")
    .filterBounds(aoi)
    .filterDate("${startDate}", "${endDate}")
    .filter(ee.Filter.lt("${sensor === 'S2_SR' ? 'CLOUDY_PIXEL_PERCENTAGE' : 'CLOUD_COVER'}", ${maxCloudCover}))
)

composite = collection.median().clip(aoi)
index_img = composite.normalizedDifference(["${sensorBands.geeBands[0]}", "${sensorBands.geeBands[1]}"]).rename("${indexDef.id}")

# 4. Visualisasi & Ekspor GeoTIFF Lokal via geemap
vis_params = {
    "min": -0.2,
    "max": 0.85,
    "palette": ${JSON.stringify(indexDef.paletteHex)}
}
m.addLayer(index_img, vis_params, "${indexDef.id} - ${regionName}")
m.add_colorbar(vis_params, label="${indexDef.indonesianName}")

${
  includeExport
    ? `geemap.ee_export_image(
    index_img,
    filename="${outputLayerPath.replace('.gpkg', '.tif')}",
    scale=${spatialResolutionMeters},
    crs="${crsEpsg}",
    region=aoi
)`
    : '# Ekspor lokal dilewati.'
}
m
`;
  }

  // 6. POSTGIS SQL & GDAL/OGR CLI
  if (platformId === 'postgis-gdal') {
    return `-- =============================================================================
-- GeoScript Studio — Query Spasial PostGIS 3.4 & Perintah CLI GDAL/OGR
-- Wilayah Studi : ${regionName} (~${areaKm2} km²)
-- Bounding Box  : [${bboxCoordsStr}] | Target SRID: ${epsgNumberOnly} (${crsEpsg})
-- WKT AOI       : ${wktPolygonStr}
-- =============================================================================

-- BAGIAN A: QUERY SPASIAL POSTGIS (Reproyeksi UTM, Buffer ${bufferDistanceMeters}m & Luas Hektar)
WITH aoi_envelope AS (
    SELECT ST_Transform(
        ${hasCustomPolygon ? `ST_GeomFromText('${wktPolygonStr}', 4326)` : `ST_MakeEnvelope(${bboxCoordsStr}, 4326)`},
        ${epsgNumberOnly}
    ) AS geom_utm
)
SELECT
    f.id,
    f.nama_fitur,
    ROUND((ST_Area(ST_Buffer(ST_Transform(f.geom, ${epsgNumberOnly}), ${bufferDistanceMeters})) / 10000.0)::numeric, 3) AS luas_buffer_ha,
    ST_Buffer(ST_Transform(f.geom, ${epsgNumberOnly}), ${bufferDistanceMeters}) AS geom_buffer_utm
FROM
    public.layer_spasial f
JOIN
    aoi_envelope a
ON
    ST_Intersects(ST_Transform(f.geom, ${epsgNumberOnly}), a.geom_utm);

-- =============================================================================
-- BAGIAN B: PERINTAH TERMINAL GDAL / OGR CLI (OSGeo4W Shell / Linux)
-- =============================================================================
-- 1. Potong (Clip) & Reproyeksikan Raster ke ${crsEpsg} Resolusi ${spatialResolutionMeters}m:
-- gdalwarp -te ${bbox.minLon} ${bbox.minLat} ${bbox.maxLon} ${bbox.maxLat} -te_srs EPSG:4326 -t_srs ${crsEpsg} -tr ${spatialResolutionMeters} ${spatialResolutionMeters} -r bilinear -co COMPRESS=LZW input_raw.tif clipped_utm.tif

-- 2. Hitung Indeks Spektral ${indexDef.id} (${sensorBands.expression}):
-- gdal_calc.py -A ${sensorBands.geeBands[0]}.tif -B ${sensorBands.geeBands[1]}.tif --outfile=${indexDef.id.toLowerCase()}_${regionName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.tif --calc="(A.astype(float)-B.astype(float))/(A.astype(float)+B.astype(float)+1e-7)" --NoDataValue=-9999 --co="COMPRESS=LZW"
`;
  }

  // 7. SWAN WAVE MODEL (.swn — Simulating WAves Nearshore)
  const dLon = Math.max(0.01, bbox.maxLon - bbox.minLon);
  const dLat = Math.max(0.01, bbox.maxLat - bbox.minLat);
  const meanLatRad = (((bbox.minLat + bbox.maxLat) / 2) * Math.PI) / 180;
  const domainWidthMeters = dLon * 111320 * Math.cos(meanLatRad);
  const domainHeightMeters = dLat * 111132;
  const targetRes = Math.max(20, spatialResolutionMeters);
  const mxc = Math.max(10, Math.min(400, Math.round(domainWidthMeters / targetRes)));
  const myc = Math.max(10, Math.min(400, Math.round(domainHeightMeters / targetRes)));
  const dxDeg = dLon / mxc;
  const dyDeg = dLat / myc;
  const swanStart = `${startDate.replace(/-/g, '')}.000000`;
  const swanEnd = `${endDate.replace(/-/g, '')}.000000`;
  const safeProjName = (regionName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'SWANAOI').toUpperCase();
  const batFile = inputLayerPath.replace(/\.(gpkg|tif|shp|geojson|csv|wkt)$/i, '.bot');
  const outPrefix = outputLayerPath.replace(/\.(gpkg|tif|mat|tab|pdf)$/i, '');

  const customPointsBlock =
    customPolygon && customPolygon.length >= 2
      ? customPolygon
          .slice(0, 12)
          .map((v) => `${v.lng.toFixed(5)} ${v.lat.toFixed(5)}`)
          .join(' &\n       ')
      : `${((bbox.minLon + bbox.maxLon) / 2).toFixed(5)} ${((bbox.minLat + bbox.maxLat) / 2).toFixed(5)}`;

  return `$ ============================================================================
$ GeoScript Studio — File Input Model Gelombang SWAN (.swn)
$ Wilayah Studi : ${regionName} (~${areaKm2} km²)
$ Domain BBox   : [${bboxCoordsStr}] (Grid: ${mxc} x ${myc} sel · Res ~${targetRes}m)
$ Proyeksi Grid : SPHERICAL CCM (WGS 84) | Referensi UTM Lokal: ${crsEpsg}
$ Periode Sim   : ${swanStart} s/d ${swanEnd}
$ ${activePipelineComment}${uploadedAttrComment ? `\n$ ${uploadedAttrComment}` : ''}
$ ============================================================================

$ 1. Identitas Proyek & Mode Simulasi Non-Stasioner 2D
PROJECT '${safeProjName}' 'RUN1'
MODE NONSTATIONARY TWODIMENSIONAL
SET LEVEL 0.0 NAUT
COORD SPHERICAL CCM

$ 2. Definisi Grid Komputasi Reguler (CGRID) berdasarkan BBox AOI
$ Format: xpc ypc alpc xlenc ylenc mxc myc CIRCLE mdc flow fhigh msc
CGRID REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0. ${dLon.toFixed(4)} ${dLat.toFixed(4)} ${mxc} ${myc} CIRCLE 36 0.04 1.0 32

$ 3. Input Grid Batimetri (.bot dari BATNAS / GEBCO)
$ Catatan: fac = -1. jika file .bot berisi elevasi negatif untuk dasar laut
INPGRID BOTTOM REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0. ${mxc} ${myc} ${dxDeg.toFixed(6)} ${dyDeg.toFixed(6)} EXC -9999.
READINP BOTTOM -1. '${batFile}' 3 0 FREE

$ 4. Input Forcing Angin (Konstan atau Time-Series ERA5/BMKG)
WIND 12.0 135.0
$ -- Untuk input angin spasial-temporal (Non-Stationary .wnd), aktifkan baris berikut:
$ INPGRID WIND REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0. ${mxc} ${myc} ${dxDeg.toFixed(6)} ${dyDeg.toFixed(6)} NONSTAT ${swanStart} 3 HR ${swanEnd}
$ READINP WIND 1. 'data/angin_era5.wnd' 3 0 FREE

$ 5. Kondisi Batas Gelombang Terbuka (Spektrum JONSWAP — Sisi Selatan & Timur)
BOUN SHAPESPEC JONSWAP 3.3 PEAK DSPR DEGREES
BOUN SIDE S CONSTANT PAR ${Math.max(0.5, Math.abs(thresholdValue)).toFixed(2)} 8.0 180. 25.
$ BOUN SIDE E CONSTANT PAR ${Math.max(0.5, Math.abs(thresholdValue)).toFixed(2)} 7.5 110. 25.

$ 6. Formulasi Fisika Perairan Dangkal (Generasi 3, Wave Breaking & Gesekan Dasar)
GEN3 KOMEN
BREAKING CONSTANT 1.0 0.73
FRICTION JONSWAP 0.067
TRIADS
WCAP KOMEN

$ 7. Konfigurasi Numerik & Kriteria Konvergensi
PROP BSBT
NUMERIC ACCUR 0.02 0.02 0.02 98. NONSTAT 15

$ 8. Definisi Lokasi & Format Output (Matriks .mat & Tabel Titik Kontrol)
GROUP 'DOMAIN' 1 ${mxc + 1} 1 ${myc + 1}
POINTS 'STASIUN_AOI' &
       ${customPointsBlock}

${
  includeExport
    ? `BLOCK 'DOMAIN' NOHEADER '${outPrefix}_hs_dir.mat' LAY 3 HSIGN TPS DIR PDIR WIND DEP OUTPUT ${swanStart} 3 HR
TABLE 'DOMAIN' HEADER '${outPrefix}_grid.tab' XP YP DEP HSIGN TPS DIR OUT
TABLE 'STASIUN_AOI' HEADER '${outPrefix}_stasiun.tab' TIME XP YP DEP HSIGN TPS DIR OUTPUT ${swanStart} 1 HR`
    : `$ Ekspor file output dinonaktifkan sesuai konfigurasi.`
}

$ 9. Eksekusi Perhitungan & Penutupan File Input
TEST 1,0
COMPUTE NONSTAT ${swanStart} 30 MIN ${swanEnd}
STOP
`;
}
