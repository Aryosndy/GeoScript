import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLATFORM_DEFINITIONS,
  SPECTRAL_INDEX_DEFINITIONS,
  calculateBboxAreaKm2,
  calculatePolygonAreaKm2,
  calculatePolygonPerimeterKm,
  type GisPlatformId,
  type GisTemplate,
  type ScriptParameters,
} from '../utils/gisEngine';
import { generateMapVisualization } from '../utils/mapVisualizerEngine';
import type { RealEoGrid } from '../utils/realEoGridLoader';
import { Check, Download, FileImage, FileText, Printer, RefreshCw } from 'lucide-react';

interface ReportAndJpgExporterProps {
  template: GisTemplate;
  platformId: GisPlatformId;
  params: ScriptParameters;
  generatedCode: string;
  realEoGrid?: RealEoGrid | null;
}

function sanitizeFileSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'geoscript_report'
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const ReportAndJpgExporter: React.FC<ReportAndJpgExporterProps> = ({
  template,
  platformId,
  params,
  generatedCode,
  realEoGrid = null,
}) => {
  const [reportTitle, setReportTitle] = useState<string>(
    `Laporan Teknis ${template.title} — ${params.regionName}`
  );
  const [authorName, setAuthorName] = useState<string>('Tim Analisis Spasial & Survei Lapangan');
  const [projectCode, setProjectCode] = useState<string>('GS-2026-01');
  const [notes, setNotes] = useState<string>(
    `Pengolahan dilakukan pada sistem proyeksi metrik ${params.crsEpsg} dengan resolusi ${params.spatialResolutionMeters} m menggunakan ${
      PLATFORM_DEFINITIONS.find((p) => p.id === platformId)?.label || platformId
    }.`
  );
  const [jpgDataUrl, setJpgDataUrl] = useState<string>('');
  const [exportedFeedback, setExportedFeedback] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sinkronkan judul laporan ketika template atau wilayah berubah
  useEffect(() => {
    setReportTitle(`Laporan Teknis ${template.title} — ${params.regionName}`);
  }, [template.title, params.regionName]);

  const platformMeta = useMemo(
    () => PLATFORM_DEFINITIONS.find((p) => p.id === platformId) || PLATFORM_DEFINITIONS[0],
    [platformId]
  );

  const indexDef = useMemo(
    () =>
      SPECTRAL_INDEX_DEFINITIONS.find((i) => i.id === params.spectralIndex) ||
      SPECTRAL_INDEX_DEFINITIONS[0],
    [params.spectralIndex]
  );

  const hasCustomPolygon = Boolean(params.customPolygon && params.customPolygon.length >= 3);
  const areaKm2 = hasCustomPolygon
    ? calculatePolygonAreaKm2(params.customPolygon!)
    : calculateBboxAreaKm2(params.bbox);
  const areaHa = Math.round(areaKm2 * 100);
  const perimeterKm = hasCustomPolygon
    ? calculatePolygonPerimeterKm(params.customPolygon!)
    : Number(
        (
          2 *
          (Math.abs(params.bbox.maxLat - params.bbox.minLat) * 111.132 +
            Math.abs(params.bbox.maxLon - params.bbox.minLon) *
              111.32 *
              Math.cos((((params.bbox.minLat + params.bbox.maxLat) / 2) * Math.PI) / 180))
        ).toFixed(2)
      );

  const tutorialSteps =
    template.tutorialsByPlatform[platformId] ||
    template.tutorialsByPlatform[template.defaultPlatform] ||
    [];

  // Render High-DPI Cartographic Layout Sheet (1600x1000) ke Canvas -> data:image/jpeg
  const renderCartographicPlate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1600;
    const H = 1000;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Latar Putih Bersih & Bingkai Kartografi
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // 2. Pita Header Publikasi (Teal Oceanic Gradient)
    const grad = ctx.createLinearGradient(24, 24, W - 24, 150);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#0f766e');
    ctx.fillStyle = grad;
    ctx.fillRect(24, 24, W - 48, 128);

    ctx.fillStyle = '#99f6e4';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`GEOSCRIPT STUDIO · LEMBAR PETA & RINGKASAN TEKNIS (${projectCode})`, 56, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px "Outfit", "Plus Jakarta Sans", sans-serif';
    const clippedTitle = reportTitle.length > 68 ? `${reportTitle.slice(0, 65)}...` : reportTitle;
    ctx.fillText(clippedTitle, 56, 108);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Platform: ${platformMeta.label}   |   Proyeksi: ${params.crsEpsg}   |   Penyusun: ${authorName}`,
      56,
      136
    );

    // 3. Kanvas Peta Utama (Kiri: x=56..1030, y=184..890)
    const mapX = 56;
    const mapY = 184;
    const mapW = 974;
    const mapH = 706;

    // Background Peta Lembut
    const mapBg = ctx.createLinearGradient(mapX, mapY, mapX + mapW, mapY + mapH);
    mapBg.addColorStop(0, '#f0f9ff');
    mapBg.addColorStop(1, '#f0fdfa');
    ctx.fillStyle = mapBg;
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    // Graticule Koordinat (5 x 4 garis lintang/bujur)
    ctx.font = '500 13px "JetBrains Mono", monospace';
    for (let i = 1; i <= 4; i++) {
      const gx = mapX + (i / 5) * mapW;
      const lonVal =
        params.bbox.minLon + (i / 5) * Math.max(0.001, params.bbox.maxLon - params.bbox.minLon);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(gx, mapY);
      ctx.lineTo(gx, mapY + mapH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.fillText(`${lonVal.toFixed(3)}° BT`, gx - 34, mapY + mapH - 12);
    }
    for (let j = 1; j <= 3; j++) {
      const gy = mapY + (j / 4) * mapH;
      const latVal =
        params.bbox.maxLat - (j / 4) * Math.max(0.001, params.bbox.maxLat - params.bbox.minLat);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(mapX, gy);
      ctx.lineTo(mapX + mapW, gy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.fillText(`${latVal.toFixed(3)}°`, mapX + 12, gy - 6);
    }

    // Gambar Geometri AOI (Poligon Kustom atau BBox dengan margin 16%)
    const padX = mapW * 0.16;
    const padY = mapH * 0.16;
    const drawW = mapW - padX * 2;
    const drawH = mapH - padY * 2;
    const dLon = Math.max(0.0001, params.bbox.maxLon - params.bbox.minLon);
    const dLat = Math.max(0.0001, params.bbox.maxLat - params.bbox.minLat);

    const pts = hasCustomPolygon
      ? params.customPolygon!.map((v) => ({
          x: mapX + padX + ((v.lng - params.bbox.minLon) / dLon) * drawW,
          y: mapY + padY + ((params.bbox.maxLat - v.lat) / dLat) * drawH,
        }))
      : [
          { x: mapX + padX, y: mapY + padY },
          { x: mapX + padX + drawW, y: mapY + padY },
          { x: mapX + padX + drawW, y: mapY + padY + drawH },
          { x: mapX + padX, y: mapY + padY + drawH },
        ];

    const vizSnapshot = generateMapVisualization(template.id, platformId, params, {
      gridSize: 160,
      realGrid: realEoGrid,
    });

    // Kontur simulasi di dalam AOI agar plate informatif secara visual
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(13, 148, 136, 0.14)';
    ctx.fill();
    ctx.clip();

    // Pola garis/transek halus sebagai latar sebelum raster selesai dimuat
    for (let k = -10; k < 28; k++) {
      ctx.strokeStyle = k % 2 === 0 ? 'rgba(2, 132, 199, 0.16)' : 'rgba(15, 118, 110, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mapX + k * 48, mapY);
      ctx.bezierCurveTo(
        mapX + k * 48 + 40,
        mapY + mapH * 0.35,
        mapX + k * 48 - 40,
        mapY + mapH * 0.65,
        mapX + k * 48 + 18,
        mapY + mapH
      );
      ctx.stroke();
    }
    ctx.restore();

    const finishPlateOverlay = () => {
      // Outline poligon AOI tegas
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Vertex nodes + Titik Pusat
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      const cLat = ((params.bbox.minLat + params.bbox.maxLat) / 2).toFixed(4);
      const cLon = ((params.bbox.minLon + params.bbox.maxLon) / 2).toFixed(4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fillRect(mapX + padX + 8, mapY + padY + 8, Math.min(drawW - 16, 590), 54);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 18px "Outfit", sans-serif';
      ctx.fillText(params.regionName, mapX + padX + 16, mapY + padY + 30);
      ctx.font = '500 13.5px "JetBrains Mono", monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText(
        `Centroid: ${cLat}°, ${cLon}° · Luas: ${areaKm2.toLocaleString('id-ID')} km² · Mean: ${vizSnapshot.stats.meanLabel}`,
        mapX + padX + 16,
        mapY + padY + 52
      );
    };

    finishPlateOverlay();

    // Panah Utara (North Arrow) di pojok kanan atas peta
    const naX = mapX + mapW - 58;
    const naY = mapY + 66;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(naX, naY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(naX, naY - 22);
    ctx.lineTo(naX + 10, naY + 10);
    ctx.lineTo(naX, naY + 3);
    ctx.lineTo(naX - 10, naY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 13px "Outfit", sans-serif';
    ctx.fillText('U', naX - 4.5, naY + 26);

    // Batang Skala Metrik (Scale Bar) di kiri bawah peta
    const approxWidthKm = Math.max(1, Math.round(Math.sqrt(areaKm2) * 0.45));
    const sbX = mapX + 26;
    const sbY = mapY + mapH - 52;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(sbX - 10, sbY - 24, 210, 44);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(sbX - 10, sbY - 24, 210, 44);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sbX, sbY, 90, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.strokeRect(sbX + 90, sbY, 90, 8);
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('0', sbX, sbY - 6);
    ctx.fillText(`${Math.round(approxWidthKm / 2)} km`, sbX + 75, sbY - 6);
    ctx.fillText(`${approxWidthKm} km`, sbX + 158, sbY - 6);

    // 4. Panel Informasi & Grafik Mini (Kanan: x=1054..1544, y=184..890)
    const panelX = 1054;
    const panelW = 490;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(panelX, mapY, panelW, mapH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, mapY, panelW, mapH);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 20px "Outfit", sans-serif';
    ctx.fillText('RINGKASAN PARAMETER & OUTPUT', panelX + 24, mapY + 40);

    const rows: [string, string][] = [
      ['Alur Kerja', template.title.slice(0, 36)],
      ['Platform Target', platformMeta.shortLabel],
      ['Sistem Proyeksi', params.crsEpsg],
      ['Luas Wilayah', `${areaKm2.toLocaleString('id-ID')} km² (${areaHa.toLocaleString('id-ID')} Ha)`],
      ['Keliling AOI', `${perimeterKm} km`],
      ['Resolusi Spasial', `${params.spatialResolutionMeters} meter`],
      ['Indeks / Rumus', `${indexDef.id} (${params.sensor})`],
      ['Nilai Ambang Batas', `${params.thresholdValue}`],
      ['Rentang Waktu', `${params.startDate} s/d ${params.endDate}`],
    ];

    let rowY = mapY + 76;
    rows.forEach(([k, v]) => {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(k, panelX + 24, rowY);
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 13.5px "JetBrains Mono", monospace';
      ctx.fillText(v, panelX + 178, rowY);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 24, rowY + 11);
      ctx.lineTo(panelX + panelW - 24, rowY + 11);
      ctx.stroke();
      rowY += 35;
    });

    // Legenda Spektral / Klasifikasi
    const legY = rowY + 18;
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 16px "Outfit", sans-serif';
    ctx.fillText(`PALET LEGENDA (${indexDef.id})`, panelX + 24, legY);

    const swW = (panelW - 48) / indexDef.paletteHex.length;
    indexDef.paletteHex.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(panelX + 24 + idx * swW, legY + 14, swW - 4, 22);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(panelX + 24 + idx * swW, legY + 14, swW - 4, 22);
    });
    ctx.fillStyle = '#475569';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Rendah (${indexDef.typicalRange.split(' ')[0]})`, panelX + 24, legY + 54);
    ctx.fillText('Tinggi / Maksimum', panelX + panelW - 140, legY + 54);

    // Grafik Mini Kurva Simulasi di Kanan Bawah Panel
    const gX = panelX + 24;
    const gY = legY + 84;
    const gW = panelW - 48;
    const gH = 148;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gX, gY, gW, gH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(gX, gY, gW, gH);

    ctx.fillStyle = '#0f766e';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('KURVA PROFIL DINAMIKA SPASIAL / TEMPORAL', gX + 12, gY + 22);

    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const px = gX + 16 + (i / 24) * (gW - 32);
      const norm = 0.5 + 0.34 * Math.sin(i * 0.45) + 0.14 * Math.cos(i * 0.9);
      const py = gY + gH - 18 - norm * (gH - 52);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Footer Plate
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `GeoScript Studio Automated Cartography · Output Target: ${params.outputLayerPath}`,
      56,
      H - 44
    );
    ctx.fillText(
      `Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')}`,
      W - 245,
      H - 44
    );

    const jpg = canvas.toDataURL('image/jpeg', 0.95);
    setJpgDataUrl(jpg);

    if (vizSnapshot.rasterDataUrl) {
      const rasterImg = new Image();
      rasterImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(rasterImg, mapX + padX, mapY + padY, drawW, drawH);
        ctx.restore();
        finishPlateOverlay();
        setJpgDataUrl(canvas.toDataURL('image/jpeg', 0.95));
      };
      rasterImg.src = vizSnapshot.rasterDataUrl;
    }
  };

  useEffect(() => {
    renderCartographicPlate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, platformId, params, realEoGrid, reportTitle, authorName, projectCode]);

  const triggerFileDownload = (href: string, filename: string, feedbackMsg: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportedFeedback(feedbackMsg);
    setTimeout(() => setExportedFeedback(''), 2800);
  };

  const handleDownloadJpg = () => {
    if (!jpgDataUrl) renderCartographicPlate();
    const slug = sanitizeFileSlug(`${template.id}_${params.regionName}`);
    triggerFileDownload(jpgDataUrl, `peta_ringkasan_${slug}.jpg`, 'File JPG berhasil diunduh!');
  };

  const handleDownloadHtmlReport = () => {
    const slug = sanitizeFileSlug(`${template.id}_${params.regionName}`);
    const htmlContent = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 36px auto; max-width: 960px; line-height: 1.6; }
    .header { border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 22px; }
    .meta { color: #475569; font-size: 13px; }
    h1 { margin: 4px 0 6px; font-size: 24px; color: #0f172a; }
    h2 { font-size: 17px; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 26px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; }
    img.plate { width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 10px; }
    pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="meta">Kode Dokumen: ${escapeHtml(projectCode)} · Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">Penyusun: ${escapeHtml(authorName)} · Platform: ${escapeHtml(platformMeta.label)}</div>
  </div>
  <h2>1. Ringkasan Eksekutif & Catatan Teknis</h2>
  <p>${escapeHtml(template.overview)}</p>
  <p><strong>Catatan Analisis:</strong> ${escapeHtml(notes)}</p>
  <h2>2. Peta Layout AOI & Ringkasan Spasial (JPG)</h2>
  ${jpgDataUrl ? `<img class="plate" src="${jpgDataUrl}" alt="Peta Layout AOI" />` : ''}
  <h2>3. Spesifikasi Parameter Pengolahan</h2>
  <table>
    <tr><th>Parameter</th><th>Nilai Konfigurasi</th></tr>
    <tr><td>Wilayah Studi (AOI)</td><td>${escapeHtml(params.regionName)}</td></tr>
    <tr><td>Luas & Keliling Geodesik</td><td>${areaKm2} km² (${areaHa.toLocaleString('id-ID')} Ha) · Keliling ${perimeterKm} km</td></tr>
    <tr><td>Sistem Koordinat (CRS)</td><td>${escapeHtml(params.crsEpsg)}</td></tr>
    <tr><td>Bounding Box (WGS 84)</td><td>[${params.bbox.minLon.toFixed(4)}, ${params.bbox.minLat.toFixed(4)}, ${params.bbox.maxLon.toFixed(4)}, ${params.bbox.maxLat.toFixed(4)}]</td></tr>
    <tr><td>Resolusi & Ambang Batas</td><td>${params.spatialResolutionMeters} m · Ambang ${params.thresholdValue}</td></tr>
    <tr><td>Output Target</td><td>${escapeHtml(template.expectedOutput)}</td></tr>
  </table>
  <h2>4. Tahapan Eksekusi</h2>
  <ol>
    ${tutorialSteps.map((s) => `<li><strong>${escapeHtml(s.title)}</strong>: ${escapeHtml(s.instruction)}</li>`).join('\n    ')}
  </ol>
  <h2>5. Lampiran Script (${escapeHtml(platformMeta.fileExtension)})</h2>
  <pre><code>${escapeHtml(generatedCode)}</code></pre>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerFileDownload(url, `laporan_${slug}.html`, 'Laporan HTML siap cetak/Word berhasil diunduh!');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleDownloadMarkdownReport = () => {
    const slug = sanitizeFileSlug(`${template.id}_${params.regionName}`);
    const mdContent = `# ${reportTitle}

- **Kode Proyek:** ${projectCode}
- **Penyusun:** ${authorName}
- **Platform:** ${platformMeta.label}
- **Tanggal:** ${new Date().toLocaleDateString('id-ID')}

## 1. Ringkasan Metodologi
${template.overview}

**Catatan Teknis:** ${notes}

## 2. Parameter Spasial
| Parameter | Nilai |
|---|---|
| Wilayah AOI | ${params.regionName} |
| Luas Geodesik | ${areaKm2} km² (${areaHa.toLocaleString('id-ID')} Ha) |
| Proyeksi UTM / EPSG | ${params.crsEpsg} |
| Resolusi Spasial | ${params.spatialResolutionMeters} m |
| Ambang Batas | ${params.thresholdValue} |
| Periode Akuisisi | ${params.startDate} s/d ${params.endDate} |
| Output Diharapkan | ${template.expectedOutput} |

## 3. Script Otomasi (${platformMeta.fileExtension})
\`\`\`${platformMeta.language}
${generatedCode.trim()}
\`\`\`
`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerFileDownload(url, `laporan_${slug}.md`, 'Laporan Markdown (.md) berhasil diunduh!');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="p-5 bg-white space-y-5 max-h-[680px] overflow-y-auto print-report-sheet">
      {/* Offscreen High-DPI Canvas */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Action Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Pembuat Laporan Teknis & Ekspor Langsung (.JPG / .HTML / PDF)
          </h3>
          <p className="text-xs text-slate-600">
            Unduh layout peta AOI beresolusi tinggi (1600×1000 px JPG) atau laporan lengkap beserta tabel parameter & script.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={renderCartographicPlate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Perbarui Layout
          </button>
          <button
            type="button"
            onClick={handleDownloadJpg}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors shadow-xs"
          >
            <FileImage className="w-3.5 h-3.5" />
            Unduh Peta & Ringkasan (.jpg)
          </button>
          <button
            type="button"
            onClick={handleDownloadHtmlReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Laporan (.html)
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdownReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Laporan (.md)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {exportedFeedback && (
        <div className="no-print flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl">
          <Check className="w-4 h-4 shrink-0" />
          <span>{exportedFeedback}</span>
        </div>
      )}

      {/* Editable Report Metadata */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
        <div className="sm:col-span-2">
          <label htmlFor="rpt-title" className="block text-[11px] font-medium text-slate-600 mb-1">
            Judul Laporan & Peta
          </label>
          <input
            id="rpt-title"
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
        <div>
          <label htmlFor="rpt-code" className="block text-[11px] font-medium text-slate-600 mb-1">
            Kode Proyek / Nomor Dokumen
          </label>
          <input
            id="rpt-code"
            type="text"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
        <div>
          <label htmlFor="rpt-author" className="block text-[11px] font-medium text-slate-600 mb-1">
            Penyusun / Instansi
          </label>
          <input
            id="rpt-author"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rpt-notes" className="block text-[11px] font-medium text-slate-600 mb-1">
            Catatan Teknis / Kesimpulan Awal
          </label>
          <input
            id="rpt-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          />
        </div>
      </div>

      {/* Live Preview of Rendered Cartographic JPG Plate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-800">
            Pratinjau Lembar Peta & Ringkasan (Siap Ekspor .JPG 1600×1000 px)
          </span>
          <span className="font-mono tabular-nums">{areaKm2} km² · {params.crsEpsg}</span>
        </div>
        {jpgDataUrl && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <img
              src={jpgDataUrl}
              alt="Pratinjau Layout Peta & Ringkasan JPG"
              className="w-full h-auto block"
              data-testid="report-jpg-preview"
            />
          </div>
        )}
      </div>

      {/* Structured Report Body Preview */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3 text-xs">
        <div className="font-semibold text-slate-900">Ringkasan Isi Laporan Otomatis</div>
        <p className="text-slate-700 leading-relaxed">{template.overview}</p>
        <p className="text-slate-700">
          <strong>Catatan:</strong> {notes}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
            <div className="text-slate-500">Luas AOI</div>
            <div className="font-mono font-bold text-slate-900">{areaKm2} km²</div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
            <div className="text-slate-500">Keliling</div>
            <div className="font-mono font-bold text-slate-900">{perimeterKm} km</div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
            <div className="text-slate-500">Resolusi</div>
            <div className="font-mono font-bold text-teal-700">{params.spatialResolutionMeters} m</div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5">
            <div className="text-slate-500">Platform</div>
            <div className="font-semibold text-sky-700 truncate">{platformMeta.shortLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
