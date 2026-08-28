// CookieAuditStats
"use client";

import { useEffect, useState, useRef } from "react";
import { cookieAuditService } from "@/services/api/cookieAudit.api";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, useInView } from "framer-motion";
import {
  LogIn,
  ShieldAlert,
  Radio,
  Globe,
  AlertTriangle,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 800;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString("fa-IR")}
    </span>
  );
}

interface StatCardData {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
  warn?: boolean;
  border?: string;
}

export default function CookieAuditStatsCard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [livePulse, setLivePulse] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await cookieAuditService.getStats();
        // پاسخ ممکن است داخل data باشد
        const data = res.data || res;
        setStats(data);
      } catch (e) {
        console.error("Stats fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // Real-time Socket.io
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const socket = io(API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("cookie-audit:new", () => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1500);
      fetchStats(); // به‌روزرسانی دوباره آمار
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="border-0 shadow-elevation rounded-2xl overflow-hidden"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-7 w-14 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-11 w-11 bg-muted rounded-xl animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5 rounded-2xl">
        <CardContent className="p-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" />
          خطا در بارگذاری آمار
        </CardContent>
      </Card>
    );
  }

  const statCards: StatCardData[] = [
    {
      title: "کل لاگین‌ها",
      value: stats.totalLogins ?? 0,
      icon: LogIn,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "موارد مشکوک (۲۴h)",
      value: stats.suspiciousLast24h ?? 0,
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
      warn: true,
      border:
        (stats.suspiciousLast24h ?? 0) > 0
          ? "ring-2 ring-destructive/30"
          : "",
    },
    {
      title: "نشست‌های فعال",
      value: stats.activeSessionCount ?? 0,
      icon: Radio,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      title: "IPهای یکتا",
      value: stats.uniqueIPs ?? 0,
      icon: Globe,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
  ];

  const recentSuspicious = stats.recentSuspicious || [];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const isWarn = card.warn && card.value > 0;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
            >
              <Card
                className={`border-0 shadow-elevation rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  card.border || ""
                } ${livePulse ? "ring-2 ring-primary/30" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {card.title}
                      </p>
                      <p
                        className={`text-2xl font-black ${
                          isWarn ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        <AnimatedCounter value={card.value} />
                      </p>
                    </div>
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center ${card.bg}`}
                    >
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* موارد مشکوک اخیر */}
      {recentSuspicious.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-elevation rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-l from-destructive/10 via-destructive/5 to-transparent p-4 border-b border-destructive/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                <span className="text-sm font-black">موارد مشکوک اخیر</span>
                <Badge variant="destructive" className="text-[10px] mr-auto">
                  {recentSuspicious.length} مورد
                </Badge>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {recentSuspicious.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Fingerprint className="w-4 h-4 text-destructive/60 shrink-0" />
                      <span className="font-medium truncate">
                        {item.user || (item.userId?.firstName
                          ? `${item.userId.firstName} ${item.userId.lastName || ""}`.trim()
                          : item.ip)}
                      </span>
                    </div>
                    <span
                      className="text-xs font-mono text-muted-foreground shrink-0"
                      dir="ltr"
                    >
                      {item.ip}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(item.createdAt), "HH:mm", {
                        locale: faIR,
                      })}
                    </span>
                    <Badge
                      variant="destructive"
                      className="text-[10px] shrink-0"
                    >
                      {item.reason || "نامشخص"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}