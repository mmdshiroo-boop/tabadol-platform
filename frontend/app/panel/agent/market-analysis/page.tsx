"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MarketAdvancedFilter } from "@/components/filters/MarketAdvancedFilter";
import type { MarketFilterValues } from "@/components/filters";
import { MapPinned, Home, Calendar } from "lucide-react";
import apiClient from "@/services/api/client";
import { toast } from "sonner";
import { MapView } from "@/components/panel/MapView";
import { LocationHierarchyBrowser } from "@/components/market/LocationHierarchyBrowser";
import { MarketPulseCard } from "@/components/market/MarketPulseCard";
import { PriceTrendChart } from "@/components/market/PriceTrendChart";
import { DistrictTrendChart } from "@/components/market/DistrictTrendChart";
import { LocationAnalyticsModal } from "@/components/market/LocationAnalyticsModal";
import { cn } from "@/lib/utils";
import { PROVINCES, CITIES } from "@/lib/iranLocations";
import { getCityCoords } from "@/lib/cityCoordinates";
import {
  loadDivisions,
  getProvinces,
  getCounties,
  getById,
  findProvinceByName,
  findCountyByName,
} from "@/lib/iranDivisions"; // ✅

/* ═══════════════════ TYPES ═══════════════════ */
interface Stats {
  avgPricePerMeter: number;
  totalAdsCount: number;
  growthRate: number;
  avgArea: number;
  maxPrice: number;
  minPrice: number;
  avgTotalPrice?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const formatMoney = (value: number) => {
  if (!value) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} میلیارد`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} میلیون`;
  return value.toLocaleString("fa-IR") + " تومان";
};

// تابع کمکی برای گرفتن مختصات از روی نام استان/شهر
const getCoordsFromLegacy = (
  provinceName: string,
  cityName: string = ""
): [number, number] => {
  const legacyProvince = PROVINCES.find((p) => p.name === provinceName);
  if (!legacyProvince) return [32.4279, 53.688];
  const provinceId = Number(legacyProvince.id);
  if (cityName) {
    const coords = getCityCoords(cityName, provinceId);
    return [coords.lat, coords.lng];
  }
  const coords = getCityCoords("", provinceId);
  return [coords.lat, coords.lng];
};

export default function MarketAnalysisPage() {
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [analysisDistrict, setAnalysisDistrict] = useState("");
  const [activeDistrictName, setActiveDistrictName] = useState("");
  const [dynamicCenter, setDynamicCenter] = useState<[number, number]>([32.4279, 53.688]);
  const [mapZoom, setMapZoom] = useState(6);
  const [tradeType, setTradeType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [buildingAge, setBuildingAge] = useState("");
  const [roomsCount, setRoomsCount] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("همه");
  const [chartPeriod, setChartPeriod] = useState<"3" | "6" | "12">("6");
  const [markers, setMarkers] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [priceTrend, setPriceTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLocationDetected, setInitialLocationDetected] = useState(false);

  const [analysisProvince, setAnalysisProvince] = useState("");
  const [analysisCity, setAnalysisCity] = useState("");
  const [analysisDistrictModal, setAnalysisDistrictModal] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [savedFilterValues, setSavedFilterValues] = useState<Partial<MarketFilterValues>>({});

  useEffect(() => {
    loadDivisions();
  }, []);

  /* ════════ Derived values ════════ */
  const selectedProvinceName = useMemo(
    () => (selectedProvinceId ? getById(Number(selectedProvinceId))?.Name || "" : ""),
    [selectedProvinceId]
  );
  const selectedCityName = useMemo(
    () => (selectedCityId ? getById(Number(selectedCityId))?.Name || "" : ""),
    [selectedCityId]
  );

  /* ════════ Data fetching ════════ */
  const fetchAllCountryMap = useCallback(async () => {
    setLoading(true);
    try {
      const mapRes = await apiClient.get("/market/map-ads");
      if (mapRes.data?.success) {
        const mapData = mapRes.data.data;
        setMarkers(mapData.markers || []);
        if (mapData.center) {
          setDynamicCenter([mapData.center.lat, mapData.center.lng]);
          setMapZoom(6);
        }
      }
    } catch {
      toast.error("خطا در دریافت داده‌های نقشه");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFilteredData = useCallback(async () => {
    setLoading(true);
    try {
      const province = selectedProvinceId ? getById(Number(selectedProvinceId)) : undefined;
      const city = selectedCityId ? getById(Number(selectedCityId)) : undefined;
      const params: any = {};
      if (tradeType) params.tradeType = tradeType;
      if (propertyType && propertyType !== "none") params.propertyType = propertyType;
      if (priceRange && priceRange !== "none") params.priceRange = priceRange;
      if (sizeRange && sizeRange !== "none") params.sizeRange = sizeRange;
      if (buildingAge && buildingAge !== "none") params.buildingAge = buildingAge;
      if (roomsCount && roomsCount !== "none") params.roomsCount = roomsCount;
      if (selectedRegion && selectedRegion !== "همه") params.region = selectedRegion;
      if (province) params.province = province.Name;
      if (city) {
        params.city = city.Name;
        if (analysisDistrict && analysisDistrict !== "none") params.district = analysisDistrict;
      }

      const [analysisRes, mapRes] = await Promise.all([
        apiClient.get("/market/analysis", { params }),
        apiClient.get("/market/map-ads", { params }),
      ]);

      if (analysisRes.data?.success) {
        const raw = analysisRes.data.data;
        setStats({
          avgPricePerMeter: raw.overallAvgPrice || 0,
          totalAdsCount: raw.totalAds || 0,
          growthRate: raw.growthRate ?? 0,
          avgArea: raw.avgArea || 0,
          maxPrice: raw.maxPrice || 0,
          minPrice: raw.minPrice || 0,
          avgTotalPrice: raw.avgTotalPrice || 0,
        });
        setPriceTrend(raw.marketTrends || []);
      }

      if (mapRes.data?.success) {
        const mapData = mapRes.data.data;
        setMarkers(mapData.markers || []);
        // مرکز/زوم را قبلاً در هندلرها تنظیم کرده‌ایم
      }
    } catch {
      toast.error("خطا در دریافت داده‌های بازار");
    } finally {
      setLoading(false);
    }
  }, [
    selectedProvinceId, selectedCityId, analysisDistrict,
    tradeType, propertyType, priceRange, sizeRange,
    buildingAge, roomsCount, selectedRegion,
  ]);

  useEffect(() => {
    if (selectedProvinceId) {
      fetchFilteredData();
    } else {
      setStats(null);
      setPriceTrend([]);
      fetchAllCountryMap();
    }
  }, [
    selectedProvinceId, selectedCityId, analysisDistrict,
    tradeType, propertyType, priceRange, sizeRange,
    buildingAge, roomsCount, selectedRegion,
  ]);

  // تشخیص موقعیت IP
  useEffect(() => {
    if (initialLocationDetected) return;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data?.country_code === "IR" && data?.region) {
          const allProvinces = getProvinces();
          const provinceMatch = allProvinces.find(
            (p) => p.Name.includes(data.region) || data.region.includes(p.Name)
          );
          if (provinceMatch) {
            setSelectedProvinceId(String(provinceMatch.Id));
            const counties = getCounties(provinceMatch.Id);
            let cityMatch;
            if (data.city) {
              cityMatch = counties.find((c) =>
                c.Name.includes(data.city) || data.city.includes(c.Name)
              );
              if (cityMatch) setSelectedCityId(String(cityMatch.Id));
            }
            setDynamicCenter(getCoordsFromLegacy(provinceMatch.Name, cityMatch?.Name || ""));
            setMapZoom(cityMatch ? 12 : 8);

            setSavedFilterValues({
              province: provinceMatch.Name,
              city: cityMatch?.Name || "",
              district: "none",
            });
            setInitialLocationDetected(true);
          }
        }
      } catch {}
    })();
  }, [initialLocationDetected]);

  // ─── فیلتر مارکرها بر اساس استان/شهر انتخابی ───
  const displayMarkers = useMemo(() => {
    if (!selectedProvinceName && !selectedCityName) return markers;
    return markers.filter((ad) => {
      const adProvince = (ad.province || "").trim();
      const adCity = (ad.city || "").trim();

      const matchProvince =
        !selectedProvinceName ||
        adProvince === selectedProvinceName ||
        adProvince.includes(selectedProvinceName) ||
        selectedProvinceName.includes(adProvince);

      if (!matchProvince) return false;

      if (selectedCityName) {
        return (
          adCity === selectedCityName ||
          adCity.includes(selectedCityName) ||
          selectedCityName.includes(adCity)
        );
      }
      return true;
    });
  }, [markers, selectedProvinceName, selectedCityName]);

  // Handlers
  const handleSelectProvince = useCallback((provinceId: string, provinceName: string) => {
    if (!provinceId) {
      setSelectedProvinceId("");
      setSelectedCityId("");
      setAnalysisDistrict("none");
      setActiveDistrictName("");
      setSavedFilterValues({});
      return;
    }
    setSelectedProvinceId(provinceId);
    setSelectedCityId("");
    setAnalysisDistrict("none");
    setActiveDistrictName("");
    setDynamicCenter(getCoordsFromLegacy(provinceName));
    setMapZoom(8);
    setSavedFilterValues((prev) => ({ ...prev, province: provinceName, city: "", district: "none" }));
  }, []);

  const handleSelectCity = useCallback((cityId: string, cityName: string) => {
    setSelectedCityId(cityId);
    setAnalysisDistrict("none");
    setActiveDistrictName("");
    const provinceName = selectedProvinceId
      ? getById(Number(selectedProvinceId))?.Name || ""
      : "";
    setDynamicCenter(getCoordsFromLegacy(provinceName, cityName));
    setMapZoom(12);
    setSavedFilterValues((prev) => ({ ...prev, city: cityName, district: "none" }));
  }, [selectedProvinceId]);

  const handleSelectDistrict = (districtName: string) => {
    setAnalysisDistrict(districtName);
    setActiveDistrictName(districtName);
    setAnalysisProvince(
      selectedProvinceId ? getById(Number(selectedProvinceId))?.Name || "" : ""
    );
    setAnalysisCity(selectedCityId ? getById(Number(selectedCityId))?.Name || "" : "");
    setAnalysisDistrictModal(districtName);
    setIsLocationModalOpen(true);
    // تنظیم زوم برای محله
    const provinceName = selectedProvinceId ? getById(Number(selectedProvinceId))?.Name || "" : "";
    const cityName = selectedCityId ? getById(Number(selectedCityId))?.Name || "" : "";
    if (cityName) {
      setDynamicCenter(getCoordsFromLegacy(provinceName, cityName));
      setMapZoom(13);
    }
  };

  const handleAnalyzeLocation = (level: "province" | "city" | "district", name: string) => {
    if (level === "province") {
      setAnalysisProvince(name);
      setAnalysisCity("");
      setAnalysisDistrictModal("");
    } else if (level === "city") {
      setAnalysisCity(name);
      setAnalysisDistrictModal("");
    } else {
      setAnalysisDistrictModal(name);
    }
    setIsLocationModalOpen(true);
  };

  // 🆕 مهم: وقتی فیلتر اعمال می‌شود، مقادیر استان/شهر/منطقه را به‌روزرسانی می‌کنیم
  const handleMarketFilterApply = useCallback((filters: MarketFilterValues) => {
    setSavedFilterValues(filters);
    setTradeType(filters.tradeType);
    setPropertyType(filters.propertyType);
    setPriceRange(filters.priceRange);
    setSizeRange(filters.sizeRange);
    setBuildingAge(filters.buildingAge);
    setRoomsCount(filters.roomsCount);
    setSelectedRegion(filters.region);
    setAnalysisDistrict(filters.district);

    if (filters.province) {
      const prov = findProvinceByName(filters.province);
      if (prov) {
        setSelectedProvinceId(String(prov.Id));
        if (filters.city) {
          const city = findCountyByName(prov.Id, filters.city);
          if (city) {
            setSelectedCityId(String(city.Id));
            setDynamicCenter(getCoordsFromLegacy(prov.Name, city.Name));
            setMapZoom(filters.district && filters.district !== "none" ? 13 : 12);
          }
        } else {
          setSelectedCityId("");
          setDynamicCenter(getCoordsFromLegacy(prov.Name));
          setMapZoom(8);
        }
      } else {
        setSelectedProvinceId("");
        setSelectedCityId("");
        setDynamicCenter([32.4279, 53.688]);
        setMapZoom(6);
      }
    } else {
      setSelectedProvinceId("");
      setSelectedCityId("");
      setDynamicCenter([32.4279, 53.688]);
      setMapZoom(6);
    }

    // اگر محله انتخاب شده بود، activeDistrictName را تنظیم کن
    if (filters.district && filters.district !== "none") {
      setActiveDistrictName(filters.district);
    } else {
      setActiveDistrictName("");
    }
  }, []);

  const handleMarketFilterReset = useCallback(() => {
    setSavedFilterValues({});
    setTradeType("");
    setPropertyType("");
    setPriceRange("");
    setSizeRange("");
    setBuildingAge("");
    setRoomsCount("");
    setSelectedRegion("همه");
    setAnalysisDistrict("none");
    setSelectedProvinceId("");
    setSelectedCityId("");
    setActiveDistrictName("");
    setDynamicCenter([32.4279, 53.688]);
    setMapZoom(6);
  }, []);

  const initialFilterValues = useMemo(() => ({
    ...savedFilterValues,
    province: selectedProvinceId
      ? getById(Number(selectedProvinceId))?.Name || ""
      : "",
    city: selectedCityId
      ? getById(Number(selectedCityId))?.Name || ""
      : "",
    district: analysisDistrict,
  }), [savedFilterValues, selectedProvinceId, selectedCityId, analysisDistrict]);

  const filteredTrend = useMemo(() => priceTrend.slice(-parseInt(chartPeriod)), [priceTrend, chartPeriod]);
  const movingAverage = useMemo(() => {
    const window = 3;
    return filteredTrend.map((_, idx) => {
      if (idx < window - 1) return null;
      const sum = filteredTrend.slice(idx - window + 1, idx + 1).reduce((acc, d) => acc + (d.avgPricePerMeter || 0), 0);
      return Math.round(sum / window);
    });
  }, [filteredTrend]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="min-h-screen space-y-6 px-4 sm:px-6 pb-8" dir="rtl">
      {/* Header */}
      <motion.header variants={itemVariants} className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background border-b border-primary/10 rounded-b-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <MapPinned className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">تحلیل بازار مسکن</h1>
              <p className="text-sm text-muted-foreground">بروزرسانی لحظه‌ای | داده‌های واقعی</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm p-1.5 rounded-2xl border">
            <button onClick={() => setTradeType("buy")} className={`px-5 py-2.5 text-sm font-bold rounded-xl ${tradeType === "buy" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              <Home className="w-4 h-4 inline ml-1" /> خرید
            </button>
            <button onClick={() => setTradeType("rent")} className={`px-5 py-2.5 text-sm font-bold rounded-xl ${tradeType === "rent" ? "bg-blue-500 text-white" : "text-muted-foreground"}`}>
              <Calendar className="w-4 h-4 inline ml-1" /> اجاره
            </button>
          </div>
        </div>
      </motion.header>

      {/* Filter */}
      <motion.div variants={itemVariants}>
        <MarketAdvancedFilter
          initialValues={initialFilterValues}
          onApply={handleMarketFilterApply}
          onReset={handleMarketFilterReset}
          loading={loading}
        />
      </motion.div>

      {/* Location Browser + Map */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-[500px]">
          <LocationHierarchyBrowser
            selectedProvinceId={selectedProvinceId}
            selectedCityId={selectedCityId}
            onSelectProvince={handleSelectProvince}
            onSelectCity={handleSelectCity}
            onSelectDistrict={handleSelectDistrict}
            onAnalyze={handleAnalyzeLocation}
          />
        </div>
        <div className="lg:col-span-2 h-[500px] rounded-2xl overflow-hidden border">
          <MapView
            markers={displayMarkers}
            loading={loading}
            center={dynamicCenter}
            zoom={mapZoom}
            onAdClick={(ad: any) => ad.district && handleSelectDistrict(ad.district)}
            className="h-full"
          />
        </div>
      </motion.div>

      {/* Chart + Pulse */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriceTrendChart
            filteredTrend={filteredTrend}
            movingAverage={movingAverage}
            stats={stats}
            chartPeriod={chartPeriod}
            setChartPeriod={setChartPeriod}
          />
        </div>
        <div>
          <MarketPulseCard stats={stats} tradeType={tradeType} formatMoney={formatMoney} />
        </div>
      </motion.div>

      {/* District Trend */}
      <AnimatePresence>
        {activeDistrictName && (
          <DistrictTrendChart
            data={priceTrend}
            loading={loading}
            districtName={activeDistrictName}
            onClose={() => setActiveDistrictName("")}
          />
        )}
      </AnimatePresence>

      {/* Location Analytics Modal */}
      <LocationAnalyticsModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        initialProvince={analysisProvince}
        initialCity={analysisCity}
        initialDistrict={analysisDistrictModal}
        formatMoney={formatMoney}
      />
    </motion.div>
  );
}