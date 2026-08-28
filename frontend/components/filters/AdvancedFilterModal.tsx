"use client";

import { useState, useEffect, useRef, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Filter,
  X,
  SlidersHorizontal,
  Building2,
  Layers,
  ShoppingBag,
  ArrowUpDown,
  Eye,
  Clock,
  Home,
  Car,
  Wrench,
  Briefcase,
  Tag,
  RefreshCw,
  Check,
  ImageIcon,
  Zap,
  ShieldCheck,
  BedDouble,
  Maximize2,
  Building,
  Trees,
  Warehouse,
  Waves,
  MapPin,
  Hammer,
  LandPlot,
  Store,
  ShowerHead,
  LayoutGrid,
  Layers2,
  TreePine,
  Castle,
  Hotel,
  DoorOpen,
  Ruler,
  CalendarDays,
  Frame,
  Gem,
  Heart,
} from "lucide-react";
import { Category } from "@/services/api/category.api";
import { Province, City, locationApi } from "@/services/api/location.api";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface AdvancedFilters {
  category?: string;
  province?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  adType?: string;
  propertyType?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  q?: string;

  minArea?: number;
  maxArea?: number;
  rooms?: string;
  floor?: string;
  floorCount?: string;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  documentType?: string;
  usage?: string;

  hasElevator?: boolean;
  hasParking?: boolean;
  hasStorage?: boolean;
  hasBalcony?: boolean;
  hasYard?: boolean;

  heatingSystem?: string;
  coolingSystem?: string;
  flooring?: string;
  buildingFacade?: string;

  landWidth?: number;
  landLength?: number;
  landUsage?: string;

  officeType?: string;

  hasPool?: boolean;
  hasSauna?: boolean;

  hasImage?: boolean;
  isUrgent?: boolean;
  isVerified?: boolean;
}

interface AdvancedFilterModalProps {
  categories: Category[];
  provinces: Province[];
  priceRange: { min: number; max: number };
  currentFilters: Partial<AdvancedFilters>;
  activeFiltersCount: number;
  onApply: (filters: AdvancedFilters) => void;
  clearFilters: () => void;
}

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const PROPERTY_TYPES = [
  { value: "apartment", label: "آپارتمان", icon: Building },
  { value: "villa", label: "ویلایی", icon: TreePine },
  { value: "house", label: "خانه حیاط‌دار", icon: Home },
  { value: "land", label: "زمین", icon: LandPlot },
  { value: "suite", label: "سوئیت / استودیو", icon: DoorOpen },
  { value: "office", label: "دفتر اداری", icon: Briefcase },
  { value: "commercial", label: "مغازه تجاری", icon: Store },
  { value: "bare_land", label: "کلنگی", icon: Hammer },
  { value: "penthouse", label: "پنت‌هاوس", icon: Castle },
  { value: "duplex", label: "دوبلکس", icon: Layers2 },
  { value: "garden", label: "باغ", icon: Trees },
  { value: "hotel", label: "مهمان‌پذیر", icon: Hotel },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین", icon: Clock },
  { value: "oldest", label: "قدیمی‌ترین", icon: ArrowUpDown },
  { value: "price_asc", label: "ارزان‌ترین", icon: ShoppingBag },
  { value: "price_desc", label: "گران‌ترین", icon: Gem },
  { value: "most_viewed", label: "پربازدیدترین", icon: Eye },
  { value: "popular", label: "محبوب‌ترین", icon: Heart },
];

const AD_TYPES = [
  { value: "", label: "همه نوع" },
  { value: "sale", label: "فروش" },
  { value: "rent", label: "اجاره" },
  { value: "mortgage", label: "رهن و اجاره" },
  { value: "presale", label: "پیش‌فروش" },
  { value: "exchange", label: "معاوضه" },
  { value: "daily_rent", label: "اجاره روزانه" },
  { value: "construction", label: "مشارکت در ساخت" },
];

const ROOMS_OPTIONS = [
  { value: "0", label: "بدون اتاق" },
  { value: "1", label: "۱ اتاق" },
  { value: "2", label: "۲ اتاق" },
  { value: "3", label: "۳ اتاق" },
  { value: "4", label: "۴ اتاق" },
  { value: "5", label: "۵ به بالا" },
];

const FLOOR_OPTIONS = [
  { value: "1", label: "همکف" },
  { value: "2", label: "طبقه ۱" },
  { value: "3", label: "طبقه ۲" },
  { value: "4", label: "طبقه ۳" },
  { value: "5", label: "طبقه ۴" },
  { value: "6", label: "طبقه ۵" },
  { value: "7", label: "طبقه ۶ و بالاتر" },
  { value: "-1", label: "زیرزمین" },
  { value: "-2", label: "پیلوت" },
];

const TOTAL_FLOORS_OPTIONS = [
  { value: "1", label: "۱ طبقه" },
  { value: "2", label: "۲ طبقه" },
  { value: "3", label: "۳ طبقه" },
  { value: "4", label: "۴ طبقه" },
  { value: "5", label: "۵ طبقه" },
  { value: "6", label: "۶ طبقه" },
  { value: "7", label: "۷ طبقه و بالاتر" },
];

const DOCUMENT_TYPES = [
  { value: "sheshdang", label: "شش‌دانگ" },
  { value: "pendang", label: "پنج‌دانگ" },
  { value: "mangulehdar", label: "منگوله‌دار" },
  { value: "tasfiyeh", label: "تسویه" },
  { value: "ghabz", label: "قبض" },
  { value: "other", label: "سایر" },
];

const USAGE_TYPES = [
  { value: "maskani", label: "مسکونی" },
  { value: "tejarati", label: "تجاری" },
  { value: "edari", label: "اداری" },
  { value: "sanati", label: "صنعتی" },
  { value: "amozeshi", label: "آموزشی" },
  { value: "behdashti", label: "بهداشتی" },
  { value: "vardaneshi", label: "ورزشی" },
  { value: "other", label: "سایر" },
];

const HEATING_SYSTEMS = [
  { value: "shoofazh", label: "شوفاژ" },
  { value: "pakage", label: "پکیج" },
  { value: "dastgah_markazi", label: "دایرکت مرکزی" },
  { value: "heater", label: "هیتر" },
  { value: "adeghi", label: "آذرخش" },
  { value: "other", label: "سایر" },
];

const COOLING_SYSTEMS = [
  { value: "kooler_aby", label: "کولر آبی" },
  { value: "kooler_gazi", label: "کولر گازی" },
  { value: "split", label: "اسپلیت" },
  { value: "chiller", label: "چیلر" },
  { value: "fancoil", label: "فن‌کوئل" },
  { value: "other", label: "سایر" },
];

const FLOORING_TYPES = [
  { value: "ceramic", label: "سرامیک" },
  { value: "parket", label: "پارکت" },
  { value: "moquet", label: "موکت" },
  { value: "sang", label: "سنگ" },
  { value: "laminet", label: "لمینت" },
  { value: "epoxy", label: "اپوکسی" },
  { value: "other", label: "سایر" },
];

const FACADE_TYPES = [
  { value: "sangi", label: "سنگی" },
  { value: "ajori", label: "آجری" },
  { value: "simani", label: "سیمانی" },
  { value: "composite", label: "کامپوزیت" },
  { value: "choobi", label: "چوبی" },
  { value: "sheishei", label: "شیشه‌ای" },
  { value: "other", label: "سایر" },
];

const LAND_DOC_TYPES = [
  { value: "sheshdang", label: "شش‌دانگ" },
  { value: "pendang", label: "پنج‌دانگ" },
  { value: "mangulehdar", label: "منگوله‌دار" },
  { value: "ghalb_asasi", label: "قالب حکیم‌آباد" },
  { value: "ghalb_talaq", label: "قالب طلق" },
  { value: "tasfiyeh", label: "تسویه" },
  { value: "other", label: "سایر" },
];

const LAND_USAGE_TYPES = [
  { value: "maskani", label: "مسکونی" },
  { value: "keshavarzi", label: "کشاورزی" },
  { value: "sanati", label: "صنعتی" },
  { value: "tejarati", label: "تجاری" },
  { value: "bagh", label: "باغ" },
  { value: "other", label: "سایر" },
];

const OFFICE_TYPES = [
  { value: "mustaqel", label: "مستقل" },
  { value: "tabaghei", label: "طبقه‌ای" },
  { value: "majmooe_edari", label: "مجتمع اداری" },
  { value: "pasaazh", label: "پاساژ" },
  { value: "bazar_sanati", label: "بازار سنتی" },
  { value: "other", label: "سایر" },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toPersianNum = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);

const parseNum = (s: string): number =>
  parseInt(
    s
      .replace(/[,،٫]/g, "")
      .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))),
  ) || 0;

const formatPriceShort = (v: number): string => {
  if (v >= 1_000_000_000)
    return `${toPersianNum(Math.round(v / 1_000_000_000))} میلیارد`;
  if (v >= 1_000_000)
    return `${toPersianNum(Math.round(v / 1_000_000))} میلیون`;
  if (v >= 1_000) return `${toPersianNum(Math.round(v / 1_000))} هزار`;
  return toPersianNum(v);
};

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS (OUTSIDE MAIN COMPONENT FOR PERFORMANCE)
   ═══════════════════════════════════════════════════════════════════ */

function ChipButton({
  label,
  icon: Icon,
  selected,
  onClick,
  className = "",
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200 active:scale-95 whitespace-nowrap ${
        selected
          ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label}</span>
      {selected && <Check className="w-3 h-3 shrink-0" />}
    </button>
  );
}

function ToggleRow({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2.5 px-1 cursor-pointer group rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className={`p-1.5 rounded-lg transition-colors ${checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <span
          className={`text-xs font-medium transition-colors ${checked ? "text-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </label>
  );
}

function DualInput({
  label,
  icon: Icon,
  minPlaceholder,
  maxPlaceholder,
  minSuffix,
  maxSuffix,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  minSuffix?: string;
  maxSuffix?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <Label className="text-[11px] text-muted-foreground font-medium">
          {label}
        </Label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Input
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder={minPlaceholder || "از"}
            className="h-9 text-center text-xs rounded-xl pl-8 bg-muted/20 border-border"
          />
          {minSuffix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
              {minSuffix}
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder={maxPlaceholder || "تا"}
            className="h-9 text-center text-xs rounded-xl pl-8 bg-muted/20 border-border"
          />
          {maxSuffix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
              {maxSuffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionIcon({
  icon: Icon,
  label,
  badge,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
      <span className="text-xs font-bold">{label}</span>
      {badge && (
        <Badge
          variant="secondary"
          className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-transparent"
        >
          {badge}
        </Badge>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PRICE RANGE SLIDER
   ═══════════════════════════════════════════════════════════════════ */

interface PriceRangeSliderProps {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (val: number) => void;
  onChangeMax: (val: number) => void;
  formatLabel?: (val: number) => string;
}

function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
}: PriceRangeSliderProps) {
  const safeMax = max > min ? max : min + 1;
  const minPercent = Math.max(
    0,
    Math.min(100, ((valueMin - min) / (safeMax - min)) * 100),
  );
  const maxPercent = Math.max(
    0,
    Math.min(100, ((valueMax - min) / (safeMax - min)) * 100),
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full h-2 bg-muted rounded-full my-4">
        <div
          className="absolute h-full bg-primary rounded-full transition-all duration-75"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={safeMax}
          value={valueMin}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val <= valueMax) onChangeMin(val);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer z-10"
          dir="ltr"
        />
        <input
          type="range"
          min={min}
          max={safeMax}
          value={valueMax}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= valueMin) onChangeMax(val);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer z-20"
          dir="ltr"
        />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1">
          <span className="text-muted-foreground block mb-1">
            از قیمت (تومان)
          </span>
          <Input
            type="number"
            value={valueMin}
            onChange={(e) => onChangeMin(Number(e.target.value))}
            className="h-8 text-xs font-mono"
          />
        </div>
        <span className="text-muted-foreground mt-4">-</span>
        <div className="flex-1">
          <span className="text-muted-foreground block mb-1">
            تا قیمت (تومان)
          </span>
          <Input
            type="number"
            value={valueMax}
            onChange={(e) => onChangeMax(Number(e.target.value))}
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function AdvancedFilterModal({
  categories,
  provinces,
  priceRange,
  currentFilters,
  activeFiltersCount,
  onApply,
  clearFilters,
}: AdvancedFilterModalProps) {
  const [draft, setDraft] = useState<AdvancedFilters>({
    ...currentFilters,
  });
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [minAreaStr, setMinAreaStr] = useState("");
  const [maxAreaStr, setMaxAreaStr] = useState("");
  const [minYearStr, setMinYearStr] = useState("");
  const [maxYearStr, setMaxYearStr] = useState("");

  const priceTypingRef = useRef(false);
  const areaTypingRef = useRef(false);
  const yearTypingRef = useRef(false);

  useEffect(() => {
    if (
      priceTypingRef.current ||
      areaTypingRef.current ||
      yearTypingRef.current
    )
      return;

    setDraft({ ...currentFilters });

    if (currentFilters.minArea) setMinAreaStr(String(currentFilters.minArea));
    else setMinAreaStr("");
    if (currentFilters.maxArea) setMaxAreaStr(String(currentFilters.maxArea));
    else setMaxAreaStr("");

    if (currentFilters.minYearBuilt)
      setMinYearStr(String(currentFilters.minYearBuilt));
    else setMinYearStr("");
    if (currentFilters.maxYearBuilt)
      setMaxYearStr(String(currentFilters.maxYearBuilt));
    else setMaxYearStr("");
  }, [currentFilters]);

  useEffect(() => {
    if (!draft.province || draft.province === "all") {
      setCities([]);
      return;
    }
    setCitiesLoading(true);
    locationApi
      .getCitiesByProvince(draft.province)
      .then((data) => setCities(data || []))
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setCities([]);
      })
      .finally(() => setCitiesLoading(false));
  }, [draft.province]);

  const selectedPropertyType = draft.propertyType || "";
  const isLand =
    selectedPropertyType === "land" || selectedPropertyType === "garden";
  const isVilla =
    selectedPropertyType === "villa" || selectedPropertyType === "house";
  const isCommercial =
    selectedPropertyType === "commercial" || selectedPropertyType === "office";

  const updateDraft = (patch: Partial<AdvancedFilters>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const handleApply = () => {
    const clean: AdvancedFilters = { ...draft };

    // پاک‌سازی فیلدهای خالی
    Object.keys(clean).forEach((key) => {
      const k = key as keyof AdvancedFilters;
      if (clean[k] === undefined || clean[k] === "") {
        delete clean[k];
      }
    });

    onApply(clean);
    setModalOpen(false);
  };

  const handleClear = () => {
    setDraft({});
    setMinAreaStr("");
    setMaxAreaStr("");
    setMinYearStr("");
    setMaxYearStr("");
    priceTypingRef.current = false;
    areaTypingRef.current = false;
    yearTypingRef.current = false;
    clearFilters();
    setModalOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="rounded-xl gap-2 h-9 border-border text-xs font-bold"
      >
        <Filter className="w-4 h-4 text-primary" />
        فیلتر پیشرفته
        {activeFiltersCount > 0 && (
          <Badge className="rounded-full h-4 min-w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground border-transparent">
            {toPersianNum(activeFiltersCount)}
          </Badge>
        )}
      </Button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 backdrop-blur-md bg-black/40"
            onClick={() => setModalOpen(false)}
          />
          <div
            className="relative z-10 flex flex-col
              w-[95vw] max-w-[700px] max-h-[90vh] sm:max-h-[85vh] lg:max-h-[80vh]
              bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50
              overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div
              className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border/50"
              dir="rtl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-black text-sm sm:text-base text-foreground">
                      فیلتر پیشرفته
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeFiltersCount > 0
                        ? `${toPersianNum(activeFiltersCount)} فیلتر فعال`
                        : "جستجوی دقیق‌تر آگهی‌ها"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">پاک کردن</span>
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-8 w-8 rounded-full flex items-center justify-center
                      bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground
                      transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 sm:px-6 py-3">
              <div className="flex flex-col h-full min-h-0 w-full" dir="rtl">
                <div className="pb-2">
                  <Accordion
                    type="multiple"
                    defaultValue={[
                      "sort",
                      "adType",
                      "propertyType",
                      "location",
                      "price",
                    ]}
                    className="space-y-0"
                  >
                    {/* مرتب‌سازی */}
                    <AccordionItem value="sort" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={ArrowUpDown}
                          label="مرتب‌سازی نتایج"
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          {SORT_OPTIONS.map((opt) => (
                            <ChipButton
                              key={opt.value}
                              label={opt.label}
                              icon={opt.icon}
                              selected={
                                (draft.sortBy || "newest") === opt.value
                              }
                              onClick={() => updateDraft({ sortBy: opt.value })}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* نوع معامله */}
                    <AccordionItem value="adType" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={Tag}
                          label="نوع معامله"
                          badge={
                            draft.adType
                              ? AD_TYPES.find((t) => t.value === draft.adType)
                                  ?.label
                              : undefined
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {AD_TYPES.map((t) => (
                            <ChipButton
                              key={t.value}
                              label={t.label}
                              selected={(draft.adType || "") === t.value}
                              onClick={() =>
                                updateDraft({ adType: t.value || undefined })
                              }
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* نوع ملک */}
                    <AccordionItem value="propertyType" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={Building2}
                          label="نوع ملک"
                          badge={
                            draft.propertyType
                              ? PROPERTY_TYPES.find(
                                  (t) => t.value === draft.propertyType,
                                )?.label
                              : undefined
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                          {PROPERTY_TYPES.map((pt) => {
                            const Icon = pt.icon;
                            return (
                              <ChipButton
                                key={pt.value}
                                label={pt.label}
                                icon={Icon}
                                selected={draft.propertyType === pt.value}
                                onClick={() => {
                                  const newType =
                                    draft.propertyType === pt.value
                                      ? undefined
                                      : pt.value;
                                  updateDraft({ propertyType: newType });
                                }}
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* موقعیت مکانی */}
                    <AccordionItem value="location" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={MapPin}
                          label="موقعیت مکانی"
                          badge={
                            draft.city
                              ? draft.city
                              : draft.province
                                ? provinces.find(
                                    (p) => p._id === draft.province,
                                  )?.name
                                : undefined
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="space-y-3 bg-muted/20 border border-border/50 p-3 rounded-xl">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground font-medium">
                              استان
                            </Label>
                            <Select
                              value={draft.province || "all"}
                              onValueChange={(v) =>
                                updateDraft({
                                  province: v === "all" ? undefined : v,
                                  city: undefined,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border">
                                <SelectValue placeholder="همه استان‌ها" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="all" className="text-xs">
                                  همه استان‌ها
                                </SelectItem>
                                {provinces.map((p) => (
                                  <SelectItem
                                    key={p._id}
                                    value={p._id}
                                    className="text-xs"
                                  >
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground font-medium">
                              شهر
                            </Label>
                            <Select
                              value={draft.city || "all"}
                              onValueChange={(v) =>
                                updateDraft({
                                  city: v === "all" ? undefined : v,
                                })
                              }
                              disabled={!draft.province || citiesLoading}
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs bg-background border-border">
                                <SelectValue
                                  placeholder={
                                    citiesLoading
                                      ? "در حال بارگذاری..."
                                      : draft.province
                                        ? "انتخاب شهر"
                                        : "ابتدا استان را انتخاب کنید"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="all" className="text-xs">
                                  همه شهرها
                                </SelectItem>
                                {cities.map((c) => (
                                  <SelectItem
                                    key={c._id}
                                    value={c.name}
                                    className="text-xs"
                                  >
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* محدوده قیمت */}
                    <AccordionItem value="price" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={ShoppingBag}
                          label="محدوده قیمت"
                          badge={
                            draft.minPrice || draft.maxPrice
                              ? "فعال"
                              : undefined
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <PriceRangeSlider
                          min={priceRange.min}
                          max={priceRange.max}
                          valueMin={draft.minPrice || priceRange.min}
                          valueMax={draft.maxPrice || priceRange.max}
                          onChangeMin={(v) =>
                            updateDraft({
                              minPrice: v === priceRange.min ? undefined : v,
                            })
                          }
                          onChangeMax={(v) =>
                            updateDraft({
                              maxPrice: v === priceRange.max ? undefined : v,
                            })
                          }
                          formatLabel={formatPriceShort}
                        />
                        {draft.minPrice || draft.maxPrice ? (
                          <p className="text-[11px] text-primary font-bold bg-primary/5 rounded-lg py-1.5 text-center mt-2">
                            {draft.minPrice
                              ? `از ${formatPriceShort(draft.minPrice)}`
                              : ""}
                            {draft.minPrice && draft.maxPrice ? " — " : ""}
                            {draft.maxPrice
                              ? `تا ${formatPriceShort(draft.maxPrice)}`
                              : ""}
                            {" تومان"}
                          </p>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* مشخصات ملک */}
                    <AccordionItem value="specs" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon icon={Maximize2} label="مشخصات ملک" />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 space-y-4">
                        <DualInput
                          label="متراژ (متر مربع)"
                          icon={Maximize2}
                          minPlaceholder="از متراژ"
                          maxPlaceholder="تا متراژ"
                          minSuffix="م²"
                          maxSuffix="م²"
                          minValue={minAreaStr}
                          maxValue={maxAreaStr}
                          onMinChange={(v) => {
                            setMinAreaStr(v);
                            areaTypingRef.current = true;
                            const n = parseNum(v);
                            updateDraft({ minArea: n > 0 ? n : undefined });
                          }}
                          onMaxChange={(v) => {
                            setMaxAreaStr(v);
                            areaTypingRef.current = true;
                            const n = parseNum(v);
                            updateDraft({ maxArea: n > 0 ? n : undefined });
                          }}
                        />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <BedDouble className="w-3.5 h-3.5 text-primary" />
                            <Label className="text-[11px] text-muted-foreground font-medium">
                              تعداد اتاق خواب
                            </Label>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ROOMS_OPTIONS.map((r) => (
                              <ChipButton
                                key={r.value}
                                label={r.label}
                                selected={(draft.rooms || "") === r.value}
                                onClick={() =>
                                  updateDraft({
                                    rooms:
                                      draft.rooms === r.value
                                        ? undefined
                                        : r.value,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground font-medium">
                              طبقه واحد
                            </Label>
                            <Select
                              value={draft.floor || "any"}
                              onValueChange={(v) =>
                                updateDraft({
                                  floor: v === "any" ? undefined : v,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                <SelectValue placeholder="مهم نیست" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="any" className="text-xs">
                                  مهم نیست
                                </SelectItem>
                                {FLOOR_OPTIONS.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                    className="text-xs"
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground font-medium">
                              طبقات کل ساختمان
                            </Label>
                            <Select
                              value={draft.floorCount || "any"}
                              onValueChange={(v) =>
                                updateDraft({
                                  floorCount: v === "any" ? undefined : v,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                <SelectValue placeholder="مهم نیست" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="any" className="text-xs">
                                  مهم نیست
                                </SelectItem>
                                {TOTAL_FLOORS_OPTIONS.map((f) => (
                                  <SelectItem
                                    key={f.value}
                                    value={f.value}
                                    className="text-xs"
                                  >
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DualInput
                          label="سال ساخت (شمسی)"
                          icon={CalendarDays}
                          minPlaceholder="از سال"
                          maxPlaceholder="تا سال"
                          minValue={minYearStr}
                          maxValue={maxYearStr}
                          onMinChange={(v) => {
                            setMinYearStr(v);
                            yearTypingRef.current = true;
                            const n = parseNum(v);
                            updateDraft({
                              minYearBuilt: n > 0 ? n : undefined,
                            });
                          }}
                          onMaxChange={(v) => {
                            setMaxYearStr(v);
                            yearTypingRef.current = true;
                            const n = parseNum(v);
                            updateDraft({
                              maxYearBuilt: n > 0 ? n : undefined,
                            });
                          }}
                        />
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            نوع سند
                          </Label>
                          <Select
                            value={draft.documentType || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                documentType: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {DOCUMENT_TYPES.map((d) => (
                                <SelectItem
                                  key={d.value}
                                  value={d.value}
                                  className="text-xs"
                                >
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            کاربری ملک
                          </Label>
                          <Select
                            value={draft.usage || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                usage: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {USAGE_TYPES.map((u) => (
                                <SelectItem
                                  key={u.value}
                                  value={u.value}
                                  className="text-xs"
                                >
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* امکانات */}
                    <AccordionItem value="amenities" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon icon={Frame} label="امکانات و تجهیزات" />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 space-y-2">
                        <div className="space-y-0.5">
                          <ToggleRow
                            label="آسانسور"
                            icon={LayoutGrid}
                            checked={!!draft.hasElevator}
                            onChange={(v) =>
                              updateDraft({ hasElevator: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="پارکینگ"
                            icon={Car}
                            checked={!!draft.hasParking}
                            onChange={(v) =>
                              updateDraft({ hasParking: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="انباری"
                            icon={Warehouse}
                            checked={!!draft.hasStorage}
                            onChange={(v) =>
                              updateDraft({ hasStorage: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="بالکن / تراس"
                            icon={DoorOpen}
                            checked={!!draft.hasBalcony}
                            onChange={(v) =>
                              updateDraft({ hasBalcony: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="حیاط / باغچه"
                            icon={TreePine}
                            checked={!!draft.hasYard}
                            onChange={(v) =>
                              updateDraft({ hasYard: v || undefined })
                            }
                          />
                        </div>
                        <Separator className="my-2 opacity-40" />
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            سیستم گرمایش
                          </Label>
                          <Select
                            value={draft.heatingSystem || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                heatingSystem: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {HEATING_SYSTEMS.map((h) => (
                                <SelectItem
                                  key={h.value}
                                  value={h.value}
                                  className="text-xs"
                                >
                                  {h.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            سیستم سرمایش
                          </Label>
                          <Select
                            value={draft.coolingSystem || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                coolingSystem: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {COOLING_SYSTEMS.map((c) => (
                                <SelectItem
                                  key={c.value}
                                  value={c.value}
                                  className="text-xs"
                                >
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            کف‌پوش
                          </Label>
                          <Select
                            value={draft.flooring || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                flooring: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {FLOORING_TYPES.map((f) => (
                                <SelectItem
                                  key={f.value}
                                  value={f.value}
                                  className="text-xs"
                                >
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground font-medium">
                            نمای ساختمان
                          </Label>
                          <Select
                            value={draft.buildingFacade || "any"}
                            onValueChange={(v) =>
                              updateDraft({
                                buildingFacade: v === "any" ? undefined : v,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                              <SelectValue placeholder="مهم نیست" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="any" className="text-xs">
                                مهم نیست
                              </SelectItem>
                              {FACADE_TYPES.map((f) => (
                                <SelectItem
                                  key={f.value}
                                  value={f.value}
                                  className="text-xs"
                                >
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* فیلترهای تخصصی (شرطی) */}
                    {(isLand || isVilla || isCommercial) && (
                      <AccordionItem
                        value="specialized"
                        className="border-none"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <SectionIcon
                            icon={Wrench}
                            label={
                              isLand
                                ? "مشخصات زمین"
                                : isVilla
                                  ? "مشخصات ویلایی"
                                  : "مشخصات تجاری / اداری"
                            }
                          />
                        </AccordionTrigger>
                        <AccordionContent className="pb-2 space-y-4">
                          {isLand && (
                            <>
                              <DualInput
                                label="عرض خیابان (متر)"
                                icon={Ruler}
                                minPlaceholder="حداقل عرض"
                                maxPlaceholder="حداکثر عرض"
                                minSuffix="متر"
                                maxSuffix="متر"
                                minValue={
                                  draft.landWidth ? String(draft.landWidth) : ""
                                }
                                maxValue={""}
                                onMinChange={(v) => {
                                  const n = parseNum(v);
                                  updateDraft({
                                    landWidth: n > 0 ? n : undefined,
                                  });
                                }}
                                onMaxChange={() => {}}
                              />
                              <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground font-medium">
                                  طول بر (متر)
                                </Label>
                                <Input
                                  value={
                                    draft.landLength
                                      ? String(draft.landLength)
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const n = parseNum(e.target.value);
                                    updateDraft({
                                      landLength: n > 0 ? n : undefined,
                                    });
                                  }}
                                  placeholder="مثلاً ۲۰ متر"
                                  className="h-9 text-xs rounded-xl bg-muted/20 border-border"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="text-[11px] text-muted-foreground font-medium">
                                    سند زمین
                                  </Label>
                                  <Select
                                    value={draft.documentType || "any"}
                                    onValueChange={(v) =>
                                      updateDraft({
                                        documentType:
                                          v === "any" ? undefined : v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                      <SelectValue placeholder="مهم نیست" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem
                                        value="any"
                                        className="text-xs"
                                      >
                                        مهم نیست
                                      </SelectItem>
                                      {LAND_DOC_TYPES.map((d) => (
                                        <SelectItem
                                          key={d.value}
                                          value={d.value}
                                          className="text-xs"
                                        >
                                          {d.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[11px] text-muted-foreground font-medium">
                                    کاربری زمین
                                  </Label>
                                  <Select
                                    value={draft.landUsage || "any"}
                                    onValueChange={(v) =>
                                      updateDraft({
                                        landUsage: v === "any" ? undefined : v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                      <SelectValue placeholder="مهم نیست" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem
                                        value="any"
                                        className="text-xs"
                                      >
                                        مهم نیست
                                      </SelectItem>
                                      {LAND_USAGE_TYPES.map((u) => (
                                        <SelectItem
                                          key={u.value}
                                          value={u.value}
                                          className="text-xs"
                                        >
                                          {u.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </>
                          )}
                          {isVilla && (
                            <>
                              <ToggleRow
                                label="استخر"
                                icon={Waves}
                                checked={!!draft.hasPool}
                                onChange={(v) =>
                                  updateDraft({ hasPool: v || undefined })
                                }
                              />
                              <ToggleRow
                                label="سونا / جکوزی"
                                icon={ShowerHead}
                                checked={!!draft.hasSauna}
                                onChange={(v) =>
                                  updateDraft({ hasSauna: v || undefined })
                                }
                              />
                            </>
                          )}
                          {isCommercial && (
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-muted-foreground font-medium">
                                نوع دفتر / مغازه
                              </Label>
                              <Select
                                value={draft.officeType || "any"}
                                onValueChange={(v) =>
                                  updateDraft({
                                    officeType: v === "any" ? undefined : v,
                                  })
                                }
                              >
                                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                  <SelectValue placeholder="مهم نیست" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="any" className="text-xs">
                                    مهم نیست
                                  </SelectItem>
                                  {OFFICE_TYPES.map((o) => (
                                    <SelectItem
                                      key={o.value}
                                      value={o.value}
                                      className="text-xs"
                                    >
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {(isLand || isVilla || isCommercial) && (
                      <Separator className="opacity-50" />
                    )}

                    {/* دسته‌بندی موضوعی */}
                    <AccordionItem value="category" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon
                          icon={Layers}
                          label="دسته‌بندی موضوعی"
                          badge={
                            draft.category
                              ? categories.find(
                                  (c) => c.slug === draft.category,
                                )?.name
                              : undefined
                          }
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto rounded-xl border border-border/40 p-1 bg-muted/10">
                          <button
                            type="button"
                            onClick={() => updateDraft({ category: undefined })}
                            className={`w-full text-right px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all ${
                              !draft.category
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Tag className="w-3.5 h-3.5 shrink-0" />
                            <span>همه دسته‌بندی‌ها</span>
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() =>
                                updateDraft({
                                  category:
                                    draft.category === cat.slug
                                      ? undefined
                                      : cat.slug,
                                })
                              }
                              className={`w-full text-right px-3 py-2 rounded-lg text-[11px] flex items-center gap-2.5 transition-all ${
                                draft.category === cat.slug
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <span className="flex-1 leading-relaxed whitespace-normal break-words">
                                {cat.name}
                              </span>
                              {draft.category === cat.slug && (
                                <Check className="w-3 h-3 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <Separator className="opacity-50" />

                    {/* فیلترهای نمایشی */}
                    <AccordionItem value="display" className="border-none">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <SectionIcon icon={Eye} label="نمایش و سایر" />
                      </AccordionTrigger>
                      <AccordionContent className="pb-2">
                        <div className="space-y-0.5">
                          <ToggleRow
                            label="فقط آگهی‌های عکس‌دار"
                            icon={ImageIcon}
                            checked={!!draft.hasImage}
                            onChange={(v) =>
                              updateDraft({ hasImage: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="فقط آگهی‌های فوری"
                            icon={Zap}
                            checked={!!draft.isUrgent}
                            onChange={(v) =>
                              updateDraft({ isUrgent: v || undefined })
                            }
                          />
                          <ToggleRow
                            label="فقط آگهی‌های تایید شده"
                            icon={ShieldCheck}
                            checked={!!draft.isVerified}
                            onChange={(v) =>
                              updateDraft({ isVerified: v || undefined })
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
              <Button
                className="w-full rounded-xl gap-2 font-black h-11 sm:h-12 text-sm transition-all bg-primary border-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/20"
                onClick={handleApply}
              >
                <Check className="w-4 h-4" />
                اعمال فیلترها
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
