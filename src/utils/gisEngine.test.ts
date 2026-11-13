import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBboxAreaKm2,
  calculatePolygonAreaKm2,
  calculatePolygonPerimeterKm,
  exportAoiToWkt,
  exportAoiToGeoJson,
  parseUploadedSpatialFile,
  SAMPLE_SPATIAL_FILES,
  recommendUtmEpsg,
  decimalToDms,
  validateScriptParameters,
  generateGisScript,
  REGION_PRESETS,
  SPECTRAL_INDEX_DEFINITIONS,
  type ScriptParameters,
} from './gisEngine';

const sampleParams: ScriptParameters = {
  regionName: 'Kawasan Metropolitan Jabodetabek',
  bbox: { minLon: 106.55, minLat: -6.65, maxLon: 107.15, maxLat: -6.08 },
  crsEpsg: 'EPSG:32748',
  startDate: '2026-01-01',
  endDate: '2026-09-30',
  maxCloudCover: 20,
  sensor: 'S2_SR',
  spectralIndex: 'NDVI',
  bufferDistanceMeters: 500,
  inputLayerPath: 'data/jaringan_sungai.gpkg',
  outputLayerPath: 'output/hasil_analisis.gpkg',
  spatialResolutionMeters: 10,
  thresholdValue: 0.35,
  includeVisualization: true,
  includeExport: true,
  pipelineSteps: ['Cloud Masking', 'Clip AOI', 'Hitung Indeks', 'Ekspor GeoTIFF'],
};

test('calculateBboxAreaKm2 computes positive geodesic area for Jabodetabek BBox', () => {
  const area = calculateBboxAreaKm2(sampleParams.bbox);
  assert.equal(area > 4000 && area < 4500, true);
  assert.equal(calculateBboxAreaKm2({ minLon: 106, minLat: -6, maxLon: 106, maxLat: -6 }), 0);
});

test('calculatePolygonAreaKm2 and calculatePolygonPerimeterKm compute geodesic metrics for custom polygon', () => {
  const vertices = [
    { lat: -0.98, lng: 116.68 },
    { lat: -0.98, lng: 116.78 },
    { lat: -0.88, lng: 116.78 },
    { lat: -0.88, lng: 116.68 },
  ];
  const area = calculatePolygonAreaKm2(vertices);
  const perimeter = calculatePolygonPerimeterKm(vertices);
  assert.equal(area > 110 && area < 135, true);
  assert.equal(perimeter > 40 && perimeter < 50, true);
});

test('exportAoiToWkt and exportAoiToGeoJson serialize BBox and custom polygons accurately', () => {
  const wktBbox = exportAoiToWkt(sampleParams.bbox);
  assert.equal(wktBbox.startsWith('POLYGON(('), true);
  assert.equal(wktBbox.includes('106.55000 -6.65000'), true);

  const customVerts = [
    { lat: -6.2, lng: 106.8 },
    { lat: -6.2, lng: 106.9 },
    { lat: -6.1, lng: 106.85 },
  ];
  const geojsonStr = exportAoiToGeoJson('Segitiga Uji', sampleParams.bbox, 'EPSG:32748', customVerts);
  const parsed = JSON.parse(geojsonStr);
  assert.equal(parsed.type, 'FeatureCollection');
  assert.equal(parsed.features[0].properties.nama_aoi, 'Segitiga Uji');
  assert.equal(parsed.features[0].geometry.coordinates[0].length, 4);
});

test('parseUploadedSpatialFile parses GeoJSON, CSV, and WKT sample spatial files', () => {
  const geojsonSample = SAMPLE_SPATIAL_FILES[0];
  const parsedGeojson = parseUploadedSpatialFile(geojsonSample.fileName, geojsonSample.content);
  assert.equal(parsedGeojson.formatLabel, 'GeoJSON');
  assert.equal(parsedGeojson.featureCount, 1);
  assert.equal(parsedGeojson.vertices.length >= 5, true);
  assert.equal(parsedGeojson.recommendedEpsg, 'EPSG:32750');
  assert.equal(parsedGeojson.attributeColumns.includes('NAMA_ZONA'), true);

  const csvSample = SAMPLE_SPATIAL_FILES[1];
  const parsedCsv = parseUploadedSpatialFile(csvSample.fileName, csvSample.content);
  assert.equal(parsedCsv.formatLabel, 'CSV Koordinat');
  assert.equal(parsedCsv.featureCount, 4);
  assert.equal(parsedCsv.attributeColumns.includes('ID_STASIUN'), true);
  assert.equal(parsedCsv.recommendedEpsg, 'EPSG:32748');

  const wktSample = SAMPLE_SPATIAL_FILES[2];
  const parsedWkt = parseUploadedSpatialFile(wktSample.fileName, wktSample.content);
  assert.equal(parsedWkt.formatLabel, 'WKT Geometry');
  assert.equal(parsedWkt.vertices.length, 4);
  assert.equal(parsedWkt.recommendedEpsg, 'EPSG:32750');
});

test('recommendUtmEpsg identifies correct Indonesian UTM zones (South & North)', () => {
  const jkt = recommendUtmEpsg(106.8, -6.2);
  assert.equal(jkt.epsg, 'EPSG:32748');
  assert.equal(jkt.zoneNumber, 48);
  assert.equal(jkt.hemisphere, 'S');

  const riau = recommendUtmEpsg(101.8, 0.5);
  assert.equal(riau.epsg, 'EPSG:32647');
  assert.equal(riau.zoneNumber, 47);
  assert.equal(riau.hemisphere, 'N');

  const ikn = recommendUtmEpsg(116.8, -0.9);
  assert.equal(ikn.epsg, 'EPSG:32750');
});

test('decimalToDms formats Indonesian cardinal directions (BT/BB/LU/LS) without 60.0" overflow', () => {
  const lonStr = decimalToDms(106.85, true);
  assert.equal(lonStr, `106° 51' 0.0" BT`);

  const latStr = decimalToDms(-6.2, false);
  assert.equal(latStr, `6° 12' 0.0" LS`);
});

test('validateScriptParameters catches invalid BBox, date range, and cloud cover', () => {
  const validResult = validateScriptParameters(sampleParams);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);

  const invalidResult = validateScriptParameters({
    ...sampleParams,
    bbox: { minLon: 108.0, minLat: -6.0, maxLon: 106.0, maxLat: -7.0 },
    maxCloudCover: 120,
    startDate: '2026-10-01',
    endDate: '2026-02-01',
  });
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.errors.length, 4);
});

test('generateGisScript produces valid code across all 6 GIS platforms including custom polygons', () => {
  const parsedSample = parseUploadedSpatialFile(
    SAMPLE_SPATIAL_FILES[0].fileName,
    SAMPLE_SPATIAL_FILES[0].content
  );
  const customPolyParams: ScriptParameters = {
    ...sampleParams,
    customPolygon: parsedSample.vertices,
    uploadedFileSummary: parsedSample,
  };

  const geeJs = generateGisScript('spectral-vegetation-monitoring', 'gee-js', customPolyParams);
  assert.equal(geeJs.includes('ee.Geometry.Polygon(['), true);
  assert.equal(geeJs.includes("crs: 'EPSG:32748'"), true);

  const pyGis = generateGisScript('vector-buffer-zonal-stats', 'python-gis', customPolyParams);
  assert.equal(pyGis.includes('Polygon(['), true);
  assert.equal(pyGis.includes('ATTRIBUTE_COLUMNS = ["KODE_WP","NAMA_ZONA","FUNGSI_LAHAN","TARGET_TUTUPAN_HIJAU_PERSEN"]'), true);

  const pyQgis = generateGisScript('spectral-vegetation-monitoring', 'pyqgis', sampleParams);
  assert.equal(pyQgis.includes('processing.run("native:buffer"'), true);

  const arcPy = generateGisScript('spectral-vegetation-monitoring', 'arcpy', sampleParams);
  assert.equal(arcPy.includes('arcpy.SpatialReference(32748)'), true);

  const postgis = generateGisScript('spectral-vegetation-monitoring', 'postgis-gdal', customPolyParams);
  assert.equal(postgis.includes("ST_GeomFromText('POLYGON(("), true);
  assert.equal(postgis.includes('gdal_calc.py'), true);

  const swan = generateGisScript('coastal-wave-swan', 'swan', customPolyParams);
  assert.equal(swan.includes('MODE NONSTATIONARY TWODIMENSIONAL'), true);
  assert.equal(swan.includes('CGRID REGULAR'), true);
  assert.equal(swan.includes('INPGRID BOTTOM REGULAR'), true);
  assert.equal(swan.includes("POINTS 'STASIUN_AOI'"), true);
  assert.equal(swan.includes('COMPUTE NONSTAT 20260101.000000 30 MIN 20260930.000000'), true);
  assert.equal(swan.includes('STOP'), true);

  assert.equal(REGION_PRESETS.length >= 8, true);
});

test('supports 12 spectral indices, Agisoft Metashape, Pix4Dmapper, Tidal, Shoreline Slope, and LULC scripts', () => {
  const indexIds = SPECTRAL_INDEX_DEFINITIONS.map((d) => d.id);
  for (const required of ['BSI', 'NDMI', 'AWEI', 'MVI', 'NDBaI'] as const) {
    assert.equal(indexIds.includes(required), true);
  }

  const agisoft = generateGisScript('uav-agisoft-metashape', 'agisoft-py', sampleParams);
  assert.equal(agisoft.includes('import Metashape'), true);
  assert.equal(agisoft.includes('chunk.exportReport('), true);

  const pix4d = generateGisScript('uav-pix4d-photogrammetry', 'pix4d-cli', sampleParams);
  assert.equal(pix4d.includes('pix4dmapper.exe'), true);
  assert.equal(pix4d.includes('--orthomosaic'), true);

  const tidal = generateGisScript('tidal-analysis-harmonics', 'python-gis', sampleParams);
  assert.equal(tidal.includes('TIDAL_OMEGA'), true);
  assert.equal(tidal.includes('Formzahl'), true);

  const shoreline = generateGisScript('shoreline-slope-erosion', 'python-gis', sampleParams);
  assert.equal(shoreline.includes('tan_beta'), true);
  assert.equal(shoreline.includes('slope_deg'), true);

  const shorelineGee = generateGisScript('shoreline-slope-erosion', 'gee-js', sampleParams);
  assert.equal(shorelineGee.includes('AWEI'), true);

  const lulcGee = generateGisScript('land-cover-classification', 'gee-js', sampleParams);
  assert.equal(lulcGee.includes('BSI'), true);
  assert.equal(lulcGee.includes('MVI'), true);
  assert.equal(lulcGee.includes('LULC_Class'), true);
});

import { generateMapVisualization } from './mapVisualizerEngine';

test('generateMapVisualization produces spectral stats, LULC breakdown, SWAN vectors, and polygon inspection', () => {
  const ndviViz = generateMapVisualization('spectral-vegetation-monitoring', 'gee-js', sampleParams);
  assert.equal(ndviViz.legendItems.length, 3);
  assert.equal(ndviViz.stats.totalAreaHa > 0, true);
  assert.equal(ndviViz.stats.passingPercent >= 0 && ndviViz.stats.passingPercent <= 100, true);

  const lulcViz = generateMapVisualization('land-cover-classification', 'gee-js', sampleParams);
  assert.equal(lulcViz.legendItems.length, 6);
  assert.equal((lulcViz.stats.classBreakdown || []).length, 6);

  const swanViz = generateMapVisualization('coastal-wave-swan', 'swan', sampleParams);
  assert.equal((swanViz.swanVectors || []).length >= 4 && (swanViz.swanVectors || []).length <= 12, true);

  const slopeViz = generateMapVisualization('shoreline-slope-erosion', 'python-gis', sampleParams);
  assert.equal((slopeViz.transects || []).length, 7);

  const uavViz = generateMapVisualization('uav-agisoft-metashape', 'agisoft-py', sampleParams);
  assert.equal((uavViz.gcpPoints || []).length, 5);

  const polyViz = generateMapVisualization('spectral-vegetation-monitoring', 'gee-js', {
    ...sampleParams,
    customPolygon: [
      { lat: -6.4, lng: 106.7 },
      { lat: -6.4, lng: 106.9 },
      { lat: -6.2, lng: 106.9 },
      { lat: -6.2, lng: 106.7 },
    ],
  });
  assert.equal(polyViz.inspectAt(-6.3, 106.8).inPolygon, true);
  assert.equal(polyViz.inspectAt(-6.6, 106.56).inPolygon, false);
});

import type { RealEoGrid } from './realEoGridLoader';

test('generateMapVisualization uses RealEoGrid for DEM slope, water masking, and authentic execution logs', () => {
  const N = 32;
  const elev = new Float32Array(N * N);
  const rgb = new Uint8Array(N * N * 3);
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const idx = row * N + col;
      // North half (row < N/2): terrain rising 2m..45m; South half: shallow-to-deep ocean -0.5m..-12m
      if (row < N / 2) {
        elev[idx] = 2 + (N / 2 - row) * 2.5 + col * 0.4;
        rgb[idx * 3] = 42;
        rgb[idx * 3 + 1] = 128; // Green vegetation reflectance
        rgb[idx * 3 + 2] = 36;
      } else {
        elev[idx] = -(row - N / 2 + 1) * 0.8;
        rgb[idx * 3] = 18;
        rgb[idx * 3 + 1] = 48;
        rgb[idx * 3 + 2] = 98; // Dark ocean water
      }
    }
  }

  const mockRealGrid: RealEoGrid = {
    bboxKey: 'test-key',
    bbox: { ...sampleParams.bbox },
    gridSize: N,
    zoomUsed: 10,
    tileCount: 8,
    metersPerPixelX: 450,
    metersPerPixelY: 450,
    minElevM: -12.8,
    maxElevM: 48.0,
    waterPercent: 50,
    elevationGrid: elev,
    rgbGrid: rgb,
    marine: { available: true, waveHeightM: 1.65, waveDirDeg: 205, wavePeriodS: 8.4 },
    fetchDurationMs: 120,
  };

  const slopeReal = generateMapVisualization('shoreline-slope-erosion', 'python-gis', sampleParams, {
    gridSize: N,
    realGrid: mockRealGrid,
  });
  assert.equal(slopeReal.stats.isRealData, true);
  assert.equal(slopeReal.stats.executionLogs.length >= 3, true);
  assert.equal((slopeReal.transects || []).length > 0, true);

  const swanReal = generateMapVisualization('coastal-wave-swan', 'swan', sampleParams, {
    gridSize: N,
    realGrid: mockRealGrid,
  });
  assert.equal(swanReal.stats.isRealData, true);
  // South ocean cell should have wave height in meters while north elevated land cell is masked
  const oceanProbe = swanReal.inspectAt(-6.5, 106.85);
  const landProbe = swanReal.inspectAt(-6.15, 106.85);
  assert.equal(oceanProbe.valueText.endsWith(' m'), true);
  assert.equal(landProbe.valueText.startsWith('Masked'), true);
});



