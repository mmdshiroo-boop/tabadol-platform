// app/(main)/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/app/context/AuthContext";
import { adsApi, Ad } from "@/services/api/ads.api";
import { categoryApi, Category } from "@/services/api/category.api";
import { locationApi, Province } from "@/services/api/location.api";
import AdFeed from "@/components/common/AdFeed";
import { FullPageSpinner } from "@/components/ui/skeletons";
import { VipPromoCard } from "@/components/common/VipPromoCard";
import { HeroBanner } from "@/components/home/hero-banner";

// ★ Dynamic imports برای کامپوننت‌های سنگین
const HeroSection = dynamic(
  () => import("@/components/home/HeroSection").then((mod) => mod.HeroSection),
  { ssr: false }
);

const MobileCategories = dynamic(
  () => import("@/components/mobile/mobile-categories").then((mod) => mod.MobileCategories),
  { ssr: false }
);

function HomePageContent() {
  const { user } = useAuth();

  const [latestAds, setLatestAds] = useState<Ad[]>([]);
  const [urgentAds, setUrgentAds] = useState<Ad[]>([]);
  const [popularAds, setPopularAds] = useState<Ad[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [allCategories, provs, latest, urgent, popular] =
          await Promise.all([
            categoryApi.getAll(),
            locationApi.getProvinces(),
            adsApi.getAll({ sortBy: "newest", limit: 8 }),
            adsApi.getAll({ isUrgent: true, limit: 8 }),
            adsApi.getAll({ sortBy: "most_viewed", limit: 8 }),
          ]);

        setCategories(allCategories);
        setProvinces(provs);
        setLatestAds(latest.data);
        setUrgentAds(urgent.data);
        setPopularAds(popular.data);
      } catch (e) {
        console.error("Error fetching initial data:", e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  if (initialLoading) return <FullPageSpinner />;

  const showVipPromo = !user || user.role === "user";

  return (
    <div className="flex flex-col items-center w-full">
      {/* دسته‌بندی سریع موبایل */}
      <div className="w-full md:hidden">
        <MobileCategories />
      </div>

      <main className="w-full mt-1 md:mt-6 space-y-5 md:space-y-6">
        {/* بنر اصلی تبادل */}
        <HeroSection />


        {/* بنر مشاهده آگهی‌ها */}
        <HeroBanner />

        {/* کارت VIP — فقط موبایل — فقط کاربر عادی/مهمان */}
        {showVipPromo && (
          <div className="w-full px-3 sm:px-4">
            <VipPromoCard
              source="home"
              title="بیشتر دیده شو، سریع‌تر بفروش"
              description="با اشتراک VIP تبادل، آگهی‌هات در صدر نتایج قرار می‌گیرن و به ابزارهای حرفه‌ای دسترسی پیدا می‌کنی."
              ctaText="مشاهده پلن‌های VIP"
            />
          </div>
        )}

        {/* فید آگهی‌ها */}
        <AdFeed
          isFiltered={false}
          filterLoading={false}
          filteredAds={[]}
          urgentAds={urgentAds}
          popularAds={popularAds}
          latestAds={latestAds}
          categories={categories}
          appliedCategory=""
          appliedCity=""
          appliedMinPrice=""
          appliedMaxPrice=""
          appliedOnlyWithImage={false}
          appliedOnlyUrgent={false}
          currentPage={currentPage}
          totalPages={1}
          handleCategoryChange={() => {}}
          handleCityChange={() => {}}
          setAppliedMinPrice={() => {}}
          setAppliedMaxPrice={() => {}}
          setAppliedOnlyWithImage={() => {}}
          setAppliedOnlyUrgent={() => {}}
          setCurrentPage={setCurrentPage}
          clearFilters={() => {}}
        />
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <HomePageContent />
    </Suspense>
  );
}