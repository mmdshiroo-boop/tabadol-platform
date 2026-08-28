"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRewards, redeemReward } from "@/services/api/reward.api";
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
  Gift,
  Coins,
  Check,
  ArrowLeft,
  Loader2,
  Star,
  Package,
  Ticket,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const toFa = (num: number) => num.toLocaleString("fa-IR");

interface Reward {
  _id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  isActive: boolean;
  type: "discount" | "gift" | "service" | "other";
  discountPercent?: number;
  discountAmount?: number;
}

export default function UserRewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const data = await getRewards();
      setRewards(data.rewards);
      setUserPoints(data.userPoints);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast.error("خطا در دریافت جوایز");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    setRedeemingId(rewardId);
    try {
      await redeemReward(rewardId);
      toast.success("جایزه با موفقیت دریافت شد");
      await fetchRewards();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در دریافت جایزه");
    } finally {
      setRedeemingId(null);
    }
  };

  const getTypeIcon = (type: Reward["type"]) => {
    switch (type) {
      case "discount":
        return <Ticket className="w-5 h-5" />;
      case "gift":
        return <Gift className="w-5 h-5" />;
      case "service":
        return <Wrench className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: Reward["type"]) => {
    switch (type) {
      case "discount":
        return "تخفیف";
      case "gift":
        return "هدیه";
      case "service":
        return "خدمات";
      default:
        return "سایر";
    }
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6" dir="rtl">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6" dir="rtl">
      {/* دکمه بازگشت */}
      <Button
        variant="ghost"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/panel/user/loyalty")}
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت به باشگاه
      </Button>

      {/* ─── هدر امتیاز ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border border-border/50 shadow-lg">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Coins className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-center sm:text-right">
              <h2 className="text-2xl font-black text-foreground">
                {toFa(userPoints)}{" "}
                <span className="text-base font-bold text-muted-foreground">امتیاز</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                جوایز را با امتیاز خود دریافت کنید
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── لیست جوایز ─── */}
      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" dir="rtl">
          <Gift className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">فعلاً جایزه‌ای موجود نیست</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rewards.map((reward, index) => {
            const canRedeem =
              userPoints >= reward.pointsCost &&
              reward.stock > 0 &&
              reward.isActive;
            const isRedeeming = redeemingId === reward._id;

            return (
              <motion.div
                key={reward._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="h-full"
              >
                <Card
                  className={cn(
                    "h-full flex flex-col border-2 transition-all hover:shadow-lg p-2",
                    canRedeem
                      ? "border-orange-500/30"
                      : "border-border/60 opacity-80"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          {getTypeIcon(reward.type)}
                        </div>
                        <CardTitle className="text-xl">{reward.title}</CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs bg-muted/50 text-muted-foreground border-border/50"
                      >
                        {getTypeLabel(reward.type)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-5 pt-0">
                    <p className="text-base text-muted-foreground leading-7">
                      {reward.description}
                    </p>

                    <div className="flex items-center justify-between text-base font-bold">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-5 h-5 text-amber-500" />
                        {toFa(reward.pointsCost)} امتیاز
                      </span>
                      <span
                        className={reward.stock > 0 ? "text-emerald-600" : "text-red-600"}
                      >
                        {reward.stock > 0
                          ? `موجودی: ${toFa(reward.stock)}`
                          : "ناموجود"}
                      </span>
                    </div>

                    <Button
                      className="w-full gap-2 h-12 text-base"
                      disabled={!canRedeem || isRedeeming}
                      onClick={() => handleRedeem(reward._id)}
                    >
                      {isRedeeming ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      {isRedeeming ? "در حال دریافت..." : "دریافت جایزه"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}