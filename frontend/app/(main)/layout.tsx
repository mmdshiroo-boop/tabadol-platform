// app/main/layout

"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { Header } from "@/components/common/header";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { useLocationTracking } from "../../hooks/useLocationTracking";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLocationTracking();

  const pathname = usePathname();
  const isAdDetail = pathname.startsWith("/ad/");
  const isChat = pathname.startsWith("/chat");
  const isHome = pathname === "/";

  return (
    <div
      className={`flex flex-col relative ${
        isChat ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      }`}
    >
      {/* هدر دسکتاپ */}
      <div className="hidden md:block w-full shrink-0">
        {/* ✅ Header کامل در Suspense */}
        <Suspense fallback={<HeaderSkeleton />}>
          <Header />
        </Suspense>
      </div>

      {/* هدر موبایل فقط صفحه اصلی */}
      {isHome && (
        <div className="md:hidden w-full shrink-0">
          <Suspense fallback={null}>
            <MobileHeader />
          </Suspense>
        </div>
      )}

      <main
        className={`flex-1 w-full min-h-0 ${
          !isAdDetail && !isChat
            ? "max-w-[1400px] mx-auto pb-20 md:pb-6"
            : ""
        }`}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </main>

      {!isAdDetail && (
        <>
          {!isChat && (
            <div className="hidden md:block shrink-0">
              <Footer />
            </div>
          )}
          <div id="mobile-bottom-nav" className="md:hidden shrink-0">
            <BottomNav />
          </div>
        </>
      )}
    </div>
  );
}

// Skeleton ساده برای هدر
function HeaderSkeleton() {
  return (
    <div className="h-20 w-full border-b border-border/40 bg-background/80 animate-pulse" />
  );
}