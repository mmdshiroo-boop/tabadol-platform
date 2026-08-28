// created-ad/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Footer } from "@/components/common/Footer";
import { CreateAdWizard } from "@/components/create-ad/CreateAdWizard";
import { Header } from "@/components/common/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CreateAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth?redirect=/create-ad");
      return;
    }
    setIsLoggedIn(true);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl flex items-center justify-center">
          <Skeleton className="h-[420px] w-full rounded-3xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* هدر موبایل */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border/60 bg-background/80 backdrop-blur-md md:hidden sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="rounded-full hover:bg-accent shrink-0"
          >
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Button>
          <span
            className="font-bold text-sm text-foreground cursor-pointer"
            onClick={() => router.push("/")}
          >
            بازگشت به خانه
          </span>
        </div>
        <span className="font-black text-xs text-primary">ثبت آگهی</span>
      </div>

      <main className="flex-1">
        <CreateAdWizard />
      </main>
    </div>
  );
}