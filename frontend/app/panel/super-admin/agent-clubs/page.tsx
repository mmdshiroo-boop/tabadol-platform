"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Eye,
  Send,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { adminAgentClubApi, ClubSummary } from "@/services/api/adminAgentClub.api";
import { cn } from "@/lib/utils";

export default function AdminAgentClubsPage() {
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const [clubsRes, statsRes] = await Promise.all([
        adminAgentClubApi.getClubs({ page, limit: 10, search }),
        adminAgentClubApi.getSystemStats(),
      ]);
      setClubs(clubsRes.data);
      setTotalPages(clubsRes.pagination.pages);
      setStats(statsRes);
    } catch (error) {
      toast.error("خطا در دریافت لیست باشگاه‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, [page, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary" />
          مدیریت باشگاه‌های مشتریان
        </h1>
        <p className="text-sm text-muted-foreground">نمایش و مدیریت باشگاه‌های اختصاصی مشاوران</p>
      </div>

      {/* آمار کلی */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={Building2} label="کل باشگاه‌ها" value={stats.totalClubs} />
          <StatCard icon={Users} label="کل اعضا" value={stats.totalMembers} />
          <StatCard icon={Send} label="کل پیام‌ها" value={stats.totalSmsSent} />
          <StatCard icon={Eye} label="کل کمپین‌ها" value={stats.totalCampaigns} />
          <StatCard icon={CheckCircle2} label="کل فعالیت‌ها" value={stats.totalActivities} />
        </div>
      )}

      {/* جستجو */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="جستجوی باشگاه (نام مشاور، آژانس)..."
          className="pr-10 rounded-xl"
        />
      </div>

      {/* لیست باشگاه‌ها */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">باشگاهی یافت نشد</div>
          ) : (
            clubs.map((club) => (
              <Card key={club._id} className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm hover:shadow-md transition-all">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {club.userInfo?.avatar ? (
                          <img src={club.userInfo.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/panel/admin/agent-clubs/${club._id}`} className="font-bold text-base hover:text-primary transition-colors">
                            {club.agentInfo?.firstName || ""} {club.agentInfo?.lastName || ""}
                          </Link>
                          {club.agentInfo?.isVerified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {club.agentInfo?.agencyName || "آژانس"} 
                          {club.userInfo?.city && <><MapPin className="w-3 h-3" /> {club.userInfo.city}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold">{club.membersCount}</p>
                        <p className="text-[10px] text-muted-foreground">اعضا</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{club.totalViews}</p>
                        <p className="text-[10px] text-muted-foreground">بازدید</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{club.totalSmsSent}</p>
                        <p className="text-[10px] text-muted-foreground">پیام</p>
                      </div>
                    </div>
                    <Link href={`/panel/admin/agent-clubs/${club._id}`}>
                      <Button variant="outline" size="sm" className="rounded-xl">جزئیات</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="py-2 px-3 text-sm">{page} / {totalPages}</span>
          <Button disabled={page === totalPages} onClick={() => setPage(page + 1)} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// کامپوننت کارت آماری کوچک
function StatCard({ icon: Icon, label, value, color = "text-primary", bg = "bg-primary/10" }: { icon: any; label: string; value: number; color?: string; bg?: string }) {
  return (
    <div className="rounded-2xl border bg-card/70 p-4">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
          <Icon size={16} className={color} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-black mt-1">{value.toLocaleString("fa-IR")}</p>
    </div>
  );
}