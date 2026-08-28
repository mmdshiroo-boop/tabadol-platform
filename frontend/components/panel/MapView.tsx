"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import Link from "next/link";
import {
  Loader2,
  Maximize2,
  Minimize2,
  Layers,
  MapPin,
  Eye,
  Calendar,
  Navigation,
  Tag,
  Ruler,
  BedDouble,
  Building2,
  Hash,
} from "lucide-react";
import { MapAdItem as BaseMapAdItem } from "@/types";
import "leaflet/dist/leaflet.css";

// گسترش تایپ
interface MapAdItem extends BaseMapAdItem {
  status?: string;
  isVip?: boolean;
  isUrgent?: boolean;
  views?: number;
  id?: string;
}

const IRAN_BOUNDS = L.latLngBounds([25.0, 44.0], [40.0, 63.5]);

// ─── Dynamic imports ─────────────────────────────────
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

import MarkerClusterGroup from "react-leaflet-cluster";
import { useMap } from "react-leaflet";

// ─── Types ───────────────────────────────────────────
interface MapViewProps {
  markers?: MapAdItem[];
  loading?: boolean;
  className?: string;
  onAdClick?: (ad: MapAdItem) => void;
  center?: [number, number];
  zoom?: number;
}

interface TileLayerConfig {
  id: string;
  name: string;
  url: string;
  attribution: string;
  icon: string;
  subdomains?: string;
  maxZoom?: number;
  extraClassName?: string; // برای فیلتر CSS در دارک بلو
}

const TILE_LAYERS: TileLayerConfig[] = [
  {
    id: "osm",
    name: "نقشه استاندارد",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    icon: "🗺️",
    subdomains: "abcd",
  },
  {
    id: "satellite",
    name: "ماهواره‌ای",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://maps.google.com/">Google Maps</a>',
    icon: "🛰️",
    subdomains: "",
    maxZoom: 20,
  },
  {
    id: "dark",
    name: "حالت تاریک",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    icon: "🌙",
    subdomains: "abcd",
    maxZoom: 19,
  }
];

// ─── Status Config ───────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  pending: "#f59e0b",
  sold: "#6366f1",
  rejected: "#ef4444",
  expired: "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  pending: "در انتظار",
  sold: "فروخته شده",
  rejected: "رد شده",
  expired: "منقضی",
};

// ─── Helpers ─────────────────────────────────────────
function formatPrice(price: number | null | undefined): string {
  if (!price || price === 0) return "رایگان";
  if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} میلیارد`;
  if (price >= 1000000) return `${(price / 1000000).toFixed(0)} میلیون`;
  return `${price.toLocaleString("fa-IR")}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

// ─── MapController ───────────────────────────────────
function MapController({
  center,
  zoom,
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && center) {
      map.flyTo(center, zoom || 9, { animate: true, duration: 0.8 });
    }
  }, [map, center, zoom]);

  return null;
}

// ─── MapView Component ───────────────────────────────
export function MapView({
  markers = [],
  loading = false,
  className = "",
  onAdClick,
  center,
  zoom,
}: MapViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTileLayer, setActiveTileLayer] = useState("osm");
  const [mounted, setMounted] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // شمارش خطاهای تایل برای جلوگیری از بازگشت زودهنگام
  const tileErrorCount = useRef(0);
  const MAX_TILE_ERRORS = 5;

  const initialCenter: [number, number] = center || [32.4279, 53.688];
  const initialZoom = zoom || 6;

  const activeLayer =
    TILE_LAYERS.find((l) => l.id === activeTileLayer) || TILE_LAYERS[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const validMarkers = useMemo(
    () => markers.filter((ad) => ad.lat != null && ad.lng != null),
    [markers],
  );

  // فقط بعد از چند خطا به OSM برمی‌گردیم
  const handleTileError = () => {
    tileErrorCount.current += 1;
    if (
      activeTileLayer !== "osm" &&
      tileErrorCount.current >= MAX_TILE_ERRORS
    ) {
      tileErrorCount.current = 0;
      setActiveTileLayer("osm");
    }
  };

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-2xl ${className}`}
        style={{ minHeight: "500px" }}
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="mt-3 text-muted-foreground text-sm">
            در حال آماده‌سازی نقشه...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group ${className}`}
      style={{
        height: isFullscreen ? "100vh" : "650px",
        width: isFullscreen ? "100vw" : "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        zIndex: isFullscreen ? 9999 : 1,
        transition: "all 0.3s ease",
      }}
    >
      {/* ── Top Controls ── */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="h-10 px-3 bg-card shadow-card hover:shadow-md border border-border/50 rounded-xl flex items-center gap-2 text-sm font-medium text-foreground transition-all"
          >
            <Layers className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">
              {activeLayer.icon} {activeLayer.name}
            </span>
          </button>

          {showLayerMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLayerMenu(false)}
              />
              <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-20 min-w-[170px] overflow-hidden">
                {TILE_LAYERS.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => {
                      tileErrorCount.current = 0;
                      setActiveTileLayer(layer.id);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                      activeTileLayer === layer.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-base">{layer.icon}</span>
                    <span>{layer.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 bg-card shadow-card hover:shadow-md border border-border/50 rounded-xl flex items-center justify-center text-foreground transition-all"
          title={isFullscreen ? "خروج از تمام صفحه" : "تمام صفحه"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm shadow-card border border-border/50 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs font-medium flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = validMarkers.filter((a) => a.status === key).length;
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[key] }}
                />
                <span className="text-muted-foreground">{label}:</span>
                <span className="text-foreground font-bold">{count}</span>
              </div>
            );
          })}
          <div className="border-r border-border h-4 mx-1" />
          <span className="text-muted-foreground">
            کل:{" "}
            <span className="text-foreground font-bold">
              {validMarkers.length}
            </span>
          </span>
        </div>
      </div>

      {/* ── Loading Overlay ── */}
      {loading && (
        <div className="absolute inset-0 z-[999] bg-background/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="bg-card shadow-xl border border-border rounded-2xl px-6 py-4 flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-foreground font-medium">
              در حال بارگذاری آگهی‌ها...
            </span>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        maxZoom={19}
        minZoom={5}
        maxBounds={IRAN_BOUNDS}
        maxBoundsViscosity={1.0}
        attributionControl={false}
        className="w-full h-full rounded-2xl"
        zoomControl={true}
        scrollWheelZoom={true}
        style={{ borderRadius: "1rem" }}
      >
        <TileLayer
          key={activeTileLayer}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          subdomains={activeLayer.subdomains || ""}
          maxZoom={activeLayer.maxZoom ?? 19}
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />

        <MapController center={center} zoom={zoom} />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            let size = 40;
            if (count >= 100) size = 60;
            else if (count >= 10) size = 50;

            return L.divIcon({
              html: `<div style="
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(249,115,22,0.9);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: ${count > 99 ? "12px" : "14px"};
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">${count > 99 ? "99+" : count}</div>`,
              className: "",
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });
          }}
        >
          {validMarkers.map((ad) => {
            const color =
              STATUS_COLORS[ad.status ?? "active"] || STATUS_COLORS.active;
            const radius = ad.isVip ? 9 : 6;

            return (
              <CircleMarker
                key={ad.id ?? ad._id}
                center={[ad.lat!, ad.lng!]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  color: "#ffffff",
                  weight: 2.5,
                  fillOpacity: 0.9,
                }}
                eventHandlers={{
                  click: () => onAdClick?.(ad),
                }}
              >
                <Popup>
                  <AdCard ad={ad} color={color} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}



// ─── AdCard Component (خلاصه‌شده با تأکید بر موقعیت) ─────────────────
function AdCard({ ad, color }: { ad: MapAdItem; color: string }) {
  const lat = ad.lat;
  const lng = ad.lng;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // تصویر
  const rawImage =
    ad.image || (Array.isArray(ad.images) ? ad.images[0] : ad.images);
  const imageSrc: string | null =
    typeof rawImage === "string" ? rawImage : null;
  const finalImageUrl = imageSrc
    ? imageSrc.startsWith("http")
      ? imageSrc
      : `${BASE_URL}${imageSrc.startsWith("/") ? "" : "/"}${imageSrc}`
    : "";

  // اطلاعات اضافی (در صورت وجود)
  const area = (ad as any).area;
  const roomsCount = (ad as any).roomsCount || (ad as any).rooms;
  const adType = (ad as any).adType || (ad as any).type || "sale";
  const adTypeLabel =
    adType === "rent" ? "اجاره" : adType === "sale" ? "فروش" : adType;

  return (
    <div
      className="w-[320px] bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/40 overflow-hidden"
      dir="rtl"
      style={{ fontFamily: "Vazirmatn, system-ui, sans-serif" }}
    >
      {/* تصویر */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {finalImageUrl ? (
          <img
            src={finalImageUrl}
            alt={ad.title || ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Building2 className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* نشان وضعیت */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow"
            style={{ backgroundColor: color }}
          >
            {STATUS_LABELS[ad.status ?? "active"] || ad.status}
          </span>
          {ad.isVip && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-400 text-yellow-900">
              VIP
            </span>
          )}
          {ad.isUrgent && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white animate-pulse">
              فوری
            </span>
          )}
        </div>

        {/* قیمت */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 shadow">
            <span className="text-base font-extrabold text-primary">
              {formatPrice(ad.price)}
            </span>
            <span className="text-[10px] text-muted-foreground mr-1">
              {adTypeLabel === "اجاره" ? "تومان/ماه" : "تومان"}
            </span>
          </div>
        </div>
      </div>

      {/* اطلاعات اصلی */}
      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm text-card-foreground line-clamp-2 leading-6">
          {ad.title || "بدون عنوان"}
        </h3>

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs font-medium text-foreground truncate">
            {ad.city || "نامشخص"}
            {ad.district ? `، ${ad.district}` : ""}
          </p>
        </div>

        {(area || roomsCount) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {area && <span>{area.toLocaleString("fa-IR")} متر</span>}
            {roomsCount && <span>{roomsCount} خواب</span>}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Link
            href={`/ad/${ad.id ?? ad._id}`}
            target="_blank"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            مشاهده
          </Link>
          {lat != null && lng != null && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              مسیر
            </a>
          )}
        </div>
      </div>
    </div>
  );
}