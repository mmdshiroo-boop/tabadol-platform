// components/market/DistrictTrendChart.tsx
"use client";

import React, { useMemo } from "react";
import {
  BarChart3,
  MapPin,
  X,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DistrictTrendChartProps {
  data: any[];
  loading: boolean;
  districtName: string;
  onClose: () => void;
}

export function DistrictTrendChart({
  data,
  loading,
  districtName,
  onClose,
}: DistrictTrendChartProps) {
  const upColor = "#f97316",
        downColor = "#ef4444",
        maColor = "hsl(var(--primary))",
        gridColor = "hsl(var(--border) / 0.4)",
        textColor = "hsl(var(--foreground))";

  const chartData = useMemo(
    () =>
      data.map((item: any, idx: number) => {
        const slice = data.slice(Math.max(0, idx - 2), idx + 1);
        const ma =
          slice.reduce(
            (sum: number, d: any) => sum + (d.avgPricePerMeter || 0),
            0,
          ) / slice.length;
        return {
          ...item,
          ma: idx >= 2 ? Math.round(ma) : null,
          isUp:
            idx > 0
              ? item.avgPricePerMeter >= data[idx - 1].avgPricePerMeter
              : true,
        };
      }),
    [data],
  );

  if (!districtName) return null;

  const firstPrice = data[0]?.avgPricePerMeter || 0,
        lastPrice = data[data.length - 1]?.avgPricePerMeter || 0,
        isUp = lastPrice >= firstPrice,
        trendColor = isUp ? upColor : downColor;

  const prices = data.map((d: any) => d.avgPricePerMeter).filter(Boolean);
  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices),
        maxPrice = Math.max(...prices),
        diff = maxPrice - minPrice,
        yMin = minPrice - diff * 0.15,
        yMax = maxPrice + diff * 0.15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">نوسان قیمت در {districtName}</span>
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-muted shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-4 min-h-[300px] h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id={`dGrad-${districtName}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fontWeight: 500, fill: textColor }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 500, fill: textColor }}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}م`}
                axisLine={false}
                tickLine={false}
                width={55}
                domain={[yMin, yMax]}
                orientation="right"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl min-w-[180px]">
                      <p className="text-xs font-bold mb-2">{label}</p>
                      <p className="text-sm font-mono tabular-nums">
                        {(point.avgPricePerMeter / 1_000_000).toFixed(1)} م.ت
                      </p>
                      {point.ma && (
                        <p className="text-xs text-primary mt-1">
                          MA: {(point.ma / 1_000_000).toFixed(1)}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="avgPricePerMeter"
                stroke={trendColor}
                strokeWidth={2.5}
                fill={`url(#dGrad-${districtName})`}
                dot={false}
                activeDot={{ r: 6, fill: "hsl(var(--background))", stroke: trendColor, strokeWidth: 2.5 }}
              />
              <Area
                type="monotone"
                dataKey="ma"
                stroke={maColor}
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="none"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}