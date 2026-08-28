// app/panel/super-admin/audit-logs/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Fingerprint, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DownloadBehaviorModal } from "@/components/cookie-ui/DownloadBehaviorModal";
import apiClient from "@/services/api/client";
import { exportAuditLogsToPDF } from "@/lib/exportAuditPDF";

const CookieAuditStatsCard = dynamic(
  () => import("@/components/cookie-ui/CookieAuditStats"),
  { ssr: false },
);
const CookieAuditTable = dynamic(
  () => import("@/components/cookie-ui/CookieAuditTable"),
  { ssr: false },
);
const CookieCharts = dynamic(
  () => import("@/components/cookie-ui/CookieCharts"),
  { ssr: false },
);
const CookieAuditDetailModal = dynamic(
  () => import("@/components/cookie-ui/CookieAuditDetailModal"),
  { ssr: false },
);
const UserDetailModal = dynamic(
  () => import("@/components/cookie-ui/UserDetailModal"),
  { ssr: false },
);

export default function CookieAuditsPage() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [downloadUserId, setDownloadUserId] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // ─── خروجی PDF کامل ──────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      // دریافت تمام لاگ‌ها با فیلترهای پیش‌فرض (می‌توانید پارامترهای بیشتری اضافه کنید)
      const res = await apiClient.get("/super-admin/cookie-audits", {
        params: {
          page: 1,
          limit: 10000,
        },
      });
      const logs = res.data?.data || [];
      if (logs.length === 0) {
        toast.warning("هیچ داده‌ای برای خروجی وجود ندارد");
        return;
      }
      await exportAuditLogsToPDF(
        logs,
        `audit-logs-${new Date().toISOString().slice(0, 10)}.pdf`,
        "گزارش رصد کوکی و نشست‌ها",
      );
      toast.success("فایل PDF با موفقیت دانلود شد");
    } catch (error: any) {
      console.error("PDF export error:", error);
      toast.error(error.message || "خطا در دانلود فایل PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* هدر */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 border border-primary/10 shadow-md backdrop-blur-md bg-card/60">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                رصد کوکی و نشست‌ها
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                مانیتورینگ لحظه‌ای فعالیت‌ها و امنیت کاربران
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 h-9"
            >
              {exportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {exportingPDF ? "در حال تولید..." : "PDF کامل"}
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground">Real-time</span>
            </div>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        }
      >
        <CookieAuditStatsCard />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <CookieAuditTable
          onViewDetail={(log: any) => setSelectedLog(log)}
          onViewUser={(userId: string) => setSelectedUserId(userId)}
          onDownloadReport={(userId: string) => setDownloadUserId(userId)}
        />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[420px] rounded-2xl" />}>
        <CookieCharts />
      </Suspense>

      {/* مودال جزئیات رویداد */}
      {selectedLog && (
        <CookieAuditDetailModal
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* مودال جزئیات کاربر */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onDownloadReport={(userId) => setDownloadUserId(userId)}
        />
      )}

      {/* مودال دانلود گزارش */}
      {downloadUserId && (
        <DownloadBehaviorModal
          userId={downloadUserId}
          open={!!downloadUserId}
          onOpenChange={() => setDownloadUserId(null)}
        />
      )}
    </div>
  );
}