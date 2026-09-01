// frontend/app/ad/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Share2,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { AdInfoCard } from "@/components/ad/AdInfoCard";
import AdImageGallery from "@/components/ad/AdGallery";
import { AdBreadcrumb } from "@/components/ad/AdBreadcrumb";
import { AdActions } from "@/components/ad/AdActions";
import { getImageUrl } from "@/lib/getImageUrl";
import { AdMaps } from "@/components/ad/AdMaps";

interface AdDetail {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceType: string;
  adType: string;
  city: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  role?: string;
  contactPhone: string;
  contactName?: string;
  userId: {
    _id: string;
    role?: string;
    firstName: string;
    lastName: string;
    phone: string;
    isVerified?: boolean;
    avatar?: string;
  };
  category?: { _id: string; name: string; slug: string };
  views: number;
  status: string;
  isUrgent: boolean;
  isVip: boolean;
  createdAt: string;
  area?: number;
  rooms?: number;
  buildingAge?: number;
  yearBuilt?: number;
  parkingCount?: number;
  amenities?: Record<string, boolean>;
  additionalProperties?: Array<{ name: string; value: string }>;
  sourceUrl?: string;
}

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();

  const adId = useMemo(() => {
    if (!params?.id) return null;
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params?.id]);

  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // ✅ اسکرول به بالای صفحه هنگام ورود یا تغییر آگهی
  useEffect(() => {
    if (adId) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [adId]);

  useEffect(() => {
    if (!adId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/ads/${adId}`);
        setAd(res.data.data);
      } catch (error) {
        console.error("Error fetching ad:", error);
        toast.error("خطا در دریافت اطلاعات آگهی");
      } finally {
        setLoading(false);
      }
    })();
  }, [adId]);

  const handleBack = () => router.back();
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

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: ad?.title || "مشاهده آگهی",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("لینک آگهی کپی شد");
      }
      if (adId) {
        await apiClient.post(`/ads/${adId}/share`);
      }
    } catch (error) {
      toast.error("خطا در اشتراک‌گذاری");
    }
  };

  const handleReport = () => toast.info("گزارش تخلف ثبت شد");

  const nextSlide = () => {
    if (!ad?.images || ad.images.length === 0) return;
    setImgIdx((prev) => (prev === ad.images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (!ad?.images || ad.images.length === 0) return;
    setImgIdx((prev) => (prev === 0 ? ad.images.length - 1 : prev - 1));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
        <Skeleton className="h-5 w-60 rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-[16/9] rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center" dir="rtl">
        <h2 className="text-2xl font-black mb-3">آگهی یافت نشد</h2>
      </div>
    );
  }

  const sellerName =
    ad.contactName ||
    `${ad.userId?.firstName || ""} ${ad.userId?.lastName || ""}`.trim() ||
    "کاربر";
  const hasCoordinates =
    typeof ad.latitude === "number" && typeof ad.longitude === "number";

  return (
    <div className="w-full pb-28 md:pb-6" dir="rtl">
      {/* اسلایدر موبایل */}
      <div
        className="relative w-full h-[300px] md:hidden cursor-pointer"
        onClick={() => setModalOpen(true)}
      >
        {ad.images && ad.images.length > 0 ? (
          <img
            src={getImageUrl(ad.images[imgIdx] || "/placeholder.jpg")}
            alt={ad.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            تصویر موجود نیست
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
          className="absolute top-4 right-4 bg-white/90 p-2 rounded-xl text-gray-700 shadow-sm backdrop-blur-sm z-10"
        >
          <ChevronRight size={24} />
        </button>

        <div className="absolute top-4 left-4 flex items-center bg-white/90 rounded-xl shadow-sm text-gray-700 backdrop-blur-sm z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSaveToggle();
            }}
            className={`p-2 transition-colors rounded-r-xl hover:bg-gray-200`}
          >
            <Bookmark
              className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </button>
          <div className="w-[1px] h-5 bg-gray-300"></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 hover:bg-gray-200 transition-colors"
          >
            <Share2 size={20} />
          </button>
          <div className="w-[1px] h-5 bg-gray-300"></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReport();
            }}
            className="p-2 hover:bg-gray-200 rounded-l-xl transition-colors"
          >
            <AlertOctagon size={20} />
          </button>
        </div>

        {ad.images && ad.images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/50 p-1.5 rounded-full text-black z-10"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/50 p-1.5 rounded-full text-black z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2 z-10">
              {ad.images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full transition-all ${idx === imgIdx ? "bg-orange-500 scale-110" : "bg-black/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 flex justify-center">
        <AdBreadcrumb
          cityName={ad.city}
          citySlug={ad.city}
          categories={ad.category ? [ad.category] : []}
          adTitle={ad.title}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7 mt-4">
        <div className="lg:col-span-2 space-y-5">
          <div className="hidden md:block">
            <AdImageGallery
              images={ad.images}
              isModalOpen={modalOpen}
              setIsModalOpen={setModalOpen}
              currentIndex={imgIdx}
              setCurrentIndex={setImgIdx}
            />
          </div>

          <AdInfoCard
            adId={ad._id}
            title={ad.title}
            price={ad.price}
            priceType={ad.priceType}
            status={ad.status}
            adType={ad.adType}
            categoryName={ad.category?.name}
            city={ad.city}
            district={ad.district}
            createdAt={ad.createdAt}
            description={ad.description}
            isUrgent={ad.isUrgent}
            area={ad.area}
            rooms={ad.rooms}
            buildingAge={ad.buildingAge}
            yearBuilt={ad.yearBuilt}
            parkingCount={ad.parkingCount}
            amenities={ad.amenities}
            additionalProperties={ad.additionalProperties}
            views={ad.views}
            userRole={ad.userId?.role}
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start space-y-5">
          <AdActions
            sellerName={sellerName}
            sellerPhone={ad.contactPhone}
            isVerified={ad.userId?.isVerified}
            adPrice={ad.price}
            adArea={ad.area}
            adTitle={ad.title}
            sellerAvatar={ad.userId?.avatar}
            adId={ad._id}
            sellerUserId={ad.userId?._id}
            sourceUrl={ad.sourceUrl}
            adData={ad}
          />

          {hasCoordinates ? (
            <AdMaps
              city={ad.city}
              district={ad.district}
              address={ad.address}
              latitude={ad.latitude as number}
              longitude={ad.longitude as number}
            />
          ) : (
            <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">
                موقعیت مکانی برای این آگهی ثبت نشده است
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}