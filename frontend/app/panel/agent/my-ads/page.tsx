// app/panel/agent/my-ads/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  Edit,
  Trash2,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  Loader2,
  RefreshCw,
  MapPin,
  Calendar,
  X,
  SortDesc,
  SortAsc,
  TrendingUp,
  DollarSign,
  Printer,
  Download,
  Map,
  List,
  Filter,
  Layers,
  Satellite,
  Map as MapIcon,
  Maximize2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "@/services/api/client";
import { getImageUrl, cn } from "@/lib/utils";
import { PROVINCES, CITIES } from "@/lib/iranLocations";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/colors/red.css";
import { printBulkAds, printSingleAd, mapBackendAdToPrintAd } from "@/lib/printAds";
import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════
// IMPORT AD CARD COMPONENTS
// ═══════════════════════════════════════════════════════════════
import {
  AdList,
  AdPopupCard,
  AdStatusBadge,
  type AdCardData,
} from "@/components/ad/AdCard";

// --- کامپوننت نقشه ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── رفع آیکون Leaflet ───
const fixMarkerIcon = () => {
  if (typeof window !== "undefined") {
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
  }
};
fixMarkerIcon();

// ─── تایلرهای نقشه ───
const TILE_LAYERS = {
  street: {
    name: "خیابانی",
    icon: MapIcon,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    name: "ماهواره‌ای",
    icon: Satellite,
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
  },
  hybrid: {
    name: "ترکیبی",
    icon: Layers,
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
  },
};

// ─── آیکون سفارشی نارنجی ───
const createCustomIcon = (isVip: boolean = false) => {
  const color = isVip ? "#F59E0B" : "#F97316";
  const glowColor = isVip ? "rgba(245,158,11,0.5)" : "rgba(249,115,22,0.5)";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:46px;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          background: linear-gradient(135deg, ${color}, ${isVip ? '#D97706' : '#EA580C'});
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow: 0 3px 12px ${glowColor}, 0 2px 6px rgba(0,0,0,0.12);
          border:2px solid #fff;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="transform:rotate(45deg);">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="white" fill-opacity="0.95"/>
            <circle cx="12" cy="10" r="3" fill="${color}"/>
            ${isVip ? `<circle cx="12" cy="10" r="1.5" fill="white" opacity="0.8"/>` : ''}
          </svg>
        </div>
        <div style="
          position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
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

// ─── کامپوننت تغییر مرکز نقشه ───
function ChangeMapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && map) {
      map.setView(center, map.getZoom(), { animate: true });
      setTimeout(() => {
        try { map.invalidateSize({ animate: false }); } catch {}
      }, 200);
    }
  }, [center, map]);
  return null;
}

// ─── Helpers ───
const formatPrice = (price: number) => {
  if (!price || price === 0) return "توافقی";
  return price.toLocaleString("en-US") + " تومان";
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// ─── تبدیل Property به AdCardData ───
const mapPropertyToAdCardData = (property: any): AdCardData => {
  return {
    _id: property._id,
    title: property.title || "",
    price: property.price || 0,
    city: property.city || "",
    province: property.province || "",
    district: property.district || "",
    neighborhood: property.address || property.neighborhood || "",
    status: property.status || "pending",
    views: property.views || 0,
    createdAt: property.createdAt || new Date().toISOString(),
    isVip: property.isVip || false,
    images: property.images || [],
    latitude: property.latitude,
    longitude: property.longitude,
    area: property.area,
    rooms: property.rooms,
    hasElevator: property.hasElevator,
    hasParking: property.hasParking,
    hasStorage: property.hasStorage,
    hasBalcony: property.hasBalcony,
    hasYard: property.hasYard,
  };
};

// ═══════════════════════════════════════════════════════════════
// مودال فیلتر پیشرفته
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// مودال فیلتر پیشرفته (نسخه نهایی با رفع کامل تاریخ)
// ═══════════════════════════════════════════════════════════════

function AdvancedFilterModal({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onReset,
  availableCities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onReset: () => void;
  availableCities: typeof CITIES;
}) {
  const [showCustomDate, setShowCustomDate] = useState(filters.dateRange === "custom");

  const setQuickDate = (range: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    let start: Date | null = null,
      end: Date | null = null;
    switch (range) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = new Date(y);
        start.setHours(0, 0, 0, 0);
        end = new Date(y);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "week": {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        start = new Date(w);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "month": {
        const m = new Date(now);
        m.setMonth(m.getMonth() - 1);
        start = new Date(m);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }
    onFilterChange("dateRange", range);
    onFilterChange("startDate", start);
    onFilterChange("endDate", end);
    setShowCustomDate(false);
  };

  const handleCustomDateToggle = () => {
    setShowCustomDate(!showCustomDate);
    if (!showCustomDate) {
      onFilterChange("dateRange", "custom");
    } else {
      onFilterChange("dateRange", "all");
      onFilterChange("startDate", null);
      onFilterChange("endDate", null);
    }
  };

  const AMENITIES = [
    { key: "hasElevator", label: "آسانسور" },
    { key: "hasParking", label: "پارکینگ" },
    { key: "hasStorage", label: "انباری" },
    { key: "hasBalcony", label: "بالکن" },
    { key: "hasYard", label: "حیاط" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible rounded-2xl p-0 gap-0 bg-card border-border shadow-2xl">
        <DialogHeader className="sticky top-0 z-10 px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              فیلتر پیشرفته
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-visible">
          {/* ─── جستجو ─── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-bold">جستجو</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجو در عنوان، شهر، آدرس..."
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
                className="pr-10 rounded-xl h-10 bg-muted/40 border-border/60 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* ─── استان، شهر، وضعیت ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">استان</Label>
              <Select
                value={filters.province}
                onValueChange={(val) => onFilterChange("province", val)}
              >
                <SelectTrigger className="rounded-xl h-10 bg-muted/40 border-border/60">
                  <SelectValue placeholder="همه استان‌ها" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">همه استان‌ها</SelectItem>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">شهر</Label>
              <Select
                value={filters.city}
                onValueChange={(val) => onFilterChange("city", val)}
              >
                <SelectTrigger className="rounded-xl h-10 bg-muted/40 border-border/60">
                  <SelectValue placeholder="همه شهرها" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">همه شهرها</SelectItem>
                  {availableCities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-bold">وضعیت</Label>
              <Select
                value={filters.status}
                onValueChange={(val) => onFilterChange("status", val)}
              >
                <SelectTrigger className="rounded-xl h-10 bg-muted/40 border-border/60">
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="pending">در انتظار</SelectItem>
                  <SelectItem value="sold">فروخته شده</SelectItem>
                  <SelectItem value="expired">منقضی شده</SelectItem>
                  <SelectItem value="rejected">رد شده</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─── قیمت ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">حداقل قیمت</Label>
              <Input
                type="number"
                placeholder="۰"
                value={filters.minPrice}
                onChange={(e) =>
                  onFilterChange("minPrice", e.target.value ? Number(e.target.value) : "")
                }
                className="rounded-xl h-10 bg-muted/40 border-border/60 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-bold">حداکثر قیمت</Label>
              <Input
                type="number"
                placeholder="۱,۰۰۰,۰۰۰"
                value={filters.maxPrice}
                onChange={(e) =>
                  onFilterChange("maxPrice", e.target.value ? Number(e.target.value) : "")
                }
                className="rounded-xl h-10 bg-muted/40 border-border/60 focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* ─── تاریخ (اصلاح‌شده) ─── */}
          <div className="space-y-3 relative" style={{ zIndex: 99999 }}>
            <Label className="text-sm font-bold">بازهٔ زمانی</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filters.dateRange === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickDate("today")}
                className="h-8 rounded-xl text-xs font-bold"
              >
                امروز
              </Button>
              <Button
                variant={filters.dateRange === "yesterday" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickDate("yesterday")}
                className="h-8 rounded-xl text-xs font-bold"
              >
                دیروز
              </Button>
              <Button
                variant={filters.dateRange === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickDate("week")}
                className="h-8 rounded-xl text-xs font-bold"
              >
                هفته گذشته
              </Button>
              <Button
                variant={filters.dateRange === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickDate("month")}
                className="h-8 rounded-xl text-xs font-bold"
              >
                ماه گذشته
              </Button>
              <Button
                variant={showCustomDate ? "default" : "outline"}
                size="sm"
                onClick={handleCustomDateToggle}
                className="h-8 rounded-xl text-xs font-bold"
              >
                {showCustomDate ? "لغو" : "دلخواه"}
              </Button>
            </div>

            {showCustomDate && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {/* @ts-ignore */}
<DatePicker
  calendar={persian}
  locale={persian_fa}
  value={filters.startDate}
  onChange={(date) => onFilterChange("startDate", date?.toDate() || null)}
  placeholder="از تاریخ"
  className="red"
  inputClass="w-[140px] rounded-xl border border-border/40 h-9 px-3 text-sm bg-background"
  containerStyle={{ zIndex: 99999, position: "relative" }}
/>
                <span className="text-muted-foreground text-sm">تا</span>
           <DatePicker
  calendar={persian}
  locale={persian_fa}
  value={filters.startDate}
  onChange={(date) => onFilterChange("startDate", date?.toDate() || null)}
  placeholder="از تاریخ"
  className="red"
  inputClass="w-[140px] rounded-xl border border-border/40 h-9 px-3 text-sm bg-background"
  containerStyle={{ zIndex: 99999, position: "relative" }}
/>
              </div>
            )}
          </div>

          {/* ─── امکانات ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">امکانات رفاهی</Label>
            <div className="flex flex-wrap items-center gap-3">
              {AMENITIES.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`filter-${key}`}
                    checked={filters[key as keyof Pick<FilterState, typeof key>] as boolean}
                    onCheckedChange={(checked) => onFilterChange(key, !!checked)}
                  />
                  <Label htmlFor={`filter-${key}`} className="text-xs font-medium cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* ─── دکمه‌ها ─── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              onClick={onReset}
              className="gap-2 rounded-xl h-10 order-2 sm:order-1"
            >
              <X className="w-4 h-4" />
              حذف همه فیلترها
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="gap-2 rounded-xl h-10 font-bold shadow-md shadow-primary/20 order-1 sm:order-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              اعمال فیلتر
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ═══════════════════════════════════════════════════════════════
// مودال بزرگ‌نمایی نقشه (۳۰٪ لیست + ۷۰٪ نقشه)
// ═══════════════════════════════════════════════════════════════
function FullscreenMapModal({
  open,
  onOpenChange,
  ads,
  center,
  zoom,
  onPrintSingle,
  onEditAd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ads: AdCardData[];
  center: [number, number];
  zoom: number;
  onPrintSingle: (ad: AdCardData) => void;
  onEditAd: (ad: AdCardData) => void;
}) {
  const [activeLayer, setActiveLayer] = useState<"street" | "satellite" | "hybrid">("street");
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<any>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validAds = ads.filter((ad) => ad.latitude && ad.longitude);
  const currentLayer = TILE_LAYERS[activeLayer];

  const focusOnAd = (ad: AdCardData) => {
    if (mapRef.current && ad.latitude && ad.longitude) {
      mapRef.current.setView([ad.latitude, ad.longitude], 16, { animate: true });
      setSelectedAdId(ad._id);
    }
  };

  if (!isMounted || typeof window === "undefined") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm transition-all duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className={`absolute inset-4 md:inset-6 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden transition-all duration-300 ${
          open ? "scale-100" : "scale-95"
        }`}
        dir="rtl"
      >
        {/* هدر */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm text-foreground">
              {validAds.length} آگهی روی نقشه
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* بدنه: لیست (۳۰%) + نقشه (۷۰%) */}
        <div className="flex flex-row h-[calc(100%-52px)]">
          {/* لیست - ۳۰% */}
          <div className="w-[30%] border-l border-border bg-card/50 overflow-y-auto p-2 custom-scrollbar">
            <AdList
              ads={validAds}
              variant="compact"
              selectedId={selectedAdId}
              onFocus={(ad) => focusOnAd(ad)}
              onView={(ad) => window.location.href = `/ad/${ad._id}`}
              onEdit={(ad) => onEditAd(ad)}
              onPrint={(ad) => onPrintSingle(ad)}
              className="space-y-2"
            />
          </div>

          {/* نقشه - ۷۰% */}
          <div className="w-[70%] relative bg-muted/20">
            <MapContainer
              ref={mapRef}
              center={center}
              zoom={zoom}
              className="w-full h-full"
              zoomControl={true}
              scrollWheelZoom={true}
              dragging={true}
              attributionControl={false}
              style={{ zIndex: 1 }}
            >
              <TileLayer
                key={activeLayer}
                url={currentLayer.url}
                attribution={currentLayer.attribution}
                maxZoom={19}
              />
              <ChangeMapCenter center={center} />

              {validAds.map((ad) => {
                const isVip = ad.isVip || false;
                const markerIcon = createCustomIcon(isVip);
                return (
                  <Marker
                    key={ad._id}
                    position={[ad.latitude!, ad.longitude!]}
                    icon={markerIcon}
                  >
                    <Popup className="custom-popup" closeButton={false}>
                      <AdPopupCard
                        ad={ad}
                        onView={() => window.location.href = `/ad/${ad._id}`}
                        onEdit={() => onEditAd(ad)}
                        onPrint={() => onPrintSingle(ad)}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* کنترل‌های لایه نقشه */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
              <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg">
                {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                  <button
                    key={key}
                    onClick={() => setActiveLayer(key as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                      activeLayer === key
                        ? "bg-primary text-white shadow-md"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                    title={layer.name}
                  >
                    <layer.icon className="w-3.5 h-3.5" />
                    <span>{layer.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// کامپوننت اصلی نقشه
// ═══════════════════════════════════════════════════════════════
function AdMapComponent({
  ads,
  onPrintSingle,
  onEditAd,
}: {
  ads: AdCardData[];
  onPrintSingle: (ad: AdCardData) => void;
  onEditAd: (ad: AdCardData) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"street" | "satellite" | "hybrid">("street");
  const [modalOpen, setModalOpen] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const defaultCenter: [number, number] = [35.6892, 51.389];
  const hasCoords = ads.some((a) => a.latitude && a.longitude);
  const center: [number, number] = hasCoords
    ? [
        ads.find((a) => a.latitude && a.longitude)!.latitude!,
        ads.find((a) => a.latitude && a.longitude)!.longitude!,
      ]
    : defaultCenter;

  const zoomLevel = hasCoords ? 13 : 6;
  const currentTile = TILE_LAYERS[activeLayer];

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoomLevel);
    }
  };

  if (!isMounted || typeof window === "undefined") {
    return <div className="w-full h-full bg-muted/20 animate-pulse rounded-2xl" />;
  }

  const validAds = ads.filter((a) => a.latitude && a.longitude);

  return (
    <>
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-card border border-border">
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={zoomLevel}
          className="w-full h-full"
          zoomControl={true}
          scrollWheelZoom={true}
          attributionControl={false}
          style={{ zIndex: 1 }}
        >
          <TileLayer
            key={activeLayer}
            url={currentTile.url}
            attribution={currentTile.attribution}
            maxZoom={19}
          />
          <ChangeMapCenter center={center} />

          {validAds.map((ad) => {
            const isVip = ad.isVip || false;
            const icon = createCustomIcon(isVip);
            return (
              <Marker
                key={ad._id}
                position={[ad.latitude!, ad.longitude!]}
                icon={icon}
              >
                <Popup className="custom-popup" closeButton={false}>
                  <AdPopupCard
                    ad={ad}
                    onView={() => window.location.href = `/ad/${ad._id}`}
                    onEdit={() => onEditAd(ad)}
                    onPrint={() => onPrintSingle(ad)}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* کنترل‌های نقشه */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          <div className="flex flex-col gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg">
            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                  activeLayer === key
                    ? "bg-primary text-white shadow-md"
                    : "hover:bg-muted text-muted-foreground"
                }`}
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

          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg gap-1.5 text-xs font-bold"
            onClick={() => setModalOpen(true)}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            بزرگ‌نمایی
          </Button>
        </div>

        {validAds.length > 0 && (
          <div className="absolute top-3 right-3 z-20 bg-card/90 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 text-xs shadow-md flex items-center gap-1.5">
            <span className="font-black text-primary">{validAds.length.toLocaleString("en-US")}</span>
            <span className="text-muted-foreground">آگهی روی نقشه</span>
          </div>
        )}

        {validAds.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-[2px] z-10 rounded-2xl">
            <div className="text-center p-6 max-w-xs">
              <div className="w-16 h-16 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                <MapIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">هیچ آگهی با موقعیت مکانی یافت نشد</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                برای نمایش روی نقشه، آگهی‌ها باید دارای مختصات جغرافیایی باشند.
              </p>
            </div>
          </div>
        )}
      </div>

      <FullscreenMapModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        ads={ads}
        center={center}
        zoom={zoomLevel}
        onPrintSingle={onPrintSingle}
        onEditAd={onEditAd}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface Ad extends AdCardData {
  priceType?: string;
  district?: string;
  category?: { _id: string; name: string };
}

interface FilterState {
  search: string;
  province: string;
  city: string;
  district: string;
  neighborhood: string;
  status: string;
  dateRange: "today" | "yesterday" | "week" | "month" | "custom" | "all";
  startDate: Date | null;
  endDate: Date | null;
  sortBy: "newest" | "oldest" | "mostViewed" | "highestPrice" | "lowestPrice";
  minPrice: number | "";
  maxPrice: number | "";
  hasElevator: boolean;
  hasParking: boolean;
  hasStorage: boolean;
  hasBalcony: boolean;
  hasYard: boolean;
}

const STATUS_OPTIONS = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "pending", label: "در انتظار" },
  { value: "sold", label: "فروخته شده" },
  { value: "expired", label: "منقضی شده" },
  { value: "rejected", label: "رد شده" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین", icon: SortDesc },
  { value: "oldest", label: "قدیمی‌ترین", icon: SortAsc },
  { value: "mostViewed", label: "پربازدیدترین", icon: TrendingUp },
  { value: "highestPrice", label: "گران‌ترین", icon: DollarSign },
  { value: "lowestPrice", label: "ارزان‌ترین", icon: DollarSign },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AgentMyAds() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // ─── فیلترها ───
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    province: "all",
    city: "all",
    district: "all",
    neighborhood: "all",
    status: "all",
    dateRange: "all",
    startDate: null,
    endDate: null,
    sortBy: "newest",
    minPrice: "",
    maxPrice: "",
    hasElevator: false,
    hasParking: false,
    hasStorage: false,
    hasBalcony: false,
    hasYard: false,
  });

  // ─── شهرهای قابل نمایش ───
  const availableCities = useMemo(() => {
    if (filters.province === "all") return CITIES;
    const province = PROVINCES.find((p) => p.name === filters.province);
    if (!province) return [];
    return CITIES.filter((city) => city.province_id === province.id);
  }, [filters.province]);

  // ─── دریافت آگهی‌ها ───
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.province !== "all") params.province = filters.province;
      if (filters.city !== "all") params.city = filters.city;
      if (filters.district !== "all") params.district = filters.district;
      if (filters.neighborhood !== "all") params.neighborhood = filters.neighborhood;
      if (filters.status !== "all") params.status = filters.status;
      if (filters.dateRange !== "all" && filters.dateRange !== "custom") {
        params.dateRange = filters.dateRange;
      } else if (filters.dateRange === "custom" && filters.startDate && filters.endDate) {
        params.startDate = filters.startDate.toISOString();
        params.endDate = filters.endDate.toISOString();
      }
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.hasElevator) params.hasElevator = true;
      if (filters.hasParking) params.hasParking = true;
      if (filters.hasStorage) params.hasStorage = true;
      if (filters.hasBalcony) params.hasBalcony = true;
      if (filters.hasYard) params.hasYard = true;
      params.sortBy = filters.sortBy;

      const res = await apiClient.get("/ads/my", { params });
      setAds(res.data.data || res.data.ads || []);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error("خطا در دریافت آگهی‌ها");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // ─── تغییر فیلتر ───
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      if (key === "province") {
        newFilters.city = "all";
        newFilters.district = "all";
        newFilters.neighborhood = "all";
      }
      if (key === "city") {
        newFilters.district = "all";
        newFilters.neighborhood = "all";
      }
      if (key === "district") {
        newFilters.neighborhood = "all";
      }
      return newFilters;
    });
  };

  // ─── ریست فیلترها ───
  const resetFilters = () => {
    setFilters({
      search: "",
      province: "all",
      city: "all",
      district: "all",
      neighborhood: "all",
      status: "all",
      dateRange: "all",
      startDate: null,
      endDate: null,
      sortBy: "newest",
      minPrice: "",
      maxPrice: "",
      hasElevator: false,
      hasParking: false,
      hasStorage: false,
      hasBalcony: false,
      hasYard: false,
    });
    setFilterModalOpen(false);
  };

  // ─── حذف ───
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/ads/${deleteId}`);
      toast.success("آگهی حذف شد");
      setAds((prev) => prev.filter((ad) => ad._id !== deleteId));
      setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در حذف");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  // ─── انتخاب همه ───
  const toggleSelectAll = () => {
    if (selectedIds.length === ads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ads.map((a) => a._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // ─── پرینت گروهی ───
  const handlePrintSelected = async () => {
    if (selectedIds.length === 0) {
      toast.warning("حداقل یک آگهی را انتخاب کنید.");
      return;
    }
    const selectedAds = ads.filter((a) => selectedIds.includes(a._id));
    try {
      await printBulkAds(selectedAds.map(mapBackendAdToPrintAd), {
        agencyName: "آژانس املاک شما",
        agentName: "مشاور",
        onProgress: (msg) => toast.info(msg),
      });
    } catch (error) {
      toast.error("خطا در پرینت");
    }
  };

  // ─── پرینت تکی ───
  const handlePrintSingle = async (ad: AdCardData) => {
    try {
      await printSingleAd(mapBackendAdToPrintAd(ad), {
        agencyName: "آژانس املاک شما",
        agentName: "مشاور",
        onProgress: (msg) => toast.info(msg),
      });
    } catch (error) {
      toast.error("خطا در پرینت");
    }
  };

  // ─── ویرایش ───
  const handleEditAd = (ad: AdCardData) => {
    router.push(`/panel/agent/my-ads/edit-ad/${ad._id}`);
  };

  // ─── خروجی اکسل ───
  const handleExportExcel = () => {
    if (ads.length === 0) {
      toast.warning("هیچ آگهی برای خروجی وجود ندارد.");
      return;
    }
    const data = ads.map((ad) => ({
      "عنوان": ad.title,
      "قیمت": formatPrice(ad.price),
      "استان": ad.province || "",
      "شهر": ad.city || "",
      "منطقه": ad.district || "",
      "محله": ad.neighborhood || "",
      "وضعیت": ad.status,
      "بازدید": ad.views,
      "تاریخ ثبت": formatDate(ad.createdAt),
      "متراژ": ad.area || "",
      "تعداد اتاق": ad.rooms || "",
      "آسانسور": ad.hasElevator ? "دارد" : "ندارد",
      "پارکینگ": ad.hasParking ? "دارد" : "ندارد",
      "انباری": ad.hasStorage ? "دارد" : "ندارد",
      "بالکن": ad.hasBalcony ? "دارد" : "ندارد",
      "حیاط": ad.hasYard ? "دارد" : "ندارد",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "آگهی‌ها");
    XLSX.writeFile(wb, `آگهی‌های_آژانس_${new Date().toLocaleDateString("fa-IR")}.xlsx`);
    toast.success("خروجی اکسل دانلود شد.");
  };

  // ─── آمار ───
  const activeAds = ads.filter((a) => a.status === "active").length;
  const totalViews = ads.reduce((sum, a) => sum + (a.views || 0), 0);
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.province !== "all") count++;
    if (filters.city !== "all") count++;
    if (filters.district !== "all") count++;
    if (filters.neighborhood !== "all") count++;
    if (filters.status !== "all") count++;
    if (filters.dateRange !== "all") count++;
    if (filters.sortBy !== "newest") count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.hasElevator) count++;
    if (filters.hasParking) count++;
    if (filters.hasStorage) count++;
    if (filters.hasBalcony) count++;
    if (filters.hasYard) count++;
    return count;
  }, [filters]);

  // ─── تبدیل ads به AdCardData ───
  const adData = useMemo(() => ads.map(mapPropertyToAdCardData), [ads]);

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 px-3 sm:px-6 pb-8"
        dir="rtl"
      >
        {/* ─── HEADER ─── */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">آگهی‌های من</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                مدیریت آگهی‌های ثبت‌شده توسط شما
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAds}
              className="gap-2 rounded-xl border-border/60 hover:bg-muted"
            >
              <RefreshCw className="w-4 h-4" /> بروزرسانی
            </Button>
            <Button
              onClick={() => router.push("/create-ad")}
              className="gap-2 rounded-xl font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
            >
              <PlusCircle className="w-4 h-4" /> ثبت آگهی جدید
            </Button>
          </div>
        </motion.div>

        {/* ─── STATS ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-foreground">{ads.length.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted-foreground font-medium">کل آگهی‌ها</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-emerald-600">{activeAds.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted-foreground font-medium">فعال</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-foreground">{totalViews.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted-foreground font-medium">کل بازدیدها</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-primary">{selectedIds.length.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted-foreground font-medium">انتخاب‌شده</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── نوار فیلتر سریع ─── */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/60 shadow-sm rounded-2xl p-3 bg-card/80 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              {/* جستجو */}
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="جستجو..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pr-10 rounded-xl h-9 text-sm bg-muted/40 border-border/60 focus-visible:ring-primary"
                />
              </div>

              {/* فیلتر وضعیت */}
              <Select
                value={filters.status}
                onValueChange={(val) => handleFilterChange("status", val)}
              >
                <SelectTrigger className="w-[130px] rounded-xl h-9 text-sm border-border/60 bg-muted/40">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* مرتب‌سازی */}
              <Select
                value={filters.sortBy}
                onValueChange={(val) => handleFilterChange("sortBy", val as any)}
              >
                <SelectTrigger className="w-[130px] rounded-xl h-9 text-sm border-border/60 bg-muted/40">
                  <SelectValue placeholder="مرتب‌سازی" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex items-center gap-2">
                        <o.icon className="w-4 h-4" />
                        {o.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* دکمه فیلتر پیشرفته */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterModalOpen(true)}
                className="gap-1.5 rounded-xl h-9 text-sm border-border/60 hover:bg-muted"
              >
                <SlidersHorizontal className="w-4 h-4" />
                فیلتر
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {/* دکمه‌های عملیات گروهی */}
              <div className="flex items-center gap-1 mr-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="rounded-xl h-9 text-xs"
                >
                  {selectedIds.length === ads.length ? "لغو همه" : "انتخاب همه"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintSelected}
                  disabled={selectedIds.length === 0}
                  className="rounded-xl h-9 text-xs gap-1"
                >
                  <Printer className="w-4 h-4" /> پرینت
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="rounded-xl h-9 text-xs gap-1"
                >
                  <Download className="w-4 h-4" /> اکسل
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-xl h-9 text-xs gap-1"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className="rounded-xl h-9 text-xs gap-1"
                >
                  <MapIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ─── CONTENT ─── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <Card className="border-2 border-dashed border-border/60 bg-muted/20 rounded-2xl">
            <CardContent className="py-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center rounded-full text-muted-foreground/70">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-foreground mb-1.5">
                هنوز هیچ آگهی‌ای ثبت نکرده‌اید
              </h3>
              <p className="text-muted-foreground text-xs font-medium mb-5">
                اولین آگهی خود را ثبت کنید
              </p>
              <Button
                onClick={() => router.push("/create-ad")}
                className="gap-2 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white"
              >
                <PlusCircle className="w-4 h-4" /> ثبت اولین آگهی
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "map" ? (
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden h-[500px] p-0">
            <AdMapComponent
              ads={adData}
              onPrintSingle={handlePrintSingle}
              onEditAd={handleEditAd}
            />
          </Card>
        ) : (
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
            {/* ─── دسکتاپ: جدول ─── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40">
                    <th className="p-4 w-8">
                      <Checkbox
                        checked={selectedIds.length === ads.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      آگهی
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      قیمت
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      استان
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      شهر
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      محله
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      وضعیت
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      بازدید
                    </th>
                    <th className="text-right text-xs font-bold text-muted-foreground p-4">
                      تاریخ
                    </th>
                    <th className="text-center text-xs font-bold text-muted-foreground p-4">
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => (
                    <tr
                      key={ad._id}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selectedIds.includes(ad._id)}
                          onCheckedChange={() => toggleSelect(ad._id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(ad.images?.[0])}
                            alt={ad.title}
                            className="w-10 h-10 rounded-lg object-cover border border-border/30 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/user.webp";
                            }}
                          />
                          <Link
                            href={`/ad/${ad._id}`}
                            className="font-bold text-sm hover:text-primary transition-colors line-clamp-1"
                          >
                            {ad.title}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold">
                        {formatPrice(ad.price)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {ad.province || "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {ad.city || "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {ad.neighborhood || "—"}
                      </td>
                      <td className="p-4">
                        <AdStatusBadge status={ad.status} />
                      </td>
                      <td className="p-4 text-sm">
                        {ad.views.toLocaleString("en-US")}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(ad.createdAt)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1"
                            onClick={() => router.push(`/ad/${ad._id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                            onClick={() => handleEditAd(ad)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white"
                            onClick={() => handlePrintSingle(ad)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs gap-1 text-rose-500 border-rose-500/20 hover:bg-rose-600 hover:text-white"
                            onClick={() => setDeleteId(ad._id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── موبایل: لیست کارتی ─── */}
            <div className="md:hidden divide-y divide-border/40">
              <AdList
                ads={adData}
                variant="compact"
                onView={(ad) => router.push(`/ad/${ad._id}`)}
                onEdit={(ad) => router.push(`/panel/agent/my-ads/edit-ad/${ad._id}`)}
                onPrint={handlePrintSingle}
                onDelete={(ad) => setDeleteId(ad._id)}
                className="p-2"
              />
            </div>
          </Card>
        )}

        {/* ─── دیالوگ حذف ─── */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="rounded-2xl max-w-[90vw] sm:max-w-md" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-destructive">
                حذف آگهی
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                آیا از حذف کامل این آگهی اطمینان دارید؟ این عمل قابل بازگشت نیست.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <AlertDialogCancel className="rounded-xl text-sm font-bold">
                انصراف
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-rose-500 hover:bg-rose-600 rounded-xl text-sm font-bold text-white gap-1"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>

      {/* ─── مودال فیلتر پیشرفته ─── */}
      <AdvancedFilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        availableCities={availableCities}
      />
    </>
  );
}