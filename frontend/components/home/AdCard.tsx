"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { favoritesApi } from "@/services/api/ads.api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  HiOutlineBookmark,
  HiBookmark,
  HiChevronRight,
  HiChevronLeft,
} from "react-icons/hi2";
import { ImageOff, MapPin, Tag, Crown, Image as ImageIcon } from "lucide-react";
import { getImageUrl } from "@/lib/getImageUrl";
import VerifiedBadge from "@/components/common/VerifiedBadge"; // ✅ اضافه شد

export interface AdCardProps {
  _id: string;
  title: string;
  price: number;
  city: string;
  district?: string;
  images?: string[];
  createdAt: string;
  isUrgent?: boolean;
  isVerified?: boolean;
  adType?: "sale" | "rent" | "daily_rent" | "exchange" | "mortgage";
  userRole?: string;
}

const AD_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  sale: {
    label: "فروش",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200/60",
  },
  rent: {
    label: "اجاره",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200/60",
  },
  daily_rent: {
    label: "اجاره روزانه",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200/60",
  },
  mortgage: {
    label: "رهن و اجاره",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200/60",
  },
  exchange: {
    label: "معاوضه",
    color: "text-cyan-700",
    bg: "bg-cyan-50 border-cyan-200/60",
  },
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);

const formatRelativeDate = (dateString: string): string => {
  if (!dateString) return "";
  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 5) return "لحظاتی پیش";
  if (diffMinutes < 60) return `${toFa(diffMinutes)} دقیقه پیش`;
  if (diffHours < 24) return `${toFa(diffHours)} ساعت پیش`;
  if (diffDays === 1) return "دیروز";
  if (diffDays === 2) return "پریروز";
  if (diffDays < 7) return `${toFa(diffDays)} روز پیش`;
  if (diffWeeks === 1) return "۱ هفته پیش";
  if (diffWeeks < 4) return `${toFa(diffWeeks)} هفته پیش`;
  if (diffMonths === 1) return "۱ ماه پیش";
  return `${toFa(diffMonths)} ماه پیش`;
};

const formatPrice = (price: number): string => {
  if (price === 0) return "توافقی";
  return price.toLocaleString("fa-IR");
};

const imgVariants: Variants = {
  initial: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
    },
  }),
};

export function AdCard({
  _id,
  title,
  price,
  city,
  district,
  images,
  createdAt,
  isUrgent,
  isVerified,
  adType,
  userRole,
}: AdCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    if (token) {
      favoritesApi
        .checkFavorite(_id)
        .then((res) => setIsSaved(res.isFavorited))
        .catch(() => {});
    }
  }, [_id]);

  const handleSave = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoggedIn) {
        toast.error("لطفاً ابتدا وارد شوید");
        router.push("/auth");
        return;
      }
      if (saveLoading) return;
      setSaveLoading(true);
      try {
        if (isSaved) {
          await favoritesApi.removeFavorite(_id);
          setIsSaved(false);
          toast.success("از ذخیره‌شده‌ها حذف شد");
        } else {
          await favoritesApi.addFavorite(_id);
          setIsSaved(true);
          toast.success("ذخیره شد");
        }
      } catch {
        toast.error("خطا در ذخیره‌سازی");
      } finally {
        setSaveLoading(false);
      }
    },
    [isLoggedIn, isSaved, saveLoading, _id, router],
  );

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images && images.length > 1) {
      setDirection(1);
      setImgIndex((p) => (p === images.length - 1 ? 0 : p + 1));
    }
  };
  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images && images.length > 1) {
      setDirection(-1);
      setImgIndex((p) => (p === 0 ? images.length - 1 : p - 1));
    }
  };

  const hasMultiple = images && images.length > 1;
  const adTypeConf = adType ? AD_TYPE_CONFIG[adType] : null;
  const timeStr = formatRelativeDate(createdAt);

  return (
    <Link href={`/ad/${_id}`} className="block group h-full flex flex-col">
      <div
        dir="rtl"
        className="flex flex-col h-full rounded-2xl border border-border/50 bg-card
                   shadow-sm hover:shadow-md hover:border-border transition-all duration-300 overflow-hidden
                   max-sm:flex-row-reverse max-sm:h-[140px] max-sm:rounded-none max-sm:border-0
                   max-sm:border-b max-sm:border-border/40 max-sm:shadow-none max-sm:bg-transparent
                   max-sm:p-3 max-sm:gap-3 max-sm:overflow-visible"
      >
        {/* ══════ IMAGE SECTION ══════ */}
        <div
          className="relative aspect-[4/3] overflow-hidden bg-muted/15 shrink-0 group/slider
                        max-sm:w-[130px] max-sm:h-full max-sm:aspect-auto max-sm:rounded-xl"
        >
          <AnimatePresence initial={false} custom={direction}>
            {images && images.length > 0 ? (
              <motion.img
                key={imgIndex}
                custom={direction}
                variants={imgVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                src={getImageUrl(images[imgIndex])}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
                <ImageOff className="w-7 h-7 text-muted-foreground/25" />
              </div>
            )}
          </AnimatePresence>

          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent pointer-events-none z-10 max-sm:hidden" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10 max-sm:hidden" />

          {/* Badges (Top Right Desktop) */}
          {adTypeConf && (
            <div className="absolute top-2.5 right-2.5 z-30 max-sm:hidden">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-sm",
                  adTypeConf.bg,
                  adTypeConf.color,
                )}
              >
                <Tag className="w-3 h-3" /> {adTypeConf.label}
              </span>
            </div>
          )}

          {/* BADGES (Top Left Desktop) */}
          <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 max-sm:hidden">
            {isUrgent && (
              <span className="bg-red-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-md shadow-lg shadow-red-600/30">
                فوری
              </span>
            )}
            {isVerified && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg shadow-emerald-600/20 flex items-center gap-1">
                <VerifiedBadge size="sm" className="text-white" /> تایید شده
              </span>
            )}
            {userRole === "vip" && (
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                <Crown className="w-3 h-3" /> VIP
              </span>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="absolute bottom-2.5 right-2.5 z-30 p-1.5 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 active:scale-90 transition-all duration-200
                       max-sm:bottom-auto max-sm:right-auto max-sm:top-1.5 max-sm:left-1.5 max-sm:p-1.5 max-sm:bg-black/30"
          >
            {isSaved ? (
              <HiBookmark className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-orange-400" />
            ) : (
              <HiOutlineBookmark
                className="w-5 h-5 max-sm:w-4 max-sm:h-4 text-white/90"
                strokeWidth={2}
              />
            )}
          </button>

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 max-sm:bottom-1.5 max-sm:right-1.5 max-sm:left-auto">
              <div className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md max-sm:hidden">
                {toFa(imgIndex + 1)} / {toFa(Math.min(images!.length, 5))}
              </div>
              <div className="hidden max-sm:flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                <span className="pt-0.5">{toFa(images!.length)}</span>
                <ImageIcon className="w-3 h-3 opacity-90" />
              </div>
            </div>
          )}

          {/* Slider arrows & dots (Desktop Only) */}
          {hasMultiple && (
            <div className="max-sm:hidden">
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/slider:opacity-100 shadow-md z-20 active:scale-90 transition-all"
              >
                <HiChevronRight className="w-4 h-4 text-gray-800" />
              </button>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/slider:opacity-100 shadow-md z-20 active:scale-90 transition-all"
              >
                <HiChevronLeft className="w-4 h-4 text-gray-800" />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                {images!.slice(0, 5).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      imgIndex === i
                        ? "w-3 h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/50",
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════ CONTENT SECTION ══════ */}
        <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-2 max-sm:p-0 max-sm:gap-0 max-sm:py-0.5 max-sm:justify-between">
          <div>
            {/* Title */}
            <h3 className="font-bold text-[13px] md:text-sm text-foreground leading-relaxed line-clamp-2 group-hover:text-primary/90 transition-colors">
              {title}
            </h3>
            {/* VIP Mobile Badge */}
            {userRole === "vip" && (
              <div className="hidden max-sm:block mt-1.5">
                <span className="inline-flex items-center text-[10px] bg-cyan-100/60 text-cyan-700 px-2.5 py-0.5 rounded-full font-bold">
                  Ad تابلو شده
                </span>
              </div>
            )}
          </div>

          {/* ── DESKTOP LOCATION ── */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 max-sm:hidden">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">
              {district ? `${city}، ${district}` : city}
            </span>
          </div>

          <div className="flex-1 max-sm:hidden" />

          {/* ── DESKTOP BOTTOM ROW ── */}
          <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/30 max-sm:hidden">
            <div className="flex items-baseline gap-1 min-w-0">
              <span
                className={cn(
                  "font-black text-sm md:text-[15px] truncate",
                  price === 0 ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {formatPrice(price)}
              </span>
              {price !== 0 && (
                <span className="text-[10px] text-muted-foreground/70 font-medium shrink-0">
                  تومان
                </span>
              )}
            </div>
            {timeStr && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {timeStr}
              </span>
            )}
          </div>

          {/* ── MOBILE BOTTOM ROW ── */}
          <div className="hidden max-sm:flex flex-col gap-1.5">
            <div className="flex items-baseline gap-1 min-w-0">
              <span
                className={cn(
                  "font-black text-[14px] truncate",
                  price === 0 ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {formatPrice(price)}
              </span>
              {price !== 0 && (
                <span className="text-[10px] text-muted-foreground/80 font-medium shrink-0">
                  تومان
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground line-clamp-1">
              {district ? `${city}، ${district}` : city}
              {timeStr ? `، ${timeStr}` : ""}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}