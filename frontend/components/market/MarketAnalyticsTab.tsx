"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MapPin,
  TrendingUp,
  Clock,
  X,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const formatPersianDate = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const parseableDate = /^\d{4}-\d{2}$/.test(dateString)
      ? `${dateString}-01`
      : dateString;
    const date = new Date(parseableDate);
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
        month: "long",
        year: "numeric",
      }).format(date);
    }
    return dateString;
  } catch {
    return dateString;
  }
};

interface MarketAnalyticsTabProps {
  stats: any;
  markers: any[];
  selectedDistrict: string;
  handleDistrictClick: (district: string) => void;
  districtTrendData: any[];
  districtAnalysis: string;
  setSelectedDistrict: (district: string) => void;
}

export default function MarketAnalyticsTab({
  stats,
  markers,
  selectedDistrict,
  handleDistrictClick,
  districtTrendData,
  districtAnalysis,
  setSelectedDistrict,
}: MarketAnalyticsTabProps) {
  const [chartPeriod, setChartPeriod] = useState<"3" | "6" | "12">("6");
  const priceTrend = stats?.marketTrends || [];

  const filteredTrend = useMemo(
    () => priceTrend.slice(-parseInt(chartPeriod)),
    [priceTrend, chartPeriod],
  );

  const themeColor = "#f97316";
  const gridColor = "hsl(var(--border) / 0.4)";
  const textColor = "hsl(var(--muted-foreground))";

  const chartData = useMemo(
    () =>
      filteredTrend.map((item: any) => ({
        ...item,
        persianDate: formatPersianDate(item.month),
      })),
    [filteredTrend],
  );

  const prices = filteredTrend
    .map((d: any) => d.avgPricePerMeter)
    .filter(Boolean);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceDiff = maxPrice - minPrice || 1;
  const yMin = minPrice - priceDiff * 0.1;
  const yMax = maxPrice + priceDiff * 0.1;

  return (
    <div className="space-y-6">
      {/* Main Price Trend Chart */}
      <Card className="rounded-2xl border-border/30 overflow-hidden bg-card shadow-sm">
        <CardHeader className="p-5 pb-4 border-b border-border/20 bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              روند نوسان قیمت هر متر مربع (میانگین شهر)
            </CardTitle>
            <div className="text-left" dir="ltr">
              <p className="text-2xl font-mono font-bold text-foreground">
                {filteredTrend[filteredTrend.length - 1]?.avgPricePerMeter
                  ? (
                      filteredTrend[filteredTrend.length - 1]
                        .avgPricePerMeter / 1_000_000
                    ).toFixed(2)
                  : "—"}
              </p>
              <span className="text-xs text-muted-foreground">
                میلیون تومان
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 h-[350px] sm:h-[400px]" dir="ltr">
          {filteredTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient
                    id="orangeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={themeColor}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={themeColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="persianDate"
                  tick={{
                    fontSize: 11,
                    fill: textColor,
                    fontFamily: "Vazirmatn",
                  }}
                  axisLine={false}
                  tickLine={false}
                  dy={12}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: textColor,
                    fontFamily: "Vazirmatn",
                  }}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)} M`}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  domain={[yMin, yMax]}
                  orientation="left"
                />
                <Tooltip
                  cursor={{
                    stroke: themeColor,
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload;
                    return (
                      <div
                        className="bg-background border border-border rounded-xl p-4 shadow-xl min-w-[200px]"
                        dir="rtl"
                      >
                        <p className="text-sm font-bold mb-2 text-foreground">
                          {label}
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            میانگین قیمت:
                          </span>
                          <span className="font-bold text-orange-600">
                            {(point.avgPricePerMeter / 1_000_000).toFixed(2)}{" "}
                            میلیون تومان
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgPricePerMeter"
                  stroke={themeColor}
                  strokeWidth={3}
                  fill="url(#orangeGradient)"
                  dot={{
                    r: 4,
                    fill: "hsl(var(--background))",
                    stroke: themeColor,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: themeColor,
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="w-8 h-8 opacity-50" />
              <p className="text-sm mr-2">
                داده کافی برای رسم نمودار در دسترس نیست
              </p>
            </div>
          )}
        </CardContent>
        <div className="border-t border-border/20 px-5 py-3 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" /> بازه زمانی: {chartPeriod} ماهه
          </div>
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 border border-border/50">
            {["3", "6", "12"].map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p as "3" | "6" | "12")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  chartPeriod === p
                    ? "bg-background shadow-sm text-orange-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p} ماهه
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* District Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 rounded-2xl border-border/30 shadow-sm bg-card">
          <CardHeader className="p-5 border-b border-border/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              تحلیل منطقه‌ای
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto no-scrollbar p-3 space-y-2">
              {Array.from(
                new Set(markers.map((m) => m.district).filter(Boolean)),
              )
                .slice(0, 10)
                .map((district: any) => (
                  <button
                    key={district}
                    onClick={() => handleDistrictClick(district)}
                    className={`w-full text-right p-3 rounded-xl transition-all flex items-center justify-between border ${
                      selectedDistrict === district
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-600"
                        : "bg-transparent border-transparent hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span className="font-medium text-sm">{district}</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                ))}
              {markers.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  لطفاً ابتدا شهر یا فیلتر مورد نظر را انتخاب کنید.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedDistrict ? (
              <DistrictTrendChart
                key={selectedDistrict}
                data={districtTrendData}
                districtName={selectedDistrict}
                analysis={districtAnalysis}
                onClose={() => setSelectedDistrict("")}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[400px] rounded-2xl border border-dashed border-border/50 bg-muted/10 flex flex-col items-center justify-center text-muted-foreground p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 border border-orange-500/20">
                  <MapPin className="w-8 h-8 text-orange-500" />
                </div>
                <p className="font-bold text-foreground mb-1">
                  یک محله را انتخاب کنید
                </p>
                <p className="text-sm max-w-sm">
                  برای مشاهده نوسانات قیمت و تحلیل هوش مصنوعی، روی یکی از
                  محله‌های لیست کلیک کنید.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── DistrictTrendChart Component ───
function DistrictTrendChart({
  data,
  districtName,
  analysis,
  onClose,
}: {
  data: any[];
  districtName: string;
  analysis: string;
  onClose: () => void;
}) {
  const themeColor = "#f97316";
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      persianDate: formatPersianDate(item.month),
    }));
  }, [data]);

  const prices = data.map((d: any) => d.avgPricePerMeter).filter(Boolean);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const diff = maxPrice - minPrice || 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col h-full"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/20 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <MapPin className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              نوسان قیمت: {districtName}
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {data.length} ماه گذشته
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-600"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-4 flex-grow min-h-[250px]" dir="ltr">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 15, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`dGrad-${districtName}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={themeColor}
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="100%"
                    stopColor={themeColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="hsl(var(--border)/0.3)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="persianDate"
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                  fontFamily: "Vazirmatn",
                }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                hide
                domain={[minPrice - diff * 0.1, maxPrice + diff * 0.1]}
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--muted-foreground))",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div
                      className="bg-background border border-border rounded-lg p-2 shadow-lg"
                      dir="rtl"
                    >
                      <p className="text-xs font-bold text-orange-600">
                        {(point.avgPricePerMeter / 1_000_000).toFixed(2)}{" "}
                        میلیون تومان
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="avgPricePerMeter"
                stroke={themeColor}
                strokeWidth={2}
                fill={`url(#dGrad-${districtName})`}
                dot={{
                  r: 3,
                  fill: "hsl(var(--background))",
                  stroke: themeColor,
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 5,
                  fill: themeColor,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            داده‌ای موجود نیست
          </div>
        )}
      </div>
      {analysis && (
        <div className="border-t border-border/20 p-4 bg-muted/10">
          <div className="flex items-start gap-3" dir="rtl">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {analysis}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}