"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Bookmark,
  Share2,
  FileText,
  Clock,
  Flame,
  Home,
  Layers,
  Calendar,
  Car,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { CommentsSection } from "./CommentsSection";

interface AdInfoCardProps {
  adId: string;
  title: string;
  price: number;
  priceType?: string;
  status: string;
  categoryName?: string;
  city: string;
  district?: string;
  createdAt: string;
  description: string;
  isUrgent?: boolean;
  area?: number;
  rooms?: number;
  buildingAge?: number;
  yearBuilt?: number;
  parkingCount?: number;
  userRole?: string;
  amenities?: {
    parking?: boolean;
    storage?: boolean;
    elevator?: boolean;
    balcony?: boolean;
    pool?: boolean;
  };
  additionalProperties?: Array<{ name: string; value: string }>;
  rawAttributes?: Record<string, any>;
  adType?: string;
  views?: number;
}

export function AdInfoCard({
  adId,
  title,
  userRole,
  price,
  priceType = "fixed",
  status,
  adType,
  categoryName,
  city,
  district,
  createdAt,
  description,
  isUrgent = false,
  area,
  rooms,
  buildingAge,
  yearBuilt,
  parkingCount,
  amenities,
  additionalProperties,
  rawAttributes,
}: AdInfoCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`saved_ad_${adId}`);
      setIsSaved(!!saved);
    }
  }, [adId]);

  const handleSaveToggle = () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    if (nextState) {
      localStorage.setItem(`saved_ad_${adId}`, "true");
      toast.success("آگهی با موفقیت نشان‌گذاری شد");
    } else {
      localStorage.removeItem(`saved_ad_${adId}`);
      toast.success("آگهی از نشان‌گذاری‌ها حذف شد");
    }
  };

  const formatPrice = (num: number) => {
    if (!num || num === 0) return "توافقی";
    return num.toLocaleString("fa-IR") + " تومان";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "لحظاتی پیش";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "اخیراً";
    }
  };

  const getPriceDisplay = () => {
    if (priceType === "negotiable" || price === 0) {
      return { label: "قیمت:", value: "توافقی" };
    }
    switch (adType) {
      case "daily_rent":
        return { label: "اجاره روزانه:", value: formatPrice(price) + " / شب" };
      case "rent":
        return { label: "اجاره ماهانه:", value: formatPrice(price) };
      case "mortgage":
        return { label: "رهن کامل:", value: formatPrice(price) };
      default:
        return { label: "قیمت کل:", value: formatPrice(price) };
    }
  };

  const priceDisplay = getPriceDisplay();
  // ─── استخراج هوشمند از additionalProperties ───
  const findValue = (keywords: string[]): string | null => {
    if (additionalProperties && additionalProperties.length > 0) {
      const normalize = (str: string) =>
        str
          .replace(/\s+/g, "")
          .replace(/\u200c/g, "")
          .replace(/ی/g, "ی")
          .replace(/ک/g, "ک")
          .toLowerCase();
      const found = additionalProperties.find((p) =>
        keywords.some((kw) => normalize(p.name).includes(normalize(kw))),
      );
      if (found) return found.value;
    }
    if (rawAttributes) {
      for (const [key, val] of Object.entries(rawAttributes)) {
        if (keywords.some((kw) => key.includes(kw))) return String(val);
      }
    }
    if (description) {
      for (const kw of keywords) {
        const regex = new RegExp(`${kw}\\s*:?\\s*([۰-۹\\d,\\s]+)`, "i");
        const match = description.match(regex);
        if (match && match[1]) return match[1];
      }
    }
    return null;
  };
 const areaDisplay = area ? `${area.toLocaleString("fa-IR")} متر` : "—";
  const roomsDisplay = rooms ? `${rooms.toLocaleString("fa-IR")} اتاق` : "—";
  const currentPersianYear = 1405;
  const ageDisplay = buildingAge
    ? `${buildingAge} سال`
    : yearBuilt
      ? `${currentPersianYear - yearBuilt} سال (ساخت ${yearBuilt})`
      : "—";
  const parkingDisplay = parkingCount
    ? `${parkingCount} خودرو`
    : amenities?.parking
      ? "دارد"
      : "ندارد";

  const hasElevator = amenities?.elevator || findValue(["آسانسور"]) === "دارد";
  const hasStorage = amenities?.storage || findValue(["انباری"]) === "دارد";
  const hasBalcony = amenities?.balcony || findValue(["بالکن"]) === "دارد";
  const hasPool = amenities?.pool || findValue(["استخر"]) === "دارد";

  return (
    <div
      className="space-y-6 bg-card rounded-2xl border border-border/60 shadow-xs p-5 sm:p-6"
      dir="rtl"
    >
      {/* هدر آگهی */}
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap gap-2 items-center">
            {categoryName && (
              <Badge
                variant="default"
                className="text-[10px]  rounded-lg font-bold"
              >
                {categoryName}
              </Badge>
            )}

            {isUrgent && (
              <Badge className="text-[10px] rounded-lg font-bold bg-destructive text-destructive-foreground gap-1">
                <Flame className="w-3 h-3" /> فوری
              </Badge>
            )}
          </div>
          <h1 className="font-black text-lg md:text-xl text-foreground leading-8">
            {title}
          </h1>
          {userRole === "vip" && (
            <div className="mt-2 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-600">
                آگهی‌دهنده VIP
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {formatDate(createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {city} {district ? `، ${district}` : ""}
            </span>
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* قیمت */}
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border/40">
        <span className="text-xs text-muted-foreground font-bold">
          {priceDisplay.label}
        </span>
        <span className="text-base font-black text-primary tabular-nums">
          {priceDisplay.value}
        </span>
      </div>

      {/* مشخصات کلیدی */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50 tabular-nums text-center">
        <div className="flex flex-col p-2.5 bg-card border border-border/40 rounded-lg">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
            <Home className="w-3 h-3 text-muted-foreground/70" /> متراژ
          </span>
          <span className="text-sm font-black text-foreground mt-1.5">
            {areaDisplay}
          </span>
        </div>
        <div className="flex flex-col p-2.5 bg-card border border-border/40 rounded-lg">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-muted-foreground/70" /> اتاق خواب
          </span>
          <span className="text-sm font-black text-foreground mt-1.5">
            {roomsDisplay}
          </span>
        </div>
        <div className="flex flex-col p-2.5 bg-card border border-border/40 rounded-lg">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground/70" />{" "}
            {buildingAge ? "سن بنا" : "سال ساخت"}
          </span>
          <span className="text-sm font-black text-foreground mt-1.5">
            {ageDisplay}
          </span>
        </div>
        <div className="flex flex-col p-2.5 bg-card border border-border/40 rounded-lg">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
            <Car className="w-3 h-3 text-muted-foreground/70" /> پارکینگ
          </span>
          <span className="text-sm font-black text-foreground mt-1.5">
            {parkingDisplay}
          </span>
        </div>
      </div>

      {/* امکانات رفاهی */}
      {(amenities?.parking ||
        hasElevator ||
        hasStorage ||
        hasBalcony ||
        hasPool) && (
        <div className="space-y-2">
          <h4 className="text-xs font-black text-foreground">
            امکانات رفاهی ملک
          </h4>
          <div className="flex flex-wrap gap-2">
            {amenities?.parking && (
              <Badge variant="outline" className="text-[11px] rounded-lg">
                پارکینگ
              </Badge>
            )}
            {hasElevator && (
              <Badge variant="outline" className="text-[11px] rounded-lg">
                آسانسور
              </Badge>
            )}
            {hasStorage && (
              <Badge variant="outline" className="text-[11px] rounded-lg">
                انباری
              </Badge>
            )}
            {hasBalcony && (
              <Badge variant="outline" className="text-[11px] rounded-lg">
                بالکن / تراس
              </Badge>
            )}
            {hasPool && (
              <Badge variant="outline" className="text-[11px] rounded-lg">
                استخر
              </Badge>
            )}
          </div>
        </div>
      )}

      <Separator className="bg-border" />

      {/* توضیحات */}
      <div className="space-y-3">
        <h3 className="font-black text-base text-foreground flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" />
          توضیحات آگهی
        </h3>
        <p className="text-sm text-muted-foreground font-medium leading-7 text-justify whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* مشخصات تکمیلی */}
      {additionalProperties && additionalProperties.length > 0 && (
        <div className="mt-4 bg-muted/10 border border-border/50 p-4 rounded-xl space-y-2">
          <h4 className="font-black text-xs text-foreground mb-3">
            مشخصات تکمیلی آگهی
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {additionalProperties.map((prop, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 text-xs border-b border-border/30 last:border-0 sm:even:border-b-0"
              >
                <span className="text-muted-foreground font-medium">
                  {prop.name}
                </span>
                <span className="font-bold text-foreground">{prop.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator className="bg-border" />
      <CommentsSection adId={adId} />
    </div>
  );
}