import React, { useState } from 'react';
import {
  SPECTRAL_INDEX_DEFINITIONS,
  recommendUtmEpsg,
  decimalToDms,
  type BoundingBox,
  type SatelliteSensorId,
  type SpectralIndexId,
} from '../utils/gisEngine';
import { Calculator, Compass, ArrowUpRight, Sliders, LocateFixed, Waves } from 'lucide-react';

interface SpectralAndCrsToolboxProps {
  activeSensor: SatelliteSensorId;
  activeIndex: SpectralIndexId;
  onApplyIndexAndSensor: (indexId: SpectralIndexId, sensorId: SatelliteSensorId) => void;
  onApplyCustomCoordinates: (bbox: BoundingBox, epsg: string, label: string) => void;
  onApplyShorelineSlope?: (slopeDeg: number, transectMeters: number) => void;
}

const SENSORS: { id: SatelliteSensorId; label: string; resolution: string }[] = [
  { id: 'S2_SR', label: 'Sentinel-2 MSI L2A', resolution: '10m / 20m' },
  { id: 'LANDSAT_8_9', label: 'Landsat 8/9 OLI-2 C2', resolution: '30m' },
  { id: 'SENTINEL_1_SAR', label: 'Sentinel-1 C-Band SAR', resolution: '10m GRD' },
  { id: 'MODIS_TERRA', label: 'MODIS Terra MOD09GA', resolution: '250m / 500m' },
];

const INDONESIAN_UTM_ZONES = [
  { zone: '46N / 46S', lonRange: '90° BT – 96° BT', epsgN: 'EPSG:32646', epsgS: 'EPSG:32746', coverage: 'Aceh Barat, Pulau Simeulue, Kepulauan Mentawai Barat' },
  { zone: '47N / 47S', lonRange: '96° BT – 102° BT', epsgN: 'EPSG:32647', epsgS: 'EPSG:32747', coverage: 'Sumatera Utara, Sumatera Barat, Riau, Jambi, Bengkulu' },
  { zone: '48N / 48S', lonRange: '102° BT – 108° BT', epsgN: 'EPSG:32648', epsgS: 'EPSG:32748', coverage: 'Sumatera Selatan, Lampung, Kep. Bangka Belitung, Banten, DKI Jakarta, Jawa Barat, Kalbar Barat' },
  { zone: '49N / 49S', lonRange: '108° BT – 114° BT', epsgN: 'EPSG:32649', epsgS: 'EPSG:32749', coverage: 'Jawa Tengah, DI Yogyakarta, Jawa Timur, Kalimantan Barat, Kalimantan Tengah' },
  { zone: '50N / 50S', lonRange: '114° BT – 120° BT', epsgN: 'EPSG:32650', epsgS: 'EPSG:32750', coverage: 'Bali, NTB, Kalimantan Selatan, Kalimantan Timur (IKN), Kalimantan Utara, Sulawesi Barat & Selatan' },
  { zone: '51N / 51S', lonRange: '120° BT – 126° BT', epsgN: 'EPSG:32651', epsgS: 'EPSG:32751', coverage: 'NTT, Sulawesi Tengah, Sulawesi Tenggara, Gorontalo, Sulawesi Utara, Maluku Utara Barat' },
  { zone: '52N / 52S', lonRange: '126° BT – 132° BT', epsgN: 'EPSG:32652', epsgS: 'EPSG:32752', coverage: 'Maluku (Ambon, Seram), Maluku Utara (Halmahera), Papua Barat Daya (Raja Ampat, Sorong)' },
  { zone: '53S', lonRange: '132° BT – 138° BT', epsgN: 'EPSG:32653', epsgS: 'EPSG:32753', coverage: 'Papua Barat (Fakfak, Manokwari), Papua Tengah (Timika, Nabire)' },
  { zone: '54S', lonRange: '138° BT – 144° BT', epsgN: 'EPSG:32654', epsgS: 'EPSG:32754', coverage: 'Papua (Jayapura), Papua Pegunungan (Wamena), Papua Selatan (Merauke)' },
];

export const SpectralAndCrsToolbox: React.FC<SpectralAndCrsToolboxProps> = ({
  activeSensor,
  activeIndex,
  onApplyIndexAndSensor,
  onApplyCustomCoordinates,
  onApplyShorelineSlope,
}) => {
  const [selectedSensor, setSelectedSensor] = useState<SatelliteSensorId>(activeSensor);

  // Interactive Spectral Reflectance Simulator State (0.01 - 0.90)
  const [reflNir, setReflNir] = useState<number>(0.48);
  const [reflRed, setReflRed] = useState<number>(0.08);
  const [reflGreen, setReflGreen] = useState<number>(0.11);
  const [reflBlue, setReflBlue] = useState<number>(0.06);
  const [reflSwir1, setReflSwir1] = useState<number>(0.18);
  const [reflSwir2, setReflSwir2] = useState<number>(0.09);

  // Coordinate & UTM Calculator State
  const [testLon, setTestLon] = useState<number>(116.85);
  const [testLat, setTestLat] = useState<number>(-0.95);
  const [boxHalfSizeDeg, setBoxHalfSizeDeg] = useState<number>(0.25);
  const [isLocatingCrs, setIsLocatingCrs] = useState<boolean>(false);
  const [crsGeoError, setCrsGeoError] = useState<string | null>(null);

  // Shoreline Slope (tan beta) & Iribarren Calculator State
  const [deltaZ, setDeltaZ] = useState<number>(2.4);
  const [deltaX, setDeltaX] = useState<number>(40);
  const [waveH0, setWaveH0] = useState<number>(1.5);
  const [wavePeriodT, setWavePeriodT] = useState<number>(8.0);

  // Compute simulated index values for all 12 indices
  const simNdvi = (reflNir - reflRed) / (reflNir + reflRed + 1e-7);
  const simNdwi = (reflGreen - reflNir) / (reflGreen + reflNir + 1e-7);
  const simNdbi = (reflSwir1 - reflNir) / (reflSwir1 + reflNir + 1e-7);
  const simEvi = 2.5 * ((reflNir - reflRed) / (reflNir + 6 * reflRed - 7.5 * reflBlue + 1));
  const simSavi = ((reflNir - reflRed) / (reflNir + reflRed + 0.5)) * 1.5;
  const simMndwi = (reflGreen - reflSwir1) / (reflGreen + reflSwir1 + 1e-7);
  const simNbr = (reflNir - reflSwir2) / (reflNir + reflSwir2 + 1e-7);
  const simBsi =
    ((reflSwir1 + reflRed) - (reflNir + reflBlue)) /
    ((reflSwir1 + reflRed) + (reflNir + reflBlue) + 1e-7);
  const simNdmi = (reflNir - reflSwir1) / (reflNir + reflSwir1 + 1e-7);
  const simAwei = 4 * (reflGreen - reflSwir1) - (0.25 * reflNir + 2.75 * reflSwir2);
  const simMvi = (reflNir - reflGreen) / (Math.abs(reflSwir1 - reflGreen) > 1e-3 ? reflSwir1 - reflGreen : 0.02);
  const simNdbai = (reflSwir1 - reflSwir2) / (reflSwir1 + reflSwir2 + 1e-7);

  const simulatedMap: Record<SpectralIndexId, number> = {
    NDVI: simNdvi,
    NDWI: simNdwi,
    NDBI: simNdbi,
    EVI: simEvi,
    SAVI: simSavi,
    MNDWI: simMndwi,
    NBR: simNbr,
    BSI: simBsi,
    NDMI: simNdmi,
    AWEI: simAwei,
    MVI: simMvi,
    NDBaI: simNdbai,
  };

  // Shoreline slope & Iribarren calculations
  const tanBeta = deltaZ / Math.max(1, deltaX);
  const slopeDeg = (Math.atan(tanBeta) * 180) / Math.PI;
  const slopePct = tanBeta * 100;
  const L0 = 1.56 * wavePeriodT * wavePeriodT;
  const iribarrenXi0 = tanBeta / Math.sqrt(Math.max(0.01, waveH0) / Math.max(1, L0));
  const breakerType =
    iribarrenXi0 < 0.5
      ? 'Spilling (Pantai Landai / Disipatif)'
      : iribarrenXi0 <= 3.3
        ? 'Plunging (Intermediat / Transisi)'
        : 'Surging / Collapsing (Pantai Curam / Reflektif)';

  const utmResult = recommendUtmEpsg(testLon, testLat);

  const handleApplyTestedCoords = () => {
    const newBbox: BoundingBox = {
      minLon: Number((testLon - boxHalfSizeDeg).toFixed(4)),
      maxLon: Number((testLon + boxHalfSizeDeg).toFixed(4)),
      minLat: Number((testLat - boxHalfSizeDeg).toFixed(4)),
      maxLat: Number((testLat + boxHalfSizeDeg).toFixed(4)),
    };
    onApplyCustomCoordinates(
      newBbox,
      utmResult.epsg,
      `Titik Uji (${testLat.toFixed(3)}°, ${testLon.toFixed(3)}°)`
    );
  };

  const handleUseCurrentGps = () => {
    setCrsGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setCrsGeoError('Browser tidak mendukung GPS Geolocation.');
      return;
    }
    setIsLocatingCrs(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTestLat(Number(pos.coords.latitude.toFixed(5)));
        setTestLon(Number(pos.coords.longitude.toFixed(5)));
        setBoxHalfSizeDeg(0.05);
        setIsLocatingCrs(false);
      },
      () => {
        setIsLocatingCrs(false);
        setCrsGeoError('Izin lokasi ditolak atau koordinat GPS tidak tersedia.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Spectral Index Explorer & Simulator */}
      <section className="bg-white/95 border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)]" aria-labelledby="spectral-calc-heading">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <h1 id="spectral-calc-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
              Kalkulator Indeks Spektral & Referensi Band Satelit
            </h1>
            <p className="text-sm text-slate-600">
              Bandingkan kombinasi band untuk Sentinel-2, Landsat 8/9, Sentinel-1 SAR, dan MODIS, atau simulasikan nilai reflektansi permukaan secara langsung.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilih Sensor Satelit">
            {SENSORS.map((sensor) => (
              <button
                key={sensor.id}
                type="button"
                onClick={() => setSelectedSensor(sensor.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedSensor === sensor.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sensor.label} ({sensor.resolution})
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Pixel Reflectance Simulator */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Simulator Reflektansi Piksel (Surface Reflectance 0.0 – 0.9)
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setReflNir(0.52);
                  setReflRed(0.05);
                  setReflGreen(0.08);
                  setReflBlue(0.04);
                  setReflSwir1(0.16);
                  setReflSwir2(0.07);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700"
              >
                Preset: Hutan Lebat
              </button>
              <button
                type="button"
                onClick={() => {
                  setReflNir(0.04);
                  setReflRed(0.06);
                  setReflGreen(0.14);
                  setReflBlue(0.11);
                  setReflSwir1(0.02);
                  setReflSwir2(0.01);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700"
              >
                Preset: Badan Air / Danau
              </button>
              <button
                type="button"
                onClick={() => {
                  setReflNir(0.22);
                  setReflRed(0.24);
                  setReflGreen(0.21);
                  setReflBlue(0.18);
                  setReflSwir1(0.36);
                  setReflSwir2(0.31);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
              >
                Preset: Terbangun / Beton
              </button>
              <button
                type="button"
                onClick={() => {
                  setReflNir(0.42);
                  setReflRed(0.06);
                  setReflGreen(0.09);
                  setReflBlue(0.05);
                  setReflSwir1(0.14);
                  setReflSwir2(0.06);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
              >
                Preset: Mangrove Pesisir
              </button>
              <button
                type="button"
                onClick={() => {
                  setReflNir(0.28);
                  setReflRed(0.31);
                  setReflGreen(0.24);
                  setReflBlue(0.16);
                  setReflSwir1(0.42);
                  setReflSwir2(0.35);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
              >
                Preset: Tanah Terbuka / Pasir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label htmlFor="sim-nir" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>NIR (Inframerah)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflNir.toFixed(2)}</span>
              </label>
              <input
                id="sim-nir"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflNir}
                onChange={(e) => setReflNir(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
            <div>
              <label htmlFor="sim-red" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Red (Merah)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflRed.toFixed(2)}</span>
              </label>
              <input
                id="sim-red"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflRed}
                onChange={(e) => setReflRed(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
            <div>
              <label htmlFor="sim-green" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Green (Hijau)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflGreen.toFixed(2)}</span>
              </label>
              <input
                id="sim-green"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflGreen}
                onChange={(e) => setReflGreen(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
            <div>
              <label htmlFor="sim-blue" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Blue (Biru)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflBlue.toFixed(2)}</span>
              </label>
              <input
                id="sim-blue"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflBlue}
                onChange={(e) => setReflBlue(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
            <div>
              <label htmlFor="sim-swir1" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>SWIR 1 (1.6µm)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflSwir1.toFixed(2)}</span>
              </label>
              <input
                id="sim-swir1"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflSwir1}
                onChange={(e) => setReflSwir1(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
            <div>
              <label htmlFor="sim-swir2" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>SWIR 2 (2.2µm)</span>
                <span className="font-mono tabular-nums text-sky-700">{reflSwir2.toFixed(2)}</span>
              </label>
              <input
                id="sim-swir2"
                type="range"
                min="0.01"
                max="0.85"
                step="0.01"
                value={reflSwir2}
                onChange={(e) => setReflSwir2(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>
        </div>

        {/* High-Density Spectral Index Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Indeks</th>
                <th className="py-3 px-4">Kegunaan & Interpretasi</th>
                <th className="py-3 px-4">Ekspresi Band ({selectedSensor})</th>
                <th className="py-3 px-4 text-right">Hasil Simulasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {SPECTRAL_INDEX_DEFINITIONS.map((idxDef) => {
                const sensorDetail = idxDef.bandsBySensor[selectedSensor];
                const simVal = simulatedMap[idxDef.id];
                const isCurrent = activeIndex === idxDef.id && activeSensor === selectedSensor;
                return (
                  <tr key={idxDef.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900 text-sm">{idxDef.id}</div>
                      <div className="text-slate-500">{idxDef.indonesianName}</div>
                      <div className="flex items-center gap-1 mt-1.5" aria-label="Palet warna">
                        {idxDef.paletteHex.map((hex) => (
                          <span
                            key={hex}
                            className="w-4 h-2 rounded-xs border border-slate-300/60"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-top max-w-md space-y-1">
                      <p className="text-slate-700 font-medium">{idxDef.purpose}</p>
                      <p className="text-slate-500">{idxDef.thresholdGuide}</p>
                    </td>
                    <td className="py-3.5 px-4 align-top font-mono">
                      <div className="text-slate-900 font-semibold">{sensorDetail.expression}</div>
                      <div className="text-slate-500 font-sans mt-0.5">{sensorDetail.bandDescription}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-right font-mono tabular-nums">
                      <span className="text-sm font-bold text-slate-900">
                        {simVal >= 0 ? `+${simVal.toFixed(3)}` : simVal.toFixed(3)}
                      </span>
                      <div className="text-[11px] text-slate-500">Rentang {idxDef.typicalRange}</div>
                    </td>
                    <td className="py-3.5 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => onApplyIndexAndSensor(idxDef.id, selectedSensor)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                          isCurrent
                            ? 'bg-emerald-700 text-white'
                            : 'bg-sky-700 hover:bg-sky-800 text-white'
                        }`}
                      >
                        {isCurrent ? 'Aktif di Script' : 'Gunakan di Script'}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Coordinate Converter & Indonesian UTM Zone Reference */}
      <section className="bg-white/95 border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)]" aria-labelledby="crs-calc-heading">
        <div className="border-b border-slate-200 pb-4">
          <h2 id="crs-calc-heading" className="text-xl font-bold text-slate-900 tracking-tight">
            Kalkulator Koordinat & Pencari Zona Proyeksi UTM Indonesia (EPSG)
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Masukkan koordinat atau deteksi lokasi GPS saat ini untuk mengonversi ke Derajat Menit Detik (DMS) serta menentukan kode EPSG UTM metrik yang tepat.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Coordinate Input Box */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-700" />
                <span>Uji Titik Koordinat & Buat BBox AOI</span>
              </span>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={isLocatingCrs}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg transition-colors"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${isLocatingCrs ? 'animate-spin' : ''}`} />
                {isLocatingCrs ? 'Mencari GPS...' : 'Lokasi Saat Ini'}
              </button>
            </div>

            {crsGeoError && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {crsGeoError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="calc-lon" className="block text-xs font-medium text-slate-700 mb-1">
                  Bujur / Longitude (°BT/BB)
                </label>
                <input
                  id="calc-lon"
                  type="number"
                  step="0.01"
                  value={testLon}
                  onChange={(e) => setTestLon(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
              <div>
                <label htmlFor="calc-lat" className="block text-xs font-medium text-slate-700 mb-1">
                  Lintang / Latitude (°LU/LS)
                </label>
                <input
                  id="calc-lat"
                  type="number"
                  step="0.01"
                  value={testLat}
                  onChange={(e) => setTestLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="calc-radius" className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Radius Kotak AOI (Derajat)</span>
                <span className="font-mono tabular-nums">±{boxHalfSizeDeg}° (~{Math.round(boxHalfSizeDeg * 222)} km lebar)</span>
              </label>
              <input
                id="calc-radius"
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={boxHalfSizeDeg}
                onChange={(e) => setBoxHalfSizeDeg(parseFloat(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Format DMS (Lintang, Bujur):</span>
                <span className="font-mono font-semibold text-slate-900">
                  {decimalToDms(testLat, false)}, {decimalToDms(testLon, true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rekomendasi Proyeksi Metrik:</span>
                <span className="font-mono font-bold text-sky-700">
                  {utmResult.epsg} ({utmResult.label})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyTestedCoords}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Terapkan Koordinat & {utmResult.epsg} ke Studio Script
            </button>
          </div>

          {/* Indonesian UTM Zones Reference Table */}
          <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Zona UTM</th>
                  <th className="py-2.5 px-3">Rentang Bujur</th>
                  <th className="py-2.5 px-3">Utara (LU)</th>
                  <th className="py-2.5 px-3">Selatan (LS)</th>
                  <th className="py-2.5 px-3">Cakupan Wilayah di Indonesia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {INDONESIAN_UTM_ZONES.map((row) => {
                  const isHighlighted =
                    row.epsgN === utmResult.epsg || row.epsgS === utmResult.epsg;
                  return (
                    <tr
                      key={row.zone}
                      className={isHighlighted ? 'bg-sky-50/90 font-medium' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {row.zone}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.lonRange}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-sky-800 whitespace-nowrap">
                        {row.epsgN}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-sky-800 whitespace-nowrap">
                        {row.epsgS}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{row.coverage}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Kalkulator Kemiringan Garis Pantai (Foreshore Slope tan beta & Iribarren) */}
      <section className="bg-white/95 border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)]" aria-labelledby="shoreline-slope-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-teal-700" />
              <h2 id="shoreline-slope-heading" className="text-xl font-bold text-slate-900 tracking-tight">
                Kalkulator Kemiringan Garis Pantai (tan β) & Bilangan Iribarren (ξ₀)
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Hitung kemiringan lereng pantai (derajat & persen), klasifikasi morfodinamika, serta tipe pecah gelombang untuk kalibrasi script garis pantai & SWAN.
            </p>
          </div>
          {onApplyShorelineSlope && (
            <button
              type="button"
              onClick={() => onApplyShorelineSlope(Number(slopeDeg.toFixed(2)), Math.round(deltaX * 2))}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors whitespace-nowrap"
            >
              Terapkan ke Script Garis Pantai
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="slope-dz" className="block text-xs font-medium text-slate-700 mb-1">
              Beda Tinggi Darat–Laut Δz (m)
            </label>
            <input
              id="slope-dz"
              type="number"
              step="0.1"
              value={deltaZ}
              onChange={(e) => setDeltaZ(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="slope-dx" className="block text-xs font-medium text-slate-700 mb-1">
              Jarak Horizontal Foreshore Δx (m)
            </label>
            <input
              id="slope-dx"
              type="number"
              step="1"
              min="1"
              value={deltaX}
              onChange={(e) => setDeltaX(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="slope-h0" className="block text-xs font-medium text-slate-700 mb-1">
              Tinggi Gelombang Laut Dalam H₀ (m)
            </label>
            <input
              id="slope-h0"
              type="number"
              step="0.1"
              min="0.1"
              value={waveH0}
              onChange={(e) => setWaveH0(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="slope-t" className="block text-xs font-medium text-slate-700 mb-1">
              Periode Gelombang T (detik)
            </label>
            <input
              id="slope-t"
              type="number"
              step="0.5"
              min="1"
              value={wavePeriodT}
              onChange={(e) => setWavePeriodT(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">Kemiringan tan β</div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">{tanBeta.toFixed(4)}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">Sudut & Persen Lereng</div>
            <div className="text-lg font-bold font-mono text-teal-700 mt-0.5">
              {slopeDeg.toFixed(2)}° ({slopePct.toFixed(1)}%)
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-500">Bilangan Iribarren (ξ₀)</div>
            <div className="text-lg font-bold font-mono text-sky-700 mt-0.5">{iribarrenXi0.toFixed(3)}</div>
          </div>
          <div className="bg-teal-50/75 border border-teal-200 rounded-xl p-3.5">
            <div className="text-xs text-teal-800 font-medium">Karakteristik Gelombang Pantai</div>
            <div className="text-xs font-bold text-slate-900 mt-1">{breakerType}</div>
          </div>
        </div>
      </section>
    </div>
  );
};
