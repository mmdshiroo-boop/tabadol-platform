"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, MapPin, Calendar, Heart } from "lucide-react";
import { favoritesApi } from "@/services/api/ads.api";
import { toast } from "sonner";
import VerifiedBadge from "@/components/common/VerifiedBadge"; // ✅ اضافه شد

export interface AdCardProps {
  _id: string;
  title: string;
  price: number;
  city: string;
  district?: string;
  images?: string[];
  views?: number;
  createdAt: string;
  isUrgent?: boolean;
  isVerified?: boolean;
  adType?: "sale" | "rent" | "daily_rent" | "exchange" | "mortgage";
}

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return "/placeholder.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/uploads")) {
    return `http://localhost:5001${imagePath}`;
  }
  return `http://localhost:5001/uploads/${imagePath}`;
};

const getAdTypeDisplay = (adType?: string) => {
  switch (adType) {
    case "sale":
      return { text: "فروش", icon: "💰" };
    case "rent":
      return { text: "اجاره", icon: "🏠" };
    case "daily_rent":
      return { text: "روزانه", icon: "📅" };
    case "exchange":
      return { text: "معاوضه", icon: "🔄" };
    case "mortgage":
      return { text: "رهن", icon: "🏦" };
    default:
      return null;
  }
};

const formatRelativeDate = (dateString: string): string => {
  if (!dateString) return "نامشخص";

  const now = new Date();
  const created = new Date(dateString);
  const diffMs = now.getTime() - created.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 5) return "لحظاتی پیش";
  if (diffMinutes < 60) return `${diffMinutes.toLocaleString("fa-IR")} دقیقه پیش`;
  if (diffHours < 24) return `${diffHours.toLocaleString("fa-IR")} ساعت پیش`;
  if (diffDays === 1) return "دیروز";
  if (diffDays === 2) return "پریروز";
  if (diffDays < 7) return `${diffDays.toLocaleString("fa-IR")} روز پیش`;
  if (diffWeeks === 1) return "۱ هفته پیش";
  if (diffWeeks < 4) return `${diffWeeks.toLocaleString("fa-IR")} هفته پیش`;
  if (diffMonths === 1) return "۱ ماه پیش";
  return `${diffMonths.toLocaleString("fa-IR")} ماه پیش`;
};

export function AdCard({
  _id,
  title,
  price,
  city,
  district,
  images,
  views,
  createdAt,
  isUrgent,
  isVerified,
  adType,
}: AdCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    if (token) {
      checkFavoriteStatus();
    }
  }, [_id]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await favoritesApi.checkFavorite(_id);
      setIsLiked(response.isFavorited);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.error("لطفاً ابتدا وارد شوید");
      router.push("/auth");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (isLiked) {
        await favoritesApi.removeFavorite(_id);
        setIsLiked(false);
        toast.success("از نشان شده‌ها حذف شد");
      } else {
        await favoritesApi.addFavorite(_id);
        setIsLiked(true);
        toast.success("به نشان شده‌ها اضافه شد");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "خطا در عملیات");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "توافقی";
    return price.toLocaleString("fa-IR") + " تومان";
  };

  const adTypeInfo = getAdTypeDisplay(adType);

  return (
    <Link href={`/ad/${_id}`}>
      <Card
        className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-border/50 hover:border-primary/30 h-full text-right"
        dir="rtl"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {images && images[0] ? (
            <img
              src={getImageUrl(images[0])}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.jpg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-muted-foreground text-sm">بدون تصویر</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1">
            {isUrgent && (
              <Badge
                variant="destructive"
                className="text-xs px-2 py-0.5 rounded-full"
              >
                فوری
              </Badge>
            )}
            {isVerified && (
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center gap-1"
              >
                <VerifiedBadge size="sm" className="text-green-600" />
                تایید شده
              </Badge>
            )}
          </div>

          {adTypeInfo && (
            <div className="absolute bottom-2 left-2">
              <Badge className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                <span className="ml-0.5">{adTypeInfo.icon}</span>
                {adTypeInfo.text}
              </Badge>
            </div>
          )}

          {/* دکمه قلب */}
          <button
            onClick={handleLike}
            disabled={loading}
            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all z-10"
          >
            <Heart
              className={`w-4 h-4 transition-all ${
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </button>
        </div>

        <CardContent className="p-3 space-y-2">
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors leading-relaxed min-h-[40px]">
            {title}
          </h3>

          <p className="text-base md:text-lg font-black text-primary tabular-nums">
            {formatPrice(price)}
          </p>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border/40">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[110px] font-medium">
                {district ? `${city}، ${district}` : city}
              </span>
            </div>

            <div className="flex items-center gap-2 tabular-nums">
              {views !== undefined && views > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{views.toLocaleString("fa-IR")}</span>
                </div>
              )}
              <div className="flex items-center gap-1 font-bold text-[11px] text-muted-foreground/90">
                <Calendar className="w-3 h-3" />
                <span>{formatRelativeDate(createdAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}