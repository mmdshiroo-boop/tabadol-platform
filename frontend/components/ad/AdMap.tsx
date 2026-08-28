"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, Satellite, Layers, Maximize2, X, Eye, Edit, Printer, Trash2, MapPin, Calendar, Home, TrendingUp, Moon } from "lucide-react";
import Link from "next/link";
import { getImageUrl, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ────────────────────────────────────────────────────────────────
// Fix Leaflet default icon
// ────────────────────────────────────────────────────────────────
const fixMarkerIcon = () => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};
fixMarkerIcon();

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
export interface AdMapAd {
  _id: string;
  title: string;
  price: number;
  city: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  status: "pending" | "active" | "sold" | "expired" | "rejected";
  views: number;
  createdAt: string;
  isVip: boolean;
  images?: string[];
  latitude?: number;
  longitude?: number;
  area?: number;
  rooms?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasStorage?: boolean;
  hasBalcony?: boolean;
  hasYard?: boolean;
}

export interface AdMapProps {
  ads?: AdMapAd[];
  interactive?: boolean;
  className?: string;
  onAdView?: (ad: AdMapAd) => void;
  onAdEdit?: (ad: AdMapAd) => void;
  onAdPrint?: (ad: AdMapAd) => void;
  onAdDelete?: (ad: AdMapAd) => void;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const formatPrice = (price: number) => {
  if (!price || price === 0) return "توافقی";
  return price.toLocaleString("en-US") + " تومان";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const getStatusBadge = (status: string) => {
  const configs: Record<
    string,
    { label: string; className: string }
  > = {
    active: {
      label: "فعال",
      className: "bg-emerald-500 text-white border-emerald-500",
    },
    pending: {
      label: "در انتظار",
      className: "bg-amber-500 text-white border-amber-500",
    },
    sold: {
      label: "فروخته شده",
      className: "bg-blue-500 text-white border-blue-500",
    },
    expired: {
      label: "منقضی شده",
      className: "bg-gray-500 text-white border-gray-500",
    },
    rejected: {
      label: "رد شده",
      className: "bg-rose-500 text-white border-rose-500",
    },
  };
  const item = configs[status] || configs.pending;
  return (
    <Badge className={`${item.className} text-[10px] px-2 py-0.5 border-none rounded-full`}>
      {item.label}
    </Badge>
  );
};

// ────────────────────────────────────────────────────────────────
// Tile layers (به‌روز شده)
// ────────────────────────────────────────────────────────────────
const TILE_LAYERS = {
  street: {
    name: "خیابانی",
    icon: Map,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: "ماهواره‌ای",
    icon: Satellite,
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  hybrid: {
    name: "ترکیبی",
    icon: Layers,
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark_blue: {
    name: "دارک بلو",
    icon: Moon,
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// ────────────────────────────────────────────────────────────────
// Custom marker icon
// ────────────────────────────────────────────────────────────────
const createCustomMarker = (isVip: boolean = false) => {
  const color = isVip ? "#F59E0B" : "#F97316";
  const glowColor = isVip ? "rgba(245,158,11,0.5)" : "rgba(249,115,22,0.5)";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:46px;cursor:pointer;">
        <div style="
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          background: linear-gradient(135deg, ${color}, ${isVip ? '#D97706' : '#EA580C'});
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow: 0 4px 16px ${glowColor}, 0 2px 8px rgba(0,0,0,0.12);
          border:2.5px solid #fff;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="transform:rotate(45deg);">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="white" fill-opacity="0.95"/>
            <circle cx="12" cy="10" r="3" fill="${color}"/>
            ${isVip ? `<circle cx="12" cy="10" r="1.5" fill="white" opacity="0.8"/>` : ''}
          </svg>
        </div>
        <div style="
          position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);
          width:20px;height:6px;background:rgba(0,0,0,0.15);
          border-radius:50%;filter:blur(2px);
        "></div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
};

// ────────────────────────────────────────────────────────────────
// Popup Card Component — کامپوننت کارت پاپ‌آپ نقشه
// ────────────────────────────────────────────────────────────────
function MapPopupCard({
  ad,
  onView,
  onEdit,
  onPrint,
  onDelete,
}: {
  ad: AdMapAd;
  onView?: (ad: AdMapAd) => void;
  onEdit?: (ad: AdMapAd) => void;
  onPrint?: (ad: AdMapAd) => void;
  onDelete?: (ad: AdMapAd) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-[280px] max-w-[90vw] bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/50">
      {/* ─── Image ─── */}
      <div className="relative h-[130px] bg-muted/30">
        <img
          src={imageError ? "/images/user.webp" : getImageUrl(ad.images?.[0])}
          alt={ad.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {getStatusBadge(ad.status)}
          {ad.isVip && (
            <Badge className="bg-amber-500 text-white border-none text-[10px] px-2 py-0.5 rounded-full">
              ★ VIP
            </Badge>
          )}
        </div>

        <div className="absolute bottom-2 right-2">
          <span className="text-white font-black text-lg drop-shadow-lg bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
            {formatPrice(ad.price)}
          </span>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="p-3 space-y-2">
        <Link
          href={`/ad/${ad._id}`}
          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 block"
          onClick={(e) => e.stopPropagation()}
        >
          {ad.title}
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            {ad.city || "—"}
          </span>
          {ad.province && (
            <span className="flex items-center gap-1">
              <Home className="w-3 h-3" />
              {ad.province}
            </span>
          )}
          {ad.neighborhood && <span>• {ad.neighborhood}</span>}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {ad.views !== undefined && (
            <span className="flex items-center gap-1">
              👁 {ad.views.toLocaleString("en-US")}
            </span>
          )}
          {ad.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(ad.createdAt)}
            </span>
          )}
          {ad.area && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {ad.area.toLocaleString("en-US")} م²
            </span>
          )}
          {ad.rooms && (
            <span className="flex items-center gap-1">
              🛏 {ad.rooms} خواب
            </span>
          )}
        </div>

        {(ad.hasElevator || ad.hasParking || ad.hasStorage || ad.hasBalcony || ad.hasYard) && (
          <div className="flex flex-wrap gap-1">
            {ad.hasElevator && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                آسانسور
              </span>
            )}
            {ad.hasParking && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                پارکینگ
              </span>
            )}
            {ad.hasStorage && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                انباری
              </span>
            )}
            {ad.hasBalcony && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                بالکن
              </span>
            )}
            {ad.hasYard && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                حیاط
              </span>
            )}
          </div>
        )}

        {/* ─── Actions ─── */}
        <div className="flex items-center gap-1 pt-1.5 border-t border-border/30">
          <Button
            size="sm"
            className="flex-1 rounded-xl text-[10px] font-bold gap-1 bg-primary hover:bg-primary/90 text-white h-7"
            onClick={() => onView ? onView(ad) : window.location.href = `/ad/${ad._id}`}
          >
            <Eye className="w-3 h-3" /> مشاهده
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-[10px] gap-1 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white h-7 px-2.5"
            onClick={() => onEdit?.(ad)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-[10px] gap-1 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white h-7 px-2.5"
            onClick={() => onPrint?.(ad)}
          >
            <Printer className="w-3 h-3" />
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-[10px] gap-1 text-rose-600 border-rose-500/20 hover:bg-rose-500 hover:text-white h-7 px-2.5"
              onClick={() => onDelete(ad)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main AdMap Component
// ────────────────────────────────────────────────────────────────
export function AdMap({
  ads = [],
  interactive = true,
  className = "",
  onAdView,
  onAdEdit,
  onAdPrint,
  onAdDelete,
}: AdMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"street" | "satellite" | "hybrid" | "dark_blue">("street");
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validAds = useMemo(() => {
    if (!ads || !Array.isArray(ads)) return [];
    return ads.filter((ad) => ad?.latitude && ad?.longitude);
  }, [ads]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (validAds.length > 0) {
      return [validAds[0].latitude!, validAds[0].longitude!];
    }
    return [35.6892, 51.389];
  }, [validAds]);

  const zoomLevel = validAds.length > 1 ? 12 : 15;
  const currentLayer = TILE_LAYERS[activeLayer];

  // 🆕 بازگشت خودکار به street در صورت خطا در لایه‌های دیگر
  const handleTileError = () => {
    if (activeLayer !== "street") {
      setActiveLayer("street");
    }
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(defaultCenter, zoomLevel);
    }
  };

  if (!isMounted || typeof window === "undefined") {
    return (
      <div
        className={cn(
          "w-full h-full bg-muted/20 animate-pulse flex items-center justify-center rounded-2xl",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">بارگذاری نقشه...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-2xl overflow-hidden bg-card border border-border",
        className
      )}
    >
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={zoomLevel}
        className="w-full h-full"
        zoomControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        attributionControl={false}
        style={{ zIndex: 1 }}
      >
        <TileLayer
          key={activeLayer}
          url={currentLayer.url}
          attribution={currentLayer.attribution}
          maxZoom={19}
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />

        {validAds.map((ad) => {
          const isVip = ad.isVip || false;
          const markerIcon = createCustomMarker(isVip);

          return (
            <Marker
              key={ad._id}
              position={[ad.latitude!, ad.longitude!]}
              icon={markerIcon}
            >
              <Popup className="custom-popup" closeButton={false}>
                <MapPopupCard
                  ad={ad}
                  onView={onAdView}
                  onEdit={onAdEdit}
                  onPrint={onAdPrint}
                  onDelete={onAdDelete}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg">
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button
              key={key}
              onClick={() => setActiveLayer(key as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium",
                activeLayer === key
                  ? "bg-primary text-white shadow-md"
                  : "hover:bg-muted text-muted-foreground"
              )}
              title={layer.name}
            >
              <layer.icon className="w-3.5 h-3.5" />
              <span>{layer.name}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="bg-card/90 backdrop-blur-sm border-border rounded-xl shadow-lg hover:bg-muted gap-1.5 text-xs font-medium"
          onClick={handleRecenter}
          title="بازگشت به مرکز"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          مرکز
        </Button>
      </div>

      {validAds.length > 0 && (
        <div className="absolute top-3 right-3 z-20 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 text-xs shadow-lg flex items-center gap-1.5">
          <span className="font-black text-primary">
            {validAds.length.toLocaleString("en-US")}
          </span>
          <span className="text-muted-foreground">آگهی روی نقشه</span>
        </div>
      )}

      {validAds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-[2px] z-10 rounded-2xl">
          <div className="text-center p-6 max-w-xs">
            <div className="w-16 h-16 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
              <Map className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">
              هیچ آگهی با موقعیت مکانی یافت نشد
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              برای نمایش روی نقشه، آگهی‌ها باید دارای مختصات جغرافیایی باشند.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdMap;