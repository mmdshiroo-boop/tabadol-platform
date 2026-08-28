"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Send,
  Trophy,
  Network,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { agentClubApi, ClubOverview } from "@/services/api/agentClub.api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function AgentClubDashboardPage() {
  const [overview, setOverview] = useState<ClubOverview | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [overviewData, analyticsData] = await Promise.all([
        agentClubApi.getOverview(),
        agentClubApi.getAnalytics(30),
      ]);
      setOverview(overviewData);
      setAnalytics(analyticsData);
    } catch (error) {
      toast.error("خطا در دریافت اطلاعات داشبورد");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 px-3 sm:px-6 pb-8" dir="rtl">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-8"
      dir="rtl"
    >
      {/* هدر */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 border border-primary/20 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
                باشگاه مشتریان اختصاصی
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                مدیریت اعضا، پیامک‌ها و رقابت با سایر مشاوران
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/panel/agent/club/members">
              <Button className="gap-1 rounded-xl">
                <Plus className="w-4 h-4" />
                افزودن عضو
              </Button>
            </Link>
            <Link href="/panel/agent/club/sms">
              <Button variant="outline" className="gap-1 rounded-xl">
                <Send className="w-4 h-4" />
                ارسال پیامک
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="کل اعضا"
          value={overview?.membersCount.toLocaleString() || "0"}
          icon={Users}
          description="تعداد مشتریان باشگاه"
          href="/panel/agent/club/members"
        />
        <StatCard
          title="بازدید آگهی‌ها"
          value={overview?.totalViews.toLocaleString() || "0"}
          icon={Eye}
          description="مجموع بازدید اعضا"
        />
        <StatCard
          title="پیامک ارسال‌شده"
          value={overview?.totalSmsSent.toLocaleString() || "0"}
          icon={MessageSquare}
          description={`${overview?.totalCampaigns || 0} کمپین`}
          href="/panel/agent/club/sms"
        />
        <StatCard
          title="اعضای جدید این ماه"
          value={overview?.newThisMonth.toLocaleString() || "0"}
          icon={TrendingUp}
          description="رشد باشگاه"
        />
      </div>

      {/* دسترسی سریع */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/panel/agent/club/members", label: "مدیریت اعضا", icon: Users },
          { href: "/panel/agent/club/ranking", label: "رتبه‌بندی مشاوران", icon: Trophy },
          { href: "/panel/agent/club/graph", label: "گراف شبکه", icon: Network },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="border-border/60 shadow-sm hover:shadow-md transition-all rounded-xl bg-card/80 backdrop-blur-sm cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.label}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* نمودارها */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* نمودار رشد اعضا */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                رشد اعضا (۳۰ روز)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.memberGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* نمودار بازدیدها */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                بازدیدها (۳۰ روز)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.viewGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* نمودار پیامک‌ها */}
          <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-base font-black flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                پیامک‌های ارسال‌شده (۳۰ روز)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.smsGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* آخرین فعالیت‌ها */}
      {overview?.recentActivities && overview.recentActivities.length > 0 && (
        <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              آخرین فعالیت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {overview.recentActivities.map((act: any) => (
                <div
                  key={act._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold rounded-full"
                    >
                      {act.type === "member_added" && "افزودن عضو"}
                      {act.type === "sms_sent" && "ارسال پیامک"}
                      {act.type === "view" && "بازدید"}
                      {act.type === "member_removed" && "حذف عضو"}
                      {act.type === "rank_changed" && "تغییر رتبه"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {act.type === "member_added" &&
                        `عضو جدید: ${act.metadata?.phone}`}
                      {act.type === "sms_sent" &&
                        `ارسال به ${act.metadata?.sent} شماره`}
                      {act.type === "view" && `بازدید از آگهی`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(act.createdAt).toLocaleString("fa-IR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}