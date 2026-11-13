import React, { useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  REGION_PRESETS,
  calculateBboxAreaKm2,
  calculatePolygonAreaKm2,
  calculatePolygonPerimeterKm,
  verticesToBbox,
  exportAoiToGeoJson,
  exportAoiToWkt,
  recommendUtmEpsg,
  decimalToDms,
  type BoundingBox,
  type LatLngVertex,
  type RegionPreset,
} from '../utils/gisEngine';
import {
  generateMapVisualization,
  type MapVisualizationResult,
} from '../utils/mapVisualizerEngine';
import type { RealEoGrid } from '../utils/realEoGridLoader';
import type { GisPlatformId, ScriptParameters } from '../utils/gisEngine';
import {
  Compass,
  Crosshair,
  MapPin,
  RotateCcw,
  Layers,
  Pentagon,
  Square,
  Undo2,
  Trash2,
  Download,
  Copy,
  Check,
  CircleDot,
  LocateFixed,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Pipette,
  Sparkles,
  Play,
  Loader2,
  Terminal,
} from 'lucide-react';

export type BasemapId =
  | 'google-hybrid'
  | 'google-satellite'
  | 'google-terrain'
  | 'google-roadmap'
  | 'esri-imagery'
  | 'esri-topo'
  | 'esri-darkgray';

export type MapInteractionMode = 'bbox' | 'polygon' | 'inspect';

interface InteractiveAoiMapProps {
  activeTemplateId: string;
  platformId: GisPlatformId;
  params: ScriptParameters;
  regionName: string;
  bbox: BoundingBox;
  crsEpsg: string;
  bufferDistanceMeters: number;
  customPolygon?: LatLngVertex[];
  realEoGrid?: RealEoGrid | null;
  isRunningViz?: boolean;
  vizRunError?: string | null;
  runSignal?: number;
  onRunVisualization?: (forceRefresh?: boolean) => void;
  onSelectPreset: (preset: RegionPreset) => void;
  onUpdateBbox: (bbox: BoundingBox, suggestedEpsg?: string, customName?: string) => void;
  onUpdateCustomPolygon: (
    vertices: LatLngVertex[] | undefined,
    updatedBbox?: BoundingBox,
    suggestedEpsg?: string,
    customName?: string
  ) => void;
  onVisualizationChange?: (viz: MapVisualizationResult | null) => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

const BASEMAP_OPTIONS: {
  id: BasemapId;
  label: string;
  provider: 'google' | 'esri';
  googleMapTypeId?: 'hybrid' | 'satellite' | 'terrain' | 'roadmap';
  esriTileUrl?: string;
  attribution?: string;
}[] = [
  {
    id: 'google-hybrid',
    label: 'Google Hybrid (Satelit + Label)',
    provider: 'google',
    googleMapTypeId: 'hybrid',
  },
  {
    id: 'google-satellite',
    label: 'Google Satellite (Citra Murni)',
    provider: 'google',
    googleMapTypeId: 'satellite',
  },
  {
    id: 'google-terrain',
    label: 'Google Terrain (Kontur/Topografi)',
    provider: 'google',
    googleMapTypeId: 'terrain',
  },
  {
    id: 'google-roadmap',
    label: 'Google Roadmap (Peta Jalan)',
    provider: 'google',
    googleMapTypeId: 'roadmap',
  },
  {
    id: 'esri-imagery',
    label: 'Esri World Imagery (ArcGIS Satelit)',
    provider: 'esri',
    esriTileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
  {
    id: 'esri-topo',
    label: 'Esri World Topographic (ArcGIS Topo)',
    provider: 'esri',
    esriTileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Powered by Esri — Source: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS',
  },
  {
    id: 'esri-darkgray',
    label: 'Esri Dark Gray Canvas (ArcGIS Gelap)',
    provider: 'esri',
    esriTileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Powered by Esri — Source: Esri, HERE, Garmin, OpenStreetMap contributors',
  },
];

/**
 * Imperative Google Maps Vector Overlay controller (Rectangle, Polygon, Polyline, Circle)
 * synced with React state via @vis.gl/react-google-maps useMap() hook.
 */
const GoogleMapVectorOverlays: React.FC<{
  bbox: BoundingBox;
  customPolygon?: LatLngVertex[];
  showBufferPreview: boolean;
  bufferDistanceMeters: number;
  fitTriggerKey: string;
  showVisualization: boolean;
  vizOpacity: number;
  vizResult: MapVisualizationResult | null;
  onEditableRectangleChanged: (newBbox: BoundingBox) => void;
}> = ({
  bbox,
  customPolygon,
  showBufferPreview,
  bufferDistanceMeters,
  fitTriggerKey,
  showVisualization,
  vizOpacity,
  vizResult,
  onEditableRectangleChanged,
}) => {
  const map = useMap();
  const rectRef = useRef<google.maps.Rectangle | null>(null);
  const polyRef = useRef<google.maps.Polygon | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const groundOverlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const domainLinesRef = useRef<google.maps.Polyline[]>([]);
  const suppressProgrammaticRef = useRef<boolean>(false);

  // Fit bounds when preset or uploaded file changes
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds(
      { lat: bbox.minLat, lng: bbox.minLon },
      { lat: bbox.maxLat, lng: bbox.maxLon }
    );
    map.fitBounds(bounds, 36);
  }, [map, fitTriggerKey]);

  // Sync Rectangle, Polygon, Polyline, and Buffer Circle overlays
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const hasCustomPoly = Boolean(customPolygon && customPolygon.length >= 3);

    // 1. Bounding Box Rectangle
    if (!rectRef.current) {
      rectRef.current = new google.maps.Rectangle({
        map,
        editable: !hasCustomPoly,
        draggable: false,
        clickable: false,
      });

      rectRef.current.addListener('bounds_changed', () => {
        if (suppressProgrammaticRef.current || !rectRef.current) return;
        const b = rectRef.current.getBounds();
        if (!b) return;
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        const nextBbox: BoundingBox = {
          minLon: Number(sw.lng().toFixed(4)),
          minLat: Number(sw.lat().toFixed(4)),
          maxLon: Number(ne.lng().toFixed(4)),
          maxLat: Number(ne.lat().toFixed(4)),
        };
        if (
          Math.abs(nextBbox.minLon - bbox.minLon) > 0.0005 ||
          Math.abs(nextBbox.minLat - bbox.minLat) > 0.0005 ||
          Math.abs(nextBbox.maxLon - bbox.maxLon) > 0.0005 ||
          Math.abs(nextBbox.maxLat - bbox.maxLat) > 0.0005
        ) {
          onEditableRectangleChanged(nextBbox);
        }
      });
    }

    suppressProgrammaticRef.current = true;
    rectRef.current.setOptions({
      map,
      bounds: {
        north: bbox.maxLat,
        south: bbox.minLat,
        east: bbox.maxLon,
        west: bbox.minLon,
      },
      editable: !hasCustomPoly,
      strokeColor: hasCustomPoly ? '#94a3b8' : '#38bdf8',
      strokeOpacity: hasCustomPoly ? 0.6 : 0.95,
      strokeWeight: hasCustomPoly ? 1.5 : 2.5,
      fillColor: '#0ea5e9',
      fillOpacity: hasCustomPoly ? 0.05 : 0.22,
    });
    suppressProgrammaticRef.current = false;

    // 2. Custom Polygon (>= 3 vertices)
    if (customPolygon && customPolygon.length >= 3) {
      if (!polyRef.current) {
        polyRef.current = new google.maps.Polygon({
          map,
          clickable: false,
        });
      }
      polyRef.current.setOptions({
        map,
        paths: customPolygon,
        strokeColor: '#10b981',
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        fillColor: '#10b981',
        fillOpacity: 0.28,
      });
    } else if (polyRef.current) {
      polyRef.current.setMap(null);
    }

    // 3. Custom Polyline while drawing (1 or 2 vertices)
    if (customPolygon && customPolygon.length > 0 && customPolygon.length < 3) {
      if (!lineRef.current) {
        lineRef.current = new google.maps.Polyline({
          map,
          clickable: false,
        });
      }
      lineRef.current.setOptions({
        map,
        path: customPolygon,
        strokeColor: '#f59e0b',
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
      });
    } else if (lineRef.current) {
      lineRef.current.setMap(null);
    }

    // 4. Buffer Preview Circle around AOI Center
    if (showBufferPreview && bufferDistanceMeters > 0) {
      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map,
          clickable: false,
        });
      }
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      const centerLng = (bbox.minLon + bbox.maxLon) / 2;
      circleRef.current.setOptions({
        map,
        center: { lat: centerLat, lng: centerLng },
        radius: bufferDistanceMeters,
        strokeColor: '#f97316',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#f97316',
        fillOpacity: 0.18,
      });
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
    }
    // 5. Direct Spatial Visualization GroundOverlay (Spectral / LULC / SWAN / Slope / SAR / UAV)
    if (groundOverlayRef.current) {
      groundOverlayRef.current.setMap(null);
      groundOverlayRef.current = null;
    }
    if (showVisualization && vizResult?.rasterDataUrl) {
      const overlayBounds = new google.maps.LatLngBounds(
        { lat: bbox.minLat, lng: bbox.minLon },
        { lat: bbox.maxLat, lng: bbox.maxLon }
      );
      groundOverlayRef.current = new google.maps.GroundOverlay(
        vizResult.rasterDataUrl,
        overlayBounds,
        {
          opacity: vizOpacity,
          clickable: false,
        }
      );
      groundOverlayRef.current.setMap(map);
    }

    // 6. Domain Vector Overlays (DSAS Shoreline Transects & SWAN Wave Propagation Vectors)
    domainLinesRef.current.forEach((pl) => pl.setMap(null));
    domainLinesRef.current = [];
    if (showVisualization && vizResult?.transects) {
      vizResult.transects.forEach((tr) => {
        const color = tr.epr < -1 ? '#ef4444' : tr.epr > 1 ? '#10b981' : '#facc15';
        const line = new google.maps.Polyline({
          map,
          path: [
            { lat: tr.lat1, lng: tr.lng1 },
            { lat: tr.lat2, lng: tr.lng2 },
          ],
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          clickable: false,
        });
        domainLinesRef.current.push(line);
      });
    }
    if (showVisualization && vizResult?.swanVectors) {
      const arrowScaleLat = Math.max(0.01, (bbox.maxLat - bbox.minLat) * 0.085);
      const arrowScaleLng = Math.max(0.01, (bbox.maxLon - bbox.minLon) * 0.085);
      vizResult.swanVectors.forEach((vec) => {
        const rad = (vec.angleDeg * Math.PI) / 180;
        const endLat = vec.lat + Math.cos(rad) * arrowScaleLat;
        const endLng = vec.lng + Math.sin(rad) * arrowScaleLng;
        const line = new google.maps.Polyline({
          map,
          path: [
            { lat: vec.lat, lng: vec.lng },
            { lat: endLat, lng: endLng },
          ],
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          icons: [
            {
              icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5 },
              offset: '100%',
            },
          ],
          clickable: false,
        });
        domainLinesRef.current.push(line);
      });
    }
  }, [map, bbox, customPolygon, showBufferPreview, bufferDistanceMeters, showVisualization, vizOpacity, vizResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rectRef.current?.setMap(null);
      polyRef.current?.setMap(null);
      lineRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      groundOverlayRef.current?.setMap(null);
      domainLinesRef.current.forEach((pl) => pl.setMap(null));
    };
  }, []);

  return null;
};

/**
 * Standalone Interactive Web Mercator Slippy Tile Map for Esri ArcGIS Basemaps.
 * Keeping Esri tiles in a dedicated non-Google viewer guarantees strict compliance
 * with Google Maps Platform Terms of Service (never mixing Google & non-Google tiles).
 */
const EsriSlippyTileViewer: React.FC<{
  tileUrlTemplate: string;
  attribution: string;
  bbox: BoundingBox;
  customPolygon?: LatLngVertex[];
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  showBufferPreview: boolean;
  bufferDistanceMeters: number;
  fitTriggerKey: string;
  showVisualization: boolean;
  vizOpacity: number;
  vizResult: MapVisualizationResult | null;
  onMapClickLatLng: (lat: number, lng: number) => void;
}> = ({
  tileUrlTemplate,
  attribution,
  bbox,
  customPolygon,
  userLocation,
  showBufferPreview,
  bufferDistanceMeters,
  fitTriggerKey,
  showVisualization,
  vizOpacity,
  vizResult,
  onMapClickLatLng,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(9);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: (bbox.minLat + bbox.maxLat) / 2,
    lng: (bbox.minLon + bbox.maxLon) / 2,
  });

  // Recenter and compute appropriate zoom when preset or file changes
  useEffect(() => {
    const cLat = (bbox.minLat + bbox.maxLat) / 2;
    const cLng = (bbox.minLon + bbox.maxLon) / 2;
    setCenter({ lat: cLat, lng: cLng });
    const span = Math.max(bbox.maxLon - bbox.minLon, bbox.maxLat - bbox.minLat);
    if (span > 2.5) setZoom(7);
    else if (span > 1.0) setZoom(8);
    else if (span > 0.4) setZoom(9);
    else if (span > 0.15) setZoom(11);
    else setZoom(12);
  }, [fitTriggerKey]);

  const VIEW_W = 760;
  const VIEW_H = 340;
  const scale = 256 * Math.pow(2, zoom);

  const lonToWorldX = (lon: number) => ((lon + 180) / 360) * scale;
  const latToWorldY = (lat: number) => {
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
    return (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale;
  };

  const worldXToLon = (wx: number) => (wx / scale) * 360 - 180;
  const worldYToLat = (wy: number) => {
    const n = Math.PI - (2 * Math.PI * wy) / scale;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const centerWorldX = lonToWorldX(center.lng);
  const centerWorldY = latToWorldY(center.lat);
  const topLeftWorldX = centerWorldX - VIEW_W / 2;
  const topLeftWorldY = centerWorldY - VIEW_H / 2;

  const minTileX = Math.floor(topLeftWorldX / 256);
  const maxTileX = Math.floor((topLeftWorldX + VIEW_W) / 256);
  const minTileY = Math.floor(topLeftWorldY / 256);
  const maxTileY = Math.floor((topLeftWorldY + VIEW_H) / 256);
  const maxIndex = Math.pow(2, zoom);

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= maxIndex) continue;
      const wrappedX = ((tx % maxIndex) + maxIndex) % maxIndex;
      const url = tileUrlTemplate
        .replace('{z}', String(zoom))
        .replace('{y}', String(ty))
        .replace('{x}', String(wrappedX));
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url,
        left: tx * 256 - topLeftWorldX,
        top: ty * 256 - topLeftWorldY,
      });
    }
  }

  const latLngToPixel = (lat: number, lng: number) => ({
    x: lonToWorldX(lng) - topLeftWorldX,
    y: latToWorldY(lat) - topLeftWorldY,
  });

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const py = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    const clickedLon = worldXToLon(topLeftWorldX + px);
    const clickedLat = worldYToLat(topLeftWorldY + py);
    onMapClickLatLng(clickedLat, clickedLon);
  };

  const swPx = latLngToPixel(bbox.minLat, bbox.minLon);
  const nePx = latLngToPixel(bbox.maxLat, bbox.maxLon);
  const boxX = Math.min(swPx.x, nePx.x);
  const boxY = Math.min(swPx.y, nePx.y);
  const boxW = Math.max(6, Math.abs(nePx.x - swPx.x));
  const boxH = Math.max(6, Math.abs(swPx.y - nePx.y));

  const centerPx = latLngToPixel(
    (bbox.minLat + bbox.maxLat) / 2,
    (bbox.minLon + bbox.maxLon) / 2
  );
  const metersPerPixel =
    (156543.03392 * Math.cos((((bbox.minLat + bbox.maxLat) / 2) * Math.PI) / 180)) /
    Math.pow(2, zoom);
  const bufferRadiusPx = Math.max(4, bufferDistanceMeters / Math.max(0.1, metersPerPixel));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-72 sm:h-80 bg-slate-900 overflow-hidden select-none"
      data-testid="esri-slippy-map"
    >
      {/* Esri Raster Tiles Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            className="absolute w-[256px] h-[256px] max-w-none select-none"
            style={{ left: `${t.left}px`, top: `${t.top}px` }}
          />
        ))}
      </div>

      {/* Interactive Vector & Direct Spatial Raster Overlay SVG */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="relative z-10 w-full h-full cursor-crosshair block"
        onClick={handleSvgClick}
        role="img"
        aria-label="Kanvas Peta Basemap Esri ArcGIS Interaktif"
      >
        {/* Direct In-Map Spatial Raster Visualization */}
        {showVisualization && vizResult?.rasterDataUrl && (
          <image
            href={vizResult.rasterDataUrl}
            x={boxX}
            y={boxY}
            width={boxW}
            height={boxH}
            opacity={vizOpacity}
            preserveAspectRatio="none"
          />
        )}

        {/* BBox Envelope */}
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          fill={
            showVisualization
              ? 'transparent'
              : customPolygon && customPolygon.length >= 3
              ? 'rgba(14, 165, 233, 0.06)'
              : 'rgba(14, 165, 233, 0.25)'
          }
          stroke={customPolygon && customPolygon.length >= 3 ? '#94a3b8' : '#38bdf8'}
          strokeWidth={customPolygon && customPolygon.length >= 3 ? '1.5' : '2.5'}
          strokeDasharray={customPolygon && customPolygon.length >= 3 ? '4 4' : undefined}
        />

        {/* Shoreline Slope / DSAS Transects */}
        {showVisualization &&
          vizResult?.transects?.map((tr, i) => {
            const p1 = latLngToPixel(tr.lat1, tr.lng1);
            const p2 = latLngToPixel(tr.lat2, tr.lng2);
            const color = tr.epr < -1 ? '#ef4444' : tr.epr > 1 ? '#10b981' : '#facc15';
            return (
              <line
                key={`tr-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}

        {/* SWAN Wave Propagation Vectors */}
        {showVisualization &&
          vizResult?.swanVectors?.map((vec, i) => {
            const p = latLngToPixel(vec.lat, vec.lng);
            const rad = (vec.angleDeg * Math.PI) / 180;
            const len = 18;
            const x2 = p.x + Math.sin(rad) * len;
            const y2 = p.y - Math.cos(rad) * len;
            return (
              <g key={`swan-${i}`}>
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx={x2} cy={y2} r="2.2" fill="#fde047" />
              </g>
            );
          })}

        {/* UAV GCP Checkpoints */}
        {showVisualization &&
          vizResult?.gcpPoints?.map((gcp) => {
            const p = latLngToPixel(gcp.lat, gcp.lng);
            return (
              <g key={gcp.id}>
                <polygon
                  points={`${p.x},${p.y - 6} ${p.x + 6},${p.y + 5} ${p.x - 6},${p.y + 5}`}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <text
                  x={p.x + 8}
                  y={p.y + 3}
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {gcp.id}
                </text>
              </g>
            );
          })}

        {/* Custom Polygon or Polyline */}
        {customPolygon && customPolygon.length >= 3 && (
          <polygon
            points={customPolygon
              .map((v) => {
                const p = latLngToPixel(v.lat, v.lng);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ')}
            fill="rgba(16, 185, 129, 0.28)"
            stroke="#10b981"
            strokeWidth="2.5"
          />
        )}

        {customPolygon && customPolygon.length > 0 && customPolygon.length < 3 && (
          <polyline
            points={customPolygon
              .map((v) => {
                const p = latLngToPixel(v.lat, v.lng);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
        )}

        {customPolygon &&
          customPolygon.map((v, idx) => {
            const p = latLngToPixel(v.lat, v.lng);
            return (
              <circle
                key={`${v.lat}-${v.lng}-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

        {/* Buffer Preview Circle */}
        {showBufferPreview && bufferDistanceMeters > 0 && (
          <circle
            cx={centerPx.x}
            cy={centerPx.y}
            r={bufferRadiusPx}
            fill="rgba(249, 115, 22, 0.20)"
            stroke="#f97316"
            strokeWidth="2"
          />
        )}

        {/* Current Location GPS Marker on Esri Viewer */}
        {userLocation && (() => {
          const locPx = latLngToPixel(userLocation.lat, userLocation.lng);
          return (
            <g>
              <circle
                cx={locPx.x}
                cy={locPx.y}
                r="13"
                fill="rgba(13, 148, 136, 0.22)"
                stroke="#0d9488"
                strokeWidth="1.5"
              />
              <circle
                cx={locPx.x}
                cy={locPx.y}
                r="5.5"
                fill="#0f766e"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          );
        })()}
      </svg>

      {/* Zoom & Pan Controls for Esri Viewer */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(16, z + 1))}
          aria-label="Perbesar peta Esri"
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-800 shadow-xs border border-slate-200 flex items-center justify-center transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(4, z - 1))}
          aria-label="Perkecil peta Esri"
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-800 shadow-xs border border-slate-200 flex items-center justify-center transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Required Esri Attribution Strip */}
      <div className="absolute bottom-0 inset-x-0 z-20 bg-slate-950/75 px-2.5 py-1 text-[10px] text-slate-300 truncate pointer-events-none">
        {attribution}
      </div>
    </div>
  );
};

export const InteractiveAoiMap: React.FC<InteractiveAoiMapProps> = ({
  activeTemplateId,
  platformId,
  params,
  regionName,
  bbox,
  crsEpsg,
  bufferDistanceMeters,
  customPolygon,
  realEoGrid = null,
  isRunningViz = false,
  vizRunError = null,
  runSignal = 0,
  onRunVisualization,
  onSelectPreset,
  onUpdateBbox,
  onUpdateCustomPolygon,
  onVisualizationChange,
}) => {
  const [selectedBasemap, setSelectedBasemap] = useState<BasemapId>(
    GOOGLE_MAPS_API_KEY ? 'google-hybrid' : 'esri-imagery'
  );
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('bbox');
  const [showBufferPreview, setShowBufferPreview] = useState<boolean>(false);
  const [showVisualization, setShowVisualization] = useState<boolean>(true);
  const [vizOpacity, setVizOpacity] = useState<number>(0.72);
  const [highlightThresholdMask, setHighlightThresholdMask] = useState<boolean>(false);
  const [inspectedPixel, setInspectedPixel] = useState<{
    lat: number;
    lng: number;
    valueText: string;
    classLabel: string;
  } | null>(null);
  const [wktCopied, setWktCopied] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const fitTriggerKey = `${regionName}:${bbox.minLon.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLon.toFixed(4)},${bbox.maxLat.toFixed(4)}`;

  useEffect(() => {
    if (runSignal > 0) {
      setShowVisualization(true);
    }
  }, [runSignal]);

  const activeBasemapMeta =
    BASEMAP_OPTIONS.find((b) => b.id === selectedBasemap) || BASEMAP_OPTIONS[0];

  const hasCustomPolygon = Boolean(customPolygon && customPolygon.length >= 3);
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;

  const areaKm2 = hasCustomPolygon && customPolygon
    ? calculatePolygonAreaKm2(customPolygon)
    : calculateBboxAreaKm2(bbox);
  const areaHectares = Math.round(areaKm2 * 100);
  const perimeterKm =
    hasCustomPolygon && customPolygon ? calculatePolygonPerimeterKm(customPolygon) : 0;

  const recommendedUtm = recommendUtmEpsg(centerLon, centerLat);

  const vizResult = React.useMemo(() => {
    return generateMapVisualization(activeTemplateId, platformId, params, {
      highlightThresholdMask,
      gridSize: realEoGrid ? realEoGrid.gridSize : 160,
      realGrid: realEoGrid,
    });
  }, [activeTemplateId, platformId, params, highlightThresholdMask, realEoGrid]);

  useEffect(() => {
    onVisualizationChange?.(showVisualization ? vizResult : null);
  }, [showVisualization, vizResult, onVisualizationChange]);

  const handleMapPointClick = (clickedLat: number, clickedLon: number) => {
    if (interactionMode === 'inspect') {
      const sample = vizResult.inspectAt(clickedLat, clickedLon);
      setInspectedPixel({
        lat: Number(clickedLat.toFixed(5)),
        lng: Number(clickedLon.toFixed(5)),
        valueText: sample.valueText,
        classLabel: sample.classLabel,
      });
      return;
    }

    if (interactionMode === 'polygon') {
      const nextVertices: LatLngVertex[] = [
        ...(customPolygon || []),
        {
          lat: Number(clickedLat.toFixed(5)),
          lng: Number(clickedLon.toFixed(5)),
        },
      ];
      if (nextVertices.length >= 3) {
        const nextBbox = verticesToBbox(nextVertices);
        const cLon = (nextBbox.minLon + nextBbox.maxLon) / 2;
        const cLat = (nextBbox.minLat + nextBbox.maxLat) / 2;
        const utm = recommendUtmEpsg(cLon, cLat);
        onUpdateCustomPolygon(
          nextVertices,
          nextBbox,
          utm.epsg,
          `Poligon Studi Kustom (${nextVertices.length} titik)`
        );
      } else {
        onUpdateCustomPolygon(nextVertices);
      }
      return;
    }

    // Default 'bbox' mode: center active BBox around clicked coordinate
    const halfWidth = Math.max(0.04, Math.min(0.8, (bbox.maxLon - bbox.minLon) / 2));
    const halfHeight = Math.max(0.04, Math.min(0.8, (bbox.maxLat - bbox.minLat) / 2));
    const newBbox: BoundingBox = {
      minLon: Number((clickedLon - halfWidth).toFixed(4)),
      maxLon: Number((clickedLon + halfWidth).toFixed(4)),
      minLat: Number((clickedLat - halfHeight).toFixed(4)),
      maxLat: Number((clickedLat + halfHeight).toFixed(4)),
    };
    const utm = recommendUtmEpsg(clickedLon, clickedLat);
    onUpdateCustomPolygon(
      undefined,
      newBbox,
      utm.epsg,
      `AOI Kustom (${clickedLat.toFixed(3)}°, ${clickedLon.toFixed(3)}°)`
    );
  };

  const handleGoogleMapClick = (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    handleMapPointClick(e.detail.latLng.lat, e.detail.latLng.lng);
  };

  const handleUndoPolygonVertex = () => {
    if (!customPolygon || customPolygon.length === 0) return;
    const next = customPolygon.slice(0, -1);
    if (next.length >= 3) {
      const nextBbox = verticesToBbox(next);
      onUpdateCustomPolygon(next, nextBbox);
    } else if (next.length === 0) {
      onUpdateCustomPolygon(undefined);
    } else {
      onUpdateCustomPolygon(next);
    }
  };

  const handleClearCustomPolygon = () => {
    onUpdateCustomPolygon(undefined);
    setInteractionMode('bbox');
  };

  const applyLocationBbox = (lat: number, lng: number, halfSpanDeg = 0.035) => {
    const newBbox: BoundingBox = {
      minLon: Number((lng - halfSpanDeg).toFixed(4)),
      maxLon: Number((lng + halfSpanDeg).toFixed(4)),
      minLat: Number((lat - halfSpanDeg).toFixed(4)),
      maxLat: Number((lat + halfSpanDeg).toFixed(4)),
    };
    const utm = recommendUtmEpsg(lng, lat);
    onUpdateCustomPolygon(
      undefined,
      newBbox,
      utm.epsg,
      `Lokasi Saat Ini (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`
    );
  };

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Browser ini tidak mendukung API Geolocation GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy || 0);
        setUserLocation({ lat, lng, accuracy });
        applyLocationBbox(lat, lng, 0.035);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Izin lokasi ditolak browser. Aktifkan izin lokasi di pengaturan situs atau klik titik pada peta secara manual.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Posisi GPS perangkat saat ini tidak tersedia.');
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Waktu pencarian koordinat GPS habis. Silakan coba lagi.');
        } else {
          setGeoError('Gagal mengambil lokasi saat ini dari perangkat.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCopyWkt = async () => {
    const wkt = exportAoiToWkt(bbox, customPolygon);
    try {
      await navigator.clipboard.writeText(wkt);
      setWktCopied(true);
      setTimeout(() => setWktCopied(false), 2000);
    } catch {
      setWktCopied(false);
    }
  };

  const handleDownloadGeoJson = () => {
    const geojsonText = exportAoiToGeoJson(regionName, bbox, crsEpsg, customPolygon);
    const blob = new Blob([geojsonText], { type: 'application/geo+json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aoi_${regionName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_6px_24px_-10px_rgba(15,23,42,0.06)] space-y-4">
      {/* Header & Basemap Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Peta Interaktif AOI (Google Maps & Esri ArcGIS Basemap)
          </h3>
          <p className="text-xs text-slate-500">
            Pilih peta dasar satelit/topografi, klik peta untuk menempatkan Kotak AOI atau menggambar Poligon multi-titik secara presisi.
          </p>
        </div>

        {/* Basemap Provider Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Layers className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <label htmlFor="basemap-select" className="sr-only">
            Pilih Peta Dasar (Basemap)
          </label>
          <select
            id="basemap-select"
            value={selectedBasemap}
            onChange={(e) => setSelectedBasemap(e.target.value as BasemapId)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/40"
          >
            <optgroup label="Google Maps Platform">
              {BASEMAP_OPTIONS.filter((b) => b.provider === 'google').map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Esri ArcGIS Online Basemaps">
              {BASEMAP_OPTIONS.filter((b) => b.provider === 'esri').map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Preset Wilayah Indonesia">
        {REGION_PRESETS.map((preset) => {
          const isSelected = regionName === preset.name && !hasCustomPolygon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100/85 text-slate-700 hover:bg-slate-200/75'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
            userLocation
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
          }`}
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          {isLocating ? 'Mencari GPS...' : 'Lokasi Saat Ini'}
        </button>
        <button
          type="button"
          onClick={() => {
            setUserLocation(null);
            setGeoError(null);
            onSelectPreset(REGION_PRESETS[0]);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100/85 hover:bg-slate-200/75 rounded-xl transition-colors whitespace-nowrap shrink-0 ml-auto"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {geoError && (
        <div
          role="alert"
          className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"
        >
          {geoError}
        </div>
      )}

      {userLocation && (
        <div className="px-3 py-2 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-900 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>Lokasi GPS Aktif:</strong>{' '}
            <span className="font-mono">
              {userLocation.lat.toFixed(5)}°, {userLocation.lng.toFixed(5)}°
            </span>
            {userLocation.accuracy ? ` (±${userLocation.accuracy} m)` : ''}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-teal-700 font-medium">Radius AOI:</span>
            {[
              { label: '±2 km', deg: 0.018 },
              { label: '±5 km', deg: 0.045 },
              { label: '±15 km', deg: 0.135 },
            ].map((rad) => (
              <button
                key={rad.label}
                type="button"
                onClick={() => applyLocationBbox(userLocation.lat, userLocation.lng, rad.deg)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white border border-teal-200 hover:bg-teal-100 rounded-lg text-teal-800"
              >
                {rad.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Drawing & Buffer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 border border-slate-200/75 rounded-xl p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInteractionMode('bbox')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              interactionMode === 'bbox'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            Mode Kotak AOI (BBox)
          </button>
          <button
            type="button"
            onClick={() => setInteractionMode('polygon')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              interactionMode === 'polygon'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <Pentagon className="w-3.5 h-3.5" />
            Gambar Poligon ({customPolygon?.length || 0} titik)
          </button>
          <button
            type="button"
            onClick={() => setInteractionMode('inspect')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              interactionMode === 'inspect'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <Pipette className="w-3.5 h-3.5" />
            Inspeksi Piksel
          </button>

          {customPolygon && customPolygon.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleUndoPolygonVertex}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                title="Hapus titik sudut terakhir"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                type="button"
                onClick={handleClearCustomPolygon}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                title="Hapus poligon kustom"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Poligon
              </button>
            </>
          )}
        </div>

        {/* Buffer Radius Toggle & Export Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowBufferPreview((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
              showBufferPreview
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5 text-amber-600" />
            Buffer {bufferDistanceMeters}m
          </button>
          <button
            type="button"
            onClick={handleCopyWkt}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {wktCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                WKT Tersalin
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Salin WKT
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadGeoJson}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            AOI .geojson
          </button>
        </div>
      </div>

      {/* Direct In-Map Visualization Layer Control Bar (GEE-Style Run Button + Layer Controls) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-sky-50/70 border border-teal-200/90 rounded-xl px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isRunningViz}
            onClick={() => {
              setShowVisualization(true);
              onRunVisualization?.(true);
            }}
            data-testid="run-visualization-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            {isRunningViz ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {isRunningViz ? 'Menjalankan...' : 'Run Visualisasi'}
          </button>

          <button
            type="button"
            onClick={() => setShowVisualization((prev) => !prev)}
            data-testid="toggle-map-visualization"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              showVisualization
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showVisualization ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showVisualization ? 'Layer Aktif' : 'Tampilkan Layer'}
          </button>

          {showVisualization && (
            <button
              type="button"
              onClick={() => setHighlightThresholdMask((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                highlightThresholdMask
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-teal-700" />
              {highlightThresholdMask ? 'Mode Sorot Ambang' : 'Sorot Lolos Ambang'}
            </button>
          )}
        </div>

        {showVisualization && (
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <label htmlFor="viz-opacity-slider" className="font-medium whitespace-nowrap">
              Opasitas Layer: <span className="font-mono">{Math.round(vizOpacity * 100)}%</span>
            </label>
            <input
              id="viz-opacity-slider"
              type="range"
              min="15"
              max="100"
              step="5"
              value={Math.round(vizOpacity * 100)}
              onChange={(e) => setVizOpacity(parseInt(e.target.value, 10) / 100)}
              className="w-24 accent-teal-700"
            />
          </div>
        )}
      </div>

      {vizRunError && (
        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {vizRunError}
        </div>
      )}

      {/* Mode Hint Banner when in Polygon Drawing or Pixel Inspection Mode */}
      {interactionMode === 'polygon' && (
        <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
          <span>
            <strong>Mode Gambar Poligon Aktif:</strong> Klik minimal 3 titik di atas peta untuk membentuk poligon studi (`ee.Geometry.Polygon` / `shapely.geometry.Polygon`). Saat ini:{' '}
            <strong className="font-mono">{customPolygon?.length || 0} titik</strong>.
          </span>
        </div>
      )}

      {interactionMode === 'inspect' && (
        <div className="px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Mode Inspeksi Piksel Aktif:</strong> Klik di dalam area AOI pada peta untuk membaca nilai piksel/kelas langsung tanpa menggeser kotak AOI.
          </span>
          {inspectedPixel && (
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-sky-200 text-sky-900">
              ({inspectedPixel.lat}°, {inspectedPixel.lng}°) → <strong>{inspectedPixel.valueText}</strong> · {inspectedPixel.classLabel}
            </span>
          )}
        </div>
      )}

      {/* Map Viewport Container (Google Maps Platform OR Standalone Esri ArcGIS Tile Viewer) */}
      <div
        className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900"
        data-testid="aoi-interactive-map"
      >
        {activeBasemapMeta.provider === 'google' && GOOGLE_MAPS_API_KEY ? (
          <div className="w-full h-72 sm:h-80">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                defaultCenter={{ lat: centerLat, lng: centerLon }}
                defaultZoom={9}
                mapId="DEMO_MAP_ID"
                mapTypeId={activeBasemapMeta.googleMapTypeId || 'hybrid'}
                gestureHandling="greedy"
                disableDefaultUI={false}
                streetViewControl={false}
                fullscreenControl={false}
                mapTypeControl={false}
                onClick={handleGoogleMapClick}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                <GoogleMapVectorOverlays
                  bbox={bbox}
                  customPolygon={customPolygon}
                  showBufferPreview={showBufferPreview}
                  bufferDistanceMeters={bufferDistanceMeters}
                  fitTriggerKey={fitTriggerKey}
                  showVisualization={showVisualization}
                  vizOpacity={vizOpacity}
                  vizResult={vizResult}
                  onEditableRectangleChanged={(nextBbox) => {
                    const cLon = (nextBbox.minLon + nextBbox.maxLon) / 2;
                    const cLat = (nextBbox.minLat + nextBbox.maxLat) / 2;
                    const utm = recommendUtmEpsg(cLon, cLat);
                    onUpdateBbox(nextBbox, utm.epsg);
                  }}
                />
                {showVisualization &&
                  vizResult?.gcpPoints?.map((gcp) => (
                    <AdvancedMarker
                      key={gcp.id}
                      position={{ lat: gcp.lat, lng: gcp.lng }}
                      title={`${gcp.id} (${gcp.z} m)`}
                    >
                      <div className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-mono font-bold border border-white shadow-sm">
                        {gcp.id}
                      </div>
                    </AdvancedMarker>
                  ))}
                {userLocation && (
                  <AdvancedMarker
                    position={{ lat: userLocation.lat, lng: userLocation.lng }}
                    title="Lokasi Saat Ini (GPS)"
                  >
                    <div className="w-4 h-4 rounded-full bg-teal-600 border-2 border-white shadow-md ring-4 ring-teal-400/35" />
                  </AdvancedMarker>
                )}
              </GoogleMap>
            </APIProvider>
          </div>
        ) : (
          <EsriSlippyTileViewer
            tileUrlTemplate={
              activeBasemapMeta.esriTileUrl ||
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            }
            attribution={
              activeBasemapMeta.attribution ||
              'Powered by Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            }
            bbox={bbox}
            customPolygon={customPolygon}
            userLocation={userLocation}
            showBufferPreview={showBufferPreview}
            bufferDistanceMeters={bufferDistanceMeters}
            fitTriggerKey={fitTriggerKey}
            showVisualization={showVisualization}
            vizOpacity={vizOpacity}
            vizResult={vizResult}
            onMapClickLatLng={handleMapPointClick}
          />
        )}

        {/* Bottom Telemetry / Coordinate Strip inside Map Frame */}
        <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-mono tabular-nums">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-sans font-medium text-white">{regionName}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-300">
              ~{areaKm2.toLocaleString('id-ID')} km² ({areaHectares.toLocaleString('id-ID')} Ha)
            </span>
            {perimeterKm > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Keliling: {perimeterKm.toLocaleString('id-ID')} km</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Pusat: {decimalToDms(centerLat, false)}, {decimalToDms(centerLon, true)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-sky-300">
              {crsEpsg} ({recommendedUtm.label})
            </span>
          </div>
        </div>
      </div>

      {/* Live Map Legend, Data Telemetry & Execution Console Log */}
      {showVisualization && (
        <div
          data-testid="live-map-legend-panel"
          className="rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 space-y-2.5 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{vizResult.stats.modeTitle}</span>
              <span
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                  vizResult.stats.isRealData
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {vizResult.stats.modeBadge}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-700 tabular-nums">
              <span>Min: <strong>{vizResult.stats.minLabel}</strong></span>
              <span>Mean: <strong className="text-teal-700">{vizResult.stats.meanLabel}</strong></span>
              <span>Max: <strong>{vizResult.stats.maxLabel}</strong></span>
              <span className="text-sky-800 font-sans">
                {vizResult.stats.passingLabel}:{' '}
                <strong className="font-mono">
                  {vizResult.stats.passingPercent}% ({vizResult.stats.passingAreaHa.toLocaleString('id-ID')} Ha)
                </strong>
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            Sumber Data: {vizResult.stats.dataSourceSummary}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {vizResult.legendItems.map((item) => (
              <div key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
                <span
                  className="w-3 h-3 rounded-xs border border-slate-300 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {vizResult.stats.classBreakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/75">
              {vizResult.stats.classBreakdown.map((cls) => (
                <div
                  key={cls.label}
                  className="flex items-center justify-between gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200/75 text-[11px]"
                >
                  <span className="inline-flex items-center gap-1.5 truncate text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="truncate">{cls.label.split(' / ')[0]}</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-900 shrink-0">
                    {cls.percent}% ({cls.areaHa.toLocaleString('id-ID')} Ha)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* GEE-Style Execution Console Output */}
          <div
            data-testid="viz-execution-console"
            className="rounded-lg bg-slate-900 text-slate-200 p-2.5 font-mono text-[11px] space-y-1 border border-slate-800"
          >
            <div className="flex items-center justify-between text-emerald-300 font-semibold border-b border-slate-800 pb-1">
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="w-3 h-3" />
                Konsol Hasil Eksekusi Visualisasi
              </span>
              {isRunningViz && <span className="text-amber-300">Memproses tile...</span>}
            </div>
            {vizResult.stats.executionLogs.map((log, i) => (
              <div key={i} className="leading-snug text-slate-300">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numeric BBox Input Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div>
          <label htmlFor="bbox-min-lon" className="block text-xs font-medium text-slate-600 mb-1">
            Bujur Barat (minLon)
          </label>
          <input
            id="bbox-min-lon"
            type="number"
            step="0.01"
            value={bbox.minLon}
            onChange={(e) =>
              onUpdateBbox({ ...bbox, minLon: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
        <div>
          <label htmlFor="bbox-min-lat" className="block text-xs font-medium text-slate-600 mb-1">
            Lintang Selatan (minLat)
          </label>
          <input
            id="bbox-min-lat"
            type="number"
            step="0.01"
            value={bbox.minLat}
            onChange={(e) =>
              onUpdateBbox({ ...bbox, minLat: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
        <div>
          <label htmlFor="bbox-max-lon" className="block text-xs font-medium text-slate-600 mb-1">
            Bujur Timur (maxLon)
          </label>
          <input
            id="bbox-max-lon"
            type="number"
            step="0.01"
            value={bbox.maxLon}
            onChange={(e) =>
              onUpdateBbox({ ...bbox, maxLon: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
        <div>
          <label htmlFor="bbox-max-lat" className="block text-xs font-medium text-slate-600 mb-1">
            Lintang Utara (maxLat)
          </label>
          <input
            id="bbox-max-lat"
            type="number"
            step="0.01"
            value={bbox.maxLat}
            onChange={(e) =>
              onUpdateBbox({ ...bbox, maxLat: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>
      </div>

      {crsEpsg !== recommendedUtm.epsg && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-sky-700 shrink-0" />
            <span>
              Rekomendasi zona proyeksi metrik untuk koordinat ini adalah{' '}
              <strong className="font-mono">{recommendedUtm.epsg}</strong> ({recommendedUtm.label}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateBbox(bbox, recommendedUtm.epsg)}
            className="px-2.5 py-1 font-medium bg-sky-700 text-white rounded-md hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
          >
            Gunakan {recommendedUtm.epsg}
          </button>
        </div>
      )}
    </div>
  );
};
