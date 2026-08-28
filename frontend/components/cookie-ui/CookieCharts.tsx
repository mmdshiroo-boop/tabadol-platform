// CookieCharts
"use client";

import { useEffect, useState } from "react";
import { cookieAuditService } from "@/services/api/cookieAudit.api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toJalali } from "@/lib/jalali";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, ShieldAlert } from "lucide-react";

export default function CookieCharts() {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cookieAuditService
      .getDailyStats(30)
      .then((data) => {
        setDailyData(data || []);
      })
      .catch((err) => {
        console.error("Error fetching daily stats:", err);
        setDailyData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-elevation rounded-2xl overflow-hidden">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dailyData.length === 0) {
    return (
      <Card className="border-0 shadow-elevation rounded-2xl overflow-hidden">
        <CardContent className="py-16 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            داده‌ای برای رسم نمودار ۳۰ روزه یافت نشد
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = dailyData.map((d) => ({
    date: toJalali(d._id),
    logins: d.logins ?? 0,
    suspicious: d.suspicious ?? 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-0 shadow-elevation rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="w-5 h-5 text-primary" />
            روند ۳۰ روزه فعالیت‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="suspiciousGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--destructive))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--destructive))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontFamily: "Vazirmatn",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontFamily: "Vazirmatn", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="logins"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#loginGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
                name="ورود"
              />
              <Area
                type="monotone"
                dataKey="suspicious"
                stroke="hsl(var(--destructive))"
                strokeWidth={2.5}
                fill="url(#suspiciousGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(var(--destructive))" }}
                name="مشکوک"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}