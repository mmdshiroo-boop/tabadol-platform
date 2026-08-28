// components/market/MarketPulseCard.tsx
"use client";

import React, { useMemo } from "react";
import {
  Home,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Cloud,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatPillProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: "up" | "down";
}

function StatPill({ label, value, icon, trend }: StatPillProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/50">
      <div className="p-1.5 rounded-lg bg-background dark:bg-muted/30 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p
          className={cn(
            "text-sm font-bold mt-0.5 tabular-nums",
            trend === "up"
              ? "text-emerald-600 dark:text-emerald-400"
              : trend === "down"
                ? "text-rose-600 dark:text-rose-400"
                : "text-foreground"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

interface MarketPulseCardProps {
  stats: {
    avgPricePerMeter: number;
    totalAdsCount: number;
    growthRate: number;
    maxPrice: number;
    minPrice: number;
  } | null;
  tradeType: string;
  formatMoney: (value: number) => string;
}

export function MarketPulseCard({
  stats,
  tradeType,
  formatMoney,
}: MarketPulseCardProps) {
  const analysis = useMemo(() => {
    if (!stats || stats.totalAdsCount === 0) return null;
    const { totalAdsCount, growthRate } = stats;
    let status = {
      icon: <Cloud className="w-4 h-4" />,
      label: "رکود",
      color: "text-gray-500 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      borderColor: "border-gray-200 dark:border-gray-700",
    };
    if (tradeType === "rent")
      status = {
        icon: <Home className="w-4 h-4" />,
        label: "بازار اجاره",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
      };
    else if (growthRate > 5 && totalAdsCount > 50)
      status = {
        icon: <Zap className="w-4 h-4" />,
        label: "فوق‌العاده داغ",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
      };
    else if (growthRate > 3 && totalAdsCount > 30)
      status = {
        icon: <TrendingUp className="w-4 h-4" />,
        label: "پررونق",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800",
      };
    else if (growthRate > 0.5 && totalAdsCount > 20)
      status = {
        icon: <Activity className="w-4 h-4" />,
        label: "متعادل",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        borderColor: "border-emerald-200 dark:border-emerald-800",
      };
    else if (growthRate > -2 && totalAdsCount > 10)
      status = {
        icon: <Cloud className="w-4 h-4" />,
        label: "سرد",
        color: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-50 dark:bg-sky-900/20",
        borderColor: "border-sky-200 dark:border-sky-800",
      };
    return {
      status,
      totalAdsCount,
      growthRate,
      minPrice: stats.minPrice,
      maxPrice: stats.maxPrice,
    };
  }, [stats, tradeType]);

  if (!analysis)
    return (
      <Card className="rounded-2xl border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <Activity className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            داده‌ای برای تحلیل وجود ندارد
          </p>
        </CardContent>
      </Card>
    );

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader className="p-5 pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">
              نبض بازار
            </span>
          </CardTitle>
          <Badge
            className={cn(
              "text-xs font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full border",
              analysis.status.bgColor,
              analysis.status.color,
              analysis.status.borderColor
            )}
          >
            {analysis.status.icon}
            {analysis.status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Price per square meter */}
        <div className="bg-gradient-to-br from-primary/5 to-orange-500/5 dark:from-primary/10 dark:to-orange-500/10 rounded-2xl p-5 border border-primary/10 dark:border-primary/20">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            قیمت هر متر مربع
          </p>
          <p className="text-2xl font-black text-primary tabular-nums tracking-tight">
            {stats?.avgPricePerMeter
              ? `${(stats.avgPricePerMeter / 1_000_000).toFixed(1)}`
              : "—"}
            <span className="text-sm font-normal text-muted-foreground mr-1.5">
              میلیون تومان
            </span>
          </p>
        </div>

        {/* Stats grid */}
        <div className="space-y-3">
          <StatPill
            label="آگهی فعال"
            value={analysis.totalAdsCount?.toLocaleString("fa-IR") || "—"}
            icon={<Layers className="w-4 h-4" />}
          />
          <StatPill
            label="نوسان قیمت"
            value={`${analysis.growthRate >= 0 ? "+" : ""}${analysis.growthRate}%`}
            icon={
              analysis.growthRate >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )
            }
            trend={analysis.growthRate >= 0 ? "up" : "down"}
          />
          <StatPill
            label="بیشترین قیمت"
            value={analysis.maxPrice ? formatMoney(analysis.maxPrice) : "—"}
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          />
          <StatPill
            label="کمترین قیمت"
            value={analysis.minPrice ? formatMoney(analysis.minPrice) : "—"}
            icon={<TrendingDown className="w-4 h-4 text-rose-500" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}