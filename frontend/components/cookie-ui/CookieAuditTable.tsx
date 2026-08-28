// components/cookie-ui/CookieAuditTable.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Timer,
  LogIn,
  LogOut,
  Cookie,
  Monitor,
  AlertTriangle,
  ScanSearch,
  User,
  Activity,
  Compass,
  Calendar,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { faIR } from "date-fns/locale";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { exportToExcel, exportToPDF } from "./cookieAuditExport";
import type { CookieAuditLog } from "@/types";
import apiClient from "@/services/api/client";
import { getImageUrl } from "@/lib/getImageUrl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const TYPE_MAP: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  login: {
    label: "ورود",
    icon: LogIn,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  logout: {
    label: "خروج",
    icon: LogOut,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
  suspicious: {
    label: "مشکوک",
    icon: ShieldAlert,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  session_create: {
    label: "ایجاد نشست",
    icon: Cookie,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  session_destroy: {
    label: "اتمام نشست",
    icon: XCircle,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  cookie_set: {
    label: "تنظیم کوکی",
    icon: Cookie,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  cookie_read: {
    label: "خواندن کوکی",
    icon: ScanSearch,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  cookie_delete: {
    label: "حذف کوکی",
    icon: XCircle,
    color: "text-pink-600 bg-pink-50 border-pink-200",
  },
  page_view: {
    label: "مشاهده صفحه",
    icon: Eye,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
  },
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    dot: string;
  }
> = {
  success: {
    label: "موفق",
    icon: CheckCircle2,
    color: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "ناموفق",
    icon: XCircle,
    color: "text-red-600",
    dot: "bg-red-500",
  },
  expired: {
    label: "منقضی",
    icon: Timer,
    color: "text-amber-600",
    dot: "bg-amber-500",
  },
  active: {
    label: "فعال",
    icon: CheckCircle2,
    color: "text-blue-600",
    dot: "bg-blue-500",
  },
  revoked: {
    label: "لغو شده",
    icon: XCircle,
    color: "text-gray-600",
    dot: "bg-gray-400",
  },
  suspicious: {
    label: "مشکوک",
    icon: AlertTriangle,
    color: "text-orange-600",
    dot: "bg-orange-500",
  },
  blocked: {
    label: "مسدود",
    icon: ShieldAlert,
    color: "text-red-700",
    dot: "bg-red-700",
  },
};

export default function CookieAuditTable({
  onViewDetail,
  onViewUser,
  onDownloadReport,
}: {
  onViewDetail?: (log: CookieAuditLog) => void;
  onViewUser?: (userId: string) => void;
  onDownloadReport?: (userId: string) => void;
}) {
  const [logs, setLogs] = useState<CookieAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [pathMap, setPathMap] = useState<Record<string, string>>({});
  const [pathsLoading, setPathsLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const debouncedIp = useDebounce(ipFilter, 400);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  // جدید: DateObject به‌جای رشته متنی
  const [startDateObj, setStartDateObj] = useState<DateObject | null>(null);
  const [endDateObj, setEndDateObj] = useState<DateObject | null>(null);

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", pagination.limit.toString());
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (debouncedIp) params.set("ip", debouncedIp);
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (startDateObj) {
          params.set("startDate", startDateObj.toDate().toISOString());
        }
        if (endDateObj) {
          params.set("endDate", endDateObj.toDate().toISOString());
        }
        const res = await apiClient.get(
          `/super-admin/cookie-audits?${params.toString()}`,
        );
        if (res.data?.success) {
          const newLogs: CookieAuditLog[] = res.data.data;
          setLogs(newLogs);
          setPagination(res.data.pagination);
          fetchPathsForLogs(newLogs);
        }
      } catch {
        toast.error("خطا در دریافت لاگ‌ها");
      } finally {
        setLoading(false);
      }
    },
    [
      debouncedSearch,
      debouncedIp,
      typeFilter,
      statusFilter,
      roleFilter,
      startDateObj,
      endDateObj,
      pagination.limit,
    ],
  );

  const fetchPathsForLogs = async (logs: CookieAuditLog[]) => {
    const sessionIds = [
      ...new Set(
        logs.map((log) => log.sessionId).filter((id): id is string => !!id),
      ),
    ];
    if (sessionIds.length === 0) return;

    setPathsLoading(true);
    const newPathMap: Record<string, string> = {};

    try {
      const chunkSize = 5;
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        const promises = chunk.map(async (sid) => {
          try {
            const res = await apiClient.get("/super-admin/page-views", {
              params: {
                sessionId: sid,
                limit: 1,
                sortBy: "createdAt",
                sortOrder: "desc",
              },
            });
            if (res.data?.success && res.data.data?.length > 0) {
              return { sid, path: res.data.data[0].path };
            }
          } catch {
            // ignore
          }
          return { sid, path: undefined };
        });
        const results = await Promise.all(promises);
        results.forEach((r) => {
          if (r.path) newPathMap[r.sid] = r.path;
        });
      }
    } catch (err) {
      console.error("Error fetching page views for sessions:", err);
    } finally {
      setPathMap((prev) => ({ ...prev, ...newPathMap }));
      setPathsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const stats = useMemo(
    () => ({
      total: pagination.total || logs.length,
      suspicious: logs.filter(
        (l) => l.type === "suspicious" || l.status === "suspicious",
      ).length,
      pageViews: logs.filter((l) => l.type === "page_view").length,
      activeSessions: logs.filter((l) => l.status === "active").length,
    }),
    [logs, pagination.total],
  );

  const applyDatePreset = (preset: "today" | "7days" | "30days") => {
    const now = new Date();
    let start: Date;
    if (preset === "today") start = startOfDay(now);
    else if (preset === "7days") start = subDays(now, 7);
    else start = subDays(now, 30);

    const startDate = startOfDay(start);
    const endDate = endOfDay(now);

    setStartDateObj(
      new DateObject({
        date: startDate,
        calendar: persian,
        locale: persian_fa,
      }),
    );
    setEndDateObj(
      new DateObject({
        date: endDate,
        calendar: persian,
        locale: persian_fa,
      }),
    );
  };

  const handleExport = async (type: "excel" | "pdf") => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "2000");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (debouncedIp) params.set("ip", debouncedIp);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (startDateObj) {
        params.set("startDate", startDateObj.toDate().toISOString());
      }
      if (endDateObj) {
        params.set("endDate", endDateObj.toDate().toISOString());
      }
      const res = await apiClient.get(
        `/super-admin/cookie-audits?${params.toString()}`,
      );
      const allLogs: CookieAuditLog[] = res.data?.data || logs;
      if (allLogs.length === 0) {
        toast.error("داده‌ای برای خروجی وجود ندارد");
        return;
      }
      const dateStr = format(new Date(), "yyyy-MM-dd");
      if (type === "excel") {
        await exportToExcel(allLogs, `گزارش-جامع-کوکی-${dateStr}`);
        toast.success("فایل Excel با تمام جزئیات دانلود شد");
      } else {
        await exportToPDF(allLogs, `گزارش-جامع-کوکی-${dateStr}`);
        toast.success("فایل PDF آماده چاپ گردید");
      }
    } catch {
      toast.error("خطا در تولید فایل خروجی");
    } finally {
      setExporting(false);
    }
  };

  const parseUA = (ua?: string) => {
    if (!ua) return { browser: "نامشخص", os: "" };
    let browser = "مرورگر",
      os = "";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";
    return { browser, os };
  };

  const formatDateFa = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy/MM/dd - HH:mm", { locale: faIR });
    } catch {
      return dateStr;
    }
  };

  const resetFilters = () => {
    setSearch("");
    setIpFilter("");
    setTypeFilter("all");
    setStatusFilter("all");
    setRoleFilter("all");
    setStartDateObj(null);
    setEndDateObj(null);
  };

  const hasActiveFilters =
    search ||
    ipFilter ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    roleFilter !== "all" ||
    startDateObj ||
    endDateObj;

  const handleRowClick = (log: CookieAuditLog) => {
    if (onViewDetail) onViewDetail(log);
  };

  const getPathOrCookieInfo = (log: CookieAuditLog) => {
    if (log.navigation?.currentPath) return log.navigation.currentPath;
    if (log.sessionId && pathMap[log.sessionId]) {
      return pathMap[log.sessionId];
    }
    if (log.cookieName) return `Cookie: ${log.cookieName}`;
    if (log.cookieData?.name) return `Cookie: ${log.cookieData.name}`;
    return null;
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* فیلترها */}
      <div className="bg-white dark:bg-card rounded-2xl border p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold">فیلتر هوشمند و جستجو</span>
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700 text-[10px]"
              >
                فیلتر فعال
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-muted/50 p-1 rounded-lg text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyDatePreset("today")}
                className="h-7 text-[11px] px-2 rounded"
              >
                امروز
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyDatePreset("7days")}
                className="h-7 text-[11px] px-2 rounded"
              >
                ۷ روز اخیر
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyDatePreset("30days")}
                className="h-7 text-[11px] px-2 rounded"
              >
                ۳۰ روز اخیر
              </Button>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-destructive h-8"
              >
                <RotateCw className="w-3 h-3 ml-1" /> پاک‌سازی
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("excel")}
              disabled={exporting}
              className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel کامل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={exporting}
              className="gap-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50 h-8"
            >
              <FileText className="w-3.5 h-3.5" /> PDF کامل
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="جستجو نام / موبایل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8 h-9 text-xs"
            />
          </div>
          <Input
            placeholder="فیلتر IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="h-9 text-xs font-mono"
            dir="ltr"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="نوع رویداد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه رویدادها</SelectItem>
              <SelectItem value="login">ورود کاربر</SelectItem>
              <SelectItem value="logout">خروج کاربر</SelectItem>
              <SelectItem value="suspicious">مشکوک / امنیتی</SelectItem>
              <SelectItem value="session_create">ایجاد نشست</SelectItem>
              <SelectItem value="session_destroy">اتمام نشست</SelectItem>
              <SelectItem value="cookie_set">تنظیم کوکی</SelectItem>
              <SelectItem value="cookie_read">خواندن کوکی</SelectItem>
              <SelectItem value="page_view">مشاهده صفحه</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="success">موفق</SelectItem>
              <SelectItem value="failed">ناموفق</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="expired">منقضی شده</SelectItem>
              <SelectItem value="suspicious">مشکوک</SelectItem>
              <SelectItem value="blocked">مسدود شده</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="نقش کاربر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نقش‌ها</SelectItem>
              <SelectItem value="user">کاربر عادی</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="agent">املاک</SelectItem>
              <SelectItem value="developer">سازنده</SelectItem>
              <SelectItem value="admin">مدیر</SelectItem>
            </SelectContent>
          </Select>
          {/* Date pickers */}
          <div>
            <DatePicker
              value={startDateObj}
              onChange={(date: DateObject | null) => setStartDateObj(date)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              placeholder="از تاریخ"
              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
            />
          </div>
          <div>
            <DatePicker
              value={endDateObj}
              onChange={(date: DateObject | null) => setEndDateObj(date)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              placeholder="تا تاریخ"
              className="w-full border border-input rounded-lg p-2 text-sm bg-background"
            />
          </div>
        </div>
      </div>

      {/* جدول */}
      <div className="bg-white dark:bg-card rounded-2xl border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50/70 hover:bg-orange-50/70 border-b border-orange-100">
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center w-12">
                  ردیف
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center">
                  کاربر
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center">
                  رویداد
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center">
                  وضعیت
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center hidden md:table-cell">
                  IP / دستگاه
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center hidden md:table-cell">
                  مسیر / داده کوکی
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center">
                  تاریخ ثبت
                </TableHead>
                <TableHead className="text-xs font-bold text-orange-900 py-3 px-3 text-center">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j} className="py-3 px-3 text-center">
                        <Skeleton className="h-4 w-full max-w-[90px] mx-auto rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Cookie className="w-10 h-10 opacity-30 text-orange-500" />
                      <p className="text-sm font-medium">
                        هیچ لاگ یا داده‌ای با این فیلترها یافت نشد
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {logs.map((log, idx) => {
                    const typeInfo = TYPE_MAP[log.type] || {
                      label: log.type,
                      icon: ShieldAlert,
                      color: "text-gray-600 bg-gray-50 border-gray-200",
                    };
                    const statusInfo = STATUS_CONFIG[log.status] || {
                      label: log.status,
                      icon: AlertTriangle,
                      color: "text-gray-500",
                      dot: "bg-gray-400",
                    };
                    const ua = parseUA(log.userAgent);
                    const TypeIcon = typeInfo.icon;

                    const userObj = log.userId;
                    const fullName =
                      userObj?.firstName || userObj?.lastName
                        ? `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim()
                        : null;

                    const avatarSrc = userObj?.avatar
                      ? getImageUrl(userObj.avatar)
                      : "/images/user.webp";

                    const pathOrCookie = getPathOrCookieInfo(log);

                    return (
                      <motion.tr
                        key={log._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.02 }}
                        className={cn(
                          "border-b border-border/50 hover:bg-orange-50/40 transition-colors cursor-pointer",
                          log.type === "suspicious" &&
                            "bg-red-50/30 hover:bg-red-50/50",
                        )}
                        onClick={() => handleRowClick(log)}
                      >
                        <TableCell className="py-2.5 px-3 text-center text-xs text-muted-foreground tabular-nums">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={avatarSrc}
                                alt={fullName || "کاربر"}
                                className="object-cover"
                              />
                              <AvatarFallback />
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">
                                {fullName || "مهمان / ناشناس"}
                              </span>
                              {userObj?.phone && (
                                <span
                                  className="text-[10px] text-muted-foreground font-mono"
                                  dir="ltr"
                                >
                                  {userObj.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px] font-bold rounded-lg px-2 py-0.5 inline-flex items-center",
                              typeInfo.color,
                            )}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                statusInfo.dot,
                              )}
                            />
                            <span
                              className={cn(
                                "text-[11px] font-bold",
                                statusInfo.color,
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center hidden md:table-cell">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className="text-[11px] font-mono text-foreground"
                              dir="ltr"
                            >
                              {log.ip || "-"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {ua.browser}
                              {ua.os ? ` (${ua.os})` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center hidden md:table-cell max-w-[180px]">
                          <div className="flex flex-col items-center gap-0.5 truncate">
                            {pathOrCookie ? (
                              <span
                                className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded dir-ltr truncate max-w-full text-slate-700 dark:text-slate-300"
                                dir="ltr"
                                title={pathOrCookie}
                              >
                                {pathOrCookie}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {pathsLoading && log.sessionId ? (
                                  <span className="inline-block w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin ml-1" />
                                ) : (
                                  "-"
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDateFa(log.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg hover:bg-orange-100 hover:text-orange-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(log);
                              }}
                              title="مشاهده تمام جزئیات کوکی و کاربر"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {log.userId?._id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg hover:bg-blue-100 hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewUser?.(log.userId!._id.toString());
                                }}
                                title="نمایش پروفایل کاربر"
                              >
                                <User className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {log.userId?._id && onDownloadReport && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-100 hover:text-emerald-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownloadReport?.(log.userId!._id.toString());
                                }}
                                title="دانلود گزارش کامل رفتار کاربر"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && logs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                نمایش{" "}
                <span className="font-bold text-foreground">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                تا{" "}
                <span className="font-bold text-foreground">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                از{" "}
                <span className="font-bold text-foreground">
                  {pagination.total}
                </span>{" "}
                رکورد
              </p>
              <Select
                value={pagination.limit.toString()}
                onValueChange={(val) =>
                  setPagination((prev) => ({ ...prev, limit: Number(val) }))
                }
              >
                <SelectTrigger className="h-7 text-[11px] w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">۱۰ تایی</SelectItem>
                  <SelectItem value="20">۲۰ تایی</SelectItem>
                  <SelectItem value="50">۵۰ تایی</SelectItem>
                  <SelectItem value="100">۱۰۰ تایی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from(
                { length: Math.min(5, pagination.pages) },
                (_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 5) pageNum = i + 1;
                  else if (pagination.page <= 3) pageNum = i + 1;
                  else if (pagination.page >= pagination.pages - 2)
                    pageNum = pagination.pages - 4 + i;
                  else pageNum = pagination.page - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={
                        pageNum === pagination.page ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => fetchLogs(pageNum)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg text-xs",
                        pageNum === pagination.page &&
                          "bg-orange-500 hover:bg-orange-600 text-white",
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}