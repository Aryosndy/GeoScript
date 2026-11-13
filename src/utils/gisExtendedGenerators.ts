import type { BoundingBox, GisPlatformId, LatLngVertex, ScriptParameters } from './gisEngine';

export interface ExtendedGeneratorContext {
  areaKm2: number;
  bboxCoordsStr: string;
  epsgNumberOnly: string;
  hasCustomPolygon: boolean;
  geeAoiDeclaration: string;
  pyPolygonCoords: string;
  wktPolygonStr: string;
  activePipelineComment: string;
  uploadedAttrComment: string;
}

/**
 * Generator Script Agisoft Metashape Professional (Python API)
 * Mendukung alur fotogrametri citra drone (Align Photos, Depth Maps, Point Cloud, DEM, Orthomosaic, & Export Report PDF).
 */
export function generateAgisoftMetashapeScript(
  templateId: string,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const {
    regionName,
    bbox,
    crsEpsg,
    spatialResolutionMeters,
    inputLayerPath,
    outputLayerPath,
    includeExport,
    spectralIndex,
  } = params;

  const gsdCm = Math.max(1.5, Math.min(25, spatialResolutionMeters <= 5 ? spatialResolutionMeters * 2 : 3.5));
  const outDir = outputLayerPath.includes('/')
    ? outputLayerPath.split('/').slice(0, -1).join('/')
    : 'output_metashape';
  const safeSlug = regionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'aoi';

  const isCoastalOrSlope =
    templateId === 'shoreline-slope-erosion' || templateId === 'coastal-wave-swan';
  const isLulc = templateId === 'land-cover-classification' || templateId === 'spectral-vegetation-monitoring';

  return `# ==============================================================================
# GeoScript Studio — Otomasi Fotogrametri Drone Agisoft Metashape (Python API)
# Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
# Bounding Box  : [${ctx.bboxCoordsStr}]
# Target CRS    : ${crsEpsg} (WGS 84 / UTM) | Target GSD: ~${gsdCm.toFixed(1)} cm/piksel
# Alur Template : ${templateId}
# ${ctx.activePipelineComment}${ctx.uploadedAttrComment ? `\n# ${ctx.uploadedAttrComment}` : ''}
# Cara Pakai    : Agisoft Metashape Pro -> Tools -> Run Script (Ctrl+R) atau headless CLI:
#                 metashape.sh -r run_metashape_${safeSlug}.py
# ==============================================================================

import os
import glob
import Metashape

# 1. Konfigurasi Folder Foto UAV, GCP (Opsional), & Output
PHOTO_DIR = r"${inputLayerPath.includes('.tif') || inputLayerPath.includes('.gpkg') ? 'data/foto_drone_uav' : inputLayerPath}"
GCP_CSV_PATH = r"data/gcp_koordinat_utm.csv"  # Format: label,X_easting,Y_northing,Z_elev
OUTPUT_DIR = r"${outDir || 'output_metashape'}"
PROJECT_PSX = os.path.join(OUTPUT_DIR, "proyek_${safeSlug}.psx")
TARGET_CRS = Metashape.CoordinateSystem("${crsEpsg.replace('EPSG:', 'EPSG::')}")
WGS84_CRS = Metashape.CoordinateSystem("EPSG::4326")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_photogrammetry_pipeline():
    doc = Metashape.Document()
    doc.save(PROJECT_PSX)
    chunk = doc.addChunk()
    chunk.label = "${regionName}"
    chunk.crs = TARGET_CRS

    # 2. Muat Seluruh Citra Drone (.jpg / .tif / .dng)
    photos = []
    for ext in ("*.jpg", "*.JPG", "*.jpeg", "*.tif", "*.TIF"):
        photos.extend(glob.glob(os.path.join(PHOTO_DIR, "**", ext), recursive=True))

    if not photos:
        raise FileNotFoundError(f"Tidak ditemukan foto drone pada folder: {PHOTO_DIR}")

    print(f"[1/7] Memuat {len(photos)} foto UAV ke chunk Metashape...")
    chunk.addPhotos(photos)

    # Konversi koordinat geotag kamera dari WGS 84 ke UTM lokal (${crsEpsg})
    for camera in chunk.cameras:
        if camera.reference.location:
            camera.reference.location = Metashape.CoordinateSystem.transform(
                camera.reference.location, WGS84_CRS, TARGET_CRS
            )
    chunk.updateTransform()

    # Muat Ground Control Point (GCP) jika file tersedia untuk akurasi sentimeter (RTK/PPK)
    if os.path.exists(GCP_CSV_PATH):
        print(f"      Mengimpor titik ikat tanah (GCP) dari: {GCP_CSV_PATH}")
        chunk.importReference(
            path=GCP_CSV_PATH,
            format=Metashape.ReferenceFormatCSV,
            columns="nxyz",
            delimiter=",",
            crs=TARGET_CRS,
            skip_rows=1
        )

    # 3. Align Photos (Aerotriangulasi & Bundle Adjustment)
    print("[2/7] Menjalankan MatchPhotos & AlignCameras (High Accuracy)...")
    chunk.matchPhotos(
        downscale=1,              # 1 = High, 0 = Highest, 2 = Medium
        generic_preselection=True,
        reference_preselection=True,
        keypoint_limit=40000,
        tiepoint_limit=10000
    )
    chunk.alignCameras(adaptive_fitting=True)
    chunk.optimizeCameras(fit_f=True, fit_cx=True, fit_cy=True, fit_k1=True, fit_k2=True, fit_k3=True)
    doc.save()

    # 4. Build Depth Maps & Dense Point Cloud
    print("[3/7] Membangun Depth Maps & Dense Point Cloud (Medium/Mild Filtering)...")
    chunk.buildDepthMaps(downscale=2, filter_mode=Metashape.MildFiltering)
    chunk.buildPointCloud(point_colors=True, point_confidence=True)
${
  isCoastalOrSlope
    ? `    # Filter & klasifikasi titik tanah (Ground Classification) untuk DEM pesisir bebas vegetasi
    chunk.pointCloud.classifyGroundPoints(max_angle=12.0, max_distance=0.4, cell_size=15.0)`
    : `    # Opsional: chunk.pointCloud.classifyGroundPoints()`
}
    doc.save()

    # 5. Build Digital Elevation Model (DEM / DSM)
    print("[4/7] Membangun DEM/DSM pada proyeksi ${crsEpsg}...")
    chunk.buildDem(
        source_data=Metashape.PointCloudData,
        interpolation=Metashape.EnabledInterpolation,
        projection=Metashape.OrthoProjection(TARGET_CRS)
    )
    doc.save()

    # 6. Build Orthomosaic Resolusi Tinggi
    print("[5/7] Membangun Orthomosaic & Color Calibration...")
    chunk.buildOrthomosaic(
        surface_data=Metashape.ElevationData,
        blending_mode=Metashape.MosaicBlending,
        fill_holes=True,
        projection=Metashape.OrthoProjection(TARGET_CRS)
    )
${
  isLulc
    ? `    # Kalibrasi Indeks Multispektral Drone (${spectralIndex}) jika menggunakan kamera Micasense/Mavic 3M
    # chunk.raster_transform.formula = ["(B4 - B2) / (B4 + B2)"]  # Contoh NDVI
    # chunk.raster_transform.enabled = True`
    : ''
}
    doc.save()

    # 7. Ekspor Raster GeoTIFF (Orthomosaic, DEM) & Laporan Pengolahan PDF
    ${
      includeExport
        ? `ortho_tif = os.path.join(OUTPUT_DIR, "orthomosaic_${safeSlug}.tif")
    dem_tif = os.path.join(OUTPUT_DIR, "dem_${safeSlug}.tif")
    report_pdf = os.path.join(OUTPUT_DIR, "laporan_metashape_${safeSlug}.pdf")

    compression = Metashape.ImageCompression()
    compression.tiff_compression = Metashape.ImageCompression.TiffCompressionLZW
    compression.tiff_big = True

    print(f"[6/7] Mengekspor Orthomosaic & DEM ke {OUTPUT_DIR}...")
    chunk.exportRaster(
        path=ortho_tif,
        source_data=Metashape.OrthomosaicData,
        image_format=Metashape.ImageFormatTIFF,
        image_compression=compression,
        save_alpha=True
    )
    chunk.exportRaster(
        path=dem_tif,
        source_data=Metashape.ElevationData,
        image_format=Metashape.ImageFormatTIFF,
        image_compression=compression
    )

    print(f"[7/7] Membuat Laporan Kualitas Fotogrametri Otomatis (PDF): {report_pdf}")
    chunk.exportReport(
        path=report_pdf,
        title="Laporan Pemetaan Drone UAV — ${regionName}",
        description="Diproses otomatis via GeoScript Studio & Agisoft Metashape (${crsEpsg})"
    )`
        : `print("[6/7] Blok ekspor file dinonaktifkan sesuai konfigurasi.")`
    }

    print("Selesai! Proyek Metashape, Orthomosaic, DEM, & Laporan PDF siap digunakan.")

if __name__ == "__main__":
    run_photogrammetry_pipeline()
`;
}

/**
 * Generator Script Pix4Dmapper / Pix4Dengine (CLI + Python Automation)
 */
export function generatePix4dScript(
  templateId: string,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const { regionName, crsEpsg, inputLayerPath, outputLayerPath, spatialResolutionMeters, includeExport } = params;
  const safeSlug = regionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'aoi';
  const gsdCm = Math.max(2.0, Math.min(20, spatialResolutionMeters <= 5 ? spatialResolutionMeters * 2 : 3.5));

  return `# ==============================================================================
# GeoScript Studio — Otomasi Pengolahan Citra Drone Pix4Dmapper (Python & CLI)
# Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
# Bounding Box  : [${ctx.bboxCoordsStr}]
# Target CRS    : ${crsEpsg} (EPSG:${ctx.epsgNumberOnly}) | Target GSD: ~${gsdCm.toFixed(1)} cm
# Alur Template : ${templateId}
# ${ctx.activePipelineComment}
# Cara Pakai    : Jalankan via Anaconda/Python di komputer berlisensi Pix4Dmapper:
#                 python run_pix4d_${safeSlug}.py
# ==============================================================================

import os
import subprocess
from pathlib import Path

# 1. Konfigurasi Path Eksekusi Pix4Dmapper & Direktori Proyek
PIX4D_EXE = r"C:\\Program Files\\Pix4Dmapper\\pix4dmapper.exe"  # Linux/macOS: "pix4dmapper"
PROJECT_NAME = "pix4d_${safeSlug}"
IMAGE_DIR = Path(r"${inputLayerPath.includes('.tif') || inputLayerPath.includes('.gpkg') ? 'data/foto_drone_uav' : inputLayerPath}")
WORKSPACE_DIR = Path(r"${outputLayerPath.includes('/') ? outputLayerPath.split('/').slice(0, -1).join('/') : 'output_pix4d'}")
P4D_FILE = WORKSPACE_DIR / f"{PROJECT_NAME}.p4d"
LOG_FILE = WORKSPACE_DIR / f"{PROJECT_NAME}_run.log"

WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

def run_pix4d_batch():
    """
    Menjalankan 3 tahap utama Pix4Dmapper secara headless (CLI):
      Step 1 (--initial) : Kalibrasi kamera, tie points & bundle block adjustment
      Step 2 (--point-cloud / --mesh) : Densifikasi Point Cloud (.las) & 3D Textured Mesh
      Step 3 (--dsm / --orthomosaic / --index) : DSM, DTM, Orthomosaic GeoTIFF & Quality Report PDF
    """
    if not IMAGE_DIR.exists():
        raise FileNotFoundError(f"Folder citra UAV tidak ditemukan: {IMAGE_DIR}")

    # Argumen CLI resmi Pix4Dmapper Batch Processing
    cmd = [
        PIX4D_EXE,
        "--new-project", str(P4D_FILE),
        "--image-dir", str(IMAGE_DIR),
        "--output-srs", "EPSG:${ctx.epsgNumberOnly}",
        "--cam-coord-sys", "EPSG:4326",
        "-c",                 # Close GUI automatically after execution
        "-r",                 # Run processing immediately
        "--initial",          # Step 1: Initial Processing + Quality Report
        "--point-cloud",      # Step 2: Densified Point Cloud (.las / .laz)
        "--dsm",              # Step 3a: Digital Surface Model (.tif)
        "--orthomosaic",      # Step 3b: GeoTIFF Orthomosaic
    ]

    print(f"[1/3] Menjalankan Pix4Dmapper CLI untuk proyek: {PROJECT_NAME} (${crsEpsg})...")
    print("      Perintah:", " ".join(cmd))

    with open(LOG_FILE, "w", encoding="utf-8") as logf:
        result = subprocess.run(cmd, stdout=logf, stderr=subprocess.STDOUT, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"Pix4Dmapper berhenti dengan kode {result.returncode}. Periksa log: {LOG_FILE}")

    # 2. Lokasi Output Otomatis Standar Pix4Dmapper
    project_out = WORKSPACE_DIR / PROJECT_NAME
    quality_report = project_out / "1_initial" / "report" / f"{PROJECT_NAME}_report.pdf"
    las_cloud = project_out / "2_densification" / "point_cloud" / f"{PROJECT_NAME}_group1_densified_point_cloud.las"
    dsm_tif = project_out / "3_dsm_ortho" / "1_dsm" / f"{PROJECT_NAME}_dsm.tif"
    ortho_tif = project_out / "3_dsm_ortho" / "2_mosaic" / f"{PROJECT_NAME}_transparent_mosaic_group1.tif"

    print("[2/3] Verifikasi hasil keluaran Pix4Dmapper:")
    for label, path in [
        ("Quality Report PDF", quality_report),
        ("Point Cloud (.las)", las_cloud),
        ("DSM GeoTIFF", dsm_tif),
        ("Orthomosaic GeoTIFF", ortho_tif),
    ]:
        status = "TERSEDIA" if path.exists() else "MENUNGGU"
        print(f"      - {label:22s}: {status} -> {path}")

${
  includeExport
    ? `    # 3. Optimasi & Kompresi GeoTIFF Orthomosaic via GDAL (Cloud-Optimized / LZW)
    cog_ortho = WORKSPACE_DIR / f"{PROJECT_NAME}_ortho_cog.tif"
    if ortho_tif.exists():
        subprocess.run([
            "gdal_translate", "-of", "COG", "-co", "COMPRESS=JPEG", "-co", "QUALITY=90",
            str(ortho_tif), str(cog_ortho)
        ], check=False)
        print(f"[3/3] Orthomosaic terkompresi siap GIS/QGIS: {cog_ortho}")`
    : `    print("[3/3] Langkah optimasi GDAL dilewati sesuai konfigurasi.")`
}

if __name__ == "__main__":
    run_pix4d_batch()
`;
}

/**
 * Generator Pengolahan Data Pasang Surut (Admiralty / Analisis Harmonik & Chart Datum)
 */
export function generateTidalScript(
  platformId: GisPlatformId,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const { regionName, crsEpsg, startDate, endDate, inputLayerPath, outputLayerPath, thresholdValue } = params;
  const centerLon = ((params.bbox.minLon + params.bbox.maxLon) / 2).toFixed(4);
  const centerLat = ((params.bbox.minLat + params.bbox.maxLat) / 2).toFixed(4);

  if (platformId === 'swan') {
    return `$ ============================================================================
$ GeoScript Studio — Integrasi Muka Air Pasang Surut pada SWAN (.swn)
$ Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
$ Titik Pusat   : (${centerLon}, ${centerLat}) | Proyeksi UTM: ${crsEpsg}
$ Elevasi Pasut : SET LEVEL = ${thresholdValue.toFixed(2)} m (HHWL / HAT Skenario Ekstrem)
$ ============================================================================

PROJECT 'PASUTSWAN' 'TIDE'
MODE NONSTATIONARY TWODIMENSIONAL
SET LEVEL ${thresholdValue.toFixed(2)} NAUT
COORD SPHERICAL CCM

CGRID REGULAR ${params.bbox.minLon.toFixed(4)} ${params.bbox.minLat.toFixed(4)} 0. ${(params.bbox.maxLon - params.bbox.minLon).toFixed(4)} ${(params.bbox.maxLat - params.bbox.minLat).toFixed(4)} 80 80 CIRCLE 36 0.04 1.0 32

INPGRID BOTTOM REGULAR ${params.bbox.minLon.toFixed(4)} ${params.bbox.minLat.toFixed(4)} 0. 80 80 ${((params.bbox.maxLon - params.bbox.minLon) / 80).toFixed(6)} ${((params.bbox.maxLat - params.bbox.minLat) / 80).toFixed(6)} EXC -9999.
READINP BOTTOM -1. 'data/batimetri_pesisir.bot' 3 0 FREE

$ Opsional: Input Elevasi Pasang Surut Time-Series (.wlev) tiap 1 Jam
$ INPGRID WLEV REGULAR ${params.bbox.minLon.toFixed(4)} ${params.bbox.minLat.toFixed(4)} 0. 80 80 ${((params.bbox.maxLon - params.bbox.minLon) / 80).toFixed(6)} ${((params.bbox.maxLat - params.bbox.minLat) / 80).toFixed(6)} NONSTAT ${startDate.replace(/-/g, '')}.000000 1 HR ${endDate.replace(/-/g, '')}.000000
$ READINP WLEV 1. 'data/pasut_jam_an.wlev' 3 0 FREE

WIND 10.0 180.0
BOUN SHAPESPEC JONSWAP 3.3 PEAK DSPR DEGREES
BOUN SIDE S CONSTANT PAR 1.50 7.5 180. 25.

GEN3 KOMEN
BREAKING CONSTANT 1.0 0.73
FRICTION JONSWAP 0.067

POINTS 'STASIUN_PASUT' ${centerLon} ${centerLat}
TABLE 'STASIUN_PASUT' HEADER '${outputLayerPath.replace(/\.(gpkg|tif|csv)$/i, '')}_pasut_swan.tab' TIME XP YP DEP WATLEV HSIGN TPS DIR OUTPUT ${startDate.replace(/-/g, '')}.000000 1 HR
COMPUTE NONSTAT ${startDate.replace(/-/g, '')}.000000 30 MIN ${endDate.replace(/-/g, '')}.000000
STOP
`;
  }

  if (platformId === 'postgis-gdal') {
    return `-- =============================================================================
-- GeoScript Studio — Pengolahan Database & Statistik Pasang Surut (PostGIS SQL)
-- Wilayah Studi : ${regionName} | Periode: ${startDate} s/d ${endDate}
-- =============================================================================

-- Hitung MSL, HHWL, LLWL, Tunggang Pasut, dan Zona Genangan Pasang (Rob)
WITH stats_pasut AS (
    SELECT
        stasiun_id,
        AVG(elevasi_m) AS msl_m,
        MAX(elevasi_m) AS hhwl_m,
        MIN(elevasi_m) AS llwl_m,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY elevasi_m) AS mhwl_m,
        PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY elevasi_m) AS mlwl_m
    FROM public.observasi_pasut
    WHERE waktu_utc BETWEEN '${startDate}' AND '${endDate}'
    GROUP BY stasiun_id
)
SELECT
    stasiun_id,
    ROUND(msl_m::numeric, 3) AS msl_meter,
    ROUND(hhwl_m::numeric, 3) AS hhwl_meter,
    ROUND(llwl_m::numeric, 3) AS llwl_meter,
    ROUND((hhwl_m - llwl_m)::numeric, 3) AS tunggang_pasut_maks_m
FROM stats_pasut;

-- Ekstrak Poligon Area Terdampak Pasang Tertinggi dari DEM menggunakan GDAL:
-- gdal_calc.py -A dem_pesisir_utm.tif --outfile=zona_rob_hhwl.tif --calc="A <= ${thresholdValue}" --NoDataValue=0
`;
  }

  if (platformId === 'gee-js' || platformId === 'gee-py') {
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Pemetaan Genangan Pasang Surut Maksimum (Tidal Flood / Rob) GEE
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Elevasi HHWL  : <= ${thresholdValue} meter di atas MSL (DEMNAS / FABDEM)
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

// 1. Muat DEM Resolusi Tinggi (NASADEM / FABDEM jika di-upload ke Asset)
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(aoi);

// 2. Identifikasi Zona Rentan Pasang Tertinggi (Elevasi <= HHWL ${thresholdValue} m)
var tidalInundation = dem.lte(${thresholdValue}).selfMask().rename('Tidal_Zone');

// 3. Perbandingan Citra Saat Pasang vs Surut (Sentinel-2 MNDWI)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${params.maxCloudCover}))
  .median()
  .clip(aoi);
var mndwi = s2.normalizedDifference(['B3', 'B11']).rename('MNDWI');

var areaHa = tidalInundation.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: ${params.spatialResolutionMeters},
  maxPixels: 1e10
});
print('Luas Zona Rentan Pasang Surut <= ${thresholdValue}m (Ha):', areaHa.get('Tidal_Zone'));

Map.addLayer(mndwi, {min: -0.5, max: 0.6, palette: ['#f4e3c1', '#67e8f9', '#0369a1']}, 'MNDWI Pesisir');
Map.addLayer(tidalInundation, {palette: ['#0284c7']}, 'Zona Genangan Pasang (HHWL <= ${thresholdValue}m)');
`;
    }
  }

  // Default & Primary: Python Harmonic Tidal Analysis (M2, S2, K1, O1, Formzahl, HHWL, MSL, LLWL)
  return `"""
GeoScript Studio — Analisis Harmonik Pasang Surut & Chart Datum (Python)
Wilayah Studi : ${regionName} (Koordinat Stasiun: ${centerLat}°, ${centerLon}°)
Periode Data  : ${startDate} s/d ${endDate} | Target CRS: ${crsEpsg}
Metode        : Regresi Kuadrat Terkecil Harmonik (M2, S2, K1, O1) + Bilangan Formzahl
"""

from pathlib import Path
import numpy as np
import pandas as pd

# 1. Konfigurasi Input CSV Pasang Surut (Kolom: timestamp_utc, elevasi_m)
INPUT_CSV = Path("${inputLayerPath.endsWith('.csv') ? inputLayerPath : 'data/data_pasang_surut_jam.csv'}")
OUTPUT_SUMMARY = Path("${outputLayerPath.replace(/\.(gpkg|tif)$/i, '')}_ringkasan_pasut.csv")

# Frekuensi sudut konstanta pasut utama (rad/jam)
TIDAL_OMEGA = {
    "M2": 2 * np.pi / 12.4206,  # Semidiurnal Bulan Utama
    "S2": 2 * np.pi / 12.0000,  # Semidiurnal Matahari Utama
    "K1": 2 * np.pi / 23.9345,  # Diurnal Luni-Solar
    "O1": 2 * np.pi / 25.8193,  # Diurnal Bulan Utama
}

def analyze_tides():
    if INPUT_CSV.exists():
        df = pd.read_csv(INPUT_CSV, parse_dates=["timestamp_utc"])
        t_hours = (df["timestamp_utc"] - df["timestamp_utc"].iloc[0]).dt.total_seconds().to_numpy() / 3600.0
        h = df["elevasi_m"].to_numpy(dtype=float)
    else:
        # Simulasi sintetis 29 piantan (700 jam) jika CSV lokal belum disiapkan
        t_hours = np.arange(0, 29 * 24, 1.0)
        h = (
            1.25
            + 0.48 * np.cos(TIDAL_OMEGA["M2"] * t_hours - 0.6)
            + 0.21 * np.cos(TIDAL_OMEGA["S2"] * t_hours - 1.1)
            + 0.24 * np.cos(TIDAL_OMEGA["K1"] * t_hours - 0.4)
            + 0.16 * np.cos(TIDAL_OMEGA["O1"] * t_hours - 0.8)
        )

    # 2. Desain Matriks Least-Squares Harmonik: h(t) = Z0 + sum(a_k cos(wt) + b_k sin(wt))
    cols = [np.ones_like(t_hours)]
    names = list(TIDAL_OMEGA.keys())
    for k in names:
        w = TIDAL_OMEGA[k]
        cols.append(np.cos(w * t_hours))
        cols.append(np.sin(w * t_hours))
    design_mat = np.column_stack(cols)
    beta, *_ = np.linalg.lstsq(design_mat, h, rcond=None)

    msl = float(beta[0])
    constituents = {}
    for idx, k in enumerate(names):
        a_k = beta[1 + 2 * idx]
        b_k = beta[2 + 2 * idx]
        amp = float(np.hypot(a_k, b_k))
        phase_deg = float((np.degrees(np.arctan2(b_k, a_k)) + 360) % 360)
        constituents[k] = {"amplitudo_m": round(amp, 4), "fase_deg": round(phase_deg, 2)}

    # 3. Bilangan Formzahl: F = (K1 + O1) / (M2 + S2)
    f_val = (constituents["K1"]["amplitudo_m"] + constituents["O1"]["amplitudo_m"]) / (
        constituents["M2"]["amplitudo_m"] + constituents["S2"]["amplitudo_m"] + 1e-9
    )
    tipe_pasut = (
        "Semidiurnal Murni (Harian Ganda)" if f_val <= 0.25 else
        "Campuran Condong Harian Ganda" if f_val <= 1.50 else
        "Campuran Condong Harian Tunggal" if f_val <= 3.00 else
        "Diurnal Murni (Harian Tunggal)"
    )

    # 4. Elevasi Penting (HHWL, MHWL, MSL, MLWL, LLWL, Chart Datum)
    sum_amp = sum(v["amplitudo_m"] for v in constituents.values())
    hhwl = msl + sum_amp
    llwl = msl - sum_amp
    mhwl = msl + (constituents["M2"]["amplitudo_m"] + constituents["S2"]["amplitudo_m"])
    mlwl = msl - (constituents["M2"]["amplitudo_m"] + constituents["S2"]["amplitudo_m"])

    print(f"=== HASIL ANALISIS PASANG SURUT — ${regionName} ===")
    print(f"MSL  (Mean Sea Level)         : {msl:.3f} m")
    print(f"HHWL (Highest High Water Lvl) : {hhwl:.3f} m")
    print(f"MHWL (Mean High Water Lvl)    : {mhwl:.3f} m")
    print(f"MLWL (Mean Low Water Lvl)     : {mlwl:.3f} m")
    print(f"LLWL (Lowest Low Water Lvl)   : {llwl:.3f} m")
    print(f"Formzahl (F)                  : {f_val:.3f} -> {tipe_pasut}")
    print("Konstanta Harmonik:", constituents)

    OUTPUT_SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([
        {"parameter": k, **v} for k, v in constituents.items()
    ]).to_csv(OUTPUT_SUMMARY, index=False)
    print(f"Ringkasan harmonik tersimpan di: {OUTPUT_SUMMARY}")

if __name__ == "__main__":
    analyze_tides()
`;
}

/**
 * Generator Analisis Kemiringan Garis Pantai (Foreshore Slope tan β) & Perubahan Pesisir (NSM/EPR)
 */
export function generateShorelineSlopeScript(
  platformId: GisPlatformId,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const { regionName, bbox, crsEpsg, spatialResolutionMeters, bufferDistanceMeters, thresholdValue, inputLayerPath, outputLayerPath, startDate, endDate } = params;

  if (platformId === 'swan') {
    const tanBeta = Math.tan((Math.max(0.5, Math.min(25, thresholdValue)) * Math.PI) / 180);
    return `$ ============================================================================
$ GeoScript Studio — Kalibrasi Gelombang SWAN Berbasis Kemiringan Pantai
$ Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
$ Sudut Pantai  : ${thresholdValue.toFixed(1)}° (tan beta = ${tanBeta.toFixed(4)})
$ ============================================================================

PROJECT 'SHORESLOPE' 'RUN1'
MODE NONSTATIONARY TWODIMENSIONAL
SET LEVEL 0.0 NAUT
COORD SPHERICAL CCM

CGRID REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0. ${(bbox.maxLon - bbox.minLon).toFixed(4)} ${(bbox.maxLat - bbox.minLat).toFixed(4)} 100 100 CIRCLE 36 0.04 1.0 32
INPGRID BOTTOM REGULAR ${bbox.minLon.toFixed(4)} ${bbox.minLat.toFixed(4)} 0. 100 100 ${((bbox.maxLon - bbox.minLon) / 100).toFixed(6)} ${((bbox.maxLat - bbox.minLat) / 100).toFixed(6)} EXC -9999.
READINP BOTTOM -1. 'data/batimetri_pesisir.bot' 3 0 FREE

WIND 11.5 160.0
BOUN SHAPESPEC JONSWAP 3.3 PEAK DSPR DEGREES
BOUN SIDE S CONSTANT PAR 1.80 8.5 180. 25.

$ Pecah gelombang dangkal disesuaikan dengan kemiringan foreshore (tan beta = ${tanBeta.toFixed(4)})
GEN3 KOMEN
BREAKING CONSTANT 1.0 ${tanBeta > 0.08 ? '0.80' : '0.73'}
FRICTION JONSWAP 0.067

POINTS 'GARIS_PANTAI' ${((bbox.minLon + bbox.maxLon) / 2).toFixed(5)} ${((bbox.minLat + bbox.maxLat) / 2).toFixed(5)}
TABLE 'GARIS_PANTAI' HEADER '${outputLayerPath.replace(/\.(gpkg|tif)$/i, '')}_energi_pantai.tab' TIME XP YP DEP HSIGN TPS DIR UBOT DISSIP
COMPUTE NONSTAT ${startDate.replace(/-/g, '')}.000000 30 MIN ${endDate.replace(/-/g, '')}.000000
STOP
`;
  }

  if (platformId === 'gee-js') {
    return `/**
 * GeoScript Studio — Ekstraksi Garis Pantai & Kemiringan Pesisir (GEE JavaScript)
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Metode        : AWEI/MNDWI Multi-Temporal + ee.Terrain.slope() Zona Pesisir
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 12);

// 1. Fungsi Ekstraksi Indeks Air Akurat (AWEI) untuk Batas Garis Pantai
function computeAWEI(img) {
  var scaled = img.divide(10000);
  var awei = scaled.expression(
    '4 * (GREEN - SWIR1) - (0.25 * NIR + 2.75 * SWIR2)', {
      GREEN: scaled.select('B3'),
      SWIR1: scaled.select('B11'),
      NIR: scaled.select('B8'),
      SWIR2: scaled.select('B12')
    }
  ).rename('AWEI');
  return awei;
}

var s2Col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${params.maxCloudCover}));

var coastalBaseline = computeAWEI(s2Col.filterDate('${startDate}', '${endDate}').median().clip(aoi));
var seaMask = coastalBaseline.gt(0.0).selfMask();

// 2. Hitung Kemiringan Zona Pesisir (Derajat & Persen) pada Koridor ${bufferDistanceMeters}m
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(aoi);
var coastalSlopeDeg = ee.Terrain.slope(dem).rename('Slope_Deg');
var coastalCorridor = seaMask.focalMax(${bufferDistanceMeters}, 'circle', 'meters');
var foreshoreSlope = coastalSlopeDeg.updateMask(coastalCorridor);

// 3. Vektorisasi Garis Pantai & Ekspor
var shorelineVectors = seaMask.reduceToVectors({
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  geometryType: 'polygon',
  eightConnected: true,
  maxPixels: 1e10
});

print('Jumlah Segmen Garis Pantai:', shorelineVectors.size());
Map.addLayer(foreshoreSlope, {min: 0, max: 12, palette: ['#0d9488', '#fde047', '#dc2626']}, 'Kemiringan Pantai (Derajat)');
Map.addLayer(shorelineVectors, {color: '#0284c7'}, 'Vektor Garis Pantai (AWEI)');

${
  params.includeExport
    ? `Export.table.toDrive({
  collection: shorelineVectors,
  description: 'Shoreline_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
  folder: 'GeoScript_Exports',
  fileFormat: 'GeoJSON'
});`
    : ''
}
`;
  }

  if (platformId === 'postgis-gdal') {
    return `-- =============================================================================
-- GeoScript Studio — Analisis Kemiringan & Perubahan Garis Pantai (PostGIS + GDAL)
-- Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²) | SRID: ${ctx.epsgNumberOnly}
-- =============================================================================

-- 1. Bangun Transek Tegak Lurus & Hitung Jarak Pergeseran Garis Pantai (NSM / EPR)
WITH pantai_t1 AS (
    SELECT ST_Transform(geom, ${ctx.epsgNumberOnly}) AS geom FROM public.garis_pantai_awal
),
pantai_t2 AS (
    SELECT ST_Transform(geom, ${ctx.epsgNumberOnly}) AS geom FROM public.garis_pantai_akhir
),
titik_sampel AS (
    SELECT
        generate_series(0.05, 0.95, 0.05) AS fraksi,
        ST_LineInterpolatePoint(ST_LineMerge(p1.geom), generate_series(0.05, 0.95, 0.05)) AS pt_t1
    FROM pantai_t1 p1
)
SELECT
    ROW_NUMBER() OVER () AS id_transek,
    ROUND(ST_Length(ST_ShortestLine(t.pt_t1, p2.geom))::numeric, 2) AS pergeseran_nsm_m,
    ROUND((ST_Length(ST_ShortestLine(t.pt_t1, p2.geom)) / 5.0)::numeric, 2) AS laju_epr_m_tahun,
    ST_ShortestLine(t.pt_t1, p2.geom) AS geom_transek
FROM titik_sampel t
CROSS JOIN pantai_t2 p2;

-- 2. Hitung Kemiringan Garis Pantai (Persen & Derajat) dari DEM Pesisir via GDAL:
-- gdaldem slope ${inputLayerPath} output/kemiringan_pantai_deg.tif -compute_edges
-- gdaldem slope ${inputLayerPath} output/kemiringan_pantai_pct.tif -p -compute_edges
`;
  }

  // Primary Python / PyQGIS / ArcPy / GEE-Py implementation
  return `"""
GeoScript Studio — Analisis Kemiringan Garis Pantai (Foreshore Slope tan β) & DSAS (Python)
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Proyeksi UTM  : ${crsEpsg} | Panjang Transek: ${bufferDistanceMeters}m | Spasi: ${Math.max(25, spatialResolutionMeters * 5)}m
Ambang Curam  : ${thresholdValue}°
"""

from pathlib import Path
import numpy as np
import geopandas as gpd
import rasterio
from shapely.geometry import LineString, Point

# 1. Konfigurasi File Input Garis Pantai (t1 & t2) + DEM Topobathy (DEMNAS/BATNAS)
SHORELINE_T1 = Path("data/garis_pantai_awal.gpkg")
SHORELINE_T2 = Path("data/garis_pantai_akhir.gpkg")
DEM_COASTAL = Path("${inputLayerPath}")
OUTPUT_GPKG = Path("${outputLayerPath}")
TARGET_CRS = "${crsEpsg}"
TRANSECT_SPACING_M = ${Math.max(25, spatialResolutionMeters * 5)}
TRANSECT_LENGTH_M = ${bufferDistanceMeters}
YEARS_SPAN = 5.0  # Selisih tahun t1 -> t2 untuk menghitung End Point Rate (EPR)

def sample_elev(src, x, y):
    vals = list(src.sample([(x, y)]))[0]
    val = float(vals[0])
    return np.nan if (src.nodata is not None and val == src.nodata) else val

def run_shoreline_slope_analysis():
    g_t1 = gpd.read_file(SHORELINE_T1).to_crs(TARGET_CRS)
    g_t2 = gpd.read_file(SHORELINE_T2).to_crs(TARGET_CRS)
    baseline = g_t1.geometry.unary_union
    target_line = g_t2.geometry.unary_union

    records = []
    with rasterio.open(DEM_COASTAL) as dem_src:
        # Iterasi sepanjang garis pantai baseline untuk membangun transek tegak lurus
        line = baseline if baseline.geom_type == "LineString" else list(baseline.geoms)[0]
        distances = np.arange(TRANSECT_SPACING_M, line.length - TRANSECT_SPACING_M, TRANSECT_SPACING_M)

        for idx, d in enumerate(distances, start=1):
            p_curr = line.interpolate(d)
            p_prev = line.interpolate(max(0, d - 5.0))
            p_next = line.interpolate(min(line.length, d + 5.0))

            dx = p_next.x - p_prev.x
            dy = p_next.y - p_prev.y
            norm = np.hypot(dx, dy) + 1e-9
            # Vektor normal tegak lurus garis pantai
            nx, ny = -dy / norm, dx / norm

            p_land = Point(p_curr.x + nx * (TRANSECT_LENGTH_M / 2), p_curr.y + ny * (TRANSECT_LENGTH_M / 2))
            p_sea = Point(p_curr.x - nx * (TRANSECT_LENGTH_M / 2), p_curr.y - ny * (TRANSECT_LENGTH_M / 2))
            transect = LineString([p_land, p_sea])

            # Sampling elevasi darat vs laut untuk menghitung kemiringan garis pantai (tan beta)
            z_land = sample_elev(dem_src, p_land.x, p_land.y)
            z_sea = sample_elev(dem_src, p_sea.x, p_sea.y)
            tan_beta = abs(z_land - z_sea) / TRANSECT_LENGTH_M if not (np.isnan(z_land) or np.isnan(z_sea)) else np.nan
            slope_deg = float(np.degrees(np.arctan(tan_beta))) if not np.isnan(tan_beta) else np.nan
            slope_pct = float(tan_beta * 100.0) if not np.isnan(tan_beta) else np.nan

            # Hitung pergeseran garis pantai (NSM & EPR m/tahun) terhadap garis pantai t2
            inter = transect.intersection(target_line)
            nsm_m = float(p_curr.distance(inter)) if not inter.is_empty else 0.0
            epr_m_yr = nsm_m / YEARS_SPAN

            klasifikasi = (
                "Curam (Reflektif)" if (not np.isnan(slope_deg) and slope_deg >= ${thresholdValue})
                else "Landai (Disipatif)"
            )
            records.append({
                "id_transek": idx,
                "tan_beta": round(float(tan_beta), 5) if not np.isnan(tan_beta) else None,
                "slope_deg": round(slope_deg, 2) if not np.isnan(slope_deg) else None,
                "slope_pct": round(slope_pct, 2) if not np.isnan(slope_pct) else None,
                "klasifikasi_pantai": klasifikasi,
                "nsm_m": round(nsm_m, 2),
                "epr_m_thn": round(epr_m_yr, 2),
                "geometry": transect
            })

    out_gdf = gpd.GeoDataFrame(records, crs=TARGET_CRS)
    OUTPUT_GPKG.parent.mkdir(parents=True, exist_ok=True)
    out_gdf.to_file(OUTPUT_GPKG, driver="GPKG", layer="transek_kemiringan_pantai")
    print(f"Selesai! {len(out_gdf)} transek kemiringan garis pantai tersimpan di {OUTPUT_GPKG}")
    print(out_gdf[["id_transek", "slope_deg", "slope_pct", "klasifikasi_pantai", "epr_m_thn"]].head())

if __name__ == "__main__":
    run_shoreline_slope_analysis()
`;
}

/**
 * Generator Klasifikasi Tutupan Lahan Multi-Indeks (LULC 6 Kelas: Air, Mangrove, Hutan, Terbangun, Lahan Terbuka, Pertanian)
 */
export function generateLandCoverScript(
  platformId: GisPlatformId,
  params: ScriptParameters,
  ctx: ExtendedGeneratorContext
): string {
  const { regionName, crsEpsg, startDate, endDate, maxCloudCover, spatialResolutionMeters, outputLayerPath } = params;

  if (platformId === 'gee-js' || platformId === 'gee-py') {
    if (platformId === 'gee-js') {
      return `/**
 * GeoScript Studio — Klasifikasi Tutupan Lahan 6 Kelas Multi-Indeks (LULC Sentinel-2)
 * Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
 * Indeks Utama  : NDVI, MNDWI, NDBI, BSI (Bare Soil), & MVI (Mangrove)
 * Target CRS    : ${crsEpsg} (${spatialResolutionMeters} meter)
 */

${ctx.geeAoiDeclaration}
Map.centerObject(aoi, 11);

function maskS2(img) {
  var qa = img.select('QA60');
  var mask = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  return img.updateMask(mask).divide(10000);
}

var img = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('${startDate}', '${endDate}')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', ${maxCloudCover}))
  .map(maskS2)
  .median()
  .clip(aoi);

// 1. Hitung 5 Indeks Tutupan Lahan
var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
var mndwi = img.normalizedDifference(['B3', 'B11']).rename('MNDWI');
var ndbi = img.normalizedDifference(['B11', 'B8']).rename('NDBI');
var bsi = img.expression('((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))', {
  B11: img.select('B11'), B4: img.select('B4'), B8: img.select('B8'), B2: img.select('B2')
}).rename('BSI');
var mvi = img.expression('(B8 - B3) / (B11 - B3 + 1e-6)', {
  B8: img.select('B8'), B3: img.select('B3'), B11: img.select('B11')
}).rename('MVI');

// 2. Pohon Keputusan 6 Kelas Tutupan Lahan (1: Air, 2: Mangrove, 3: Hutan, 4: Terbangun, 5: Lahan Terbuka/BSI, 6: Pertanian/Semak)
var lulc = ee.Image(6)
  .where(bsi.gt(0.05).and(ndvi.lt(0.25)), 5)
  .where(ndbi.gt(0.02).and(ndvi.lt(0.25)), 4)
  .where(ndvi.gte(0.55), 3)
  .where(mvi.gte(4.0).and(mvi.lte(18.0)).and(ndvi.gte(0.30)), 2)
  .where(mndwi.gt(0.0), 1)
  .rename('LULC_Class')
  .clip(aoi);

// 3. Hitung Neraca Luas Hektar (Ha) Per Kelas Tutupan Lahan
var areaStats = ee.Image.pixelArea().divide(10000).addBands(lulc).reduceRegion({
  reducer: ee.Reducer.sum().group({ groupField: 1, groupName: 'kelas_lulc' }),
  geometry: aoi,
  scale: ${spatialResolutionMeters},
  maxPixels: 1e10
});
print('Neraca Luas Tutupan Lahan (Hektar) [1=Air, 2=Mangrove, 3=Hutan, 4=Terbangun, 5=Terbuka, 6=Pertanian]:', areaStats);

Map.addLayer(lulc, {
  min: 1, max: 6,
  palette: ['#0284c7', '#065f46', '#16a34a', '#dc2626', '#d97706', '#bef264']
}, 'Tutupan Lahan 6 Kelas — ${regionName}');

${
  params.includeExport
    ? `Export.image.toDrive({
  image: lulc.toByte(),
  description: 'LULC_6Kelas_${regionName.replace(/[^a-zA-Z0-9]/g, '_')}',
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
  }

  return `"""
GeoScript Studio — Klasifikasi Tutupan Lahan Multi-Indeks (LULC 6 Kelas) Python
Wilayah Studi : ${regionName} (~${ctx.areaKm2} km²)
Indeks        : NDVI, MNDWI, NDBI, BSI (Lahan Terbuka), MVI (Mangrove)
Proyeksi      : ${crsEpsg} (${spatialResolutionMeters}m)
"""

from pathlib import Path
import numpy as np
import rasterio

# 1. Input Band Sentinel-2 (Blue=B2, Green=B3, Red=B4, NIR=B8, SWIR1=B11)
BAND_FILES = {
    "B2": Path("data/B02.tif"),
    "B3": Path("data/B03.tif"),
    "B4": Path("data/B04.tif"),
    "B8": Path("data/B08.tif"),
    "B11": Path("data/B11.tif"),
}
OUTPUT_LULC = Path("${outputLayerPath.replace('.gpkg', '_lulc.tif')}")

def classify_lulc():
    arrays = {}
    meta = None
    for k, p in BAND_FILES.items():
        with rasterio.open(p) as src:
            arrays[k] = src.read(1).astype("float32")
            if meta is None:
                meta = src.meta.copy()

    eps = 1e-6
    ndvi = (arrays["B8"] - arrays["B4"]) / (arrays["B8"] + arrays["B4"] + eps)
    mndwi = (arrays["B3"] - arrays["B11"]) / (arrays["B3"] + arrays["B11"] + eps)
    ndbi = (arrays["B11"] - arrays["B8"]) / (arrays["B11"] + arrays["B8"] + eps)
    bsi = ((arrays["B11"] + arrays["B4"]) - (arrays["B8"] + arrays["B2"])) / (
        (arrays["B11"] + arrays["B4"]) + (arrays["B8"] + arrays["B2"]) + eps
    )
    mvi = (arrays["B8"] - arrays["B3"]) / (arrays["B11"] - arrays["B3"] + eps)

    # Kelas: 1=Air, 2=Mangrove, 3=Hutan Rapat, 4=Terbangun, 5=Tanah Terbuka/BSI, 6=Pertanian/Semak
    lulc = np.full(ndvi.shape, 6, dtype="uint8")
    lulc[(bsi > 0.05) & (ndvi < 0.25)] = 5
    lulc[(ndbi > 0.02) & (ndvi < 0.25)] = 4
    lulc[ndvi >= 0.55] = 3
    lulc[(mvi >= 4.0) & (mvi <= 18.0) & (ndvi >= 0.30)] = 2
    lulc[mndwi > 0.0] = 1

    px_ha = (${spatialResolutionMeters} * ${spatialResolutionMeters}) / 10_000.0
    labels = {1: "Badan Air", 2: "Mangrove", 3: "Hutan Rapat", 4: "Terbangun", 5: "Lahan Terbuka (BSI)", 6: "Pertanian/Semak"}
    for cid, cname in labels.items():
        ha = float(np.sum(lulc == cid) * px_ha)
        print(f"Kelas {cid} ({cname:20s}): {ha:,.2f} Hektar")

    meta.update({"dtype": "uint8", "count": 1, "nodata": 0, "compress": "lzw"})
    OUTPUT_LULC.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(OUTPUT_LULC, "w", **meta) as dst:
        dst.write(lulc, 1)
    print(f"Peta Tutupan Lahan tersimpan di: {OUTPUT_LULC}")

if __name__ == "__main__":
    classify_lulc()
`;
}
