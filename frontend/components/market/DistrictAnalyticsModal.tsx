// components/market/DistrictAnalyticsModal.tsx
"use client";

import React, { useMemo } from "react";
import {
  MapPin,
  DollarSign,
  X,
  Zap,
  TrendingUp,
  Activity,
  Cloud,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DistrictAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: any;
  loading: boolean;
  districtName: string;
  formatMoney: (value: number) => string;
}

export function DistrictAnalyticsModal({
  isOpen,
  onClose,
  analytics,
  loading,
  districtName,
  formatMoney,
}: DistrictAnalyticsModalProps) {
  const marketStatus = useMemo(() => {
    if (!analytics) return null;
    if (analytics.count > 50)
      return {
        icon: <Zap className="w-5 h-5" />,
        label: "داغ",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      };
    if (analytics.count > 20)
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        label: "پررونق",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
      };
    if (analytics.count > 10)
      return {
        icon: <Activity className="w-5 h-5" />,
        label: "متعادل",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
      };
    return {
      icon: <Cloud className="w-5 h-5" />,
      label: "سرد",
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",
    };
  }, [analytics]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-card dark:bg-card rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-border flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/95 dark:bg-card/90 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">
                  {districtName || "منطقه"}
                </h2>
                <p className="text-xs text-muted-foreground">تحلیل جامع</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5 space-y-5 flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full"
                />
                <p className="text-sm text-muted-foreground">در حال تحلیل...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Market status */}
                <div className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 dark:from-muted/10 dark:to-muted/20 p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl border-2 flex items-center justify-center", marketStatus?.bg, marketStatus?.color)}>
                      {marketStatus?.icon}
                    </div>
                    <div className="flex-1">
                      <span className={cn("text-sm font-bold", marketStatus?.color)}>
                        {marketStatus?.label}
                      </span>
                    </div>
                    <div className="w-20 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (analytics.count / 80) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          analytics.count > 50 ? "bg-red-500" :
                          analytics.count > 20 ? "bg-amber-500" :
                          analytics.count > 10 ? "bg-emerald-500" : "bg-sky-500"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-4 text-center border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">تعداد آگهی</p>
                    <p className="text-2xl font-black text-primary">{analytics.count}</p>
                  </div>
                  <div className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-4 text-center border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">میانگین متراژ</p>
                    <p className="text-2xl font-black text-primary">{analytics.avgArea} <span className="text-sm font-normal text-muted-foreground">متر</span></p>
                  </div>
                </div>

                {/* Price details */}
                <div className="bg-gradient-to-br from-primary/5 to-orange-500/5 dark:from-primary/10 dark:to-orange-500/10 rounded-2xl p-4 border border-primary/10 dark:border-primary/20 space-y-3">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> جزئیات قیمت
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قیمت هر متر:</span>
                      <span className="font-medium">{formatMoney(analytics.avgPricePerMeter)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قیمت کل:</span>
                      <span className="font-medium">{formatMoney(analytics.avgTotalPrice)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">بازه قیمت:</span>
                      <span className="font-medium">
                        {analytics.minPrice > 0 ? formatMoney(analytics.minPrice) : "نامشخص"} —{" "}
                        {analytics.maxPrice > 0 ? formatMoney(analytics.maxPrice) : "نامشخص"}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-11 rounded-xl gap-2 font-medium"
                  onClick={onClose}
                >
                  بستن
                </Button>
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">داده‌ای برای این منطقه یافت نشد</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}