"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  TrendingUp,
  Eye,
  PlusCircle,
  Calendar,
  MapPin,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Home,
  Activity,
  CheckCircle2,
  Clock,
  Archive,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { adsApi, Ad } from "@/services/api/ads.api";
import { agentApi, Agent } from "@/services/api/agent.api";
import { getImageUrl } from "@/lib/getImageUrl";
import { cn } from "@/lib/utils";
import LoyaltyStatusCard from "@/components/loyalty/LoyaltyStatusCard"; // ✅

// ── Types ───────────────────────────────────
interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  pendingProperties: number;
  soldProperties: number;
  totalAgents: number;
  totalViews: number;
  totalDeals: number;
  monthlyGrowth: number;
  totalRevenue: number;
  conversionRate: number;
}

// ── Helpers ─────────────────────────────────
const formatPrice = (price: number): string => {
  if (!price || price === 0) return "توافقی";
  if (price >= 1_000_000_000)
    return (price / 1_000_000_000).toFixed(1) + " میلیارد تومان";
  return price.toLocaleString("fa-IR") + " تومان";
};

const formatDate = (date: string): string =>
  new Date(date).toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
  });

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// ── Main Component ──────────────────────────
export default function AgentDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeProperties: 0,
    pendingProperties: 0,
    soldProperties: 0,
    totalAgents: 0,
    totalViews: 0,
    totalDeals: 0,
    monthlyGrowth: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });

  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────
  const fetchDashboardData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [adsRes, agentsRes, statsRes] = await Promise.allSettled([
          adsApi.getMyAds({ limit: 100 }),
          agentApi.getAgents(),
          agentApi.getStats(),
        ]);

        const ads: Ad[] =
          adsRes.status === "fulfilled" ? adsRes.value.data || [] : [];
        const agents: Agent[] =
          agentsRes.status === "fulfilled" ? agentsRes.value || [] : [];
        const statsData: any =
          statsRes.status === "fulfilled" ? statsRes.value || {} : {};

        const activeAds = ads.filter((ad) => ad.status === "active").length;
        const pendingAds = ads.filter((ad) => ad.status === "pending").length;
        const soldAds = ads.filter((ad) => ad.status === "sold").length;
        const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
        const totalRevenue = ads
          .filter((ad) => ad.status === "sold")
          .reduce((sum, ad) => sum + (ad.price || 0), 0);
        const conversionRate =
          ads.length > 0 ? Math.round((soldAds / ads.length) * 100) : 0;

        setStats({
          totalProperties: ads.length,
          activeProperties: activeAds,
          pendingProperties: pendingAds,
          soldProperties: soldAds,
          totalAgents: agents.length,
          totalViews: totalViews,
          totalDeals: soldAds,
          monthlyGrowth: statsData.monthlyGrowth || 0,
          totalRevenue: totalRevenue,
          conversionRate: conversionRate,
        });

        const sortedAds = [...ads]
          .sort(
            (a, b) =>
              new Date(b.createdAt || "").getTime() -
              new Date(a.createdAt || "").getTime(),
          )
          .slice(0, 5);
        setRecentAds(sortedAds);
      } catch (err: any) {
        setError(err.response?.data?.message || "خطا در دریافت اطلاعات");
        toast.error("خطا در دریافت اطلاعات داشبورد");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Loading State ──────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 px-3 sm:px-6" dir="rtl">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" /> {/* کارت باشگاه */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // ── Error State ────────────────────────────
  if (error && stats.totalProperties === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-4"
        dir="rtl"
      >
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">خطا در بارگذاری اطلاعات</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button onClick={() => fetchDashboardData(true)} className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" />
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 px-3 sm:px-6 pb-8"
      dir="rtl"
    >
      {/* ════ Header ════ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 border border-primary/20 shadow-md"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
                داشبورد آژانس
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                مدیریت آگهی‌ها و مشاوران خود را از اینجا پیگیری کنید
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="gap-2 border-border/60 hover:bg-muted rounded-xl"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "در حال بروزرسانی..." : "بروزرسانی"}
          </Button>
        </div>
      </motion.div>

      {/* کارت باشگاه مشتریان */}
      <motion.div variants={itemVariants}>
        <LoyaltyStatusCard />
      </motion.div>

      {/* ════ KPI Cards ════ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          title="کل آگهی‌ها"
          value={stats.totalProperties.toLocaleString()}
          icon={Building}
          href="/panel/agent/my-ads"
          description={`${stats.activeProperties} فعال`}
        />
        <StatCard
          title="مشاوران"
          value={stats.totalAgents.toLocaleString()}
          icon={Users}
          href="/panel/agent/agents"
          description="اعضای آژانس"
        />
        <StatCard
          title="کل بازدیدها"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          description="بازدید آگهی‌ها"
        />
        <StatCard
          title="معاملات موفق"
          value={stats.totalDeals.toLocaleString()}
          icon={CheckCircle2}
          trend={{
            value: `${stats.conversionRate}%`,
            isPositive: stats.conversionRate > 30,
          }}
          description="نرخ تبدیل"
        />
      </motion.div>

      {/* ════ Secondary Stats ════ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard
          title="آگهی‌های فعال"
          value={stats.activeProperties.toLocaleString()}
          icon={FileText}
          href="/panel/agent/my-ads?status=active"
          description={`${stats.pendingProperties} در انتظار تأیید`}
        />
        <StatCard
          title="درآمد کل"
          value={formatPrice(stats.totalRevenue)}
          icon={DollarSign}
          description={`از ${stats.totalDeals} معامله`}
        />
        <StatCard
          title="رشد ماهانه"
          value={`${stats.monthlyGrowth >= 0 ? "+" : ""}${stats.monthlyGrowth}%`}
          icon={TrendingUp}
          trend={{
            value: `${stats.monthlyGrowth}%`,
            isPositive: stats.monthlyGrowth >= 0,
          }}
          description="نسبت به ماه قبل"
        />
      </motion.div>

      {/* ════ Quick Actions ════ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link href="/create-ad">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl bg-card/80 backdrop-blur-sm cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">ثبت آگهی جدید</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ملک جدیدی به فهرست خود اضافه کنید
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/panel/agent/my-ads">
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl bg-card/80 backdrop-blur-sm cursor-pointer group">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">مدیریت آگهی‌ها</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مشاهده و ویرایش آگهی‌های ثبت‌شده
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* ════ Recent Ads ════ */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-5 pt-5">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              آخرین آگهی‌های ثبت شده
            </CardTitle>
            <Link href="/panel/agent/my-ads">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary rounded-xl text-xs font-bold"
              >
                مشاهده همه
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {recentAds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-bold mb-2">هنوز آگهی ثبت نکرده‌اید</h3>
                <p className="text-sm mb-6">
                  اولین آگهی خود را ثبت کنید تا در معرض دید مشتریان قرار بگیرد
                </p>
                <Link href="/create-ad">
                  <Button className="gap-2 rounded-xl">
                    <PlusCircle className="w-5 h-5" />
                    ثبت آگهی جدید
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAds.map((ad) => (
                  <div
                    key={ad._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30 gap-3 group cursor-pointer"
                    onClick={() => window.open(`/ad/${ad._id}`, "_blank")}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30">
                        <img
                          src={getImageUrl(ad.images?.[0])}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/images/user.webp";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {ad.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary/70" />
                            {ad.city || "نامشخص"}
                          </span>
                          {ad.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary/70" />
                              {formatDate(ad.createdAt)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-primary/70" />
                            {ad.views || 0} بازدید
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 sm:self-center">
                      <p className="font-black text-primary text-sm">
                        {formatPrice(ad.price)}
                      </p>
                      {ad.isVip && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 rounded-full px-2.5 py-0.5">
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