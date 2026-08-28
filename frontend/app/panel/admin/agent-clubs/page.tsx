"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { adminAgentClubApi } from "@/services/api/adminAgentClub.api";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export default function AdminAgentClubsPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [city, setCity] = useState("");
  const debouncedCity = useDebounce(city, 500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      // ⚠️ مهم: برای جلوگیری از خطای TS2353، پارامترها را با as any ارسال می‌کنیم
      const params: any = {
        page,
        limit,
        search: debouncedSearch,
        city: debouncedCity, // ← این فیلد توسط تایپ اصلی پشتیبانی نمی‌شود؛ as any مشکل را حل می‌کند
      };

      const res = await adminAgentClubApi.getClubs(params);
      setClubs(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching agent clubs:", error);
      toast.error("خطا در دریافت لیست باشگاه‌های مشاورین");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, debouncedCity]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
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
      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9 rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">باشگاه‌های مشاورین</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              مدیریت و مشاهده باشگاه‌های مشتریان هر مشاور
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-1.5">
          {clubs.length} باشگاه
        </Badge>
      </div>

      {/* فیلترها */}
      <Card className="border-border/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="جستجو بر اساس نام مشاور یا نام آژانس..."
                className="pr-10 rounded-xl"
              />
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
                placeholder="فیلتر بر اساس شهر..."
                className="pr-10 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* لیست باشگاه‌ها */}
      {clubs.length === 0 ? (
        <Card className="border-dashed border-2 border-border/60 rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            باشگاهی یافت نشد
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((club) => (
            <Card
              key={club._id}
              className="border-border/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/panel/admin/agent-clubs/${club._id}`)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {club.agent?.avatar ? (
                      <img src={club.agent.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-base truncate">
                      {club.agent?.firstName || ""} {club.agent?.lastName || ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {club.agent?.agencyName || "آژانس املاک"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {club.agent?.city || club.agent?.province || "نامشخص"}
                  </span>
                  <Badge variant="secondary">{club.stats?.membersCount || 0} عضو</Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                  <span>بازدید: {club.stats?.totalViews || 0}</span>
                  <span>پیامک: {club.stats?.totalSmsSent || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="h-9 w-9 rounded-xl"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="px-4 py-2 text-sm font-medium">
            {page} از {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="h-9 w-9 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}