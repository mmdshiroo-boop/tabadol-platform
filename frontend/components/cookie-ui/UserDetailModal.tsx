// components/cookie-ui/UserDetailModal.tsx (اصلاح‌شده)
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cookieAuditService } from "@/services/api/cookieAudit.api";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  Heart,
  TrendingUp,
  ImageIcon,
  Search,
  Home,
  Hash,
  Banknote,
  X,
  LayoutDashboard,
  Activity,
  Bookmark,
  Globe,
  Building,
  ShieldCheck,
  Fingerprint,
  Clock,
  ChevronLeft,
  Layers,
  Sparkles,
  BadgeCheck,
  Calendar,
  LogIn,
  Users,
  Star,
  FileCode,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatPrice(price: number) {
  if (!price || price === 0) return "توافقی";
  if (price >= 1_000_000_000)
    return `${(price / 1_000_000_000).toFixed(1)} میلیارد تومان`;
  if (price >= 1_000_000)
    return `${(price / 1_000_000).toFixed(0)} میلیون تومان`;
  return `${price.toLocaleString("fa-IR")} تومان`;
}

// ✅ اصلاح getImageUrl برای پشتیبانی از آرایه images
const getImageUrl = (img?: string | string[] | null): string => {
  if (!img) return "";
  const image = Array.isArray(img) ? img[0] : img;
  if (!image) return "";
  if (image.startsWith("http")) return image;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
};

function formatDate(date: string | Date): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date: string | Date): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const ROLE_LABELS: Record<string, string> = {
  user: "کاربر عادی",
  vip: "VIP",
  agent: "مشاور املاک",
  expert: "کارشناس",
  developer: "توسعه‌دهنده",
  admin: "مدیر",
  super_admin: "سوپر مدیر",
};

const ROLE_COLORS: Record<string, string> = {
  user: "bg-slate-100 text-slate-700 border-slate-200",
  vip: "bg-amber-100 text-amber-700 border-amber-200",
  agent: "bg-blue-100 text-blue-700 border-blue-200",
  expert: "bg-emerald-100 text-emerald-700 border-emerald-200",
  developer: "bg-violet-100 text-violet-700 border-violet-200",
  admin: "bg-red-100 text-red-700 border-red-200",
  super_admin: "bg-rose-100 text-rose-700 border-rose-200",
};

const SIDEBAR_TABS = [
  { id: "profile", icon: LayoutDashboard, label: "اطلاعات هویتی" },
  { id: "behavior", icon: Activity, label: "رفتار جستجو" },
  { id: "viewed", icon: Eye, label: "بازدیدها" },
  { id: "bookmarks", icon: Bookmark, label: "علاقه‌مندی‌ها" },
];

const TAB_GRADIENT: Record<string, string> = {
  profile: "from-blue-500 to-indigo-600",
  behavior: "from-primary to-orange-400",
  viewed: "from-violet-500 to-purple-600",
  bookmarks: "from-rose-500 to-pink-600",
};

const TAB_BG: Record<string, string> = {
  profile: "bg-blue-50 text-blue-600 border-blue-200",
  behavior: "bg-primary/5 text-primary border-primary/20",
  viewed: "bg-violet-50 text-violet-600 border-violet-200",
  bookmarks: "bg-rose-50 text-rose-600 border-rose-200",
};

function InfoField({
  icon: Icon,
  label,
  value,
  color = "text-primary",
  mono = false,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
  badge?: { text: string; className: string };
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/30 p-4 transition-all duration-300 hover:shadow-md hover:border-primary/30">
      <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start gap-3 relative">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:shadow-sm transition-shadow">
          <Icon className={cn("w-4.5 h-4.5", color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground font-medium mb-0.5">
            {label}
          </p>
          <p
            className={cn(
              "font-bold text-sm truncate",
              mono && "font-mono text-xs tracking-wide",
            )}
            dir={mono ? "ltr" : "rtl"}
          >
            {value || "—"}
          </p>
          {badge && (
            <Badge
              variant="outline"
              className={cn("mt-1 text-[9px] px-1.5", badge.className)}
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function BehaviorMetric({
  icon: Icon,
  label,
  value,
  sub,
  gradient = "from-primary/10 to-primary/5",
  iconColor = "text-primary",
  large = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  gradient?: string;
  iconColor?: string;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br p-4 transition-all hover:shadow-md",
        gradient,
        large && "p-5",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-xl flex items-center justify-center shrink-0",
            large ? "h-12 w-12" : "h-10 w-10",
            large && "bg-white/70 backdrop-blur-sm shadow-sm",
          )}
        >
          <Icon className={cn(large ? "w-6 h-6" : "w-5 h-5", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">
            {label}
          </p>
          <p
            className={cn(
              "font-extrabold truncate",
              large ? "text-lg" : "text-sm",
            )}
          >
            {value}
          </p>
          {sub && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdCard({ ad, showHeart }: { ad: any; showHeart?: boolean }) {
  // ✅ استفاده از images[0] به‌جای ad.image
  const imgUrl = getImageUrl(ad.images?.[0] || ad.image);
  return (
    <Link href={`/ads/${ad._id}`} target="_blank">
      <motion.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg group"
      >
        <div className="absolute top-2 right-2 z-10">
          <Badge
            variant={ad.status === "active" ? "default" : "secondary"}
            className={cn(
              "text-[9px] px-1.5 py-0 shadow-sm",
              ad.status === "active" &&
                "bg-emerald-500 hover:bg-emerald-500 text-white",
            )}
          >
            {ad.status === "active"
              ? "فعال"
              : ad.status === "sold"
                ? "فروش رفته"
                : ad.status}
          </Badge>
        </div>

        {showHeart && (
          <div className="absolute top-2 left-2 z-10">
            <div className="h-7 w-7 rounded-full bg-rose-500 flex items-center justify-center shadow-md">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
        )}

        <div className="flex gap-3 p-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border/50">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={ad.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors leading-relaxed">
              {ad.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <Banknote className="w-3 h-3 shrink-0 text-emerald-600" />
              <span className="font-semibold text-emerald-700">
                {formatPrice(ad.price)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{ad.city || "نامشخص"}</span>
              {ad.area && (
                <>
                  <span className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                  <span>{ad.area} متر</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  gradientColor = "from-primary/10 to-primary/5",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  gradientColor?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className={cn(
          "h-20 w-20 rounded-3xl bg-gradient-to-br flex items-center justify-center mb-5",
          gradientColor,
        )}
      >
        <Icon className="w-9 h-9 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-semibold text-foreground/80 mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ScoreBreakdownTooltip({
  breakdown,
}: {
  breakdown: {
    viewsScore: number;
    bookmarksScore: number;
    activityScore: number;
    verificationScore: number;
    profileScore: number;
  };
}) {
  return (
    <div className="space-y-1.5 text-[11px]">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">بازدید آگهی</span>
        <span className="font-bold text-violet-600">
          {breakdown.viewsScore}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">علاقه‌مندی‌ها</span>
        <span className="font-bold text-rose-500">
          {breakdown.bookmarksScore}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">سابقه فعالیت</span>
        <span className="font-bold text-blue-600">
          {breakdown.activityScore}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">احراز هویت</span>
        <span className="font-bold text-emerald-600">
          {breakdown.verificationScore}
          <span className="text-[9px] text-muted-foreground font-normal mr-1">
            {breakdown.verificationScore === 10
              ? "(کامل)"
              : breakdown.verificationScore === 7
                ? "(موبایل+کدملی)"
                : breakdown.verificationScore === 4
                  ? "(یکی از دو)"
                  : ""}
          </span>
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">تکمیل پروفایل</span>
        <span className="font-bold text-primary">{breakdown.profileScore}</span>
      </div>
      <Separator className="my-1" />
      <div className="flex justify-between gap-4 font-bold text-xs">
        <span>مجموع</span>
        <span>
          {(breakdown.viewsScore || 0) +
            (breakdown.bookmarksScore || 0) +
            (breakdown.activityScore || 0) +
            (breakdown.verificationScore || 0) +
            (breakdown.profileScore || 0)}
        </span>
      </div>
    </div>
  );
}

export default function UserDetailModal({
  userId,
  onClose,
  onDownloadReport,
}: {
  userId: string;
  onClose: () => void;
  onDownloadReport?: (userId: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setActiveTab("profile");
    cookieAuditService
      .getUserDetails(userId)
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => toast.error("خطا در دریافت اطلاعات کاربر"))
      .finally(() => setLoading(false));
  }, [userId]);

  const engagementScore = data?.interactionScore ?? 0;
  const scoreBreakdown = data?.scoreBreakdown ?? null;

  const favCount = data?.favoritesCount ?? data?.bookmarksCount ?? 0;
  const favList = data?.favorites ?? data?.bookmarks ?? [];

  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl h-[85vh] p-0 gap-0 flex flex-col rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">
          {loading
            ? "در حال بارگذاری..."
            : `جزئیات کاربر: ${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`}
        </DialogTitle>

        {/* ═══════ Header ═══════ */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-l from-primary/8 via-primary/4 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />

          <div className="relative p-5 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-[68px] h-[68px] rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-[3px] shadow-lg ring-1 ring-white/50">
                    {loading ? (
                      <Skeleton className="w-full h-full rounded-[13px]" />
                    ) : data?.user ? (
                      (() => {
                        const avatarSrc = getImageUrl(data.user.avatar);
                        return avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="w-full h-full rounded-[13px] object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-[13px] bg-muted flex items-center justify-center">
                            <User className="w-8 h-8 text-primary/60" />
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-full h-full rounded-[13px] bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-primary/60" />
                      </div>
                    )}
                  </div>
                  {data?.user?.isVerified && (
                    <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-lg bg-emerald-500 ring-2 ring-background flex items-center justify-center shadow-sm">
                      <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div>
                  {loading ? (
                    <>
                      <Skeleton className="h-6 w-40 mb-2 rounded-lg" />
                      <Skeleton className="h-4 w-56 rounded-lg" />
                    </>
                  ) : data ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight">
                          {data.user.firstName} {data.user.lastName}
                        </h2>
                        {data.user.role && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 rounded-md",
                              ROLE_COLORS[data.user.role] || ROLE_COLORS.user,
                            )}
                          >
                            {ROLE_LABELS[data.user.role] || data.user.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="w-3.5 h-3.5" />
                          {data.user.phone}
                        </span>
                        {data.user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {data.user.email}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-lg font-bold text-destructive">
                      داده‌ای یافت نشد
                    </p>
                  )}
                </div>
              </div>

              {/* Right side: badges + close + download button */}
              <div className="flex items-center gap-2">
                {!loading && data && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <Badge className="gap-1.5 rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                      <MapPin className="w-3 h-3" />
                      {data.user.city || "نامشخص"}
                    </Badge>
                    {data.user.province && (
                      <Badge variant="outline" className="gap-1.5 rounded-lg">
                        <Globe className="w-3 h-3" />
                        {data.user.province}
                      </Badge>
                    )}
                    {data.user.district && (
                      <Badge variant="outline" className="gap-1.5 rounded-lg">
                        <Building className="w-3 h-3" />
                        {data.user.district}
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadReport?.(userId)}
                  className="gap-2 rounded-xl text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileCode className="w-4 h-4" />
                  دانلود گزارش
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ Body ═══════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
          {loading ? (
            <div className="w-full p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-48 rounded-xl" />
            </div>
          ) : data ? (
            <TooltipProvider>
              <>
                {/* ──── Sidebar (mobile: horizontal scroll) ──── */}
                <div className="md:w-60 border-b md:border-b-0 md:border-l bg-gradient-to-b from-muted/30 to-muted/10 shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto">
                  <nav className="p-3 space-y-1 flex-1 flex md:flex-col gap-2">
                    {SIDEBAR_TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const count =
                        tab.id === "viewed"
                          ? data.viewedAdsCount
                          : tab.id === "bookmarks"
                            ? favCount
                            : null;
                      return (
                        <motion.button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          whileHover={{ x: -2 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-right relative overflow-hidden whitespace-nowrap",
                            isActive
                              ? "text-white shadow-md"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                          )}
                          initial={false}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTabBg"
                              className={cn(
                                "absolute inset-0 rounded-xl bg-gradient-to-l",
                                TAB_GRADIENT[tab.id],
                              )}
                              transition={{
                                type: "spring" as const,
                                stiffness: 400,
                                damping: 30,
                              }}
                            />
                          )}
                          <tab.icon
                            className={cn(
                              "w-4 h-4 shrink-0 relative z-10",
                              isActive && "drop-shadow-sm",
                            )}
                          />
                          <span className="flex-1 relative z-10">
                            {tab.label}
                          </span>
                          {count !== null && count > 0 && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] h-5 px-1.5 relative z-10 border-0",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {count}
                            </Badge>
                          )}
                        </motion.button>
                      );
                    })}
                  </nav>

                  {/* Sidebar footer: Engagement Score (hidden on mobile) */}
                  <div className="p-3 border-t hidden md:block">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 cursor-help">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-[11px] font-bold text-primary">
                              امتیاز تعامل
                            </span>
                          </div>
                          <Progress
                            value={engagementScore}
                            className="h-2 mb-1"
                          />
                          <p className="text-xs text-muted-foreground text-center font-bold tabular-nums">
                            {engagementScore} از ۱۰۰
                          </p>
                        </div>
                      </TooltipTrigger>
                      {scoreBreakdown && (
                        <TooltipContent side="left" className="w-52 p-3">
                          <p className="text-[11px] font-bold mb-2">
                            جزئیات امتیاز
                          </p>
                          <ScoreBreakdownTooltip breakdown={scoreBreakdown} />
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>

                {/* ──── Tab Content ──── */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{
                        type: "spring" as const,
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      {/* ══════ تب اطلاعات هویتی ══════ */}
                      {activeTab === "profile" && (
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 mb-1">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-black text-foreground">
                              اطلاعات هویتی کاربر
                            </h3>
                            <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            <InfoField
                              icon={User}
                              label="نام و نام خانوادگی"
                              value={`${data.user.firstName} ${data.user.lastName}`}
                            />
                            <InfoField
                              icon={Phone}
                              label="شماره تماس"
                              value={data.user.phone}
                              mono
                            />
                            {data.user.email && (
                              <InfoField
                                icon={Mail}
                                label="ایمیل"
                                value={data.user.email}
                                color="text-blue-600"
                              />
                            )}
                            <InfoField
                              icon={Hash}
                              label="کد ملی"
                              value={data.user.nationalCode || "ثبت نشده"}
                              mono
                            />
                            <InfoField
                              icon={Globe}
                              label="آدرس IP"
                              value={data.user.ip || "نامشخص"}
                              color="text-blue-600"
                              mono
                            />
                            <InfoField
                              icon={MapPin}
                              label="شهر"
                              value={data.user.city || "ثبت نشده"}
                              color="text-emerald-600"
                            />
                            {data.user.province && (
                              <InfoField
                                icon={Globe}
                                label="استان"
                                value={data.user.province}
                                color="text-emerald-600"
                              />
                            )}
                            {data.user.district && (
                              <InfoField
                                icon={Building}
                                label="منطقه"
                                value={data.user.district}
                                color="text-emerald-600"
                              />
                            )}
                            <InfoField
                              icon={Calendar}
                              label="تاریخ عضویت"
                              value={formatDateShort(data.user.createdAt)}
                              color="text-indigo-600"
                            />
                            <InfoField
                              icon={LogIn}
                              label="آخرین ورود"
                              value={formatDate(data.user.lastLogin)}
                              color="text-indigo-600"
                            />
                            <InfoField
                              icon={Users}
                              label="تعداد نشست‌ها"
                              value={String(data.user.sessionCount || 0)}
                              color="text-violet-600"
                            />
                            <InfoField
                              icon={Star}
                              label="امتیاز کاربر"
                              value={
                                data.user.rating > 0
                                  ? `${data.user.rating} از ۵`
                                  : "بدون امتیاز"
                              }
                              color="text-amber-600"
                            />
                          </div>

                          {/* Quick Summary Card */}
                          <div className="mt-2 p-4 rounded-xl bg-gradient-to-l from-primary/8 via-primary/4 to-transparent border border-primary/10">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Fingerprint className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-[11px] text-muted-foreground">
                                  خلاصه فعالیت کاربر
                                </p>
                                <p className="text-sm font-bold">
                                  <span className="text-primary">
                                    {data.viewedAdsCount}
                                  </span>{" "}
                                  بازدید آگهی و{" "}
                                  <span className="text-rose-500">
                                    {favCount}
                                  </span>{" "}
                                  علاقه‌مندی ثبت شده
                                  {data.activityPeriod?.totalPageViews > 0 && (
                                    <>
                                      {" — "}
                                      <span className="text-muted-foreground">
                                        مجموع{" "}
                                        {data.activityPeriod.totalPageViews}{" "}
                                        صفحه بازدید
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Verification Status — 3 Levels */}
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-[11px] font-bold text-muted-foreground mb-2.5">
                              وضعیت احراز هویت
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {/* Phone Verified */}
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl border text-center transition-colors",
                                  data.user.phoneVerified
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-muted/50 border-border",
                                )}
                              >
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Phone
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      data.user.phoneVerified
                                        ? "text-emerald-600"
                                        : "text-muted-foreground/50",
                                    )}
                                  />
                                  {data.user.phoneVerified ? (
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <X className="w-3 h-3.5 text-red-400" />
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    "text-[10px] font-bold",
                                    data.user.phoneVerified
                                      ? "text-emerald-700"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {data.user.phoneVerified
                                    ? "تایید شده"
                                    : "تایید نشده"}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  شماره موبایل
                                </p>
                              </div>

                              {/* National Code Verified */}
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl border text-center transition-colors",
                                  data.user.nationalCodeVerified
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-muted/50 border-border",
                                )}
                              >
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Hash
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      data.user.nationalCodeVerified
                                        ? "text-emerald-600"
                                        : "text-muted-foreground/50",
                                    )}
                                  />
                                  {data.user.nationalCodeVerified ? (
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <X className="w-3 h-3.5 text-red-400" />
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    "text-[10px] font-bold",
                                    data.user.nationalCodeVerified
                                      ? "text-emerald-700"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {data.user.nationalCodeVerified
                                    ? "تایید شده"
                                    : "تایید نشده"}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  کد ملی
                                </p>
                              </div>

                              {/* Admin Verified */}
                              <div
                                className={cn(
                                  "p-2.5 rounded-xl border text-center transition-colors",
                                  data.user.isVerified
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-muted/50 border-border",
                                )}
                              >
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <ShieldCheck
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      data.user.isVerified
                                        ? "text-emerald-600"
                                        : "text-muted-foreground/50",
                                    )}
                                  />
                                  {data.user.isVerified ? (
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <X className="w-3 h-3.5 text-red-400" />
                                  )}
                                </div>
                                <p
                                  className={cn(
                                    "text-[10px] font-bold",
                                    data.user.isVerified
                                      ? "text-emerald-700"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {data.user.isVerified
                                    ? "تایید شده"
                                    : "تایید نشده"}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  تکمیل هویت
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-muted border text-center">
                              <Eye className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                              <p className="text-xs font-bold">
                                {data.user.totalViews || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                کل بازدید‌ها
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted border text-center">
                              <Layers className="w-5 h-5 mx-auto mb-1.5 text-blue-600" />
                              <p className="text-xs font-bold">
                                {data.user.adsCount || 0}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                آگهی‌های ثبت‌شده
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-muted border text-center">
                              <Calendar className="w-5 h-5 mx-auto mb-1.5 text-orange-500" />
                              <p className="text-xs font-bold">
                                {new Date(
                                  data.user.createdAt,
                                ).toLocaleDateString("fa-IR")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                تاریخ عضویت
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ══════ تب رفتار جستجو ══════ */}
                      {activeTab === "behavior" && (
                        <div className="space-y-5">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-black text-foreground">
                              تحلیل رفتار جستجو
                            </h3>
                            <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <BehaviorMetric
                              icon={Home}
                              label="نوع ملک ترجیحی"
                              value={data.behavior.likelyPropertyType}
                              gradient="from-indigo-500/10 to-indigo-500/5"
                              iconColor="text-indigo-600"
                            />
                            <BehaviorMetric
                              icon={Search}
                              label="شهر پرجستجو"
                              value={data.behavior.mostFrequentCity}
                              sub={
                                data.behavior.mostFrequentProvince
                                  ? `استان: ${data.behavior.mostFrequentProvince}`
                                  : undefined
                              }
                              gradient="from-blue-500/10 to-blue-500/5"
                              iconColor="text-blue-600"
                            />
                            <BehaviorMetric
                              icon={Search}
                              label="تعداد جستجوهای انجام‌شده"
                              value={data.behavior.totalSearches || 0}
                              sub={
                                data.behavior.searchCities?.length > 0
                                  ? `شهرها: ${data.behavior.searchCities.join("، ")}`
                                  : undefined
                              }
                              gradient="from-cyan-500/10 to-cyan-500/5"
                              iconColor="text-cyan-600"
                            />
                            <BehaviorMetric
                              icon={Clock}
                              label="دوره فعالیت"
                              value={
                                data.activityPeriod?.firstView
                                  ? `${formatDateShort(data.activityPeriod.firstView)} تا ${formatDateShort(data.activityPeriod.lastView)}`
                                  : "نامشخص"
                              }
                              gradient="from-teal-500/10 to-teal-500/5"
                              iconColor="text-teal-600"
                            />
                          </div>

                          {/* Price Range Card */}
                          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-5">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-br-full" />
                            <div className="relative flex items-center gap-5">
                              <div className="h-14 w-14 rounded-2xl bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center shrink-0">
                                <TrendingUp className="w-7 h-7 text-primary" />
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs text-muted-foreground font-medium">
                                  محدوده قیمت بر اساس بازدیدها
                                </p>
                                <p className="text-xl font-black text-primary">
                                  {data.behavior.priceRange || "نامشخص"}
                                </p>
                                {data.behavior.rentRange && (
                                  <p className="text-sm font-bold text-blue-600 mt-1">
                                    {data.behavior.rentRange}
                                  </p>
                                )}
                                {data.behavior.hasNegotiable && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] bg-white/60 border-primary/20 mt-1"
                                  >
                                    {data.behavior.negotiableCount} آگهی توافقی
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price Categories */}
                          {data.behavior.priceCategories && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {data.behavior.priceCategories.under1M > 0 && (
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                  <p className="text-lg font-black text-emerald-700">
                                    {data.behavior.priceCategories.under1M}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    زیر ۱ میلیون
                                  </p>
                                </div>
                              )}
                              {data.behavior.priceCategories.m1to5 > 0 && (
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                                  <p className="text-lg font-black text-blue-700">
                                    {data.behavior.priceCategories.m1to5}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    ۱ تا ۵ میلیارد
                                  </p>
                                </div>
                              )}
                              {data.behavior.priceCategories.m5to20 > 0 && (
                                <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-center">
                                  <p className="text-lg font-black text-violet-700">
                                    {data.behavior.priceCategories.m5to20}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    ۵ تا ۲۰ میلیارد
                                  </p>
                                </div>
                              )}
                              {data.behavior.priceCategories.above20B > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                                  <p className="text-lg font-black text-amber-700">
                                    {data.behavior.priceCategories.above20B}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    بالای ۲۰ میلیارد
                                  </p>
                                </div>
                              )}
                              {data.behavior.priceCategories.negotiable > 0 && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                                  <p className="text-lg font-black text-rose-600">
                                    {data.behavior.priceCategories.negotiable}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    توافقی
                                  </p>
                                </div>
                              )}
                              {data.behavior.priceCategories.rental > 0 && (
                                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
                                  <p className="text-lg font-black text-cyan-700">
                                    {data.behavior.priceCategories.rental}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    رهن و اجاره
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          <Separator />

                          {/* پروفایل خریدار/مستاجر */}
                          {data.behavior.buyerProfile && (
                            <BehaviorMetric
                              icon={Users}
                              label="پروفایل خریدار"
                              value={data.behavior.buyerProfile}
                              sub={
                                data.behavior.dealTypeDistribution?.length > 0
                                  ? data.behavior.dealTypeDistribution
                                      .map(
                                        (d: any) => `${d.type}: ${d.percent}%`,
                                      )
                                      .join(" | ")
                                  : undefined
                              }
                              gradient="from-amber-500/10 to-amber-500/5"
                              iconColor="text-amber-600"
                              large
                            />
                          )}

                          {/* توزیع شهرها */}
                          {data.behavior.cityDistribution?.length > 0 && (
                            <div className="rounded-xl border bg-card p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-primary" />
                                <h4 className="text-xs font-black">
                                  شهرهای مورد بازدید
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {data.behavior.cityDistribution
                                  .slice(0, 6)
                                  .map((item: any, i: number) => (
                                    <div
                                      key={item.city}
                                      className="flex items-center gap-3"
                                    >
                                      <span className="text-[10px] text-muted-foreground w-4 text-center font-bold">
                                        {i + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-xs font-bold truncate">
                                            {item.city}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground font-mono mr-2">
                                            {item.count} بازدید
                                          </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                              width: `${item.percent}%`,
                                            }}
                                            transition={{
                                              delay: i * 0.1,
                                              duration: 0.5,
                                            }}
                                            className={cn(
                                              "h-full rounded-full",
                                              i === 0
                                                ? "bg-primary"
                                                : i === 1
                                                  ? "bg-primary/60"
                                                  : "bg-primary/30",
                                            )}
                                          />
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold text-muted-foreground w-8 text-left">
                                        {item.percent}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* توزیع نوع معامله */}
                          {data.behavior.dealTypeDistribution?.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {data.behavior.dealTypeDistribution.map(
                                (item: any) => {
                                  const colors: Record<string, string> = {
                                    "خرید (فروش)":
                                      "from-emerald-500/10 to-emerald-500/5 border-emerald-200",
                                    "رهن و اجاره":
                                      "from-blue-500/10 to-blue-500/5 border-blue-200",
                                    "اجاره روزانه":
                                      "from-cyan-500/10 to-cyan-500/5 border-cyan-200",
                                    معاوضه:
                                      "from-amber-500/10 to-amber-500/5 border-amber-200",
                                    "رهن کامل":
                                      "from-violet-500/10 to-violet-500/5 border-violet-200",
                                  };
                                  return (
                                    <div
                                      key={item.type}
                                      className={cn(
                                        "p-3 rounded-xl border text-center",
                                        colors[item.type] ||
                                          "bg-muted border-border",
                                      )}
                                    >
                                      <p className="text-xl font-black">
                                        {item.count}
                                      </p>
                                      <p className="text-[11px] font-bold">
                                        {item.type}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {item.percent}%
                                      </p>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          )}

                          {/* توزیع نوع ملک */}
                          {data.behavior.propertyTypeDistribution?.length >
                            0 && (
                            <div className="rounded-xl border bg-card p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Home className="w-4 h-4 text-indigo-500" />
                                <h4 className="text-xs font-black">
                                  نوع ملک‌های مورد علاقه
                                </h4>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {data.behavior.propertyTypeDistribution.map(
                                  (item: any, i: number) => (
                                    <Badge
                                      key={item.type}
                                      variant="outline"
                                      className={cn(
                                        "px-3 py-1.5 text-xs font-bold gap-1.5",
                                        i === 0 &&
                                          "bg-primary/10 border-primary/30 text-primary",
                                      )}
                                    >
                                      <span>{item.type}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        ({item.count})
                                      </span>
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {/* محدوده متراژی */}
                          {data.behavior.areaDistribution?.length > 0 && (
                            <div className="rounded-xl border bg-card p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Layers className="w-4 h-4 text-teal-500" />
                                <h4 className="text-xs font-black">
                                  محدوده متراژی ترجیحی
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {data.behavior.areaDistribution.map(
                                  (item: any, i: number) => (
                                    <div
                                      key={item.range}
                                      className="flex items-center gap-3"
                                    >
                                      <span className="text-[11px] font-bold w-24 text-right">
                                        {item.range}
                                      </span>
                                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{
                                            width: `${item.percent}%`,
                                          }}
                                          transition={{
                                            delay: i * 0.1,
                                            duration: 0.4,
                                          }}
                                          className="h-full rounded-full bg-teal-500"
                                        />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground w-10 text-left">
                                        {item.percent}%
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}

                          {/* منطقه‌شناسی عمیق */}
                          {data.behavior.districtDistribution?.length > 0 && (
                            <div className="rounded-xl border bg-card p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Building className="w-4 h-4 text-rose-500" />
                                <h4 className="text-xs font-black">
                                  منطقه‌شناسی عمیق
                                </h4>
                              </div>
                              <div className="space-y-3">
                                {data.behavior.districtDistribution
                                  .slice(0, 4)
                                  .map((cityItem: any) => (
                                    <div key={cityItem.city}>
                                      <p className="text-[11px] font-black text-primary mb-1.5">
                                        {cityItem.city}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {cityItem.districts
                                          .slice(0, 4)
                                          .map((d: any) => (
                                            <Badge
                                              key={d.name}
                                              variant="secondary"
                                              className="text-[10px] px-2 py-0.5 gap-1"
                                            >
                                              <MapPin className="w-2.5 h-2.5" />
                                              {d.name}
                                              <span className="text-muted-foreground">
                                                ({d.count})
                                              </span>
                                            </Badge>
                                          ))}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Activity Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border text-center group hover:shadow-md transition-shadow">
                              <Eye className="w-5 h-5 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                              <p className="text-2xl font-black tabular-nums">
                                {data.viewedAdsCount}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                بازدید آگهی
                              </p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/5 to-transparent border text-center group hover:shadow-md transition-shadow">
                              <Heart className="w-5 h-5 mx-auto mb-2 text-rose-500 group-hover:scale-110 transition-transform" />
                              <p className="text-2xl font-black tabular-nums">
                                {favCount}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                علاقه‌مندی
                              </p>
                            </div>
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border text-center group hover:shadow-md transition-shadow">
                              <Sparkles className="w-5 h-5 mx-auto mb-2 text-emerald-500 group-hover:scale-110 transition-transform" />
                              <p className="text-2xl font-black tabular-nums">
                                {engagementScore}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                امتیاز تعامل
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ══════ تب بازدیدها ══════ */}
                      {activeTab === "viewed" && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-1">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-black text-foreground">
                              آگهی‌هایی که کاربر بازدید کرده
                            </h3>
                            <Badge
                              className={cn("text-[10px] px-2", TAB_BG.viewed)}
                            >
                              {data.viewedAdsCount} مورد
                            </Badge>
                            <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
                          </div>

                          {data.viewedAds.length === 0 ? (
                            <EmptyState
                              icon={Eye}
                              title="هنوز آگهی‌ای بازدید نشده"
                              description="این کاربر هنوز هیچ آگهی‌ای مشاهده نکرده است"
                              gradientColor="from-violet-500/10 to-violet-500/5"
                            />
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {data.viewedAds.map((ad: any) => (
                                <AdCard key={ad._id} ad={ad} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ══════ تب علاقه‌مندی‌ها (Favorites) ══════ */}
                      {activeTab === "bookmarks" && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-1">
                            <Heart className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-black text-foreground">
                              آگهی‌های ذخیره‌شده و علاقه‌مندی
                            </h3>
                            <Badge
                              className={cn(
                                "text-[10px] px-2",
                                TAB_BG.bookmarks,
                              )}
                            >
                              {favCount} مورد
                            </Badge>
                            <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
                          </div>

                          {favList.length === 0 ? (
                            <EmptyState
                              icon={Heart}
                              title="هنوز علاقه‌مندی‌ای ثبت نشده"
                              description="این کاربر هنوز آگهی‌ای را ذخیره نکرده است"
                              gradientColor="from-rose-500/10 to-rose-500/5"
                            />
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {favList.map((fav: any) =>
                                fav.ad ? (
                                  <AdCard key={fav._id} ad={fav.ad} showHeart />
                                ) : null,
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            </TooltipProvider>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-3">
              <EmptyState
                icon={User}
                title="داده‌ای یافت نشد"
                description="اطلاعات این کاربر در دسترس نیست"
              />
            </div>
          )}
        </div>

        {/* ═══════ Footer ═══════ */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-8 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <X className="w-4 h-4 ml-2" />
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}