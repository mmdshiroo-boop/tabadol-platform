// components/ad/AdCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  Trash2,
  Printer,
  MapPin,
  Calendar,
  Star,
  Clock,
  CheckCircle2,
  Ban,
  AlertCircle,
  TrendingUp,
  Home,
  Maximize2,
  Phone,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";
import { getImageUrl, cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ============================================================
// TYPES
// ============================================================
export interface AdCardData {
  _id: string;
  title: string;
  price: number;
  city: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  status: "pending" | "active" | "sold" | "expired" | "rejected";
  views: number;
  createdAt: string;
  isVip: boolean;
  images?: string[];
  latitude?: number;
  longitude?: number;
  area?: number;
  rooms?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasStorage?: boolean;
  hasBalcony?: boolean;
  hasYard?: boolean;
  contactName?: string;
  phone?: string;
  email?: string;
}

export interface AdCardProps {
  ad: AdCardData;
  variant?: "default" | "compact" | "popup" | "minimal";
  size?: "sm" | "md" | "lg";
  showActions?: boolean;
  showStatus?: boolean;
  showVipBadge?: boolean;
  onView?: (ad: AdCardData) => void;
  onEdit?: (ad: AdCardData) => void;
  onPrint?: (ad: AdCardData) => void;
  onDelete?: (ad: AdCardData) => void;
  onFavorite?: (ad: AdCardData) => void;
  className?: string;
  interactive?: boolean;
}

// ============================================================
// HELPERS
// ============================================================
export const formatPrice = (price: number) => {
  if (!price || price === 0) return "توافقی";
  return price.toLocaleString("en-US") + " تومان";
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getStatusConfig = (status: string) => {
  const configs: Record<
    string,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    active: {
      label: "فعال",
      icon: <CheckCircle2 className="w-3 h-3" />,
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    pending: {
      label: "در انتظار",
      icon: <Clock className="w-3 h-3" />,
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    sold: {
      label: "فروخته شده",
      icon: <AlertCircle className="w-3 h-3" />,
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    expired: {
      label: "منقضی شده",
      icon: <Ban className="w-3 h-3" />,
      className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    },
    rejected: {
      label: "رد شده",
      icon: <AlertCircle className="w-3 h-3" />,
      className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
  };
  return configs[status] || configs.pending;
};

// ============================================================
// STATUS BADGE
// ============================================================
export function AdStatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border",
        config.className
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ============================================================
// VIP BADGE
// ============================================================
export function AdVipBadge({ isVip }: { isVip: boolean }) {
  if (!isVip) return null;
  return (
    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[9px] px-1.5 py-0.5 rounded-full gap-0.5">
      <Star className="w-2.5 h-2.5 fill-current" /> VIP
    </Badge>
  );
}

// ============================================================
// AD IMAGE
// ============================================================
export function AdImage({
  src,
  title,
  className,
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  return (
    <div
      className={cn(
        "relative bg-muted/20 overflow-hidden border border-border/50",
        className
      )}
    >
      <img
        src={error ? "/images/user.webp" : getImageUrl(src)}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

// ============================================================
// MAIN AD CARD — کامپوننت اصلی و کامل
// ============================================================
export function AdCard({
  ad,
  variant = "default",
  size = "md",
  showActions = true,
  showStatus = true,
  showVipBadge = true,
  onView,
  onEdit,
  onPrint,
  onDelete,
  onFavorite,
  className,
  interactive = true,
}: AdCardProps) {
  const handleClick = () => {
    if (interactive && onView) onView(ad);
    else if (interactive) window.location.href = `/ad/${ad._id}`;
  };

  // ======== SIZE CONFIG ========
  const sizeConfig = {
    sm: {
      image: "h-20 w-20 rounded-xl",
      title: "text-sm",
      price: "text-sm",
      spacing: "gap-2",
      padding: "p-2.5",
    },
    md: {
      image: "h-24 w-24 rounded-xl",
      title: "text-base",
      price: "text-base",
      spacing: "gap-3",
      padding: "p-3",
    },
    lg: {
      image: "h-32 w-32 rounded-xl",
      title: "text-lg",
      price: "text-lg",
      spacing: "gap-4",
      padding: "p-4",
    },
  };

  const sz = sizeConfig[size];

  // ======== VARIANT CONFIG ========
  const isCompact = variant === "compact";
  const isPopup = variant === "popup";
  const isMinimal = variant === "minimal";

  // ======== RENDER ========
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "border-2 transition-all duration-200 overflow-hidden bg-card/80 backdrop-blur-sm",
          interactive && "cursor-pointer hover:shadow-lg hover:border-primary/40",
          isPopup && "border-border/50 shadow-xl",
          isMinimal && "border-0 shadow-none bg-transparent",
          className
        )}
        onClick={interactive && !isPopup ? handleClick : undefined}
      >
        <div className={cn("flex", sz.spacing, sz.padding)}>
          {/* ===== IMAGE ===== */}
          {(variant === "default" || variant === "popup") && (
            <AdImage
              src={ad.images?.[0]}
              title={ad.title}
              className={cn(
                "shrink-0",
                sz.image,
                isPopup && "h-28 w-28 rounded-2xl"
              )}
            />
          )}

          {/* ===== CONTENT ===== */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* HEADER: Title + VIP */}
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/ad/${ad._id}`}
                className={cn(
                  "font-bold text-foreground hover:text-primary transition-colors line-clamp-1",
                  sz.title
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {ad.title}
              </Link>
              {showVipBadge && <AdVipBadge isVip={ad.isVip} />}
            </div>

            {/* PRICE + CITY */}
            <div className="flex items-center flex-wrap gap-2">
              <span
                className={cn(
                  "font-black text-primary",
                  sz.price,
                  isPopup && "text-sm"
                )}
              >
                {formatPrice(ad.price)}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {ad.city || "—"}
              </span>
              {showStatus && (
                <span className="mr-auto">
                  <AdStatusBadge status={ad.status} />
                </span>
              )}
            </div>

            {/* DETAILS: Province, Neighborhood, Views, Date */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {ad.province && (
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  {ad.province}
                </span>
              )}
              {ad.neighborhood && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {ad.neighborhood}
                </span>
              )}
              {ad.views !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {ad.views.toLocaleString("en-US")}
                </span>
              )}
              {ad.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {formatDate(ad.createdAt)}
                </span>
              )}
              {ad.area && (
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  {ad.area.toLocaleString("en-US")} م²
                </span>
              )}
              {ad.rooms && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {ad.rooms} خواب
                </span>
              )}
            </div>

            {/* FEATURES: Amenities as tiny chips */}
            {(ad.hasElevator ||
              ad.hasParking ||
              ad.hasStorage ||
              ad.hasBalcony ||
              ad.hasYard) && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {ad.hasElevator && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                    آسانسور
                  </span>
                )}
                {ad.hasParking && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                    پارکینگ
                  </span>
                )}
                {ad.hasStorage && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                    انباری
                  </span>
                )}
                {ad.hasBalcony && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                    بالکن
                  </span>
                )}
                {ad.hasYard && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                    حیاط
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        {showActions && (variant === "default" || variant === "popup") && (
          <div
            className={cn(
              "flex items-center gap-1 px-3 pb-3 pt-1 border-t border-border/30",
              isPopup && "px-2.5 pb-2.5 pt-1"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 rounded-lg text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
              onClick={() => (onView ? onView(ad) : window.location.href = `/ad/${ad._id}`)}
            >
              <Eye className="w-3 h-3" /> مشاهده
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
              onClick={() => onEdit?.(ad)}
            >
              <Edit className="w-3 h-3" /> ویرایش
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => onPrint?.(ad)}
            >
              <Printer className="w-3 h-3" /> پرینت
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => onDelete(ad)}
              >
                <Trash2 className="w-3 h-3" /> حذف
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================
// COMPACT AD CARD — برای لیست‌های شلوغ و مودال
// ============================================================
export function AdCardCompact({
  ad,
  onView,
  onEdit,
  onPrint,
  onDelete,
  isSelected,
  onFocus,
  className,
}: {
  ad: AdCardData;
  onView?: (ad: AdCardData) => void;
  onEdit?: (ad: AdCardData) => void;
  onPrint?: (ad: AdCardData) => void;
  onDelete?: (ad: AdCardData) => void;
  isSelected?: boolean;
  onFocus?: (ad: AdCardData) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border-2 transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/60 hover:border-primary/40 bg-card/80 hover:bg-card hover:shadow-md",
        className
      )}
      onClick={() => onFocus?.(ad)}
    >
      <div className="flex items-start gap-3 p-2.5 cursor-pointer">
        {/* Image */}
        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted/20 border border-border/50">
          <img
            src={getImageUrl(ad.images?.[0])}
            alt={ad.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/user.webp";
            }}
          />
          {ad.isVip && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-bl-lg">
              ★
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {ad.title}
            </h4>
            <AdStatusBadge status={ad.status} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-primary text-sm font-mono tracking-tight">
              {formatPrice(ad.price)}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {ad.city || "—"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            {ad.province && <span>{ad.province}</span>}
            {ad.neighborhood && <span>• {ad.neighborhood}</span>}
            {ad.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {ad.views.toLocaleString("en-US")}
              </span>
            )}
            {ad.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(ad.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 rounded-lg text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(ad);
          }}
        >
          <Eye className="w-3 h-3" /> مشاهده
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(ad);
          }}
        >
          <Edit className="w-3 h-3" /> ویرایش
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            onPrint?.(ad);
          }}
        >
          <Printer className="w-3 h-3" /> پرینت
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 flex-1 rounded-lg text-[10px] gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ad);
            }}
          >
            <Trash2 className="w-3 h-3" /> حذف
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// POPUP AD CARD — مخصوص پاپ‌آپ نقشه (بازطراحی شده)
// ============================================================
export function AdPopupCard({
  ad,
  onView,
  onEdit,
  onPrint,
  className,
}: {
  ad: AdCardData;
  onView?: (ad: AdCardData) => void;
  onEdit?: (ad: AdCardData) => void;
  onPrint?: (ad: AdCardData) => void;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={cn("w-[280px] max-w-[90vw] bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/50", className)}>
      {/* ===== IMAGE SECTION ===== */}
      <div className="relative h-[130px] bg-muted/30">
        <img
          src={imageError ? "/images/user.webp" : getImageUrl(ad.images?.[0])}
          alt={ad.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Badges - top right */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <AdStatusBadge status={ad.status} />
          {ad.isVip && (
            <Badge className="bg-amber-500 text-white border-none text-[10px] px-2 py-0.5 rounded-full shadow-md">
              ★ VIP
            </Badge>
          )}
        </div>

        {/* Price - bottom right */}
        <div className="absolute bottom-2 right-2">
          <span className="text-white font-black text-lg drop-shadow-lg bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            {formatPrice(ad.price)}
          </span>
        </div>
      </div>

      {/* ===== CONTENT SECTION ===== */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <Link
          href={`/ad/${ad._id}`}
          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 block"
          onClick={(e) => e.stopPropagation()}
        >
          {ad.title}
        </Link>

        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            {ad.city || "—"}
          </span>
          {ad.province && (
            <span className="flex items-center gap-1">
              <Home className="w-3 h-3" />
              {ad.province}
            </span>
          )}
          {ad.neighborhood && <span>• {ad.neighborhood}</span>}
        </div>

        {/* Details: متراژ، خواب، بازدید، تاریخ */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap border-t border-border/30 pt-1.5">
          {ad.area && (
            <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
              <Maximize2 className="w-3 h-3" /> {ad.area.toLocaleString("en-US")} م²
            </span>
          )}
          {ad.rooms && (
            <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> {ad.rooms} خواب
            </span>
          )}
          {ad.views !== undefined && (
            <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" /> {ad.views.toLocaleString("en-US")}
            </span>
          )}
          {ad.createdAt && (
            <span className="flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" /> {formatDate(ad.createdAt)}
            </span>
          )}
        </div>

        {/* Amenities chips */}
        {(ad.hasElevator || ad.hasParking || ad.hasStorage || ad.hasBalcony || ad.hasYard) && (
          <div className="flex flex-wrap gap-1">
            {ad.hasElevator && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                آسانسور
              </span>
            )}
            {ad.hasParking && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                پارکینگ
              </span>
            )}
            {ad.hasStorage && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                انباری
              </span>
            )}
            {ad.hasBalcony && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                بالکن
              </span>
            )}
            {ad.hasYard && (
              <span className="text-[8px] px-1.5 py-0.5 bg-muted/50 rounded-full text-muted-foreground">
                حیاط
              </span>
            )}
          </div>
        )}

        {/* ===== ACTIONS ===== */}
        <div className="flex items-center gap-1 pt-1.5 border-t border-border/30">
          <Button
            size="sm"
            className="flex-1 rounded-xl text-[10px] font-bold gap-1 bg-primary hover:bg-primary/90 text-white h-7 shadow-sm"
            onClick={() => (onView ? onView(ad) : window.location.href = `/ad/${ad._id}`)}
          >
            <Eye className="w-3 h-3" /> مشاهده
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-[10px] gap-1 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white h-7 px-2.5"
            onClick={() => onEdit?.(ad)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-[10px] gap-1 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white h-7 px-2.5"
            onClick={() => onPrint?.(ad)}
          >
            <Printer className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AD LIST — کامپوننت لیست برای نمایش مجموعه آگهی‌ها
// ============================================================
export function AdList({
  ads,
  onView,
  onEdit,
  onPrint,
  onDelete,
  onFocus,
  selectedId,
  variant = "compact",
  className,
}: {
  ads: AdCardData[];
  onView?: (ad: AdCardData) => void;
  onEdit?: (ad: AdCardData) => void;
  onPrint?: (ad: AdCardData) => void;
  onDelete?: (ad: AdCardData) => void;
  onFocus?: (ad: AdCardData) => void;
  selectedId?: string | null;
  variant?: "compact" | "default" | "minimal";
  className?: string;
}) {
  if (ads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        هیچ آگهی با موقعیت مکانی وجود ندارد
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 overflow-y-auto custom-scrollbar", className)}>
      {ads.map((ad) => {
        if (variant === "compact") {
          return (
            <AdCardCompact
              key={ad._id}
              ad={ad}
              isSelected={selectedId === ad._id}
              onFocus={onFocus}
              onView={onView}
              onEdit={onEdit}
              onPrint={onPrint}
              onDelete={onDelete}
            />
          );
        }
        return (
          <AdCard
            key={ad._id}
            ad={ad}
            variant={variant === "minimal" ? "minimal" : "default"}
            onView={onView}
            onEdit={onEdit}
            onPrint={onPrint}
            onDelete={onDelete}
            interactive={!!onFocus}
          />
        );
      })}
    </div>
  );
}

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default AdCard;