"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  Eye,
  MessageSquare,
  CheckCircle2,
  MapPin,
  Star,
  Building2,
  FileText,
  Home,
  TrendingUp,
  ExternalLink,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { agentClubApi, RankingItem } from "@/services/api/agentClub.api";
import { useAuth } from "@/app/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getImageUrl } from "@/lib/getImageUrl";
import { cn } from "@/lib/utils";

export default function ClubRankingPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("");
  const { user } = useAuth();

  const debouncedCity = useDebounce(cityFilter, 500);

  useEffect(() => {
    fetchRanking();
  }, [debouncedCity]);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const data = await agentClubApi.getRanking(debouncedCity || undefined);
      setRanking(data);
    } catch (error) {
      toast.error("خطا در دریافت رتبه‌بندی");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6"
      dir="rtl"
    >
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" />
          رتبه‌بندی مشاوران
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          بر اساس اعضا، بازدید، پیامک، امتیاز و آمار واقعی عملکرد
        </p>
      </div>

      {/* فیلتر شهر */}
      <div className="relative max-w-full sm:max-w-sm">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="فیلتر بر اساس شهر..."
          className="pr-10 rounded-xl h-11"
        />
      </div>

      {/* لیست رتبه‌بندی */}
      <div className="space-y-4">
        {ranking.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>مشاوری یافت نشد</p>
          </div>
        ) : (
          ranking.map((item) => {
            // ✅ اصلاح: استفاده از any برای دسترسی به agentId
            const isCurrent = (user as any)?.agentId === item.agentId;
            return (
              <Card
                key={item.agentId}
                className={cn(
                  "border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm transition-all hover:shadow-md",
                  isCurrent
                    ? "ring-2 ring-primary shadow-lg shadow-primary/10"
                    : "hover:border-primary/30"
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  {/* ردیف اول: رتبه + آواتار + اطلاعات + امتیاز */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* رتبه */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full font-black text-lg",
                          item.rank === 1
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            : item.rank === 2
                            ? "bg-gray-400/10 text-gray-600 dark:text-gray-300"
                            : item.rank === 3
                            ? "bg-orange-600/10 text-orange-600 dark:text-orange-400"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {item.rank}
                      </div>
                      {item.rank <= 3 && (
                        <Award
                          className={cn(
                            "w-4 h-4",
                            item.rank === 1
                              ? "text-yellow-500"
                              : item.rank === 2
                              ? "text-gray-400"
                              : "text-orange-600"
                          )}
                        />
                      )}
                    </div>

                    {/* آواتار و اطلاعات */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${item.userId}`} target="_blank">
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                            <img
                              src={getImageUrl(item.avatar || "/images/user.webp")}
                              alt={item.agentName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/images/user.webp";
                              }}
                            />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/profile/${item.userId}`}
                              target="_blank"
                              className="font-bold text-base hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-full"
                            >
                              {item.agentName}
                            </Link>
                            {item.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                            {isCurrent && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 shrink-0">
                                شما
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
                            {item.agencyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" />
                                {item.agencyName}
                              </span>
                            )}
                            {item.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* امتیاز کل */}
                    <div className="text-left shrink-0">
                      <div className="bg-gradient-to-l from-primary/15 to-transparent rounded-xl px-3 py-2">
                        <p className="text-xl sm:text-2xl font-black text-primary">
                          {item.score}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          امتیاز
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* آمار باشگاه - موبایل: دو ستونه، دسکتاپ: سه ستونه */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20 text-center">
                      <p className="text-base sm:text-lg font-extrabold">
                        {item.membersCount}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        اعضا
                      </p>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20 text-center">
                      <p className="text-base sm:text-lg font-extrabold">
                        {item.totalViews}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        بازدید
                      </p>
                    </div>
                    <div className="p-2.5 sm:p-3 rounded-xl bg-muted/20 text-center">
                      <p className="text-base sm:text-lg font-extrabold">
                        {item.totalSmsSent}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        پیامک
                      </p>
                    </div>
                  </div>

                  {/* آمار عملکرد واقعی - موبایل: دو ستونه، دسکتاپ: پنج ستونه */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                    <div className="p-2 rounded-lg bg-primary/5 text-center">
                      <p className="text-sm font-bold">
                        {item.performance.totalAds}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" />
                        کل آگهی
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 text-center">
                      <p className="text-sm font-bold">
                        {item.performance.activeAds}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Home className="w-3 h-3" />
                        فعال
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 text-center">
                      <p className="text-sm font-bold">
                        {item.performance.soldAds}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        فروخته‌شده
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 text-center">
                      <p className="text-sm font-bold">
                        {item.performance.totalAdViews}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        بازدید آگهی
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5 text-center col-span-2 sm:col-span-1">
                      <p className="text-sm font-bold">
                        ٪{item.performance.conversionRate}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Star className="w-3 h-3" />
                        نرخ تبدیل
                      </p>
                    </div>
                  </div>

                  {/* لینک پروفایل عمومی */}
                  <div className="flex justify-end mt-3">
                    <Link
                      href={`/profile/${item.userId}`}
                      target="_blank"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      مشاهده پروفایل
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </motion.div>
  );
}