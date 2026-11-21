import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

interface StudioContextPayload {
  regionName?: string;
  templateTitle?: string;
  platformLabel?: string;
  crsEpsg?: string;
  spectralIndex?: string;
  sensor?: string;
  thresholdValue?: number;
  vizSummary?: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatTurnInput[];
  roleId?: string;
  fastMode?: boolean;
  studioContext?: StudioContextPayload;
}

const ROLE_INSTRUCTIONS: Record<string, string> = {
  'gis-architect':
    'Anda adalah Asisten Spesialis Pemetaan & GIS di GeoScript Studio. Anda ahli Google Earth Engine (JavaScript & Python geemap), Python Spasial (GeoPandas, Rasterio, rioxarray), PyQGIS, ArcGIS ArcPy, PostGIS, GDAL, dan interpretasi visualisasi indeks spektral serta tutupan lahan (LULC). Berikan jawaban terstruktur dalam bahasa Indonesia yang ringkas, praktis, dan akurat.',
  'coastal-oceanographer':
    'Anda adalah Ahli Oseanografi Pesisir & Hidrodinamika di GeoScript Studio. Anda ahli pemodelan gelombang nearshore SWAN (.swn), analisis data pasang surut (Admiralty/UTide, konstanta M2, S2, K1, O1, bilangan Formzahl, datum HHWL/MSL/LLWL), serta kemiringan garis pantai (tan beta, Iribarren) dan DSAS (NSM/EPR). Jawab dalam bahasa Indonesia secara teknis namun mudah dipahami.',
  'uav-photogrammetry':
    'Anda adalah Spesialis Fotogrametri Drone UAV di GeoScript Studio. Anda menguasai otomasi Agisoft Metashape Python API, Pix4Dmapper CLI, pengolahan GCP UTM, akurasi RMSE, DSM/DTM, orthomosaic GeoTIFF/COG, dan pelaporan survei udara. Jawab dalam bahasa Indonesia dengan langkah-langkah operasional yang jelas.',
};

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'geoscript-studio' });
  });

  // In-memory LRU cache for Earth Observation tiles (Terrarium DEM & Satellite Optical)
  const eoTileCache = new Map<string, { contentType: string; buf: Buffer }>();

  app.get('/api/eo-tile', async (req: Request, res: Response) => {
    const source = String(req.query.source || '');
    const z = Number(req.query.z);
    const x = Number(req.query.x);
    const y = Number(req.query.y);

    if (
      (source !== 'dem' && source !== 'sat') ||
      !Number.isInteger(z) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      z < 1 ||
      z > 15
    ) {
      res.status(400).json({ error: 'Parameter tile EO tidak valid.' });
      return;
    }

    const maxCoord = Math.pow(2, z);
    const wrappedX = ((x % maxCoord) + maxCoord) % maxCoord;
    if (y < 0 || y >= maxCoord) {
      res.status(400).json({ error: 'Koordinat tile Y di luar rentang.' });
      return;
    }

    const cacheKey = `${source}:${z}:${wrappedX}:${y}`;
    const cached = eoTileCache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(cached.buf);
      return;
    }

    const upstreamUrl =
      source === 'dem'
        ? `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${wrappedX}/${y}.png`
        : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${wrappedX}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const upstreamRes = await fetch(upstreamUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!upstreamRes.ok) {
        res.status(502).json({ error: `Tile upstream HTTP ${upstreamRes.status}` });
        return;
      }

      const arrBuf = await upstreamRes.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      const contentType =
        upstreamRes.headers.get('content-type') ||
        (source === 'dem' ? 'image/png' : 'image/jpeg');

      if (eoTileCache.size >= 160) {
        const firstKey = eoTileCache.keys().next().value;
        if (firstKey) eoTileCache.delete(firstKey);
      }
      eoTileCache.set(cacheKey, { contentType, buf });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buf);
    } catch (err: unknown) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Gagal mengambil data tile EO.',
      });
    }
  });

  app.get('/api/marine-probe', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Koordinat lat/lng tidak valid.' });
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=wave_height,wave_direction,wave_period&forecast_days=1`;
      const upstream = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!upstream.ok) {
        res.json({ available: false, waveHeightM: 1.45, waveDirDeg: 215, wavePeriodS: 7.2 });
        return;
      }
      const data = (await upstream.json()) as {
        hourly?: {
          wave_height?: (number | null)[];
          wave_direction?: (number | null)[];
          wave_period?: (number | null)[];
        };
      };
      const hs = data.hourly?.wave_height?.find((v) => typeof v === 'number' && Number.isFinite(v));
      const dir = data.hourly?.wave_direction?.find((v) => typeof v === 'number' && Number.isFinite(v));
      const tp = data.hourly?.wave_period?.find((v) => typeof v === 'number' && Number.isFinite(v));

      res.json({
        available: typeof hs === 'number',
        waveHeightM: typeof hs === 'number' ? Number(hs.toFixed(2)) : 1.45,
        waveDirDeg: typeof dir === 'number' ? Math.round(dir) : 215,
        wavePeriodS: typeof tp === 'number' ? Number(tp.toFixed(1)) : 7.2,
      });
    } catch {
      res.json({ available: false, waveHeightM: 1.45, waveDirDeg: 215, wavePeriodS: 7.2 });
    }
  });

  // In-memory LRU cache for Real Administrative Hierarchy (Nominatim) & OSM Coastline/Boundary Vectors (Overpass)
  const realSpatialZonesCache = new Map<string, Record<string, unknown>>();

  app.get('/api/spatial/real-zones', async (req: Request, res: Response) => {
    const minLon = Number(req.query.minLon);
    const minLat = Number(req.query.minLat);
    const maxLon = Number(req.query.maxLon);
    const maxLat = Number(req.query.maxLat);

    if (
      !Number.isFinite(minLon) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLon) ||
      !Number.isFinite(maxLat) ||
      minLon >= maxLon ||
      minLat >= maxLat
    ) {
      res.status(400).json({ error: 'BBox koordinat tidak valid.' });
      return;
    }

    const cacheKey = `${minLon.toFixed(3)},${minLat.toFixed(3)},${maxLon.toFixed(3)},${maxLat.toFixed(3)}`;
    const cached = realSpatialZonesCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const cLat = (minLat + maxLat) / 2;
    const cLon = (minLon + maxLon) / 2;
    // Clamp Overpass query box around center (max 0.36 deg span) so Overpass responds rapidly
    const halfSpanLat = Math.min(0.18, (maxLat - minLat) / 2);
    const halfSpanLon = Math.min(0.18, (maxLon - minLon) / 2);
    const qMinLat = (cLat - halfSpanLat).toFixed(4);
    const qMaxLat = (cLat + halfSpanLat).toFixed(4);
    const qMinLon = (cLon - halfSpanLon).toFixed(4);
    const qMaxLon = (cLon + halfSpanLon).toFixed(4);

    let nominatimAdmin: {
      provinsi?: string;
      isoCode?: string;
      kabKota?: string;
      kecamatan?: string;
      desaKelurahan?: string;
      neighbourhood?: string;
      displayName?: string;
    } | null = null;

    const osmCoastlines: { id: string; name: string; vertices: { lat: number; lng: number }[] }[] = [];
    const osmAdminLines: {
      id: string;
      name: string;
      adminLevel: string;
      vertices: { lat: number; lng: number }[];
    }[] = [];

    // 1. Fetch Nominatim Reverse Geocoding (Indonesian administrative hierarchy)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3800);
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${cLat.toFixed(5)}&lon=${cLon.toFixed(5)}&zoom=14&addressdetails=1&accept-language=id`;
      const nomRes = await fetch(nomUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GeoScriptStudio-GIS-Workbench/1.0 (https://aistudio.google.com)',
        },
      });
      clearTimeout(timer);
      if (nomRes.ok) {
        const nomJson = (await nomRes.json()) as {
          display_name?: string;
          address?: Record<string, string>;
        };
        const addr = nomJson.address || {};
        nominatimAdmin = {
          provinsi: addr.state || addr.region || undefined,
          isoCode: addr['ISO3166-2-lvl4'] || addr['ISO3166-2-lvl3'] || undefined,
          kabKota: addr.city || addr.county || addr.regency || addr.state_district || undefined,
          kecamatan: addr.municipality || addr.city_district || addr.district || addr.suburb || undefined,
          desaKelurahan: addr.village || addr.suburb || addr.quarter || addr.town || addr.hamlet || undefined,
          neighbourhood: addr.neighbourhood || addr.residential || addr.allotments || undefined,
          displayName: nomJson.display_name,
        };
      }
    } catch {
      // Fallback handled cleanly on client
    }

    // 2. Fetch Overpass API real coastline (`natural=coastline`) & administrative boundaries (`boundary=administrative`)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const overpassQuery = `[out:json][timeout:4];(way["natural"="coastline"](${qMinLat},${qMinLon},${qMaxLat},${qMaxLon});way["boundary"="administrative"]["admin_level"~"^(4|5|6|7|8)$"](${qMinLat},${qMinLon},${qMaxLat},${qMaxLon}););out geom 35;`;
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });
      clearTimeout(timer);
      if (ovRes.ok) {
        const ovJson = (await ovRes.json()) as {
          elements?: Array<{
            id: number;
            tags?: Record<string, string>;
            geometry?: Array<{ lat: number; lon: number }>;
          }>;
        };
        for (const el of ovJson.elements || []) {
          if (!Array.isArray(el.geometry) || el.geometry.length < 2) continue;
          // Decimate vertices to max 40 points per way for fast rendering
          const step = Math.max(1, Math.floor(el.geometry.length / 40));
          const verts = el.geometry
            .filter((_, idx) => idx % step === 0 || idx === el.geometry!.length - 1)
            .map((pt) => ({
              lat: Number(pt.lat.toFixed(5)),
              lng: Number(pt.lon.toFixed(5)),
            }));
          if (el.tags?.natural === 'coastline') {
            osmCoastlines.push({
              id: `osm-coast-${el.id}`,
              name: el.tags?.name || `Garis Pantai Vektor OSM (#${el.id})`,
              vertices: verts,
            });
          } else if (el.tags?.boundary === 'administrative') {
            osmAdminLines.push({
              id: `osm-adm-${el.id}`,
              name: el.tags?.name || `Batas Administrasi OSM (Level ${el.tags?.admin_level || '6'})`,
              adminLevel: el.tags?.admin_level || '6',
              vertices: verts,
            });
          }
        }
      }
    } catch {
      // Fallback handled via DEM shoreline contouring on client
    }

    const payload = {
      available: Boolean(nominatimAdmin || osmCoastlines.length > 0 || osmAdminLines.length > 0),
      fetchedAt: new Date().toISOString(),
      nominatimAdmin,
      osmCoastlines: osmCoastlines.slice(0, 18),
      osmAdminLines: osmAdminLines.slice(0, 18),
    };

    if (realSpatialZonesCache.size >= 80) {
      const oldestKey = realSpatialZonesCache.keys().next().value;
      if (oldestKey) realSpatialZonesCache.delete(oldestKey);
    }
    realSpatialZonesCache.set(cacheKey, payload);
    res.json(payload);
  });

  // Helper to extract web citations from Gemini Google Search Grounding chunks
  function extractGroundingSources(
    chunks: unknown[] | undefined
  ): Array<{ title: string; uri: string }> {
    if (!Array.isArray(chunks)) return [];
    const seen = new Set<string>();
    const sources: Array<{ title: string; uri: string }> = [];
    for (const raw of chunks) {
      const item = raw as { web?: { uri?: string; title?: string } };
      const uri = item?.web?.uri?.trim();
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      sources.push({
        title: item?.web?.title?.trim() || uri,
        uri,
      });
    }
    return sources.slice(0, 8);
  }

  // In-memory LRU cache for Google Search Grounded Administrative Profiles
  const groundedAdminCache = new Map<
    string,
    {
      summaryText: string;
      sources: Array<{ title: string; uri: string }>;
      model: string;
      groundedAt: string;
    }
  >();

  app.post('/api/spatial/grounded-admin-profile', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      regionName?: string;
      provinsi?: string;
      kabKota?: string;
      kecamatan?: string;
      desaKelurahan?: string;
      centerLat?: number;
      centerLon?: number;
      wppCode?: string;
    };

    const regionName = String(body.regionName || 'Wilayah Studi Indonesia').trim();
    const provinsi = String(body.provinsi || '').trim();
    const kabKota = String(body.kabKota || '').trim();
    const kecamatan = String(body.kecamatan || '').trim();
    const desaKelurahan = String(body.desaKelurahan || '').trim();
    const centerLat = Number(body.centerLat || -6.2);
    const centerLon = Number(body.centerLon || 106.8);
    const wppCode = String(body.wppCode || 'WPP-NRI').trim();

    const cacheKey = `${regionName}|${provinsi}|${kabKota}|${kecamatan}|${desaKelurahan}|${centerLat.toFixed(2)},${centerLon.toFixed(2)}`;
    const cached = groundedAdminCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY belum terkonfigurasi di server. Atur secret GEMINI_API_KEY di panel Settings > Secrets.',
      });
      return;
    }

    const prompt = `Gunakan Google Search untuk mencari data administrasi wilayah, kependudukan (BPS/Kemendagri), dan kondisi geografis/pesisir terkini untuk wilayah berikut di Indonesia:
- Wilayah Studi (AOI): ${regionName} (Koordinat pusat: ${centerLat.toFixed(4)}°, ${centerLon.toFixed(4)}°)
- Provinsi: ${provinsi || 'Sesuai koordinat'}
- Kabupaten/Kota: ${kabKota || 'Sesuai koordinat'}
- Kecamatan: ${kecamatan || 'Sesuai koordinat'}
- Desa/Kelurahan & Struktur RT/RW: ${desaKelurahan || 'Sesuai koordinat'}
- Wilayah Pengelolaan Perikanan: ${wppCode}

Sajikan ringkasan faktual dan terstruktur dalam bahasa Indonesia (maksimal 4 poin padat) yang mencakup:
1. Kode Wilayah Kemendagri/BPS & Hierarki Resmi (Provinsi, Kabupaten/Kota, Kecamatan, serta daftar Desa/Kelurahan utama di area tersebut).
2. Struktur Lingkungan RT/RW, Karakteristik Permukiman/Pesisir, serta Estimasi Demografi/Kependudukan terbaru dari BPS/Dukcapil.
3. Kebijakan Tata Ruang (RTRW/RDTR Provinsi & Kab/Kota) atau Zonasi Pesisir (${wppCode}) yang berlaku di wilayah ini.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const summaryText = (response.text || '').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
        | unknown[]
        | undefined;
      const sources = extractGroundingSources(chunks);

      if (!summaryText) {
        res.status(502).json({
          error: 'Model tidak mengembalikan hasil pencarian data administrasi wilayah.',
        });
        return;
      }

      const resultPayload = {
        summaryText,
        sources,
        model: 'gemini-4-hydrogen',
        groundedAt: new Date().toISOString(),
      };

      if (groundedAdminCache.size >= 40) {
        const firstKey = groundedAdminCache.keys().next().value;
        if (firstKey) groundedAdminCache.delete(firstKey);
      }
      groundedAdminCache.set(cacheKey, resultPayload);
      res.json(resultPayload);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: `Gagal memuat verifikasi Google Search Grounding: ${errMsg}`,
      });
    }
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = (req.body || {}) as ChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY belum terkonfigurasi di server. Atur secret GEMINI_API_KEY di panel Settings > Secrets.',
      });
      return;
    }

    const roleKey =
      body.roleId && ROLE_INSTRUCTIONS[body.roleId] ? body.roleId : 'gis-architect';
    const ctx = body.studioContext || {};
    const contextLines = [
      ctx.templateTitle ? `Alur Kerja Aktif: ${ctx.templateTitle}` : '',
      ctx.platformLabel ? `Platform Target: ${ctx.platformLabel}` : '',
      ctx.regionName ? `Wilayah Studi (AOI): ${ctx.regionName}` : '',
      ctx.crsEpsg ? `Proyeksi CRS: ${ctx.crsEpsg}` : '',
      ctx.sensor ? `Sensor/Dataset: ${ctx.sensor}` : '',
      ctx.spectralIndex ? `Indeks Spektral: ${ctx.spectralIndex}` : '',
      typeof ctx.thresholdValue === 'number' ? `Nilai Ambang (Threshold): ${ctx.thresholdValue}` : '',
      ctx.vizSummary ? `Ringkasan Visualisasi Peta Saat Ini: ${ctx.vizSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `${ROLE_INSTRUCTIONS[roleKey]}

Konteks Kerja Pengguna Saat Ini di GeoScript Studio:
${contextLines || 'Belum ada konteks spesifik.'}

Aturan Jawaban:
- Rujuk parameter, wilayah, indeks, atau ringkasan visualisasi peta pengguna saat relevan agar terasa kontekstual.
- Gunakan Google Search ketika pengguna menanyakan data batas administrasi terbaru, regulasi BIG/KKP/Kemendagri, atau fakta wilayah terkini.
- Jawab maksimal 3-5 paragraf ringkas atau poin-poin rapi.`;

    const formattedHistory: Content[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (turn): turn is ChatTurnInput =>
              Boolean(turn) &&
              (turn.role === 'user' || turn.role === 'model') &&
              typeof turn.text === 'string' &&
              turn.text.trim().length > 0
          )
          .slice(-20)
          .map((turn) => ({
            role: turn.role,
            parts: [{ text: turn.text }],
          }))
      : [];

    const modelName = body.fastMode ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const thinkingLevel = body.fastMode ? ThinkingLevel.MINIMAL : ThinkingLevel.HIGH;

    try {
      const chat = ai.chats.create({
        model: modelName,
        history: formattedHistory,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
          ...(modelName === 'gemini-4-hydrogen' ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const response = await chat.sendMessage({ message });
      const replyText = (response.text || '').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
        | unknown[]
        | undefined;
      const sources = extractGroundingSources(chunks);

      if (!replyText) {
        res.status(502).json({
          error: 'Model tidak mengembalikan teks jawaban. Silakan coba ulangi pertanyaan Anda.',
        });
        return;
      }

      res.json({
        reply: replyText,
        model: modelName,
        sources,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const lower = errMsg.toLowerCase();
      if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
        res.status(429).json({
          error:
            'Kuota API Gemini tercapai sementara. Tunggu beberapa saat atau periksa kuota di Settings > Secrets.',
        });
        return;
      }
      if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key')) {
        res.status(403).json({
          error:
            'Akses API Gemini ditolak atau API key tidak valid. Periksa GEMINI_API_KEY di panel Settings > Secrets.',
        });
        return;
      }
      res.status(500).json({
        error: `Gagal memproses permintaan Gemini: ${errMsg}`,
      });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GeoScript Studio server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start GeoScript Studio server:', err);
  process.exit(1);
});
