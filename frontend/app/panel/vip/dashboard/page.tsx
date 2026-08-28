"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Eye,
  FileText,
  Heart,
  BarChart3,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Calendar,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { vipApi } from "@/services/api/vip.api";
import type { VipStats } from "@/types";
import apiClient from "@/services/api/client";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/getImageUrl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import LoyaltyStatusCard from "@/components/loyalty/LoyaltyStatusCard"; // ✅

const formatMoney = (value: number) => {
  if (!value) return "—";
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1)} میلیارد`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} میلیون`;
  return value.toLocaleString("fa-IR") + " تومان";
};

const daysLeft = (endDate: string | null | undefined): string => {
  if (!endDate) return "نامشخص";
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "پایان یافته";
  return `${diffDays} روز`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function VipDashboardPage() {
  const [stats, setStats] = useState<VipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recentAds, setRecentAds] = useState<any[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    setAdsLoading(true);
    try {
      const [statsData, adsRes] = await Promise.all([
        vipApi.getStats(),
        apiClient.get("/ads/user/me", { params: { limit: 5 } }),
      ]);
      setStats(statsData as VipStats);
      setRecentAds(adsRes.data.data || []);
    } catch (err) {
      console.error("Error fetching VIP data:", err);
      toast.error("خطا در دریافت اطلاعات داشبورد");
      setError(true);
    } finally {
      setLoading(false);
      setAdsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 px-3 sm:px-6" dir="rtl">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" /> {/* برای کارت باشگاه */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 sm:h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        dir="rtl"
      >
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-muted-foreground font-medium">
          متأسفانه اطلاعات بارگذاری نشد.
        </p>
        <Button
          onClick={fetchData}
          variant="outline"
          className="gap-2 rounded-xl"
        >
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  const subscriptionEnd = stats?.subscriptionEndDate || null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 px-3 sm:px-6 pb-8"
      dir="rtl"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 border border-primary/20 shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
                داشبورد ویژه
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                آمار و اطلاعات کاربری شما
              </p>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold gap-1.5 shadow-md shadow-primary/10 self-end sm:self-auto">
            <Crown className="w-3.5 h-3.5" />
            {stats?.isVip ? "طرح ویژه فعال" : "کاربر ویژه"}
          </Badge>
        </div>
      </motion.div>

      {/* کارت باشگاه مشتریان */}
      <motion.div variants={itemVariants}>
        <LoyaltyStatusCard />
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          title="آگهی‌های من"
          value={stats?.totalAds ?? 0}
          icon={FileText}
          href="/panel/vip/my-ads"
          description="کل آگهی‌های ثبت‌شده"
        />
        <StatCard
          title="بازدیدها"
          value={(stats?.views ?? 0).toLocaleString()}
          icon={Eye}
          href="/panel/vip/analytics"
          trend={
            stats?.weeklyGrowth !== undefined &&
            stats?.weeklyGrowth !== null &&
            (stats?.views ?? 0) > 0
              ? {
                  value: `${stats.weeklyGrowth >= 0 ? "+" : ""}${stats.weeklyGrowth}%`,
                  isPositive: stats.weeklyGrowth >= 0,
                }
              : undefined
          }
          description="نسبت به هفته قبل"
        />
        <StatCard
          title="ذخیره شده‌ها"
          value={(stats?.savedAds ?? 0).toLocaleString()}
          icon={Heart}
          href="/panel/vip/bookmarks"
          description="آگهی‌های نشان‌شده"
        />
        <StatCard
          title="اعتبار اشتراک"
          value={daysLeft(subscriptionEnd)}
          icon={Calendar}
          description={
            subscriptionEnd
              ? `تا ${new Date(subscriptionEnd).toLocaleDateString("fa-IR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`
              : "اطلاعات در دسترس نیست"
          }
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link href="/panel/vip/analytics">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl bg-card/80 backdrop-blur-sm cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">آمار پیشرفته</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مشاهده جزئیات بازدیدها
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/panel/vip/market-analysis">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl bg-card/80 backdrop-blur-sm cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">تحلیل بازار</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  بررسی روندها و تحلیل صنف
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Recent Ads */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 pb-2 px-5 pt-5">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              آخرین آگهی‌های شما
            </CardTitle>
            <Link href="/panel/vip/my-ads">
              <Button
                variant="ghost"
                size="sm"
                className="text-primary gap-1 rounded-xl text-xs font-bold"
              >
                مشاهده همه
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {adsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : recentAds.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm font-bold">هیچ آگهی ثبت نکرده‌اید</p>
                <Link href="/create-ad">
                  <Button
                    variant="link"
                    className="mt-2 text-primary font-bold"
                  >
                    ثبت آگهی جدید
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAds.map((ad) => (
                  <div
                    key={ad._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30 gap-3 group"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30">
                        <img
                          src={getImageUrl(ad.images?.[0])}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/user.webp";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">
                          {ad.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{ad.city}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span>
                            {new Date(ad.createdAt).toLocaleDateString("fa-IR")}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span>{ad.views || 0} بازدید</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 sm:self-center">
                      <p className="font-black text-primary tabular-nums text-sm">
                        {formatMoney(ad.price)}
                      </p>
                      {ad.isVip && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 rounded-full px-3">
                          <Crown className="w-3 h-3" />
                          ویژه
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}