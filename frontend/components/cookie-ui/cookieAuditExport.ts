/**
 * cookieAuditExport.ts
 * توابع خروجی کامل PDF و Excel با رصد جامع جزئیات کوکی‌ها و اطلاعات کاربران
 *
 * پیش‌نیازها:
 * npm install xlsx jspdf html2canvas
 */
import type { CookieAuditLog } from "@/types";

// ─── مپینگ‌های فارسی ───
const TYPE_MAP: Record<string, string> = {
  login: "ورود به سیستم",
  logout: "خروج از سیستم",
  token_refresh: "تازه‌سازی توکن",
  session_check: "بررسی نشست",
  suspicious: "مشکوک / امنیتی",
  session_create: "ایجاد نشست",
  session_destroy: "اتمام نشست",
  cookie_set: "تنظیم کوکی",
  cookie_read: "خواندن کوکی",
  cookie_delete: "حذف کوکی",
  page_view: "مشاهده صفحه",
};

const STATUS_MAP: Record<string, string> = {
  success: "موفق",
  failed: "ناموفق",
  expired: "منقضی شده",
  active: "فعال",
  revoked: "باطل‌شده",
  suspicious: "مشکوک",
  blocked: "مسدود شده",
};

const ROLE_MAP: Record<string, string> = {
  user: "کاربر عادی",
  vip: "کاربر ویژه (VIP)",
  agent: "مشاور املاک",
  developer: "توسعه‌دهنده",
  expert: "کارشناس",
  admin: "مدیر سیستم",
  super_admin: "مدیر کل",
};

// ─── توابع کمکی ───
function toPersianType(t: string): string {
  return TYPE_MAP[t] || t || "-";
}

function toPersianStatus(s: string): string {
  return STATUS_MAP[s] || s || "-";
}

function toPersianRole(r?: string): string {
  return r ? ROLE_MAP[r] || r : "نامشخص";
}

function formatDateFa(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

function parseUA(ua?: string): string {
  if (!ua) return "-";
  let browser = "نامشخص";
  let os = "";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return os ? `${browser} / ${os}` : browser;
}

function statusColor(s: string): string {
  switch (s) {
    case "success":
    case "active":
      return "#059669";
    case "failed":
    case "blocked":
      return "#dc2626";
    case "suspicious":
    case "expired":
      return "#d97706";
    default:
      return "#4b5563";
  }
}

// ═══════════════════════════════════════════════════════════
//  PDF Export (رصد کامل جزئیات کوکی و کاربر)
// ═══════════════════════════════════════════════════════════
export async function exportToPDF(logs: CookieAuditLog[], filename: string) {
  if (!logs || logs.length === 0) {
    throw new Error("داده‌ای برای خروجی وجود ندارد");
  }

  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  const totalLogs = logs.length;
  const loginCount = logs.filter((l) => l.type === "login").length;
  const suspiciousCount = logs.filter(
    (l) => l.type === "suspicious" || l.status === "suspicious",
  ).length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const uniqueIPs = new Set(logs.map((l) => l.ip).filter(Boolean)).size;
  const uniqueUsers = new Set(
    logs.filter((l) => l.userId?._id).map((l) => l.userId!._id),
  ).size;

  const typeCounts: Record<string, number> = {};
  logs.forEach((l) => {
    typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
  });

  const el = document.createElement("div");
  el.setAttribute("dir", "rtl");
  el.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1350px;
    direction: rtl;
    font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', sans-serif;
    background: #ffffff;
    color: #1f2937;
    line-height: 1.5;
    padding: 0;
    box-sizing: border-box;
  `;

  const rowsHtml = logs
    .map((log, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#fff7ed";
      const sc = statusColor(log.status);
      const name = log.userId
        ? `${log.userId.firstName || ""} ${log.userId.lastName || ""}`.trim() ||
          "بدون نام"
        : "ناشناس / مهمان";
      const isSuspicious =
        log.type === "suspicious" || log.status === "suspicious";
      const rowBg = isSuspicious ? "#fef2f2" : bg;

      return `
        <tr style="background:${rowBg};">
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-weight:600;color:#6b7280;font-size:8px;">${i + 1}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;font-family:monospace;">${log.userId?._id || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:9px;">${name}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;font-family:monospace;">${log.userId?.phone || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;">${log.userId?.email || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-size:8px;">${toPersianRole(log.userId?.role)}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:8px;">${toPersianType(log.type)}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;font-weight:600;color:#c2410c;">${log.cookieName || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;font-family:monospace;">${log.sessionId || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-weight:700;color:${sc};font-size:8px;">${toPersianStatus(log.status)}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;direction:ltr;font-size:8px;font-family:monospace;">${log.ip || "-"}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-size:8px;">${parseUA(log.userAgent)}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-size:8px;">${formatDateFa(log.expiresAt)}</td>
          <td style="padding:6px 4px;border:1px solid #e5e7eb;text-align:center;font-size:8px;">${formatDateFa(log.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  el.innerHTML = `
    <!-- هدر گزارش -->
    <div style="background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;padding:20px 28px;text-align:center;">
      <h1 style="font-size:18px;font-weight:800;margin:0 0 4px 0;">گزارش جامع رصد کوکی‌ها، نشست‌ها و فعالیت کاربران</h1>
      <p style="font-size:11px;margin:0;opacity:0.95;">تاریخ گزارش: ${formatDateFa(new Date().toISOString())} &nbsp;|&nbsp; تعداد کل رکوردها: ${totalLogs}</p>
    </div>

    <!-- جدول کامل لاگ‌ها -->
    <div style="padding:16px 12px;">
      <table style="width:100%;border-collapse:collapse;font-size:9px;">
        <thead>
          <tr style="background:#ea580c;color:#ffffff;">
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">ردیف</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">شناسه کاربر</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">نام و خانوادگی</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">شماره تماس</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">ایمیل</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">نقش</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">نوع رویداد</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">نام کوکی</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">شناسه نشست</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">وضعیت</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">آدرس IP</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">مرورگر / OS</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">انقضای کوکی</th>
            <th style="padding:7px 4px;border:1px solid #c2410c;font-weight:700;">زمان ثبت</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- خلاصه آماری -->
    <div style="padding:10px 12px 20px; page-break-before: always;">
      <div style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:14px;">
        <h2 style="font-size:14px;font-weight:800;margin:0;">خلاصه آماری و تحلیل شاخص‌های امنیتی</h2>
      </div>

      <div style="display:flex; gap:16px; align-items:flex-start;">
        <table style="width:55%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="background:#ea580c;color:#fff;">
              <th style="padding:6px 10px;border:1px solid #c2410c;">شاخص کلیدی</th>
              <th style="padding:6px 10px;border:1px solid #c2410c;">مقدار</th>
              <th style="padding:6px 10px;border:1px solid #c2410c;">توضیحات</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ["تعداد کل لاگ‌ها", totalLogs, "مجموع کلی رویدادها"],
              ["ورودهای موفق", loginCount, "تعداد ورودهای تایید شده"],
              ["رویدادهای مشکوک", suspiciousCount, "تلاش‌های مشکوک یا غیرمجاز"],
              ["وضعیت‌های موفق", successCount, "مجموع عملیات موفق"],
              ["وضعیت‌های ناموفق", failedCount, "مجموع عملیات ناموفق"],
              ["آدرس‌های IP یکتا", uniqueIPs, "تعداد IPهای متفاوت"],
              ["کاربران یکتا", uniqueUsers, "تعداد کاربران متمایز"],
            ]
              .map(
                ([label, val, desc], i) => `
                <tr>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};font-weight:700;">${label}</td>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};font-weight:800;color:#ea580c;font-size:11px;">${val}</td>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};color:#6b7280;">${desc}</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>

        <table style="width:42%;border-collapse:collapse;font-size:10px;">
          <thead>
            <tr style="background:#ea580c;color:#fff;">
              <th style="padding:6px 10px;border:1px solid #c2410c;">نوع رویداد</th>
              <th style="padding:6px 10px;border:1px solid #c2410c;">تعداد</th>
              <th style="padding:6px 10px;border:1px solid #c2410c;">سهم (درصد)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(typeCounts)
              .map(
                ([type, count], i) => `
                <tr>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};font-weight:700;">${toPersianType(type)}</td>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};">${count}</td>
                  <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;background:${i % 2 === 0 ? "#fff" : "#fff7ed"};font-weight:800;color:#ea580c;">${((count / totalLogs) * 100).toFixed(1)}%</td>
                </tr>
              `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = 297;
    const pdfHeight = 210;
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // صفحه اول
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // صفحات بعدی
    while (heightLeft > 0) {
      position = -heightLeft; // 🔧 اصلاح اصلی
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (err) {
    console.error("خطا در تولید PDF:", err);
    throw new Error("خطا در تولید فایل PDF");
  } finally {
    document.body.removeChild(el);
  }
}

// ═══════════════════════════════════════════════════════════
//  Excel Export (شامل ۱۴ ستون رصد کامل کاربر و کوکی)
// ═══════════════════════════════════════════════════════════
export async function exportToExcel(logs: CookieAuditLog[], filename: string) {
  if (!logs || logs.length === 0) {
    throw new Error("داده‌ای برای خروجی وجود ندارد");
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ─── شیت ۱: رصد کامل لاگ‌ها ───
  const headers = [
    "ردیف",
    "شناسه کاربر (User ID)",
    "نام و نام خانوادگی",
    "شماره تماس",
    "ایمیل",
    "نقش کاربر",
    "نوع رویداد",
    "نام کوکی",
    "شناسه نشست (Session ID)",
    "وضعیت",
    "آدرس IP",
    "مرورگر / دستگاه",
    "تاریخ انقضای کوکی",
    "تاریخ و ساعت ثبت",
  ];

  const rows = logs.map((log, i) => [
    i + 1,
    log.userId?._id || "-",
    log.userId
      ? `${log.userId.firstName || ""} ${log.userId.lastName || ""}`.trim() ||
        "بدون نام"
      : "ناشناس / مهمان",
    log.userId?.phone || "-",
    log.userId?.email || "-",
    toPersianRole(log.userId?.role),
    toPersianType(log.type),
    log.cookieName || "-",
    log.sessionId || "-",
    toPersianStatus(log.status),
    log.ip || "-",
    parseUA(log.userAgent),
    formatDateFa(log.expiresAt),
    formatDateFa(log.createdAt),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // تنظیم عرض ستون‌ها
  ws["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 20 },
    { wch: 15 },
    { wch: 24 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 12 },
    { wch: 16 },
    { wch: 25 },
    { wch: 22 },
    { wch: 22 },
  ];

  ws["!views"] = [{ RTL: true }];

  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      (ws[cellRef] as any).s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "EA580C" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "لاگ‌های جامع کوکی");

  // ─── شیت ۲: خلاصه آماری ───
  const total = logs.length;
  const summaryHeaders = ["شاخص کلیدی", "مقدار", "توضیحات"];
  const summaryRows = [
    ["تعداد کل لاگ‌ها", total, "مجموع کلی رویدادهای رصدشده"],
    [
      "ورودهای موفق",
      logs.filter((l) => l.type === "login").length,
      "تعداد رویدادهای ورود موفق",
    ],
    [
      "رویدادهای مشکوک",
      logs.filter((l) => l.type === "suspicious" || l.status === "suspicious")
        .length,
      "تلاش‌های مشکوک به نفوذ یا دستکاری کوکی",
    ],
    [
      "عملیات‌های موفق",
      logs.filter((l) => l.status === "success").length,
      "کل وضعیت‌های موفق",
    ],
    [
      "عملیات‌های ناموفق",
      logs.filter((l) => l.status === "failed").length,
      "کل وضعیت‌های ناموفق",
    ],
    [
      "IP های یکتا",
      new Set(logs.map((l) => l.ip).filter(Boolean)).size,
      "تعداد آدرس‌های IP متمایز",
    ],
    [
      "کاربران یکتا",
      new Set(logs.filter((l) => l.userId?._id).map((l) => l.userId!._id)).size,
      "تعداد کاربران یکتای فعال",
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 35 }];
  wsSummary["!views"] = [{ RTL: true }];

  XLSX.utils.book_append_sheet(wb, wsSummary, "خلاصه آماری");

  XLSX.writeFile(wb, `${filename}.xlsx`);
}