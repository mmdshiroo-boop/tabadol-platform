"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, DollarSign, X, Zap, TrendingUp, Activity, Cloud,
  Search, ChevronRight, Building, Home, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api/client";
import { toast } from "sonner";
import L from "leaflet";
// ─── انواع داده ───
interface LocationAnalysisData {
  level: "province" | "city" | "district";
  locationName: string;
  totalAds: number;
  avgPricePerMeter: number;
  avgTotalPrice: number;
  avgArea: number;
  minPrice: number;
  maxPrice: number;
  growthRate: number;
  marketTrends: { month: string; avgPricePerMeter: number }[];
  subLocations: { name: string; totalAds: number; avgPricePerMeter: number; avgTotalPrice: number }[];
  parent?: { type: string; name: string; province?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialProvince?: string;
  initialCity?: string;
  initialDistrict?: string;
  formatMoney: (value: number) => string;
}

// ─── وضعیت بازار ───
const statusConfig = (count: number) => {
  if (count > 50) return { icon: <Zap className="w-6 h-6" />, label: "بازار داغ", color: "text-red-500", bg: "bg-red-50 border-red-200" };
  if (count > 20) return { icon: <TrendingUp className="w-6 h-6" />, label: "پررونق", color: "text-amber-500", bg: "bg-amber-50 border-amber-200" };
  if (count > 10) return { icon: <Activity className="w-6 h-6" />, label: "متعادل", color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" };
  return { icon: <Cloud className="w-6 h-6" />, label: "سرد و آرام", color: "text-sky-500", bg: "bg-sky-50 border-sky-200" };
};

const PERIOD_LABELS: Record<string, string> = { "3": "۳ ماهه", "6": "۶ ماهه", "12": "۱۲ ماهه" };

// ════════════════ COMPONENT ════════════════
export function LocationAnalyticsModal({
  isOpen, onClose, initialProvince, initialCity, initialDistrict, formatMoney,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LocationAnalysisData | null>(null);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [chartPeriod, setChartPeriod] = useState<"3" | "6" | "12">("6");

  // همگام‌سازی با props
  useEffect(() => {
    if (isOpen) {
      setProvince(initialProvince || "");
      setCity(initialCity || "");
      setDistrict(initialDistrict || "");
    }
  }, [isOpen, initialProvince, initialCity, initialDistrict]);

  // دریافت تحلیل از API
  const fetchAnalysis = useCallback(async () => {
    if (!province && !city && !district) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const params: any = {};
      if (province) params.province = province;
      if (city) params.city = city;
      if (district) params.district = district;
      const res = await apiClient.get("/market/location-analysis", { params });
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setData(null);
        toast.error(res.data?.message || "خطا در دریافت تحلیل");
      }
    } catch (err: any) {
      setData(null);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }, [province, city, district]);

  useEffect(() => {
    if (isOpen) fetchAnalysis();
  }, [isOpen, fetchAnalysis]);

  // جابجایی بین سطوح
  const goToCity = (cityName: string) => { setCity(cityName); setDistrict(""); };
  const goToDistrict = (districtName: string) => { setDistrict(districtName); };
  const goUp = () => {
    if (district) setDistrict("");
    else if (city) setCity("");
    else if (province) setProvince("");
  };

  const marketStatus = useMemo(() => data ? statusConfig(data.totalAds) : null, [data]);

  // فیلتر نمودار بر اساس بازه زمانی
  const filteredTrend = useMemo(() => {
    if (!data?.marketTrends) return [];
    return data.marketTrends.slice(-parseInt(chartPeriod));
  }, [data, chartPeriod]);

  const trendColor = "#f97316"; // orange-500

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm"
        >
          {/* بدنه اصلی مودال */}
          <motion.div
            key="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-card rounded-3xl w-full max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col shadow-2xl border border-border overflow-hidden"
          >
            {/* هدر (ثابت) */}
            <div className="shrink-0 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black truncate">
                    تحلیل هوشمند بازار {data?.locationName || province || city || district}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                    {province && <button onClick={() => { setProvince(""); setCity(""); setDistrict(""); }} className="hover:text-primary transition-colors font-medium">{province}</button>}
                    {city && <><ChevronRight className="w-3.5 h-3.5 -rotate-180" /> <button onClick={() => setCity("")} className="hover:text-primary transition-colors font-medium">{city}</button></>}
                    {district && <><ChevronRight className="w-3.5 h-3.5 -rotate-180" /> <span className="text-foreground font-bold">{district}</span></>}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl bg-muted/50 hover:bg-rose-500 hover:text-white transition-colors shrink-0">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* محتوای اسکرول‌شونده */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 scroll-smooth custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full" />
                  <p className="text-sm font-bold text-muted-foreground animate-pulse">در حال تحلیل داده‌های بازار...</p>
                </div>
              ) : data ? (
                <div className="max-w-6xl mx-auto space-y-8">

                  {/* بخش ۱: وضعیت بازار و کارت‌های آمار */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* وضعیت بازار */}
                    <div className="lg:col-span-4 rounded-3xl border bg-gradient-to-br from-background to-muted/30 p-6 flex flex-col justify-center">
                      <div className="flex items-center gap-5 mb-4">
                        <div className={cn("p-4 rounded-2xl border-2 flex items-center justify-center shadow-sm", marketStatus?.bg, marketStatus?.color)}>
                          {marketStatus?.icon}
                        </div>
                        <div>
                          <span className={cn("text-xl font-black", marketStatus?.color)}>{marketStatus?.label}</span>
                          <p className="text-sm font-medium text-muted-foreground mt-1">تعداد آگهی: {data.totalAds} عدد</p>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (data.totalAds / 80) * 100)}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={cn("h-full rounded-full", data.totalAds > 50 ? "bg-red-500" : data.totalAds > 20 ? "bg-amber-500" : data.totalAds > 10 ? "bg-emerald-500" : "bg-sky-500")}
                        />
                      </div>
                    </div>

                    {/* کارت‌های آمار */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/20 hover:bg-muted/40 transition-colors rounded-3xl p-5 text-center border flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2">تعداد کل آگهی‌ها</p>
                        <p className="text-3xl font-black text-primary">{data.totalAds}</p>
                      </div>
                      <div className="bg-muted/20 hover:bg-muted/40 transition-colors rounded-3xl p-5 text-center border flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2">میانگین متراژ</p>
                        <p className="text-3xl font-black text-primary">{data.avgArea}<span className="text-base font-medium text-muted-foreground mr-1">متر</span></p>
                      </div>
                      <div className="bg-muted/20 hover:bg-muted/40 transition-colors rounded-3xl p-5 text-center border flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2">میانگین قیمت کل</p>
                        <p className="text-2xl font-black text-primary">{formatMoney(data.avgTotalPrice)}</p>
                      </div>
                      <div className="bg-muted/20 hover:bg-muted/40 transition-colors rounded-3xl p-5 text-center border flex flex-col justify-center items-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2">نرخ رشد منطقه</p>
                        <p className={cn("text-3xl font-black flex items-center justify-center gap-1", data.growthRate >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {data.growthRate >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingUp className="w-6 h-6 rotate-180" />}
                          {Math.abs(data.growthRate)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* بخش ۲: جزئیات قیمت */}
                  <div className="bg-gradient-to-br from-primary/5 via-primary/5 to-orange-500/5 rounded-3xl p-6 md:p-8 border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <DollarSign className="w-32 h-32" />
                    </div>
                    <h4 className="text-lg font-black text-primary flex items-center gap-2 mb-6">
                      <DollarSign className="w-6 h-6" /> تحلیل قیمتی منطقه
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-base">
                      <div className="flex justify-between md:flex-col md:gap-2 bg-background/50 p-4 rounded-2xl border">
                        <span className="text-muted-foreground font-bold">میانگین قیمت هر متر</span>
                        <span className="font-black text-lg">{formatMoney(data.avgPricePerMeter)}</span>
                      </div>
                      <div className="flex justify-between md:flex-col md:gap-2 bg-background/50 p-4 rounded-2xl border">
                        <span className="text-muted-foreground font-bold">میانگین قیمت کل</span>
                        <span className="font-black text-lg">{formatMoney(data.avgTotalPrice)}</span>
                      </div>
                      <div className="flex justify-between md:flex-col md:gap-2 bg-background/50 p-4 rounded-2xl border">
                        <span className="text-muted-foreground font-bold">بازه نوسان قیمت</span>
                        <span className="font-black text-primary">
                          {data.minPrice > 0 ? formatMoney(data.minPrice) : "—"} <span className="text-muted-foreground font-normal mx-1">تا</span> {data.maxPrice > 0 ? formatMoney(data.maxPrice) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* بخش ۳: نمودار روند */}
                  {data.marketTrends.length > 0 && (
                    <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h4 className="text-lg font-black flex items-center gap-2">
                          <BarChart3 className="w-6 h-6 text-primary" />
                          روند تغییرات قیمت در {data.locationName}
                        </h4>
                        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
                          {(["3", "6", "12"] as const).map((p) => (
                            <button
                              key={`period-${p}`}
                              onClick={() => setChartPeriod(p)}
                              className={cn(
                                "px-5 py-2 text-sm font-bold rounded-lg transition-all",
                                chartPeriod === p ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                              )}
                            >
                              {PERIOD_LABELS[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-[350px] w-full bg-muted/10 rounded-2xl p-4 border">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={filteredTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="modalPriceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={trendColor} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border)/0.7)" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={15} />
                            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 'bold' }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}م`} axisLine={false} tickLine={false} width={60} dx={-10} />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl text-sm">
                                    <p className="font-bold text-muted-foreground mb-2">{label}</p>
<p className="text-primary font-black text-lg">
  {(Number(payload[0]?.value ?? 0) / 1_000_000).toFixed(1)} میلیون تومان
</p>                                  </div>
                                );
                              }}
                            />
                            <Area type="basis" dataKey="avgPricePerMeter" stroke={trendColor} strokeWidth={3} fill="url(#modalPriceGradient)" dot={{ r: 4, strokeWidth: 2, fill: 'var(--background)' }} activeDot={{ r: 7, fill: trendColor, stroke: "#fff", strokeWidth: 3 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* بخش ۴: زیرشاخه‌ها (کارتی) */}
                  {data.subLocations.length > 0 && (
                    <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                          {data.level === "province" ? <Building className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-lg font-black">
                            {data.level === "province"
                              ? `شهرهای استان ${data.locationName}`
                              : `محله‌های ${data.locationName}`}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {data.subLocations.length} مورد | بر اساس تعداد آگهی مرتب شده
                          </p>
                        </div>
                      </div>

                      {/* گرید کارت‌ها — کاملاً بازنویسی شده */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.subLocations.map((loc, idx) => {
                          const rankColor =
                            idx === 0
                              ? "from-amber-400 to-yellow-500"
                              : idx === 1
                                ? "from-slate-400 to-slate-500"
                                : idx === 2
                                  ? "from-orange-400 to-orange-500"
                                  : "from-primary/60 to-primary/80";

                          return (
                            <motion.button
                              key={`${loc.name}-${idx}`}
                              onClick={() =>
                                data.level === "province" ? goToCity(loc.name) : goToDistrict(loc.name)
                              }
                              whileHover={{ scale: 1.02, y: -4 }}
                              whileTap={{ scale: 0.98 }}
                              className="relative group flex flex-col p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-xl transition-all duration-300 text-right overflow-hidden"
                            >
                              {/* نوار رتبه (بالا) */}
                              <div
                                className={`absolute top-0 right-0 h-1 bg-gradient-to-r ${rankColor}`}
                                style={{ width: `${Math.max(20, 100 - idx * 10)}%` }}
                              />

                              {/* ردیف بالا: نام + تعداد آگهی */}
                              <div className="flex items-start justify-between w-full mb-3 mt-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-black group-hover:text-primary transition-colors truncate">
                                    {loc.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {data.locationName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {loc.totalAds} آگهی
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-sm font-black text-primary">
                                  {idx + 1}
                                </div>
                              </div>

                              {/* قیمت هر متر */}
                              <div className="mb-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                                <p className="text-[10px] text-muted-foreground font-bold mb-0.5">میانگین قیمت هر متر</p>
                                <p className="text-sm font-black text-foreground">
                                  {formatMoney(loc.avgPricePerMeter)}
                                </p>
                              </div>

                              {/* فوتر: قیمت کل + فلش */}
                              <div className="flex items-center justify-between w-full mt-auto pt-3 border-t border-border/40">
                                <span className="text-xs font-bold text-muted-foreground">
                                  میانگین کل: {formatMoney(loc.avgTotalPrice)}
                                </span>
                                <div className="w-7 h-7 rounded-full bg-primary/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300">
                                  <ChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Search className="w-20 h-20 mx-auto text-muted-foreground/20 mb-6" />
                  <p className="text-xl font-black text-muted-foreground">داده‌ای برای این منطقه یافت نشد</p>
                  <p className="text-sm font-medium text-muted-foreground mt-2">لطفاً استان، شهر یا محله دیگری را انتخاب کنید</p>
                </div>
              )}
            </div>

            {/* فوتر (ثابت در پایین) */}
            <div className="shrink-0 border-t bg-card/95 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-center justify-between z-10">
              <div className="w-full sm:w-auto">
                {data?.parent && (
                  <Button variant="outline" size="lg" onClick={goUp} className="w-full sm:w-auto gap-2 rounded-xl border-border/60 hover:bg-muted font-bold">
                    <ChevronRight className="w-4 h-4" />
                    بازگشت به {data.parent.type === "province" ? "استان" : "شهر"} قبلی
                  </Button>
                )}
              </div>
              <Button size="lg" className="w-full sm:w-auto min-w-[120px] rounded-xl font-bold text-base" onClick={onClose}>
                بستن پنجره
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: hsl(var(--border)); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: hsl(var(--muted-foreground) / 0.5); }
      `}} />
    </AnimatePresence>
  );
}