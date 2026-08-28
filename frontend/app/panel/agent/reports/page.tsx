"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building,
  Eye,
  Users,
  DollarSign,
  TrendingUp,
  Home,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Filter,
  X,
  Braces,
  Printer,
} from "lucide-react";
import { agentApi, AgentStats } from "@/services/api/agent.api";
import { InfoCardStatic } from "@/components/ui/info-card";
import {
  exportToExcel,
  exportToPdf,
  exportToText,
  exportToJson,
  printElement,
} from "@/utils/agentClubExport";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/colors/red.css";

const defaultStats: AgentStats = {
  properties: { total: 0, active: 0, sold: 0, pending: 0, expired: 0 },
  views: { total: 0, averagePerProperty: 0 },
  leads: { total: 0, new: 0, converted: 0, conversionRate: 0 },
  revenue: { total: 0, commission: 0, averagePerSale: 0 },
  topProperties: [],
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export default function AgentReportsPage() {
  const [stats, setStats] = useState<AgentStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingText, setDownloadingText] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);

  // ─── Date Range State ──────────────────────────────────────
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hasDateFilter, setHasDateFilter] = useState(false);

  // ─── Fetch Stats ────────────────────────────────────────────
  const fetchStats = useCallback(async (start?: Date | null, end?: Date | null) => {
    setLoading(true);
    try {
      const params: any = {};
      if (start && end) {
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
        setHasDateFilter(true);
      } else {
        setHasDateFilter(false);
      }
      const data = await agentApi.getStats(params);
      setStats({
        properties: {
          total: data?.properties?.total ?? 0,
          active: data?.properties?.active ?? 0,
          sold: data?.properties?.sold ?? 0,
          pending: data?.properties?.pending ?? 0,
          expired: data?.properties?.expired ?? 0,
        },
        views: {
          total: data?.views?.total ?? 0,
          averagePerProperty: data?.views?.averagePerProperty ?? 0,
        },
        leads: {
          total: data?.leads?.total ?? 0,
          new: data?.leads?.new ?? 0,
          converted: data?.leads?.converted ?? 0,
          conversionRate: data?.leads?.conversionRate ?? 0,
        },
        revenue: {
          total: data?.revenue?.total ?? 0,
          commission: data?.revenue?.commission ?? 0,
          averagePerSale: data?.revenue?.averagePerSale ?? 0,
        },
        topProperties: data?.topProperties ?? [],
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error(error?.response?.data?.error || "خطا در دریافت آمار");
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Refresh ────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats(startDate, endDate);
    setRefreshing(false);
    toast.success("آمار به‌روزرسانی شد");
  };

  // ─── Apply Date Filter ──────────────────────────────────────
  const handleApplyFilter = () => {
    if (startDate && endDate) {
      fetchStats(startDate, endDate);
    } else {
      toast.warning("لطفاً بازهٔ تاریخ را کامل انتخاب کنید");
    }
  };

  const handleResetFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setHasDateFilter(false);
    fetchStats(null, null);
  };

  // ─── Generate Report (Save) ────────────────────────────────
  const handleGenerateReport = async () => {
    try {
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }
      await agentApi.generateDailyReport(params);
      toast.success("گزارش ذخیره شد");
    } catch (error: any) {
      console.error("Generate report error:", error);
      toast.error(error?.response?.data?.message || "خطا در ذخیره گزارش");
    }
  };

  // ─── ساخت داده‌های گزارش ───
  const buildReportRows = (): Array<Record<string, any>> => [
    { "شاخص": "کل املاک", "مقدار": stats.properties.total },
    { "شاخص": "فعال", "مقدار": stats.properties.active },
    { "شاخص": "فروش رفته", "مقدار": stats.properties.sold },
    { "شاخص": "در انتظار تأیید", "مقدار": stats.properties.pending },
    { "شاخص": "منقضی شده", "مقدار": stats.properties.expired },
    { "شاخص": "کل بازدیدها", "مقدار": stats.views.total },
    { "شاخص": "میانگین بازدید هر ملک", "مقدار": stats.views.averagePerProperty },
    { "شاخص": "کل لیدها", "مقدار": stats.leads.total },
    { "شاخص": "لیدهای جدید", "مقدار": stats.leads.new },
    { "شاخص": "لیدهای تبدیل شده", "مقدار": stats.leads.converted },
    { "شاخص": "نرخ تبدیل (%)", "مقدار": `${stats.leads.conversionRate}%` },
    { "شاخص": "کل درآمد (تومان)", "مقدار": stats.revenue.total },
    { "شاخص": "کمیسیون (تومان)", "مقدار": stats.revenue.commission },
    { "شاخص": "میانگین فروش هر ملک (تومان)", "مقدار": Math.round(stats.revenue.averagePerSale) },
  ];

  const buildTopPropertiesRows = (): Array<Record<string, any>> =>
    stats.topProperties.map((p, i) => ({
      "ردیف": i + 1,
      "عنوان ملک": p.title,
      "بازدید": p.views,
      "وضعیت": p.status,
    }));

  // ─── خروجی Excel ───
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const rows = [
        ...buildReportRows(),
        { "شاخص": "", "مقدار": "" },
        ...buildTopPropertiesRows(),
      ];
      exportToExcel(rows, "گزارش-آژانس");
      toast.success("فایل Excel دانلود شد");
    } catch (error) {
      toast.error("خطا در دانلود Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // ─── خروجی PDF (کیفیت بالا) ───
  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const headers = ["شاخص", "مقدار"];
      const body = buildReportRows().map((r) => [r["شاخص"], r["مقدار"]]);
      await exportToPdf(headers, body, "گزارش-آژانس", "گزارش عملکرد آژانس");
      toast.success("فایل PDF دانلود شد");
    } catch (error) {
      toast.error("خطا در دانلود PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ─── خروجی TXT ───
  const handleDownloadText = () => {
    setDownloadingText(true);
    try {
      exportToText([...buildReportRows(), ...buildTopPropertiesRows()], "گزارش-آژانس");
      toast.success("فایل TXT دانلود شد");
    } catch (error) {
      toast.error("خطا در دانلود TXT");
    } finally {
      setDownloadingText(false);
    }
  };

  // ─── خروجی JSON ───
  const handleDownloadJson = () => {
    setDownloadingJson(true);
    try {
exportToJson([stats], "گزارش-آژانس");      toast.success("فایل JSON دانلود شد");
    } catch (error) {
      toast.error("خطا در دانلود JSON");
    } finally {
      setDownloadingJson(false);
    }
  };

  // ─── پرینت ───
  const handlePrint = () => {
    printElement("report-printable", "گزارش عملکرد آژانس");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
  };

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 sm:px-6 pb-8" dir="rtl">
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 border border-primary/10 shadow-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                گزارشات آژانس
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {hasDateFilter
                  ? `گزارش از ${formatDate(startDate?.toISOString())} تا ${formatDate(endDate?.toISOString())}`
                  : "آمار و گزارشات عملکرد املاک و فروش"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-xl"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {downloadingExcel ? "..." : "Excel"}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl"
            >
              <FileText className="w-4 h-4" />
              {downloadingPDF ? "..." : "PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadText}
              disabled={downloadingText}
              className="gap-2 rounded-xl"
            >
              <Download className="w-4 h-4" />
              {downloadingText ? "..." : "TXT"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              disabled={downloadingJson}
              className="gap-2 rounded-xl"
            >
              <Braces className="w-4 h-4" />
              {downloadingJson ? "..." : "JSON"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2 rounded-xl"
            >
              <Printer className="w-4 h-4" />
              چاپ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              className="gap-2 rounded-xl"
            >
              <Download className="w-4 h-4" />
              ذخیره گزارش
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              بروزرسانی
            </Button>
          </div>
        </div>

        {/* ─── Date Filter ─── */}
        <div className="relative mt-4 flex flex-col sm:flex-row items-end gap-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
 <DatePicker
  calendar={persian}
  locale={persian_fa}
  value={startDate}
  onChange={(date) => setStartDate(date?.toDate() || null)}
  placeholder="از تاریخ"
  className="red"
  inputClass="w-[140px] rounded-xl border border-border/40 h-9 px-3 text-sm bg-background"
  containerStyle={{ position: "relative", zIndex: 9999 }}
/>
              <span className="text-muted-foreground text-sm">تا</span>
            <DatePicker
  calendar={persian}
  locale={persian_fa}
  value={startDate}
  onChange={(date) => setStartDate(date?.toDate() || null)}
  placeholder="از تاریخ"
  className="red"
  inputClass="w-[140px] rounded-xl border border-border/40 h-9 px-3 text-sm bg-background"
  containerStyle={{ position: "relative", zIndex: 9999 }}
/>
            </div>
            <Button
              size="sm"
              onClick={handleApplyFilter}
              className="gap-1.5 rounded-xl h-9 bg-primary text-white hover:bg-primary/90"
            >
              <Filter className="w-3.5 h-3.5" />
              اعمال
            </Button>
            {hasDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilter}
                className="gap-1.5 rounded-xl h-9 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
                حذف فیلتر
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── بخش قابل چاپ ─── */}
      <div id="report-printable" className="space-y-6">
        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <InfoCardStatic
              icon={<Building className="w-5 h-5" />}
              title="کل املاک"
              value={stats.properties.total.toLocaleString("fa-IR")}
              subtitle={`${stats.properties.active} فعال | ${stats.properties.sold} فروش‌رفته`}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <InfoCardStatic
              icon={<Eye className="w-5 h-5" />}
              title="کل بازدیدها"
              value={stats.views.total.toLocaleString("fa-IR")}
              subtitle={`میانگین ${stats.views.averagePerProperty} بازدید در هر ملک`}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <InfoCardStatic
              icon={<Users className="w-5 h-5" />}
              title="لیدها"
              value={stats.leads.total.toLocaleString("fa-IR")}
              subtitle={`${stats.leads.converted} تبدیل شده (${stats.leads.conversionRate}%)`}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <InfoCardStatic
              icon={<DollarSign className="w-5 h-5" />}
              title="درآمد"
              value={formatCurrency(stats.revenue.total)}
              subtitle={`کمیسیون: ${formatCurrency(stats.revenue.commission)}`}
            />
          </motion.div>
        </div>

        {/* ─── Status & Leads ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="transition-shadow bg-gradient-to-br from-amber-50/10 to-transparent shadow-md border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <Home className="w-4 h-4" />
                </div>
                وضعیت املاک
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle, color: "text-emerald-500", label: "فعال", value: stats.properties.active },
                  { icon: Clock, color: "text-amber-500", label: "در انتظار", value: stats.properties.pending },
                  { icon: XCircle, color: "text-rose-500", label: "فروش رفته", value: stats.properties.sold },
                  { icon: Clock, color: "text-gray-500", label: "منقضی", value: stats.properties.expired },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} /> {item.label}
                    </span>
                    <span className="font-bold">{item.value.toLocaleString("fa-IR")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow bg-gradient-to-br from-amber-50/10 to-transparent shadow-md border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                آمار لیدها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "کل لیدها", value: stats.leads.total },
                  { label: "لیدهای جدید", value: stats.leads.new, color: "text-blue-500" },
                  { label: "لیدهای تبدیل‌شده", value: stats.leads.converted, color: "text-emerald-500" },
                  { label: "نرخ تبدیل", value: `${stats.leads.conversionRate}%`, color: "text-amber-500" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span>{item.label}</span>
                    <span className={`font-bold ${item.color || ""}`}>
                      {item.value.toLocaleString?.("fa-IR") ?? item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Top Properties ─── */}
        <Card className="transition-shadow bg-gradient-to-br from-amber-50/10 to-transparent shadow-md border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              املاک برتر (بیشترین بازدید)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProperties.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">هیچ ملکی وجود ندارد</p>
            ) : (
              <div className="space-y-3">
                {stats.topProperties.map((property, index) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{property.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.views.toLocaleString("fa-IR")} بازدید
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        property.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : property.status === "sold"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {property.status === "active" ? "فعال" : property.status === "sold" ? "فروش رفته" : "در انتظار"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Revenue Summary ─── */}
        <Card className="transition-shadow bg-gradient-to-br from-amber-50/10 to-transparent shadow-md border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">کل درآمد</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(stats.revenue.total)}
                  </p>
                </div>
              </div>
              <div className="h-12 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">کمیسیون دریافتی</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(stats.revenue.commission)}
                  </p>
                </div>
              </div>
              <div className="h-12 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">میانگین فروش هر ملک</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(Math.round(stats.revenue.averagePerSale))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}