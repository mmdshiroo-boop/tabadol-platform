"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, X, SlidersHorizontal, Building2, Layers, ShoppingBag,
  ArrowUpDown, Eye, Clock, Car, Package, Tag, Check, ImageIcon,
  Zap, BedDouble, Maximize2, Building, Trees, LandPlot, Store,
  DoorOpen, MapPin, Layers2, TreePine, Castle, Hotel, Hammer,
  Briefcase, Gem, Heart, Loader2,
} from "lucide-react";
import { Category } from "@/services/api/category.api";
import {
  loadDivisions,
  getProvinces,
  getCounties,
  findProvinceByName,
  normalizeName,
  IranDivision,
} from "@/lib/iranDivisions";
import { toast } from "sonner";
import { Slider } from "../ui/slider";

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
  hasImage?: boolean;
  isUrgent?: boolean;
  isVerified?: boolean;
}

interface AdvancedFilterModalProps {
  categories: Category[];
  provinces?: any[]; // نگه داشته می‌شود اما استفاده نمی‌شود؛ برای سازگاری با کد قبلی
  priceRange: { min: number; max: number };
  currentFilters: Partial<AdvancedFilters>;
  activeFiltersCount: number;
  onApply: (filters: AdvancedFilters) => void;
  clearFilters: () => void;
}

/* ─── ثابت‌ها ────────────────────────── */

const PROPERTY_TYPES = [
  { value: "apartment", label: "آپارتمان", icon: Building },
  { value: "villa", label: "ویلایی", icon: TreePine },
  { value: "house", label: "خانه حیاط‌دار", icon: DoorOpen },
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

const PRICE_RANGES = [
  { value: "none", label: "همه قیمت‌ها", min: undefined, max: undefined },
  { value: "0-100000000", label: "تا ۱۰۰ میلیون", min: 0, max: 100_000_000 },
  { value: "100000000-300000000", label: "۱۰۰ تا ۳۰۰ میلیون", min: 100_000_000, max: 300_000_000 },
  { value: "300000000-500000000", label: "۳۰۰ تا ۵۰۰ میلیون", min: 300_000_000, max: 500_000_000 },
  { value: "500000000-1000000000", label: "۵۰۰ میلیون تا ۱ میلیارد", min: 500_000_000, max: 1_000_000_000 },
  { value: "1000000000-2000000000", label: "۱ تا ۲ میلیارد", min: 1_000_000_000, max: 2_000_000_000 },
  { value: "2000000000-5000000000", label: "۲ تا ۵ میلیارد", min: 2_000_000_000, max: 5_000_000_000 },
  { value: "5000000000-10000000000", label: "۵ تا ۱۰ میلیارد", min: 5_000_000_000, max: 10_000_000_000 },
  { value: "10000000000-20000000000", label: "۱۰ تا ۲۰ میلیارد", min: 10_000_000_000, max: 20_000_000_000 },
  { value: "20000000000-50000000000", label: "۲۰ تا ۵۰ میلیارد", min: 20_000_000_000, max: 50_000_000_000 },
  { value: "50000000000-100000000000", label: "۵۰ تا ۱۰۰ میلیارد", min: 50_000_000_000, max: 100_000_000_000 },
  { value: "100000000000-", label: "بالای ۱۰۰ میلیارد", min: 100_000_000_000, max: undefined },
];
const AREA_RANGES = [
  { value: "none", label: "همه متراژها", min: undefined, max: undefined },
  { value: "0-50", label: "تا ۵۰ متر", min: 0, max: 50 },
  { value: "50-100", label: "۵۰ تا ۱۰۰ متر", min: 50, max: 100 },
  { value: "100-150", label: "۱۰۰ تا ۱۵۰ متر", min: 100, max: 150 },
  { value: "150-200", label: "۱۵۰ تا ۲۰۰ متر", min: 150, max: 200 },
  { value: "200-", label: "بالای ۲۰۰ متر", min: 200, max: undefined },
];

const YEAR_RANGES = [
  { value: "none", label: "همه سال‌ها", min: undefined, max: undefined },
  { value: "0-1380", label: "قبل از ۱۳۸۰", min: 0, max: 1380 },
  { value: "1380-1390", label: "۱۳۸۰ تا ۱۳۹۰", min: 1380, max: 1390 },
  { value: "1390-1400", label: "۱۳۹۰ تا ۱۴۰۰", min: 1390, max: 1400 },
  { value: "1400-", label: "بعد از ۱۴۰۰", min: 1400, max: undefined },
];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toPersianNum = (n: number) =>
  String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);

const formatPriceShort = (v: number) => {
  if (v >= 1_000_000_000) return `${toPersianNum(Math.round(v / 1_000_000_000))} میلیارد`;
  if (v >= 1_000_000) return `${toPersianNum(Math.round(v / 1_000_000))} میلیون`;
  return toPersianNum(v);
};

/* ─── تابع محاسبه value سلکت قیمت ─── */
const getPriceSelectValue = (
  minPrice: number | undefined,
  maxPrice: number | undefined,
): string => {
  if (minPrice === undefined && maxPrice === undefined) return "none";
  const match = PRICE_RANGES.find(
    (r) => r.min === minPrice && r.max === maxPrice,
  );
  return match?.value || "none";
};

const getAreaSelectValue = (
  minArea: number | undefined,
  maxArea: number | undefined,
): string => {
  if (minArea === undefined && maxArea === undefined) return "none";
  const match = AREA_RANGES.find(
    (r) => r.min === minArea && r.max === maxArea,
  );
  return match?.value || "none";
};

const getYearSelectValue = (
  minY: number | undefined,
  maxY: number | undefined,
): string => {
  if (minY === undefined && maxY === undefined) return "none";
  const match = YEAR_RANGES.find((r) => r.min === minY && r.max === maxY);
  return match?.value || "none";
};

/* ─── sub-components ─────────────────────────── */

function ChipButton({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200 whitespace-nowrap ${
        selected
          ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label}</span>
      {selected && <Check className="w-3 h-3 shrink-0" />}
    </motion.button>
  );
}

function ToggleRow({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2.5 px-1 cursor-pointer group rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <span
          className={`text-xs font-medium transition-colors ${
            checked ? "text-foreground" : "text-muted-foreground"
          }`}
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

function SectionHeader({
  icon: Icon,
  label,
  badge,
}: {
  icon?: React.ComponentType<{ className?: string }>;
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

/* ─── کامپوننت اصلی ─────────────────────────── */

export function AdvancedFilterModal({
  categories,
  provinces: _ignoredProvincesProp,
  priceRange,
  currentFilters,
  activeFiltersCount,
  onApply,
  clearFilters,
}: AdvancedFilterModalProps) {
  const [draft, setDraft] = useState<AdvancedFilters>({});
  const [iranProvinces, setIranProvinces] = useState<IranDivision[]>([]);
  const [iranCities, setIranCities] = useState<IranDivision[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadDivisions().then(() => {
      setIranProvinces(getProvinces());
    });
  }, []);

  // جلوگیری از اسکرول بدنه
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [modalOpen]);

  // بستن با Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  // همگام‌سازی draft با currentFilters هنگام باز شدن
  useEffect(() => {
    if (!modalOpen) return;
    setDraft(() => {
      const next = { ...currentFilters };
      // اگر province نام استان است و با یکی از استان‌های iranProvinces تطبیق دارد، Id آن را جایگزین می‌کنیم
      if (next.province && iranProvinces.length > 0) {
        const found = iranProvinces.find(
          (p) => normalizeName(p.Name) === normalizeName(next.province as string),
        );
        if (found) next.province = String(found.Id);
      }
      return next;
    });
  }, [modalOpen, currentFilters, iranProvinces]);

  // بارگذاری شهرها با تغییر استان
  useEffect(() => {
    if (!draft.province || draft.province === "all") {
      setIranCities([]);
      return;
    }
    const provinceId = Number(draft.province);
    if (isNaN(provinceId)) {
      setIranCities([]);
      return;
    }
    setCitiesLoading(true);
    // شبیه‌سازی delay
    setTimeout(() => {
      setIranCities(getCounties(provinceId));
      setCitiesLoading(false);
    }, 100);
  }, [draft.province]);

  const updateDraft = useCallback(
    (patch: Partial<AdvancedFilters>) =>
      setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const getProvinceName = (prov: string | undefined) => {
    if (!prov) return "";
    if (iranProvinces.length === 0) return prov;
    const found = iranProvinces.find((p) => String(p.Id) === prov);
    return found ? found.Name : prov;
  };

  const handleDetectLocation = () => {
    setIsDetecting(true);
    if (!navigator.geolocation) {
      toast.error("مرورگر شما از GPS پشتیبانی نمی‌کند.");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://api.neshan.org/v5/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
            { headers: { "Api-Key": "service.f3da8afc6b384ab5bda01e3375e1f3f5" } },
          );
          const data = await response.json();
          const provinceName = data.state || "";
          const cityName = data.city || data.municipality_zone || "";

          const foundProvince = findProvinceByName(provinceName);
          if (foundProvince) {
            const provIdStr = String(foundProvince.Id);
            let cityValue = undefined;
            if (cityName) {
              const counties = getCounties(foundProvince.Id);
              const foundCounty = counties.find(
                (c) => normalizeName(c.Name) === normalizeName(cityName) ||
                  normalizeName(c.Name).includes(normalizeName(cityName)) ||
                  normalizeName(cityName).includes(normalizeName(c.Name)),
              );
              cityValue = foundCounty ? foundCounty.Name : cityName;
            }
            updateDraft({
              province: provIdStr,
              city: cityValue,
            });
            toast.success(`موقعیت شما شناسایی شد: ${foundProvince.Name}${cityValue ? `، ${cityValue}` : ''}`);
          } else {
            toast.error("استان شما در پایگاه داده یافت نشد.");
          }
        } catch (err) {
          console.error("خطا در تشخیص موقعیت:", err);
          toast.error("خطا در تطبیق موقعیت.");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.info("دسترسی GPS مسدود است. موقعیت بر اساس IP بررسی نشد.");
        setIsDetecting(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleApply = () => {
    const clean: AdvancedFilters = { ...draft };

    // تبدیل Id استان به نام برای ارسال
    if (clean.province && iranProvinces.length > 0) {
      const found = iranProvinces.find((p) => String(p.Id) === clean.province);
      if (found) clean.province = found.Name;
    }

    // پاک‌سازی مقادیر خالی
    (Object.keys(clean) as Array<keyof AdvancedFilters>).forEach((key) => {
      const val = clean[key];
      if (val === undefined || val === null || val === "" || val === false)
        delete clean[key];
    });
    if (clean.minPrice === 0) delete clean.minPrice;
    if (clean.minArea === 0) delete clean.minArea;
    if (clean.minYearBuilt === 0) delete clean.minYearBuilt;

    onApply(clean);
    setModalOpen(false);
  };

  const handleClear = () => {
    setDraft({});
    clearFilters();
    setModalOpen(false);
  };

  return (
    <>
      {/* دکمه باز کردن */}
      <motion.div whileTap={{ scale: 0.96 }}>
        <Button
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl text-xs h-9 font-bold relative border-border bg-background"
        >
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span>فیلترهای پیشرفته</span>
          <AnimatePresence>
            {activeFiltersCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-2 -left-2"
              >
                <Badge className="w-5 h-5 flex items-center justify-center p-0 rounded-full text-[10px] bg-primary text-primary-foreground">
                  {toPersianNum(activeFiltersCount)}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* مودال */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {modalOpen && (
              <>
                {/* Overlay */}
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                  onClick={() => setModalOpen(false)}
                />

                {/* پنل */}
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, y: "100%", scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: "60%", scale: 0.97 }}
                  transition={{
                    type: "spring",
                    damping: 30,
                    stiffness: 300,
                    mass: 0.8,
                  }}
                  className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[101]"
                >
                  <div
                    className="bg-background w-full max-h-[92dvh] md:max-h-[85vh] md:w-[480px] rounded-t-3xl md:rounded-2xl shadow-2xl border-0 md:border border-border flex flex-col overflow-hidden"
                    dir="rtl"
                  >
                    {/* هدر مودال */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-extrabold text-foreground">
                          فیلترهای پیشرفته
                        </h3>
                        {activeFiltersCount > 0 && (
                          <Badge className="text-[10px] h-5 px-2 bg-primary/10 text-primary border-transparent">
                            {toPersianNum(activeFiltersCount)} فیلتر فعال
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full hover:bg-muted"
                        onClick={() => setModalOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* محتوای فیلترها */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 scroll-smooth [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
                      <Accordion
                        type="multiple"
                        defaultValue={[
                          "sort", "adType", "propertyType",
                          "location", "price", "specs",
                        ]}
                        className="space-y-0"
                      >
                        {/* مرتب‌سازی */}
                        <AccordionItem value="sort" className="border-none">
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <SectionHeader icon={ArrowUpDown} label="مرتب‌سازی نتایج" />
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="grid grid-cols-2 gap-1.5">
                              {SORT_OPTIONS.map((opt) => (
                                <ChipButton
                                  key={opt.value}
                                  label={opt.label}
                                  icon={opt.icon}
                                  selected={(draft.sortBy || "newest") === opt.value}
                                  onClick={() => updateDraft({ sortBy: opt.value })}
                                />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <Separator className="opacity-40" />

                        {/* نوع معامله */}
                        <AccordionItem value="adType" className="border-none">
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <SectionHeader
                              icon={Tag}
                              label="نوع معامله"
                              badge={
                                draft.adType
                                  ? AD_TYPES.find((t) => t.value === draft.adType)?.label
                                  : undefined
                              }
                            />
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="flex flex-wrap gap-1.5">
                              {AD_TYPES.map((t) => (
                                <ChipButton
                                  key={t.value || "all"}
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

                        <Separator className="opacity-40" />

                        {/* نوع ملک */}
                        <AccordionItem value="propertyType" className="border-none">
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <SectionHeader
                              icon={Building2}
                              label="نوع ملک"
                              badge={
                                draft.propertyType
                                  ? PROPERTY_TYPES.find((t) => t.value === draft.propertyType)?.label
                                  : undefined
                              }
                            />
                          </AccordionTrigger>
                          <AccordionContent className="pb-3">
                            <div className="grid grid-cols-3 gap-1.5">
                              {PROPERTY_TYPES.map((pt) => (
                                <ChipButton
                                  key={pt.value}
                                  label={pt.label}
                                  icon={pt.icon}
                                  selected={draft.propertyType === pt.value}
                                  onClick={() =>
                                    updateDraft({
                                      propertyType:
                                        draft.propertyType === pt.value
                                          ? undefined
                                          : pt.value,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <Separator className="opacity-40" />

                        {/* موقعیت */}
                        <AccordionItem value="location" className="border-none">
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <SectionHeader
                              icon={MapPin}
                              label="موقعیت مکانی"
                              badge={
                                draft.city && draft.province
                                  ? `${getProvinceName(draft.province)}، ${draft.city}`
                                  : draft.city
                                  ? draft.city
                                  : draft.province
                                  ? getProvinceName(draft.province)
                                  : undefined
                              }
                            />
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 space-y-3">
                            <div className="bg-muted/20 border border-border/50 p-3 rounded-xl space-y-3">
                              {/* دکمه تشخیص هوشمند */}
                              <Button
                                variant="outline"
                                onClick={handleDetectLocation}
                                disabled={isDetecting}
                                className="w-full h-10 rounded-xl border-dashed border-orange-300 dark:border-orange-700/50 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-extrabold text-xs gap-2"
                              >
                                {isDetecting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    در حال شناسایی...
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-4 h-4" />
                                    شناسایی هوشمند شهر من
                                  </>
                                )}
                              </Button>

                              {/* استان */}
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
                                  <SelectContent className="rounded-xl z-[200]">
                                    <SelectItem value="all" className="text-xs">
                                      همه استان‌ها
                                    </SelectItem>
                                    {iranProvinces.map((p) => (
                                      <SelectItem key={p.Id} value={String(p.Id)} className="text-xs">
                                        {p.Name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* شهر */}
                              <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground font-medium">
                                  شهر
                                </Label>
                                <Select
                                  value={draft.city || "all"}
                                  onValueChange={(v) =>
                                    updateDraft({ city: v === "all" ? undefined : v })
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
                                  <SelectContent className="rounded-xl z-[200]">
                                    <SelectItem value="all" className="text-xs">
                                      همه شهرها
                                    </SelectItem>
                                    {iranCities.map((c) => (
                                      <SelectItem key={c.Id} value={c.Name} className="text-xs">
                                        {c.Name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        <Separator className="opacity-40" />
{/* قیمت */}
<AccordionItem value="price" className="border-none">
  <AccordionTrigger className="py-3.5 hover:no-underline">
    <SectionHeader
      icon={ShoppingBag}
      label="محدوده قیمت"
      badge={
        draft.minPrice !== undefined || draft.maxPrice !== undefined
          ? "فعال"
          : undefined
      }
    />
  </AccordionTrigger>
  <AccordionContent className="pb-3">
    <div className="space-y-4">
      {/* انتخاب سریع از بازه‌های آماده */}
      <Select
        value={getPriceSelectValue(draft.minPrice, draft.maxPrice)}
        onValueChange={(v) => {
          if (v === "none") {
            updateDraft({ minPrice: undefined, maxPrice: undefined });
            return;
          }
          const range = PRICE_RANGES.find((r) => r.value === v);
          if (range)
            updateDraft({ minPrice: range.min, maxPrice: range.max });
        }}
      >
        <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
          <SelectValue placeholder="انتخاب بازه قیمت" />
        </SelectTrigger>
        <SelectContent className="rounded-xl z-[200]">
          {PRICE_RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value} className="text-xs">
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* اسلایدر دو دسته نارنجی با بوردر مشخص */}
      <div className="rounded-xl border-2 border-orange-300 dark:border-orange-700/50 bg-orange-50/50 dark:bg-orange-950/10 p-4 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-extrabold">
          <span className="text-muted-foreground">
            حداقل:{" "}
            <span className="text-orange-600 dark:text-orange-400">
              {draft.minPrice !== undefined
                ? formatPriceShort(draft.minPrice)
                : "۰"}
            </span>
          </span>
          <span className="text-muted-foreground">
            حداکثر:{" "}
            <span className="text-orange-600 dark:text-orange-400">
              {draft.maxPrice !== undefined
                ? formatPriceShort(draft.maxPrice)
                : formatPriceShort(100_000_000_000)}
            </span>
          </span>
        </div>

        {/* اسلایدر دو دسته */}
        <Slider
          min={0}
          max={100_000_000_000}
          step={100_000_000}
          value={[
            draft.minPrice ?? 0,
            draft.maxPrice ?? 100_000_000_000,
          ]}
          onValueChange={(values) => {
            const [min, max] = values;
            updateDraft({ minPrice: min, maxPrice: max });
          }}
          className="[&_[data-slot=track]]:h-2 [&_[data-slot=track]]:rounded-full [&_[data-slot=track]]:bg-orange-200 dark:[&_[data-slot=track]]:bg-orange-800/50 [&_[data-slot=range]]:bg-orange-500 [&_[data-slot=thumb]]:border-orange-500 [&_[data-slot=thumb]]:bg-white dark:[&_[data-slot=thumb]]:bg-orange-950"
        />

        {/* نمایش بازه انتخابی */}
        <AnimatePresence>
          {(draft.minPrice !== undefined || draft.maxPrice !== undefined) && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-orange-600 dark:text-orange-400 font-extrabold bg-orange-500/10 rounded-lg py-1.5 text-center"
            >
              {draft.minPrice !== undefined ? `از ${formatPriceShort(draft.minPrice)}` : ""}
              {draft.minPrice !== undefined && draft.maxPrice !== undefined ? " تا " : ""}
              {draft.maxPrice !== undefined ? `${formatPriceShort(draft.maxPrice)}` : ""}
              {" تومان"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  </AccordionContent>
</AccordionItem>


                        <Separator className="opacity-40" />

                        {/* مشخصات */}
                        <AccordionItem value="specs" className="border-none">
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <SectionHeader icon={Maximize2} label="مشخصات ملک" />
                          </AccordionTrigger>
                          <AccordionContent className="pb-3 space-y-4">
                            {/* متراژ */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-muted-foreground font-medium">
                                متراژ
                              </Label>
                              <Select
                                value={getAreaSelectValue(draft.minArea, draft.maxArea)}
                                onValueChange={(v) => {
                                  if (v === "none") {
                                    updateDraft({ minArea: undefined, maxArea: undefined });
                                    return;
                                  }
                                  const range = AREA_RANGES.find((r) => r.value === v);
                                  if (range)
                                    updateDraft({ minArea: range.min, maxArea: range.max });
                                }}
                              >
                                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                  <SelectValue placeholder="انتخاب متراژ" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl z-[200]">
                                  {AREA_RANGES.map((r) => (
                                    <SelectItem key={r.value} value={r.value} className="text-xs">
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* اتاق خواب */}
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
                                        rooms: draft.rooms === r.value ? undefined : r.value,
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            </div>

                            {/* سال ساخت */}
                            <div className="space-y-1.5">
                              <Label className="text-[11px] text-muted-foreground font-medium">
                                سال ساخت
                              </Label>
                              <Select
                                value={getYearSelectValue(draft.minYearBuilt, draft.maxYearBuilt)}
                                onValueChange={(v) => {
                                  if (v === "none") {
                                    updateDraft({ minYearBuilt: undefined, maxYearBuilt: undefined });
                                    return;
                                  }
                                  const range = YEAR_RANGES.find((r) => r.value === v);
                                  if (range)
                                    updateDraft({ minYearBuilt: range.min, maxYearBuilt: range.max });
                                }}
                              >
                                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20 border-border">
                                  <SelectValue placeholder="انتخاب سال ساخت" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl z-[200]">
                                  {YEAR_RANGES.map((r) => (
                                    <SelectItem key={r.value} value={r.value} className="text-xs">
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* امکانات */}
                            <div className="bg-muted/10 p-2 rounded-xl border border-border/40 space-y-0.5">
                              <ToggleRow
                                label="دارای آسانسور"
                                icon={Layers}
                                checked={!!draft.hasElevator}
                                onChange={(v) => updateDraft({ hasElevator: v || undefined })}
                              />
                              <ToggleRow
                                label="دارای پارکینگ"
                                icon={Car}
                                checked={!!draft.hasParking}
                                onChange={(v) => updateDraft({ hasParking: v || undefined })}
                              />
                              <ToggleRow
                                label="دارای انباری"
                                icon={Package}
                                checked={!!draft.hasStorage}
                                onChange={(v) => updateDraft({ hasStorage: v || undefined })}
                              />
                              <ToggleRow
                                label="فقط آگهی‌های عکس‌دار"
                                icon={ImageIcon}
                                checked={!!draft.hasImage}
                                onChange={(v) => updateDraft({ hasImage: v || undefined })}
                              />
                              <ToggleRow
                                label="آگهی‌های فوری"
                                icon={Zap}
                                checked={!!draft.isUrgent}
                                onChange={(v) => updateDraft({ isUrgent: v || undefined })}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>

                    {/* فوتر — دکمه‌های اعمال و پاک کردن */}
                    <div className="flex items-center gap-2.5 px-4 py-4 border-t border-border/60 bg-background shrink-0">
                      <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                        <Button
                          className="w-full rounded-xl text-xs h-11 font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/15"
                          onClick={handleApply}
                        >
                          اعمال فیلترها
                        </Button>
                      </motion.div>
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="outline"
                          className="rounded-xl text-xs h-11 font-bold text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all px-4"
                          onClick={handleClear}
                        >
                          پاک کردن
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}