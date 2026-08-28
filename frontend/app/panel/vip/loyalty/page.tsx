"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyLoyalty,
  getPointsHistory,
  applyReferralCode,
  getAllTiers, // ✅ برای دریافت همه سطوح
} from "@/services/api/loyalty.api";
import { LoyaltyStatus, PointsTransaction, LoyaltyTier } from "@/types/loyalty";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Gift,
  Copy,
  Check,
  UserPlus,
  Star,
  Crown,
  Medal,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const toFa = (num: number) => num.toLocaleString("fa-IR");

export default function VipLoyaltyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [allTiers, setAllTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, historyRes, tiersRes] = await Promise.all([
          getMyLoyalty(),
          getPointsHistory(),
          getAllTiers(), // ✅
        ]);

        setStatus(statusRes.data);
        setHistory(historyRes.data);
        setAllTiers(tiersRes.data);
      } catch (error) {
        console.error("Error fetching loyalty data:", error);
        toast.error("خطا در دریافت اطلاعات باشگاه");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const copyReferralCode = async () => {
    if (!status?.referralCode) return;
    await navigator.clipboard.writeText(status.referralCode);
    setCopied(true);
    toast.success("کد معرف کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    setApplyingReferral(true);
    try {
      await applyReferralCode(referralInput.trim());
      toast.success("کد معرف با موفقیت ثبت شد");
      setReferralInput("");
      const [statusRes, historyRes] = await Promise.all([
        getMyLoyalty(),
        getPointsHistory(),
      ]);
      setStatus(statusRes.data);
      setHistory(historyRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "کد معرف نامعتبر است");
    } finally {
      setApplyingReferral(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6" dir="rtl">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6" dir="rtl">
        <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-muted-foreground">اطلاعات باشگاه در دسترس نیست</h2>
      </div>
    );
  }

  const currentTier = status.tier;
  const nextTier = status.nextTier;
  const progressValue = nextTier
    ? Math.min(
        100,
        Math.round(
          ((status.points - (currentTier?.minPoints || 0)) /
            (nextTier.minPoints - (currentTier?.minPoints || 0))) *
            100
        )
      )
    : 100;

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6" dir="rtl">
      {/* دکمه بازگشت */}
      <Button
        variant="ghost"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/panel/user/dashboard")}
      >
        <ChevronLeft className="w-4 h-4" />
        بازگشت به داشبورد
      </Button>

      {/* ─── هدر سطح فعلی ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border border-border/50 shadow-lg">
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-right">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 flex-wrap">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center shadow-inner">
                    {currentTier?.icon ? (
                      <span className="text-4xl">{currentTier.icon}</span>
                    ) : (
                      <Trophy className="w-8 h-8 text-orange-500" />
                    )}
                  </div>
                  <div className="text-center md:text-right">
                    <div className="flex flex-col md:flex-row items-center gap-2 justify-center md:justify-start">
                      <h2 className="text-2xl md:text-3xl font-black text-foreground">
                        {currentTier ? currentTier.name : "بدون سطح"}
                      </h2>
                      {currentTier && (
                        <Badge variant="outline" className="text-xs font-bold border-orange-500/30 text-orange-500">
                          سطح فعلی
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      امتیاز شما:{" "}
                      <span className="font-black text-orange-500">
                        {toFa(status.points)}
                      </span>
                    </p>
                  </div>
                </div>

                {nextTier ? (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                      <span>پیشرفت به سطح {nextTier.name}</span>
                      <span>
                        {toFa(Math.max(0, nextTier.minPoints - status.points))} امتیاز مانده
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressValue}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-y-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-emerald-600 mt-4">
                    <Sparkles className="w-4 h-4" />
                    شما در بالاترین سطح هستید!
                  </div>
                )}
              </div>

              {/* مزایای سطح بعدی */}
              {nextTier && (
                <div className="w-full md:w-72 bg-background/60 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-sm">
                  <h3 className="text-sm font-bold mb-3 flex items-center justify-center md:justify-start gap-1">
                    <Crown className="w-4 h-4 text-amber-500" />
                    مزایای سطح {nextTier.name}
                  </h3>
                  <ul className="space-y-2 text-center md:text-right">
                    {nextTier.benefits?.slice(0, 4).map((benefit, idx) => (
                      <li key={idx} className="flex items-start justify-center md:justify-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── کد معرف ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-orange-500" />
                معرفی دوستان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-xl border border-border/50">
                <span className="text-lg font-mono font-black tracking-wider flex-1 text-center select-all">
                  {status.referralCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyReferralCode}
                  className="gap-1 shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "کپی شد" : "کپی"}
                </Button>
              </div>

              {status.referredBy ? (
                <p className="text-xs text-muted-foreground text-center">
                  شما توسط کاربر {status.referredBy} معرفی شده‌اید.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      placeholder="کد معرف را وارد کنید"
                      className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <Button
                      onClick={handleApplyReferral}
                      disabled={applyingReferral || !referralInput.trim()}
                      className="h-10 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      ثبت
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    با ثبت کد معرف، هر دو طرف {100} امتیاز دریافت می‌کنید.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── تاریخچه امتیازات ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Star className="w-5 h-5 text-amber-500" />
                تاریخچه امتیازات
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  هنوز امتیازی ثبت نشده است.
                </p>
              ) : (
                history.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
                          tx.points > 0
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{tx.description || tx.reason}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("fa-IR")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── تمام سطوح باشگاه ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Medal className="w-5 h-5 text-orange-500" />
              سطوح باشگاه
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {allTiers.length === 0 ? (
              <p className="text-center text-muted-foreground col-span-full py-6">
                سطحی تعریف نشده است.
              </p>
            ) : (
              allTiers.map((tier) => (
                <div
                  key={tier._id}
                  className={cn(
                    "border rounded-2xl p-4 text-center transition-all",
                    currentTier?._id === tier._id
                      ? "border-orange-500 bg-orange-500/5 shadow-md"
                      : "border-border/50 bg-card hover:shadow-sm"
                  )}
                >
                  <div className="text-4xl mb-2">{tier.icon || "🏅"}</div>
                  <h3 className="font-bold text-foreground">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tier.minPoints} تا {tier.maxPoints ?? "∞"} امتیاز
                  </p>
                  <ul className="mt-3 space-y-1 text-right text-xs">
                    {tier.benefits.slice(0, 3).map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── لینک به جوایز ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card
          className="bg-orange-500/5 border-orange-500/20 hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => router.push("/panel/user/rewards")}
        >
          <CardContent className="p-5 flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Gift className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-foreground">جوایز باشگاه</h3>
              <p className="text-sm text-muted-foreground">با امتیاز خود جایزه دریافت کنید</p>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180 group-hover:-translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}