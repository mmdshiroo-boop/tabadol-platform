"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ImageOff } from "lucide-react";
import { getImageUrl } from "@/lib/getImageUrl";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  sold: "bg-indigo-100 text-indigo-700 border-indigo-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  pending: "در انتظار",
  sold: "فروخته شده",
  rejected: "رد شده",
  expired: "منقضی",
};

const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0) return "رایگان";
  if (price >= 1_000_000_000)
    return `${(price / 1_000_000_000).toFixed(1)} میلیارد تومان`;
  if (price >= 1_000_000)
    return `${(price / 1_000_000).toFixed(0)} میلیون تومان`;
  return `${price.toLocaleString("en-US")} تومان`;
};

interface MarketTableTabProps {
  markers: any[];
  tableSearch: string;
  setTableSearch: (val: string) => void;
}

export default function MarketTableTab({
  markers = [],
  tableSearch = "",
  setTableSearch,
}: MarketTableTabProps) {
  const filteredTableData = useMemo(() => {
    const search = (tableSearch || "").trim().toLowerCase();
    if (!search) return markers;
    return markers.filter(
      (ad) =>
        ad.title?.toLowerCase().includes(search) ||
        ad.city?.toLowerCase().includes(search) ||
        ad.district?.toLowerCase().includes(search) ||
        formatPrice(ad.price).toLowerCase().includes(search),
    );
  }, [markers, tableSearch]);

  // Helper to get image source
  const getAdImage = (ad: any): string | null => {
    if (Array.isArray(ad.images) && ad.images.length > 0) {
      return ad.images[0];
    }
    if (typeof ad.image === "string" && ad.image) {
      return ad.image;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو بر اساس عنوان، شهر، محله یا قیمت..."
            className="w-full pr-10 bg-muted/30 border-transparent focus:bg-background rounded-xl"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
          <span className="font-bold text-foreground">
            {filteredTableData.length}
          </span>{" "}
          آگهی یافت شد
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-right">
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  تصویر
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  عنوان آگهی
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  قیمت
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  موقعیت
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  وضعیت
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  نوع ملک
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  مشخصات
                </th>
                <th className="p-4 font-bold text-muted-foreground whitespace-nowrap">
                  تاریخ ثبت
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredTableData.length > 0 ? (
                filteredTableData.map((ad, i) => {
                  const imgSrc = getAdImage(ad);
                  return (
                    <tr
                      key={ad.id || i}
                      className="hover:bg-muted/10 transition-colors group"
                    >
                      {/* تصویر آگهی */}
                      <td className="p-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/50 shrink-0">
                          {imgSrc ? (
                            <img
                              src={getImageUrl(imgSrc)}
                              alt={ad.title || "آگهی"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/images/user.webp";
                              }}
                            />
                          ) : (
                            <ImageOff className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-foreground max-w-[200px] truncate">
                        {ad.title || "بدون عنوان"}
                      </td>
                      <td className="p-4 font-mono">{formatPrice(ad.price)}</td>
                      <td className="p-4 text-muted-foreground">
                        {ad.city} {ad.district ? `/ ${ad.district}` : ""}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`border ${
                            STATUS_COLORS[ad.status || "active"] ||
                            STATUS_COLORS.active
                          }`}
                        >
                          {STATUS_LABELS[ad.status || "active"] || "نامشخص"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {ad.propertyType || "نامشخص"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {ad.size ? `${ad.size} متری` : "-"}{" "}
                        {ad.rooms ? `| ${ad.rooms} خوابه` : ""}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {ad.createdAt
                          ? new Date(ad.createdAt).toLocaleDateString("fa-IR")
                          : "نامشخص"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>هیچ آگهی با این مشخصات یافت نشد.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}