"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApiLogs, useLogAnalytics } from "@/hooks/useApiLogs";
import { developerApi, type LogEntry } from "@/services/api/developer.api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Loader2,
  Search,
  Trash2,
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  Globe,
  Bug,
  Timer,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileCode,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import { exportLogsToPDF } from "@/lib/pdfExport";
const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  PATCH: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const PIE_COLORS = ["#f97316", "#f59e0b", "#10b981", "#6366f1"];

export default function LogsPage() {
  const {
    analytics,
    loading: analyticsLoading,
    activeDays,
    changeDays,
    clearOldLogs,
    refetch,
  } = useLogAnalytics(7);
  const {
    logs,
    pagination,
    loading: logsLoading,
    filters,
    setFilter,
    setPage,
  } = useApiLogs();
  const [searchInput, setSearchInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | "txt" | "pdf" | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  // ─── جستجو ──────────────────────────────────────────────────
  const handleSearch = () => {
    setFilter("search", searchInput || undefined);
  };

  // ─── پاک‌سازی ──────────────────────────────────────────────
  const handleClearLogs = async () => {
    if (!confirm("لاگ‌های قدیمی‌تر از ۳۰ روز پاک شوند؟")) return;
    setClearing(true);
    try {
      await clearOldLogs(30);
      toast.success("لاگ‌های قدیمی با موفقیت پاک شدند");
    } catch (error) {
      toast.error("خطا در پاک‌سازی لاگ‌ها");
    } finally {
      setClearing(false);
    }
  };

  // ─── دریافت تمام لاگ‌ها با فیلترهای فعلی ──────────────────
  const fetchAllLogs = useCallback(async (maxRecords: number = 100000): Promise<LogEntry[]> => {
    const allLogs: LogEntry[] = [];
    let page = 1;
    const limit = 5000;
    let hasMore = true;

    const params: any = {
      limit,
      page,
    };
    if (filters.search) params.search = filters.search;
    if (filters.method) params.method = filters.method;
if ((filters as any).statusCode) params.status = (filters as any).statusCode;
    try {
      while (hasMore && allLogs.length < maxRecords) {
        const response = await developerApi.getLogs({ ...params, page });
        const data = response.data;
        if (data.logs && data.logs.length > 0) {
          allLogs.push(...data.logs);
          page++;
          if (data.pagination && data.pagination.page >= data.pagination.pages) {
            hasMore = false;
          }
          if (allLogs.length % 10000 === 0) {
            setExportProgress({ current: allLogs.length, total: data.pagination?.total || maxRecords });
          }
        } else {
          hasMore = false;
        }
      }
      return allLogs;
    } catch (error) {
      console.error("Error fetching all logs:", error);
      toast.error("خطا در دریافت لاگ‌ها");
      return [];
    } finally {
      setExportProgress(null);
    }
  }, [filters]);

  // ─── خروجی JSON ──────────────────────────────────────────────
  const exportJSON = async () => {
    setExporting("json");
    setExportProgress({ current: 0, total: 0 });
    try {
      const allLogs = await fetchAllLogs(100000);
      if (allLogs.length === 0) {
        toast.warning("هیچ لاگی برای خروجی وجود ندارد");
        setExporting(null);
        return;
      }
      const data = allLogs.map((log) => ({
        _id: log._id,
        method: log.method,
        endpoint: log.endpoint,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        ip: log.ip,
        timestamp: log.timestamp,
        error: log.error || null,
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `logs-${formatDate()}.json`);
      toast.success(`✅ خروجی JSON با ${data.length} رکورد دانلود شد`);
    } catch (error) {
      toast.error("خطا در ایجاد فایل JSON");
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };

  // ─── خروجی CSV ──────────────────────────────────────────────
  const exportCSV = async () => {
    setExporting("csv");
    setExportProgress({ current: 0, total: 0 });
    try {
      const allLogs = await fetchAllLogs(100000);
      if (allLogs.length === 0) {
        toast.warning("هیچ لاگی برای خروجی وجود ندارد");
        setExporting(null);
        return;
      }
      const headers = ["متد", "Endpoint", "وضعیت", "زمان پاسخ", "IP", "تاریخ", "خطا"];
      const rows = allLogs.map((log) => [
        log.method,
        log.endpoint,
        log.statusCode,
        `${log.responseTime}ms`,
        log.ip || "-",
        new Date(log.timestamp).toLocaleString("fa-IR"),
        log.error || "-",
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `logs-${formatDate()}.csv`);
      toast.success(`✅ خروجی CSV با ${rows.length} رکورد دانلود شد`);
    } catch (error) {
      toast.error("خطا در ایجاد فایل CSV");
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };

  // ─── خروجی TXT ──────────────────────────────────────────────
  const exportTXT = async () => {
    setExporting("txt");
    setExportProgress({ current: 0, total: 0 });
    try {
      const allLogs = await fetchAllLogs(100000);
      if (allLogs.length === 0) {
        toast.warning("هیچ لاگی برای خروجی وجود ندارد");
        setExporting(null);
        return;
      }
      const lines = [
        "═══════════════════════════════════════════════════════════",
        `📋 گزارش لاگ‌های API - تاریخ: ${new Date().toLocaleString("fa-IR")}`,
        "═══════════════════════════════════════════════════════════",
        "",
        ...allLogs.map((log) =>
          `[${new Date(log.timestamp).toLocaleString("fa-IR")}] ${log.method} ${log.endpoint} → ${log.statusCode} (${log.responseTime}ms) ${log.error ? `❌ ${log.error}` : ""}`
        ),
        "",
        "═══════════════════════════════════════════════════════════",
        `📊 مجموع: ${allLogs.length} درخواست`,
        "═══════════════════════════════════════════════════════════",
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      downloadBlob(blob, `logs-${formatDate()}.txt`);
      toast.success(`✅ خروجی TXT با ${allLogs.length} رکورد دانلود شد`);
    } catch (error) {
      toast.error("خطا در ایجاد فایل TXT");
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };

  // ─── خروجی PDF (با استفاده از تابع جدید) ──────────────────
const exportPDF = async () => {
  setExporting("pdf");
  setExportProgress({ current: 0, total: 0 });
  try {
    const allLogs = await fetchAllLogs(5000);
    if (allLogs.length === 0) {
      toast.warning("هیچ لاگی برای خروجی وجود ندارد");
      setExporting(null);
      return;
    }
    if (allLogs.length >= 5000) {
      toast.info("به دلیل حجم بالا، فقط ۵۰۰۰ رکورد اول در PDF قرار گرفتند.");
    }

    await exportLogsToPDF(
      allLogs,
      `logs-${formatDate()}.pdf`,
      "گزارش لاگ‌های API - پلتفرم تبادل"
    );

    toast.success(`✅ خروجی PDF با ${allLogs.length} رکورد دانلود شد`);
  } catch (error: any) {
    console.error("PDF export error:", error);
    toast.error(error.message || "خطا در ایجاد فایل PDF");
  } finally {
    setExporting(null);
    setExportProgress(null);
  }
};

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = () => format(new Date(), "yyyy-MM-dd-HHmm", { locale: faIR });

  const statusColor = (code: number) => {
    if (code < 300) return "text-emerald-600 dark:text-emerald-400";
    if (code < 400) return "text-blue-600 dark:text-blue-400";
    if (code < 500) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  if (analyticsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const a = analytics;

  return (
    <div className="space-y-6 px-3 sm:px-6 pb-8" dir="rtl">
      {/* ─── هدر ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100/70 dark:bg-orange-500/10 rounded-2xl border border-orange-200/50 dark:border-orange-500/20">
            <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لاگ‌ها و آنالیتیکس API</h1>
            <p className="text-muted-foreground text-sm">
              مانیتورینگ درخواست‌ها، خطاها و عملکرد
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> بروزرسانی
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearLogs}
            disabled={clearing}
            className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50"
          >
            {clearing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            پاک‌سازی
          </Button>
        </div>
      </div>

      {/* ─── بازه زمانی ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[1, 7, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={activeDays === d ? "default" : "outline"}
            onClick={() => changeDays(d)}
            className={activeDays === d ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {d === 1 ? "۲۴ ساعت" : `${d} روز`}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={exportJSON}
          disabled={exporting !== null}
          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          {exporting === "json" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
          JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={exporting !== null}
          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        >
          {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportTXT}
          disabled={exporting !== null}
          className="gap-1.5 text-gray-600 border-gray-200 hover:bg-gray-50"
        >
          {exporting === "txt" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          TXT
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportPDF}
          disabled={exporting !== null}
          className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
        >
          {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCode className="w-3.5 h-3.5" />}
          PDF
        </Button>
      </div>

      {/* ─── کارت‌های خلاصه ────────────────────────────────────── */}
      {a && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={<Activity className="w-5 h-5" />}
            label="کل درخواست‌ها"
            value={a.summary.totalRequests.toLocaleString("fa-IR")}
            sub={`${a.summary.successCount.toLocaleString("fa-IR")} موفق`}
            color="orange"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="خطای ۴xx"
            value={a.summary.error4xx.toLocaleString("fa-IR")}
            sub={`${((a.summary.error4xx / (a.summary.totalRequests || 1)) * 100).toFixed(1)}%`}
            color="amber"
          />
          <SummaryCard
            icon={<Bug className="w-5 h-5" />}
            label="خطای ۵xx"
            value={a.summary.error5xx.toLocaleString("fa-IR")}
            sub={`${((a.summary.error5xx / (a.summary.totalRequests || 1)) * 100).toFixed(1)}%`}
            color="red"
          />
          <SummaryCard
            icon={<Clock className="w-5 h-5" />}
            label="میانگین پاسخ"
            value={`${a.responseTime.avg}ms`}
            sub={`P95: ${a.responseTime.p95}ms`}
            color="cyan"
          />
        </div>
      )}

      {/* ─── نمودارها ──────────────────────────────────────────── */}
      {a && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                نمودار مصرف API
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.timeSeries.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={a.timeSeries}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
               tickFormatter={(v) => {
  const d = new Date(v as string);
  return activeDays <= 1
    ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
    : `${d.getMonth() + 1}/${d.getDate()}`;
}}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                        direction: "rtl",
                      }}
                      labelFormatter={(v) => {
  const d = new Date(v as string);                        return d.toLocaleString("fa-IR");
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="درخواست"
                      stroke="#f97316"
                      fill="url(#colorCount)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="errorCount"
                      name="خطا"
                      stroke="#ef4444"
                      fill="url(#colorError)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-cyan-500" />
                توزیع متدها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.methodStats.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={a.methodStats}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {a.methodStats.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12, direction: "rtl" }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── آمار تکمیلی ───────────────────────────────────────── */}
      {a && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                پرمصرف‌ترین Endpointها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.endpointStats.length === 0 ? (
                <EmptyList />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, a.endpointStats.length * 36)}
                >
                  <BarChart
                    data={a.endpointStats.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="endpoint"
                      tick={{ fontSize: 10 }}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12, direction: "rtl" }}
                      formatter={(value, name) => [
                        Number(value).toLocaleString("fa-IR"),
                        name === "count" ? "تعداد درخواست" : "میانگین زمان (ms)",
                      ]}
                    />
                    <Bar dataKey="count" name="count" fill="#f97316" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-500" />
                آمار زمان پاسخ‌دهی
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.summary.totalRequests === 0 ? (
                <EmptyList />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetricBox label="میانگین" value={`${a.responseTime.avg}ms`} color="orange" />
                  <MetricBox label="حداقل" value={`${a.responseTime.min}ms`} color="emerald" />
                  <MetricBox label="حداکثر" value={`${a.responseTime.max}ms`} color="red" />
                  <MetricBox label="P50" value={`${a.responseTime.p50}ms`} color="blue" />
                  <MetricBox label="P95" value={`${a.responseTime.p95}ms`} color="amber" />
                  <MetricBox label="P99" value={`${a.responseTime.p99}ms`} color="orange" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── خطاها و مصرف‌کنندگان ────────────────────────────── */}
      {a && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                خطاهای رایج
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.errorStats.length === 0 ? (
                <EmptyList message="✅ خطایی ثبت نشده! همه چیز خوبه" />
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {a.errorStats.slice(0, 10).map((err, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono shrink-0 ${statusColor(err.statusCode)}`}
                        >
                          {err.statusCode}
                        </Badge>
                        <code className="text-xs truncate" dir="ltr">
                          {err.endpoint}
                        </code>
                      </div>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {err.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                مصرف‌کنندگان برتر
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.topConsumers.length === 0 ? (
                <EmptyList />
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {a.topConsumers.map((consumer, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono truncate" dir="ltr">
                            {consumer.ip}
                          </p>
                          {consumer.apiKeyName && (
                            <p className="text-[10px] text-muted-foreground">
                              {consumer.apiKeyName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-xs font-bold">
                          {consumer.count.toLocaleString("fa-IR")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {consumer.uniqueEndpoints} endpoint
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── جدول لاگ‌ها ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-500" />
              آخرین درخواست‌ها
              {pagination && (
                <Badge variant="secondary" className="text-xs">
                  {pagination.total.toLocaleString("fa-IR")} رکورد
                </Badge>
              )}
            </CardTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 flex-1 sm:flex-none">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 w-full sm:w-44 text-xs rounded-md pr-8 pl-2"
                    placeholder="جستجوی endpoint..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Filter className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {["", "GET", "POST", "PATCH", "DELETE"].map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={filters.method === m ? "default" : "outline"}
                    onClick={() => setFilter("method", m)}
                    className={filters.method === m ? "bg-orange-600 hover:bg-orange-700 h-7 text-xs" : "h-7 text-xs"}
                  >
                    {m || "همه"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              هنوز لاگی ثبت نشده. با ارسال درخواست API، لاگ‌ها اینجا نمایش داده می‌شن.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-right pb-2 pr-2 font-medium">متد</th>
                      <th className="text-right pb-2 font-medium">Endpoint</th>
                      <th className="text-right pb-2 font-medium">وضعیت</th>
                      <th className="text-right pb-2 font-medium">زمان</th>
                      <th className="text-right pb-2 font-medium hidden md:table-cell">IP</th>
                      <th className="text-right pb-2 font-medium hidden lg:table-cell">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <motion.tr
                        key={log._id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 pr-2">
                          <Badge className={`text-[10px] font-mono ${METHOD_COLORS[log.method] || ""}`}>
                            {log.method}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <code className="text-xs font-mono break-all" dir="ltr">
                            {log.endpoint}
                          </code>
                          {log.error && (
                            <p className="text-[10px] text-red-500 truncate max-w-[200px]">
                              {log.error}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-xs font-mono font-bold ${statusColor(log.statusCode)}`}>
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs text-muted-foreground">
                            {log.responseTime}ms
                          </span>
                        </td>
                        <td className="py-2.5 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                            {log.ip || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString("fa-IR")}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.pages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                    className="gap-1 h-8"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    قبلی
                  </Button>
                  <span className="text-xs text-muted-foreground px-3">
                    {pagination.page} از {pagination.pages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPage(pagination.page + 1)}
                    className="gap-1 h-8"
                  >
                    بعدی
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {pagination.total.toLocaleString("fa-IR")} رکورد
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── نمایش پیشرفت دانلود ──────────────────────────────── */}
      {exportProgress && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">در حال آماده‌سازی...</span>
          </div>
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: exportProgress.total > 0
                  ? `${Math.min(100, (exportProgress.current / exportProgress.total) * 100)}%`
                  : '10%',
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {exportProgress.current.toLocaleString('fa-IR')} از {exportProgress.total.toLocaleString('fa-IR')} رکورد
          </p>
        </div>
      )}
    </div>
  );
}

// ─── کامپوننت‌های کمکی ──────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    orange: "bg-orange-100/70 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20",
    amber: "bg-amber-100/70 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20",
    red: "bg-red-100/70 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-500/20",
    cyan: "bg-cyan-100/70 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-500/20",
    violet: "bg-violet-100/70 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-500/20",
  };
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 rounded-xl border ${colorMap[color] || colorMap.violet}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-base sm:text-xl font-bold truncate">{value}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    orange: "text-orange-600 dark:text-orange-400",
  };
  return (
    <div className="p-2 sm:p-3 rounded-xl bg-muted/50 text-center">
      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm sm:text-lg font-bold font-mono ${colorMap[color] || ""}`}>{value}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
      <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
      <p className="text-sm">داده‌ای برای نمایش وجود ندارد</p>
      <p className="text-xs">با ارسال درخواست API، نمودارها پر می‌شن</p>
    </div>
  );
}

function EmptyList({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <p className="text-sm">{message || "داده‌ای وجود ندارد"}</p>
    </div>
  );
}