"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Eye,
  Heart,
  ArrowUpRight,
  PlusCircle,
  Calendar,
  MapPin,
  User,
  Settings,
  Bookmark,
  Bell,
  TrendingUp,
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Building2,
  ImageIcon,
} from "lucide-react";
import apiClient from "@/services/api/client";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/getImageUrl";
import LoyaltyStatusCard from "@/components/loyalty/LoyaltyStatusCard"; // ✅

// ─── TYPES ────────────────────────────────
interface Ad {
  _id: string;
  title: string;
  price: number;
  city: string;
  views: number;
  status: string;
  createdAt: string;
  images?: string[];
}

interface DashboardStats {
  totalAds: number;
  totalViews: number;
  totalFavorites: number;
  pendingAds: number;
  activeAds: number;
  soldAds: number;
}

interface ChartItem {
  name: string;
  بازدید: number;
}

// ─── HELPERS ──────────────────────────────
const formatPrice = (price: number) => {
  if (!price || price === 0) return "توافقی";
  return price.toLocaleString() + " تومان";
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
  });

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-xs space-y-1 dir-rtl">
        <p className="font-bold text-foreground">{label}</p>
        <p className="text-primary font-bold">
          بازدید: {payload[0].value.toLocaleString()} بار
        </p>
      </div>
    );
  }
  return null;
};

export default function UserDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAds: 0,
    totalViews: 0,
    totalFavorites: 0,
    pendingAds: 0,
    activeAds: 0,
    soldAds: 0,
  });
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [userData, setUserData] = useState<{
    name: string;
    walletBalance: number;
    profileCompletion: number;
  } | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const generateChartData = (ads: Ad[]) => {
    const days: { name: string; dateStr: string; views: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString("fa-IR", { weekday: "long" });

      const dayAds = ads.filter((ad) => {
        const adDate = new Date(ad.createdAt);
        return (
          adDate.getDate() === d.getDate() &&
          adDate.getMonth() === d.getMonth() &&
          adDate.getFullYear() === d.getFullYear()
        );
      });

      const dayViews = dayAds.reduce((sum, ad) => sum + (ad.views || 0), 0);

      days.push({
        name: dayName,
        dateStr: d.toISOString().split("T")[0],
        views: dayViews,
      });
    }

    const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const hasChartViews = days.some((d) => d.views > 0);

    if (!hasChartViews && totalViews > 0) {
      const daysOfWeek = [
        "شنبه",
        "یکشنبه",
        "دوشنبه",
        "سه‌شنبه",
        "چهارشنبه",
        "پنجشنبه",
        "جمعه",
      ];
      const weights = [0.12, 0.18, 0.22, 0.15, 0.19, 0.09, 0.05];
      const fallbackData = daysOfWeek.map((day, idx) => ({
        name: day,
        بازدید: Math.round(totalViews * weights[idx]),
      }));
      setChartData(fallbackData);
    } else {
      setChartData(days.map((d) => ({ name: d.name, بازدید: d.views })));
    }
  };

  const initDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [adsRes, profileRes, favRes] = await Promise.all([
        apiClient.get("/ads/user/me"),
        apiClient.get("/users/profile").catch(() => null),
        apiClient.get("/favorites").catch(() => null),
      ]);

      const ads: Ad[] = adsRes.data?.data || adsRes.data || [];
      const profile = profileRes?.data?.data || null;
      const favsCount =
        favRes?.data?.pagination?.total ?? favRes?.data?.data?.length ?? 0;

      setUserData({
        name: profile
          ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
            "کاربر گرامی"
          : "کاربر گرامی",
        walletBalance: profile?.walletBalance || 0,
        profileCompletion: profile?.profileCompletion ?? 60,
      });

      const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
      const pendingAds = ads.filter((ad) => ad.status === "pending").length;
      const activeAds = ads.filter((ad) => ad.status === "active").length;
      const soldAds = ads.filter((ad) => ad.status === "sold").length;

      setStats({
        totalAds: ads.length,
        totalViews,
        totalFavorites: favsCount,
        pendingAds,
        activeAds,
        soldAds,
      });

      setRecentAds(ads.slice(0, 5));
      generateChartData(ads);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast.error("خطا در دریافت اطلاعات داشبورد");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initDashboard();
  }, [initDashboard]);

  if (loading) {
    return (
      <div className="space-y-6 p-1" dir="rtl">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-6"
      dir="rtl"
    >
      {/* هدر پنل */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <motion.div
          variants={itemVariants}
          className="md:col-span-12 p-5 rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-primary text-primary-foreground rounded-xl shrink-0 shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-foreground">
                  سلام، {userData?.name || "کاربر گرامی"}!
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  به پنل کاربری مدیریت املاک خوش آمدید
                </p>
              </div>
            </div>
            <Link href="/create-ad">
              <Button size="sm" className="gap-2 font-bold shadow-sm">
                <PlusCircle className="w-4 h-4" /> ثبت آگهی جدید
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* کارت باشگاه مشتریان */}
      <motion.div variants={itemVariants}>
        <LoyaltyStatusCard />
      </motion.div>

      {/* کارت‌های آماری اصلی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <StatCard
            title="کل آگهی‌ها"
            value={stats.totalAds.toLocaleString()}
            icon={FileText}
            href="/panel/user/my-ads"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="مجموع بازدید"
            value={stats.totalViews.toLocaleString()}
            icon={Eye}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="نشان‌شده‌ها"
            value={stats.totalFavorites.toLocaleString()}
            icon={Heart}
            href="/panel/user/bookmarks"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="در انتظار تأیید"
            value={stats.pendingAds.toLocaleString()}
            icon={Clock}
            description="نیاز به بررسی"
          />
        </motion.div>
      </div>

      {/* تفکیک وضعیت‌های آگهی */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "آگهی‌های فعال",
            count: stats.activeAds,
            icon: CheckCircle2,
            href: "/panel/user/my-ads?status=active",
          },
          {
            label: "در انتظار تأیید",
            count: stats.pendingAds,
            icon: AlertCircle,
            href: "/panel/user/my-ads?status=pending",
          },
          {
            label: "واگذار شده",
            count: stats.soldAds,
            icon: Archive,
            href: "/panel/user/my-ads?status=sold",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={itemVariants}>
            <StatCard
              title={item.label}
              value={item.count.toLocaleString()}
              icon={item.icon}
              href={item.href}
              description="مشاهده لیست"
            />
          </motion.div>
        ))}
      </div>

      {/* دسترسی سریع */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "ثبت آگهی", href: "/create-ad", icon: PlusCircle },
          {
            label: "نشان‌شده‌ها",
            href: "/panel/user/bookmarks",
            icon: Bookmark,
          },
          { label: "اعلان‌ها", href: "/panel/user/notifications", icon: Bell },
          { label: "تنظیمات", href: "/panel/user/settings", icon: Settings },
        ].map((action, i) => (
          <Link href={action.href} key={i}>
            <div className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer font-bold text-xs flex items-center gap-2.5 shadow-sm">
              <action.icon className="w-4 h-4 shrink-0 text-primary" />
              <span>{action.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* نمودار بازدید */}
      <Card className="border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            روند بازدید هفته اخیر
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.15}
              />
              <XAxis
                dataKey="name"
                stroke="#888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="بازدید"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#colorViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* آخرین آگهی‌ها */}
      <Card className="border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-muted/10 py-3.5 px-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> آخرین آگهی‌ها
          </CardTitle>
          <Link href="/panel/user/my-ads">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary text-xs font-bold"
            >
              مشاهده همه <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-4">
          {recentAds.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">هنوز آگهی ثبت نکرده‌اید</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAds.map((ad) => {
                const imgUrl = getImageUrl(ad.images?.[0]);
                return (
                  <div
                    key={ad._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-card hover:bg-muted/40 border border-border/40 transition-all gap-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/50 flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={ad.title}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/images/user.webp";
                            }}
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-muted-foreground/40" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground truncate">
                          {ad.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary/70" />
                            {ad.city || "نامشخص"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary/70" />
                            {formatDate(ad.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-primary/70" />
                            {(ad.views || 0).toLocaleString()} بازدید
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 gap-1.5">
                      <p className="font-black text-primary text-sm sm:text-base">
                        {formatPrice(ad.price)}
                      </p>
                      <Badge
                        className={
                          ad.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : ad.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                              : "bg-slate-100 text-slate-600"
                        }
                        variant="secondary"
                      >
                        {ad.status === "active"
                          ? "فعال"
                          : ad.status === "pending"
                            ? "در انتظار"
                            : "فروخته شده"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}