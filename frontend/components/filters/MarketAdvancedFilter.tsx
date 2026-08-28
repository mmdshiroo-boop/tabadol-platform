"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  Filter,
  MapPin,
  Home,
  DollarSign,
  Ruler,
  Calendar,
  Grid3X3,
  Building,
  Sparkles,
} from "lucide-react";
import { useMarketAdvancedFilter } from "@/hooks/useMarketAdvancedFilter";
import apiClient from "@/services/api/client";
import {
  MarketFilterValues,
  BUILDING_AGE_OPTIONS,
  PRICE_RANGE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  RENT_DEPOSIT_RANGE_OPTIONS,
  RENT_MONTHLY_RANGE_OPTIONS,
  ROOMS_COUNT_OPTIONS,
  SIZE_RANGE_OPTIONS,
} from "./marketFilter.types";
import { IranLocationSelector, SelectedLocation } from "@/components/ui/IranLocationSelector"; // ✅
import {
  findProvinceByName,
  findCountyByName,
  getById,
} from "@/lib/iranDivisions"; // ✅

// ── Helper Components ──────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="rtl"
          className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-orange-500">{icon}</span>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {title}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────

interface MarketAdvancedFilterProps {
  initialValues?: Partial<MarketFilterValues>;
  onApply: (values: MarketFilterValues) => void;
  onReset?: () => void;
  loading?: boolean;
  className?: string;
  triggerLabel?: string;
}

export function MarketAdvancedFilter({
  initialValues,
  onApply,
  onReset,
  loading = false,
  className = "",
  triggerLabel = "فیلتر پیشرفته بازار",
}: MarketAdvancedFilterProps) {
  const {
    isOpen,
    filters,
    activeTags,
    hasActiveFilters,
    activeCount,
    openModal,
    closeModal,
    updateFilter,
    resetFilters,
    applyFilters,
    removeTag,
    clearAllFilters,
  } = useMarketAdvancedFilter({ initialValues, onApply });

  const [regionOptions, setRegionOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // 🆕 state برای انتخاب استان/شهر/منطقه
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>({});

  // دریافت مناطق (region) از API – این بخش جدا از استان/شهر است
  useEffect(() => {
    apiClient
      .get("/market/regions")
      .then((res) => {
        if (res.data?.success) {
          const regions: string[] = res.data.data;
          setRegionOptions(
            regions.map((r) => ({
              value: r,
              label: r === "همه" ? "همه مناطق" : r,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  // همگام‌سازی initialValues با selectedLocation
  useEffect(() => {
    if (initialValues?.province) {
      const prov = findProvinceByName(initialValues.province);
      if (prov) {
        setSelectedLocation((prev) => ({
          ...prev,
          provinceId: prov.Id,
        }));
        if (initialValues.city) {
          const county = findCountyByName(prov.Id, initialValues.city);
          if (county) {
            setSelectedLocation((prev) => ({
              ...prev,
              provinceId: prov.Id,
              countyId: county.Id,
            }));
          }
        }
      }
    }
  }, [initialValues?.province, initialValues?.city]);

  // 🆕 callback برای تغییر مکان از ایران‌سلکتور
  const handleLocationChange = (location: SelectedLocation) => {
    setSelectedLocation(location);

    // استخراج نام‌ها
    let provinceName = "";
    let cityName = "";
    let districtName = "none";

    if (location.provinceId) {
      const prov = getById(location.provinceId);
      provinceName = prov?.Name || "";
    }
    if (location.countyId) {
      const county = getById(location.countyId);
      cityName = county?.Name || "";
    }
    if (location.districtId) {
      const district = getById(location.districtId);
      districtName = district?.Name || "none";
    }

    updateFilter("province", provinceName);
    updateFilter("city", cityName);
    updateFilter("district", districtName);
  };

  // مدیریت نوع معامله
  const handleTradeTypeChange = (type: string) => {
    if (filters.tradeType === type) {
      updateFilter("tradeType", "");
      updateFilter("priceRange", "none");
      updateFilter("rentDepositRange", "none");
      updateFilter("rentMonthlyRange", "none");
    } else {
      updateFilter("tradeType", type);
      if (type === "rent") {
        updateFilter("priceRange", "none");
      } else if (type === "buy") {
        updateFilter("rentDepositRange", "none");
        updateFilter("rentMonthlyRange", "none");
      }
    }
  };

  // انیمیشن مودال
  const [isVisible, setIsVisible] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldMount(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsVisible(true)),
      );
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setShouldMount(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleReset = () => {
    resetFilters();
    setSelectedLocation({});
    onReset?.();
  };

  return (
    <div className={`inline-block ${className}`} dir="rtl" style={{ fontFamily: "Vazirmatn, system-ui, sans-serif" }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={openModal}
        className="relative flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/60 transition-all shadow-sm"
      >
        <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
        <span>{triggerLabel}</span>
        {hasActiveFilters && (
          <span className="absolute -top-2 -left-2 min-w-[20px] h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md shadow-orange-200 ring-2 ring-white">
            {activeCount > 9 ? "+۹" : activeCount}
          </span>
        )}
      </button>

      {/* Modal */}
      {shouldMount && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-all duration-300 ease-out ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={closeModal} />

          <div
            ref={modalRef}
            tabIndex={-1}
            className={`relative bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] transition-all duration-300 ease-out ${
              isVisible ? "translate-y-0 sm:scale-100" : "translate-y-10 sm:scale-95"
            }`}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">فیلتر تحلیل بازار</h2>
                  <p className="text-xs text-gray-400">جستجوی دقیق آمار مسکن</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Tags */}
            {hasActiveFilters && (
              <div className="px-5 py-3 bg-orange-50/70 border-b border-orange-100 flex-shrink-0 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 ml-1">فعال:</span>
                {activeTags.map((tag) => (
                  <span
                    key={tag.key}
                    className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {tag.displayValue}
                    <button
                      onClick={() => removeTag(tag.key)}
                      className="w-3.5 h-3.5 rounded-full bg-orange-200 hover:bg-orange-400 hover:text-white text-orange-600 flex items-center justify-center"
                    >
                      <X className="w-2 h-2 stroke-[3]" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full px-3 py-1"
                >
                  <X className="w-3 h-3" /> پاک کردن همه
                </button>
              </div>
            )}

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
              {/* Trade Type */}
              <section>
                <SectionHeader icon={<Home className="w-3.5 h-3.5" />} title="نوع معامله" />
                <div className="flex gap-2">
                  {["buy", "rent"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTradeTypeChange(type)}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                        filters.tradeType === type
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600"
                      }`}
                    >
                      {type === "buy" ? "خرید و فروش" : "رهن و اجاره"}
                    </button>
                  ))}
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* Location */}
              <section>
                <SectionHeader icon={<MapPin className="w-3.5 h-3.5" />} title="موقعیت" />
                {/* 🆕 استفاده از کامپوننت استان/شهر/منطقه */}
                <IranLocationSelector
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  className="mb-3"
                  showOptionalDistrict={true}
                />
                {/* منطقه (region) از API — مجزا از تقسیمات کشوری */}
                <FilterSelect
                  label="منطقه (منطقه‌بندی بازار)"
                  value={filters.region}
                  onChange={(v) => updateFilter("region", v)}
                  options={regionOptions.length > 0 ? regionOptions : [{ value: "همه", label: "همه مناطق" }]}
                  icon={<MapPin className="w-3.5 h-3.5 text-orange-500" />}
                />
              </section>

              <div className="border-t border-gray-100" />

              {/* Property Features */}
              <section>
                <SectionHeader icon={<Building className="w-3.5 h-3.5" />} title="ویژگی‌های ملک" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FilterSelect
                    label="نوع ملک"
                    value={filters.propertyType}
                    onChange={(v) => updateFilter("propertyType", v)}
                    options={PROPERTY_TYPE_OPTIONS}
                    icon={<Building className="w-3.5 h-3.5 text-orange-500" />}
                  />

                  {filters.tradeType !== "rent" && (
                    <FilterSelect
                      label="بازه قیمت"
                      value={filters.priceRange}
                      onChange={(v) => updateFilter("priceRange", v)}
                      options={PRICE_RANGE_OPTIONS}
                      icon={<DollarSign className="w-3.5 h-3.5 text-orange-500" />}
                    />
                  )}

                  {filters.tradeType === "rent" && (
                    <>
                      <FilterSelect
                        label="مبلغ رهن (ودیعه)"
                        value={filters.rentDepositRange}
                        onChange={(v) => updateFilter("rentDepositRange", v)}
                        options={RENT_DEPOSIT_RANGE_OPTIONS}
                        icon={<DollarSign className="w-3.5 h-3.5 text-orange-500" />}
                      />
                      <FilterSelect
                        label="اجاره ماهانه"
                        value={filters.rentMonthlyRange}
                        onChange={(v) => updateFilter("rentMonthlyRange", v)}
                        options={RENT_MONTHLY_RANGE_OPTIONS}
                        icon={<DollarSign className="w-3.5 h-3.5 text-orange-500" />}
                      />
                    </>
                  )}

                  <FilterSelect
                    label="متراژ"
                    value={filters.sizeRange}
                    onChange={(v) => updateFilter("sizeRange", v)}
                    options={SIZE_RANGE_OPTIONS}
                    icon={<Ruler className="w-3.5 h-3.5 text-orange-500" />}
                  />
                  <FilterSelect
                    label="سن بنا"
                    value={filters.buildingAge}
                    onChange={(v) => updateFilter("buildingAge", v)}
                    options={BUILDING_AGE_OPTIONS}
                    icon={<Calendar className="w-3.5 h-3.5 text-orange-500" />}
                  />
                  <FilterSelect
                    label="تعداد اتاق"
                    value={filters.roomsCount}
                    onChange={(v) => updateFilter("roomsCount", v)}
                    options={ROOMS_COUNT_OPTIONS}
                    icon={<Grid3X3 className="w-3.5 h-3.5 text-orange-500" />}
                  />
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" /> بازنشانی
              </button>
              <button
                onClick={applyFilters}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:opacity-50 shadow-md shadow-orange-200"
              >
                <Filter className="w-4 h-4" /> اعمال فیلترها
                {hasActiveFilters && (
                  <span className="bg-white/25 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}