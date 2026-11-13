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
        },
      });

      const response = await chat.sendMessage({ message });
      const replyText = (response.text || '').trim();

      if (!replyText) {
        res.status(502).json({
          error: 'Model tidak mengembalikan teks jawaban. Silakan coba ulangi pertanyaan Anda.',
        });
        return;
      }

      res.json({
        reply: replyText,
        model: modelName,
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
