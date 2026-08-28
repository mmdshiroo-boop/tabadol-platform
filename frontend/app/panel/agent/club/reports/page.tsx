"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  Send,
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { agentClubApi } from "@/services/api/agentClub.api";
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
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly";

export default function ClubReportsPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await agentClubApi.getClubReport(period);
      setData(res);
    } catch (error) {
      toast.error("خطا در دریافت گزارش");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const prepareChartData = (type: "member" | "view" | "sms") => {
    if (!data) return [];
    if (type === "member") return data.memberGrowth || [];
    if (type === "view") return data.viewGrowth || [];
    if (type === "sms") return data.smsGrowth || [];
    return [];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6"
      dir="rtl"
    >
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          گزارش‌های باشگاه
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          تحلیل رشد اعضا، بازدید و پیام‌ها در دوره‌های مختلف
        </p>
      </div>

      {/* انتخاب دوره */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid w-full sm:w-auto grid-cols-3 gap-1">
          <TabsTrigger value="daily" className="rounded-lg">
            روزانه
          </TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-lg">
            هفتگی
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg">
            ماهانه
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* کارت‌های خلاصه */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                  <Users className="w-4 h-4 text-primary" />
                  اعضای جدید
                </p>
                <p className="text-2xl font-black mt-1">
                  {data.memberGrowth
                    ? data.memberGrowth.reduce((sum: number, item: any) => sum + (item.count || 0), 0).toLocaleString("fa-IR")
                    : "۰"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                  <Eye className="w-4 h-4 text-primary" />
                  بازدیدها
                </p>
                <p className="text-2xl font-black mt-1">
                  {data.viewGrowth
                    ? data.viewGrowth.reduce((sum: number, item: any) => sum + (item.count || 0), 0).toLocaleString("fa-IR")
                    : "۰"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                  <Send className="w-4 h-4 text-primary" />
                  پیام‌ها
                </p>
                <p className="text-2xl font-black mt-1">
                  {data.smsGrowth
                    ? data.smsGrowth.reduce((sum: number, item: any) => sum + (item.count || 0), 0).toLocaleString("fa-IR")
                    : "۰"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* نمودارها */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* رشد اعضا */}
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  رشد اعضا
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareChartData("member")}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* بازدیدها */}
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  بازدیدها
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareChartData("view")}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* پیام‌ها */}
            <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  پیام‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareChartData("sms")}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}