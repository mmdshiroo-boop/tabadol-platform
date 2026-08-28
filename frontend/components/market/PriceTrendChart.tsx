// components/market/PriceTrendChart.tsx
"use client";

import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  DollarSign,
  Calendar,
  Home,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PriceTrendChartProps {
  filteredTrend: any[];
  movingAverage: (number | null)[];
  stats: any;
  chartPeriod: "3" | "6" | "12";
  setChartPeriod: (period: "3" | "6" | "12") => void;
}

// ─── کانفیگ داده‌های استاتیک ───
const PERIOD_LABELS: Record<string, string> = {
  "3": "۳ ماه",
  "6": "۶ ماه",
  "12": "۱۲ ماه",
};

const STAT_CARDS = [
  {
    key: "avgPricePerMeter",
    label: "میانگین قیمت هر متر",
    icon: <DollarSign className="w-5 h-5" />,
    color: "text-primary",
    bg: "bg-primary/10",
    format: (v: number) => `${(v / 1_000_000).toFixed(1)}`,
    suffix: " میلیون تومان",
  },
  {
    key: "totalAdsCount",
    label: "آگهی‌های فعال",
    icon: <Home className="w-5 h-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    format: (v: number) => v.toLocaleString("fa-IR"),
    suffix: " آگهی",
  },
  {
    key: "growthRate",
    label: "نرخ رشد (ماهانه)",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    format: (v: number) => `${v >= 0 ? "+" : ""}${v}%`,
    suffix: "",
  },
];

// ─── کامپوننت‌های داخلی ───

/** کارت آمار خلاصه */
function SummaryCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:shadow-md transition-shadow",
        className,
      )}
    >
      <div className="p-2.5 rounded-xl bg-muted/50 dark:bg-muted/20 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-black text-foreground mt-0.5 tabular-nums tracking-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

/** Tooltip سفارشی نمودار */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.isUp ?? true;
    return (
      <div className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl min-w-[200px] text-right">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
          <span className="text-xs font-bold text-foreground">{label}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold gap-1",
              isUp
                ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20"
                : "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/20",
            )}
          >
            {isUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {isUp ? "صعودی" : "نزولی"}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">قیمت هر متر:</span>
            <span
              className={cn(
                "font-mono font-black",
                isUp ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {((data.avgPricePerMeter || 0) / 1_000_000).toFixed(2)}
              <span className="text-[10px] font-normal ml-1">م.ت</span>
            </span>
          </div>
          {data.ma && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">میانگین متحرک:</span>
              <span className="font-mono font-bold text-primary">
                {(data.ma / 1_000_000).toFixed(2)}
                <span className="text-[10px] font-normal ml-1">م.ت</span>
              </span>
            </div>
          )}
          {data.totalAds !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">تعداد آگهی:</span>
              <span className="font-mono font-bold text-foreground">
                {data.totalAds?.toLocaleString("fa-IR") ?? "—"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

/* ════════════════ MAIN COMPONENT ════════════════ */
export function PriceTrendChart({
  filteredTrend,
  movingAverage,
  stats,
  chartPeriod,
  setChartPeriod,
}: PriceTrendChartProps) {
  const upColor = "#f97316"; // orange-500
  const downColor = "#ef4444"; // red-500
  const gridColor = "hsl(var(--border) / 0.4)";
  const maColor = "hsl(var(--primary))";
  const textColor = "hsl(var(--foreground))";

  const chartData = useMemo(
    () =>
      filteredTrend.map((item: any, idx: number) => ({
        ...item,
        ma: movingAverage?.[idx] || null,
        isUp:
          idx > 0
            ? item.avgPricePerMeter >= filteredTrend[idx - 1].avgPricePerMeter
            : true,
      })),
    [filteredTrend, movingAverage],
  );

  const prices = filteredTrend
    .map((d: any) => d.avgPricePerMeter)
    .filter(Boolean);
  const hasData = prices.length > 0;

  const lastTrend =
    filteredTrend.length >= 2
      ? filteredTrend[filteredTrend.length - 1].avgPricePerMeter >=
        filteredTrend[filteredTrend.length - 2].avgPricePerMeter
      : true;
  const trendColor = lastTrend ? upColor : downColor;

  // محاسبه محدوده Y
  let yMin = 0,
    yMax = 100_000_000;
  if (hasData) {
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const diff = maxPrice - minPrice;
    yMin = minPrice - diff * 0.2;
    yMax = maxPrice + diff * 0.2;
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="p-5 pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">
                  نوسان قیمت هر متر مربع
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحلیل روند قیمت در {PERIOD_LABELS[chartPeriod]} گذشته
              </p>
            </div>
          </div>

          {/* انتخاب بازه زمانی */}
          <div className="flex items-center gap-1 bg-muted/40 dark:bg-muted/20 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {(["3", "6", "12"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                  chartPeriod === p
                    ? "bg-background dark:bg-muted shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 pb-2">
          {STAT_CARDS.map((card) => {
            let rawValue: number = 0;
            if (card.key === "avgPricePerMeter") rawValue = stats.avgPricePerMeter || 0;
            else if (card.key === "totalAdsCount") rawValue = stats.totalAdsCount || 0;
            else if (card.key === "growthRate") rawValue = stats.growthRate ?? 0;
            return (
              <SummaryCard
                key={card.key}
                icon={
                  <span className={card.color}>{card.icon}</span>
                }
                label={card.label}
                value={`${card.format(rawValue)}${card.suffix}`}
                className={card.bg}
              />
            );
          })}
        </div>
      )}

      {/* Chart Area */}
      <CardContent className="p-3 h-80 sm:h-96">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              داده‌ای برای نمودار وجود ندارد
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-xs">
              پس از انتخاب استان یا شهر، نمودار قیمت بر اساس داده‌های واقعی رسم
              خواهد شد.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="priceUpGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={upColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={upColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="priceDownGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={downColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={downColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={gridColor}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 11,
                  fontWeight: 500,
                  fill: textColor,
                }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fontWeight: 500,
                  fill: textColor,
                }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}م`}
                axisLine={false}
                tickLine={false}
                width={55}
                domain={[yMin, yMax]}
                orientation="right"
              />
              <Tooltip content={<CustomTooltip />} />
              {/* ⭐ تغییر به basis برای انحنای سینوسی */}
              <Area
                type="basis"
                dataKey="avgPricePerMeter"
                stroke={trendColor}
                strokeWidth={2.5}
                fill={
                  lastTrend
                    ? "url(#priceUpGradient)"
                    : "url(#priceDownGradient)"
                }
                fillOpacity={1}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: trendColor,
                  strokeWidth: 2,
                  fill: "#fff",
                }}
              />
              {/* ⭐ میانگین متحرک هم basis */}
              <Area
                type="basis"
                dataKey="ma"
                stroke={maColor}
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="none"
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}