"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Coins, ChevronLeft, Gift } from "lucide-react";
import { getMyLoyalty } from "@/services/api/loyalty.api";
import { LoyaltyStatus } from "@/types/loyalty";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const toFa = (num: number) => num.toLocaleString("fa-IR");

export default function LoyaltyStatusCard() {
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLoyalty()
      .then((res) => setStatus(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (!status) return null;

  const progress = status.nextTier
    ? Math.min(
        100,
        Math.round(
          ((status.points - (status.tier?.minPoints || 0)) /
            (status.nextTier.minPoints - (status.tier?.minPoints || 0))) *
            100
        )
      )
    : 100;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden border border-border/50 shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                {status.tier?.icon ? (
                  <span className="text-2xl">{status.tier.icon}</span>
                ) : (
                  <Trophy className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div>
                <p className="font-bold text-foreground">{status.tier?.name || "بدون سطح"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  {toFa(status.points)} امتیاز
                </p>
              </div>
            </div>
            <Gift className="w-6 h-6 text-orange-500" />
          </div>

          {status.nextTier ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>تا سطح {status.nextTier.name}</span>
                <span>{toFa(status.nextTier.minPoints - status.points)} امتیاز مانده</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <p className="text-xs font-bold text-emerald-600">شما در بالاترین سطح هستید!</p>
          )}

          <Link href="/panel/user/loyalty" className="block mt-4">
            <Button variant="outline" className="w-full gap-1 border-orange-500/30 text-orange-500 hover:bg-orange-50">
              مشاهده باشگاه
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}