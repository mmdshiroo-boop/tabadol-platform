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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api/client";
import { toast } from "sonner";

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
  if (count > 50) return { icon: <Zap className="w-5 h-5" />, label: "داغ", color: "text-red-500", bg: "bg-red-50 border-red-200" };
  if (count > 20) return { icon: <TrendingUp className="w-5 h-5" />, label: "پررونق", color: "text-amber-500", bg: "bg-amber-50 border-amber-200" };
  if (count > 10) return { icon: <Activity className="w-5 h-5" />, label: "متعادل", color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200" };
  return { icon: <Cloud className="w-5 h-5" />, label: "سرد", color: "text-sky-500", bg: "bg-sky-50 border-sky-200" };
};

const PERIOD_LABELS: Record<string, string> = { "3": "۳ ماه", "6": "۶ ماه", "12": "۱۲ ماه" };

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

  if (!isOpen) return null;

  const trendColor = "#f97316"; // orange-500

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* پس‌زمینه */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}
        />
        {/* مودال */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-card rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-border flex flex-col"
        >
          {/* هدر */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold truncate">
                  تحلیل بازار {data?.locationName || province || city || district}
                </h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  {province && <button onClick={() => { setProvince(""); setCity(""); setDistrict(""); }} className="hover:text-primary font-medium">{province}</button>}
                  {city && <><ChevronRight className="w-3 h-3 -rotate-180" /> <button onClick={() => setCity("")} className="hover:text-primary font-medium">{city}</button></>}
                  {district && <><ChevronRight className="w-3 h-3 -rotate-180" /> <span className="text-foreground font-medium">{district}</span></>}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl shrink-0"><X className="w-5 h-5" /></Button>
          </div>

          {/* محتوا */}
          <ScrollArea className="flex-1 p-6 space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full" />
                <p className="text-sm text-muted-foreground">در حال تحلیل...</p>
              </div>
            ) : data ? (
              <>
                {/* وضعیت بازار */}
                <div className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-5">
                  <div className="flex items-center gap-5">
                    <div className={cn("p-3 rounded-2xl border-2 flex items-center justify-center", marketStatus?.bg, marketStatus?.color)}>
                      {marketStatus?.icon}
                    </div>
                    <div className="flex-1">
                      <span className={cn("text-base font-bold", marketStatus?.color)}>{marketStatus?.label}</span>
                      <p className="text-xs text-muted-foreground mt-1">{data.totalAds} آگهی فعال</p>
                    </div>
                    <div className="w-24 h-2 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (data.totalAds / 80) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn("h-full rounded-full", data.totalAds > 50 ? "bg-red-500" : data.totalAds > 20 ? "bg-amber-500" : data.totalAds > 10 ? "bg-emerald-500" : "bg-sky-500")}
                      />
                    </div>
                  </div>
                </div>

                {/* کارت‌های آمار */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/30 rounded-2xl p-4 text-center border">
                    <p className="text-xs text-muted-foreground mb-1">تعداد آگهی</p>
                    <p className="text-2xl font-black text-primary">{data.totalAds}</p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-4 text-center border">
                    <p className="text-xs text-muted-foreground mb-1">میانگین متراژ</p>
                    <p className="text-2xl font-black text-primary">{data.avgArea}<span className="text-sm font-normal text-muted-foreground mr-1">متر</span></p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-4 text-center border">
                    <p className="text-xs text-muted-foreground mb-1">میانگین قیمت کل</p>
                    <p className="text-xl font-black text-primary">{formatMoney(data.avgTotalPrice)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-4 text-center border">
                    <p className="text-xs text-muted-foreground mb-1">نرخ رشد</p>
                    <p className={cn("text-xl font-black", data.growthRate >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {data.growthRate >= 0 ? "+" : ""}{data.growthRate}%
                    </p>
                  </div>
                </div>

                {/* جزئیات قیمت */}
                <div className="bg-gradient-to-br from-primary/5 to-orange-500/5 rounded-2xl p-5 border border-primary/10">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4" /> جزئیات قیمت
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between sm:flex-col sm:gap-1">
                      <span className="text-muted-foreground">قیمت هر متر</span>
                      <span className="font-bold">{formatMoney(data.avgPricePerMeter)}</span>
                    </div>
                    <div className="flex justify-between sm:flex-col sm:gap-1">
                      <span className="text-muted-foreground">قیمت کل</span>
                      <span className="font-bold">{formatMoney(data.avgTotalPrice)}</span>
                    </div>
                    <div className="flex justify-between sm:flex-col sm:gap-1">
                      <span className="text-muted-foreground">بازه قیمت</span>
                      <span className="font-bold">{data.minPrice > 0 ? formatMoney(data.minPrice) : "—"} — {data.maxPrice > 0 ? formatMoney(data.maxPrice) : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* نمودار */}
                {data.marketTrends.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        روند قیمت {data.locationName}
                      </h4>
                      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
                        {(["3", "6", "12"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setChartPeriod(p)}
                            className={cn(
                              "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                              chartPeriod === p ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {PERIOD_LABELS[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-80 w-full bg-muted/20 rounded-2xl p-3 border">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredTrend} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="modalPriceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.5)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}م`} axisLine={false} tickLine={false} width={55} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="bg-background/95 backdrop-blur-xl border rounded-xl p-3 shadow-xl text-sm">
                                  <p className="font-bold mb-1">{label}</p>
                                  <p className="text-primary font-mono">{(payload[0].value / 1_000_000).toFixed(1)} میلیون تومان</p>
                                </div>
                              );
                            }}
                          />
                          <Area type="basis" dataKey="avgPricePerMeter" stroke={trendColor} strokeWidth={2.5} fill="url(#modalPriceGradient)" dot={false} activeDot={{ r: 5, fill: "#fff", stroke: trendColor, strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* زیرشاخه‌ها */}
                {data.subLocations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      {data.level === "province" ? <><Building className="w-4 h-4 text-primary" /> شهرهای {data.locationName}</> : <><Home className="w-4 h-4 text-primary" /> محله‌های {data.locationName}</>}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.subLocations.map((loc) => (
                        <button
                          key={loc.name}
                          onClick={() => data.level === "province" ? goToCity(loc.name) : goToDistrict(loc.name)}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {data.level === "province" ? <Building className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                            </span>
                            <div className="text-right">
                              <p className="text-sm font-bold">{loc.name}</p>
                              <p className="text-[10px] text-muted-foreground">{loc.totalAds} آگهی</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{formatMoney(loc.avgTotalPrice)}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Search className="w-14 h-14 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-base text-muted-foreground font-medium">داده‌ای برای این منطقه یافت نشد</p>
                <p className="text-xs text-muted-foreground mt-1">لطفاً استان یا شهر دیگری را انتخاب کنید</p>
              </div>
            )}
          </ScrollArea>

          {/* فوتر */}
          <div className="border-t p-4 flex gap-3 shrink-0">
            {data?.parent && (
              <Button variant="outline" onClick={goUp} className="gap-2">
                <ChevronRight className="w-4 h-4" />
                بازگشت به {data.parent.type === "province" ? "استان" : "شهر"}
              </Button>
            )}
            <Button className="flex-1" onClick={onClose}>بستن</Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}