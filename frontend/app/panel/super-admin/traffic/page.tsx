"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { adminApi } from "@/services/api/admin.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  RotateCcw,
  RefreshCw,
  Filter,
  Globe,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Fingerprint,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageViewEntry {
  _id: string;
  ip: string;
  path: string;
  referrer?: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  sessionId?: string;
  createdAt: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toPersianNum = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[+d]);

export default function TrafficLogsPage() {
  const [views, setViews] = useState<PageViewEntry[]>([]);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterIp, setFilterIp] = useState("");
  const [filterPath, setFilterPath] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [startDateObj, setStartDateObj] = useState<DateObject | null>(null);
  const [endDateObj, setEndDateObj] = useState<DateObject | null>(null);
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getPageViews({
        page,
        limit: meta.limit,
        ip: filterIp.trim() || undefined,
        path: filterPath.trim() || undefined,
        sessionId: filterSession.trim() || undefined,
        userId: filterUserId.trim() || undefined,
        startDate: startDateObj?.toDate().toISOString() || undefined,
        endDate: endDateObj?.toDate().toISOString() || undefined,
        sortBy: "createdAt",
        sortOrder,
      });

      if (!data.success)
        throw new Error(data.message || "خطا در دریافت لاگ ترافیک");
      setViews(data.data);
      setMeta(data.meta);
    } catch (err: any) {
      setError(err.message || "خطای شبکه");
      toast.error("دریافت ترافیک با خطا مواجه شد");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    filterIp,
    filterPath,
    filterSession,
    filterUserId,
    startDateObj,
    endDateObj,
    sortOrder,
    meta.limit,
  ]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const resetFilters = () => {
    setFilterIp("");
    setFilterPath("");
    setFilterSession("");
    setFilterUserId("");
    setStartDateObj(null);
    setEndDateObj(null);
    setSortOrder("desc");
    setPage(1);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // آمار سریع از داده‌های فعلی
  const stats = useMemo(() => {
    const uniqueIps = new Set(views.map((v) => v.ip));
    const guestCount = views.filter((v) => !v.user).length;
    const todayCount = views.filter((v) => {
      const d = new Date(v.createdAt);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }).length;
    return {
      total: meta.total,
      uniqueIps: uniqueIps.size,
      guestCount,
      todayCount,
    };
  }, [views, meta.total]);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            ترافیک سایت
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            بازدیدهای کاربران (شامل مهمان) به تفکیک IP، مسیر و نشست.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="gap-1 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" />
            پاک‌کردن فیلترها
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchViews}
            className="gap-1 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            به‌روزرسانی
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">کل بازدیدها</p>
            <p className="text-2xl font-black mt-1">{toPersianNum(stats.total)}</p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">IP یکتا</p>
            <p className="text-2xl font-black mt-1">{toPersianNum(stats.uniqueIps)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Fingerprint className="w-6 h-6" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">بازدید مهمان</p>
            <p className="text-2xl font-black mt-1">{toPersianNum(stats.guestCount)}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between shadow-sm"
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">بازدید امروز</p>
            <p className="text-2xl font-black mt-1">{toPersianNum(stats.todayCount)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl shadow-card border border-border p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">فیلترهای پیشرفته</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* IP */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              IP
            </label>
            <Input
              placeholder="مثلاً 127.0.0.1"
              value={filterIp}
              onChange={(e) => setFilterIp(e.target.value)}
              className="dir-ltr text-left rounded-xl"
            />
          </div>

          {/* Path */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              مسیر
            </label>
            <Input
              placeholder="مثلاً /search"
              value={filterPath}
              onChange={(e) => setFilterPath(e.target.value)}
              className="dir-ltr text-left rounded-xl"
            />
          </div>

          {/* Session ID */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              شناسه نشست (Session)
            </label>
            <Input
              placeholder="Session ID"
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="dir-ltr text-left rounded-xl"
            />
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              شناسه کاربر
            </label>
            <Input
              placeholder="User ID"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Date from */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              از تاریخ
            </label>
            <DatePicker
              value={startDateObj}
              onChange={(date: DateObject | null) => setStartDateObj(date)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              placeholder="انتخاب تاریخ"
              className="w-full border border-input rounded-xl p-2 text-sm bg-background"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              تا تاریخ
            </label>
            <DatePicker
              value={endDateObj}
              onChange={(date: DateObject | null) => setEndDateObj(date)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              placeholder="انتخاب تاریخ"
              className="w-full border border-input rounded-xl p-2 text-sm bg-background"
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              مرتب‌سازی
            </label>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">جدیدترین</SelectItem>
                <SelectItem value="asc">قدیمی‌ترین</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apply button */}
          <div className="flex items-end">
            <Button
              onClick={() => setPage(1)}
              className="w-full gap-1 rounded-xl"
            >
              <Search className="w-4 h-4" />
              اعمال فیلترها
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <Button
            variant="link"
            onClick={fetchViews}
            className="text-destructive"
          >
            تلاش مجدد
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-right whitespace-nowrap">زمان</TableHead>
                <TableHead className="text-right">IP</TableHead>
                <TableHead className="text-right">مسیر</TableHead>
                <TableHead className="text-right">Referrer</TableHead>
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">Session</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : views.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Globe className="w-10 h-10 opacity-50" />
                      <p className="font-medium">هیچ بازدیدی یافت نشد</p>
                      <p className="text-sm">
                        چند صفحه از سایت را باز کنید یا با فیلترهای دیگر جستجو کنید.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                views.map((v) => (
                  <TableRow
                    key={v._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleString("fa-IR")}
                    </TableCell>
                    <TableCell className="text-sm dir-ltr text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{v.ip}</span>
                        <button
                          onClick={() => handleCopyIp(v.ip)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="کپی IP"
                        >
                          {copiedIp === v.ip ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm dir-ltr text-left max-w-[200px] truncate" title={v.path}>
                      <span className="inline-flex items-center gap-1">
                        {v.path}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </span>
                    </TableCell>
                    <TableCell className="text-sm dir-ltr text-left max-w-[200px] truncate" title={v.referrer || ""}>
                      {v.referrer || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.user ? (
                        <span className="inline-flex items-center gap-1.5">
                          {v.user.firstName || v.user.lastName
                            ? `${v.user.firstName || ""} ${v.user.lastName || ""}`
                            : v.user.phone || "کاربر"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                          <MapPin className="w-3.5 h-3.5" />
                          مهمان
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm dir-ltr text-left font-mono">
                      {v.sessionId ? v.sessionId.substring(0, 8) + "…" : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-card rounded-2xl shadow-card border border-border p-4 gap-3">
          <span className="text-sm text-muted-foreground">
            صفحه {toPersianNum(meta.page)} از {toPersianNum(meta.totalPages)} | کل:{" "}
            {toPersianNum(meta.total)} بازدید
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl"
            >
              قبلی
            </Button>
            <span className="text-sm font-bold px-2">{toPersianNum(page)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.totalPages}
              className="rounded-xl"
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}