// frontend/lib/behaviorReportExport.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const toEnglishDigits = (str: string | number): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
};

const formatDate = (date: string | Date): string => {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0) return "توافقی";
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} میلیارد تومان`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} میلیون تومان`;
  return `${price.toLocaleString("fa-IR")} تومان`;
};

// ─── JSON ───
export function exportBehaviorReportToJSON(report: any, userId: string) {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `behavior-report-${userId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── CSV ───
export function exportBehaviorReportToCSV(report: any, userId: string) {
  const rows: string[][] = [];
  const u = report.user;
  const b = report.behavior || {};

  // بخش هویتی
  rows.push(["شناسه کاربر", u._id || ""]);
  rows.push(["نام", `${u.firstName || ""} ${u.lastName || ""}`]);
  rows.push(["تلفن", u.phone || ""]);
  rows.push(["ایمیل", u.email || ""]);
  rows.push(["نقش", u.role || ""]);
  rows.push(["وضعیت", u.isBanned ? "مسدود" : "فعال"]);
  rows.push(["تاریخ عضویت", formatDate(u.createdAt)]);
  rows.push(["آخرین ورود", formatDate(u.lastLogin)]);
  rows.push([]);

  // بخش رفتار
  rows.push(["--- تحلیل رفتار ---"]);
  rows.push(["نوع ملک ترجیحی", b.likelyPropertyType || "—"]);
  rows.push(["شهر پرجستجو", b.mostFrequentCity || "—"]);
  rows.push(["استان پرجستجو", b.mostFrequentProvince || "—"]);
  rows.push(["تعداد جستجوها", b.totalSearches || 0]);
  rows.push(["محدوده قیمت", b.priceRange || "—"]);
  rows.push(["محدوده رهن/اجاره", b.rentRange || "—"]);
  rows.push(["پروفایل خریدار", b.buyerProfile || "—"]);
  rows.push([]);

  // شهرهای بازدید
  if (b.cityDistribution?.length) {
    rows.push(["--- توزیع شهرهای بازدیدشده ---"]);
    rows.push(["شهر", "تعداد بازدید", "درصد"]);
    b.cityDistribution.forEach((c: any) => {
      rows.push([c.city, c.count, `${c.percent}%`]);
    });
    rows.push([]);
  }

  // مناطق بازدید
  if (b.districtDistribution?.length) {
    rows.push(["--- مناطق بازدیدشده ---"]);
    rows.push(["شهر", "منطقه", "تعداد بازدید"]);
    b.districtDistribution.forEach((d: any) => {
      d.districts?.forEach((dist: any) => {
        rows.push([d.city, dist.name, dist.count]);
      });
    });
    rows.push([]);
  }

  // آگهی‌های بازدیدشده
  if (report.viewedAds?.length) {
    rows.push(["--- آگهی‌های بازدیدشده ---"]);
    rows.push(["عنوان", "شهر", "قیمت"]);
    report.viewedAds.forEach((ad: any) => {
      rows.push([ad.title || "—", ad.city || "—", formatPrice(ad.price)]);
    });
    rows.push([]);
  }

  // علاقه‌مندی‌ها
  if (report.favorites?.length) {
    rows.push(["--- علاقه‌مندی‌ها ---"]);
    rows.push(["عنوان", "شهر", "قیمت"]);
    report.favorites.forEach((fav: any) => {
      const ad = fav.ad || fav;
      rows.push([ad.title || "—", ad.city || "—", formatPrice(ad.price)]);
    });
  }

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `behavior-report-${userId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── TXT ───
export function exportBehaviorReportToTXT(report: any, userId: string) {
  const lines: string[] = [];
  const u = report.user;
  const b = report.behavior || {};

  lines.push("════════════════════════════════════════");
  lines.push("📋 گزارش جامع رفتار کاربر");
  lines.push("════════════════════════════════════════");
  lines.push("");
  lines.push(`👤 نام: ${u.firstName || ""} ${u.lastName || ""}`);
  lines.push(`📱 تلفن: ${u.phone || "—"}`);
  lines.push(`📧 ایمیل: ${u.email || "—"}`);
  lines.push(`🔑 نقش: ${u.role || "—"}`);
  lines.push(`📍 شهر: ${u.city || "—"} - ${u.province || ""}`);
  lines.push(`🚫 وضعیت: ${u.isBanned ? "مسدود" : "فعال"}`);
  lines.push(`📅 عضویت: ${formatDate(u.createdAt)}`);
  lines.push(`📅 آخرین ورود: ${formatDate(u.lastLogin)}`);
  lines.push("");
  lines.push("════════════════════════════════════════");
  lines.push("🔍 تحلیل رفتار");
  lines.push("════════════════════════════════════════");
  lines.push(`   • نوع ملک ترجیحی: ${b.likelyPropertyType || "—"}`);
  lines.push(`   • شهر پرجستجو: ${b.mostFrequentCity || "—"}`);
  lines.push(`   • استان پرجستجو: ${b.mostFrequentProvince || "—"}`);
  lines.push(`   • تعداد جستجوها: ${b.totalSearches || 0}`);
  lines.push(`   • محدوده قیمت: ${b.priceRange || "—"}`);
  lines.push(`   • محدوده رهن/اجاره: ${b.rentRange || "—"}`);
  lines.push(`   • پروفایل خریدار: ${b.buyerProfile || "—"}`);
  lines.push("");

  if (b.cityDistribution?.length) {
    lines.push("📊 توزیع شهرهای بازدیدشده:");
    b.cityDistribution.forEach((c: any) => {
      lines.push(`   • ${c.city}: ${c.count} بازدید (${c.percent}%)`);
    });
    lines.push("");
  }

  if (b.districtDistribution?.length) {
    lines.push("🏘 مناطق بازدیدشده:");
    b.districtDistribution.forEach((d: any) => {
      lines.push(`   ${d.city}:`);
      d.districts?.forEach((dist: any) => {
        lines.push(`      - ${dist.name} (${dist.count})`);
      });
    });
    lines.push("");
  }

  if (report.viewedAds?.length) {
    lines.push("👁 آگهی‌های بازدیدشده:");
    report.viewedAds.forEach((ad: any, i: number) => {
      lines.push(`   ${i + 1}. ${ad.title || "—"} (${ad.city || "—"}) - ${formatPrice(ad.price)}`);
    });
    lines.push("");
  }

  if (report.favorites?.length) {
    lines.push("❤️ علاقه‌مندی‌ها:");
    report.favorites.forEach((fav: any, i: number) => {
      const ad = fav.ad || fav;
      lines.push(`   ${i + 1}. ${ad.title || "—"} (${ad.city || "—"}) - ${formatPrice(ad.price)}`);
    });
    lines.push("");
  }

  lines.push(`📅 تاریخ تولید: ${new Date().toLocaleString("fa-IR")}`);
  const txt = lines.join("\n");
  const blob = new Blob(["\uFEFF" + txt], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `behavior-report-${userId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── PDF ───
export async function exportBehaviorReportToPDF(report: any, userId: string) {
  await document.fonts.ready;
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1100px;
    direction: rtl;
    font-family: 'Vazirmatn', 'Tahoma', sans-serif;
    background: #ffffff;
    color: #1f2937;
    line-height: 1.5;
    padding: 24px;
    box-sizing: border-box;
  `;

  const u = report.user;
  const b = report.behavior || {};
  const stats = report.stats || {};

  const viewedAdsRows = (report.viewedAds || []).map((ad: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${ad.title || "—"}</td>
      <td>${ad.city || "—"}</td>
      <td>${formatPrice(ad.price)}</td>
    </tr>
  `).join("");

  const favoriteRows = (report.favorites || []).map((fav: any, i: number) => {
    const ad = fav.ad || fav;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${ad.title || "—"}</td>
        <td>${ad.city || "—"}</td>
        <td>${formatPrice(ad.price)}</td>
      </tr>
    `;
  }).join("");

  const cityRows = (b.cityDistribution || []).map((c: any) => `
    <tr>
      <td>${c.city}</td>
      <td>${c.count}</td>
      <td>${c.percent}%</td>
    </tr>
  `).join("");

  const districtRows = (b.districtDistribution || []).map((d: any) => `
    <tr><td colspan="3" style="font-weight:bold;">${d.city}</td></tr>
    ${(d.districts || []).map((dist: any) => `
      <tr>
        <td style="padding-right:30px;">${dist.name}</td>
        <td>${dist.count}</td>
        <td></td>
      </tr>
    `).join("")}
  `).join("");

  container.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <h1 style="font-size:20px; color:#ea580c; margin:0 0 4px 0; font-weight:bold;">گزارش جامع رفتار کاربر</h1>
      <p style="font-size:11px; margin:0;">تاریخ تولید: ${new Date().toLocaleString("fa-IR")}</p>
    </div>

    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:16px; background:#fff7ed;">
      <h2 style="font-size:14px; margin:0 0 8px 0; color:#ea580c;">اطلاعات کاربر</h2>
      <table style="width:100%; font-size:11px;">
        <tr><td><b>نام:</b></td><td>${u.firstName || ""} ${u.lastName || ""}</td></tr>
        <tr><td><b>تلفن:</b></td><td dir="ltr">${u.phone || "—"}</td></tr>
        <tr><td><b>ایمیل:</b></td><td>${u.email || "—"}</td></tr>
        <tr><td><b>نقش:</b></td><td>${u.role || "—"}</td></tr>
        <tr><td><b>شهر:</b></td><td>${u.city || "—"} - ${u.province || ""}</td></tr>
        <tr><td><b>وضعیت:</b></td><td>${u.isBanned ? "مسدود" : "فعال"}</td></tr>
        <tr><td><b>آخرین ورود:</b></td><td>${formatDate(u.lastLogin)}</td></tr>
      </table>
    </div>

    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:16px; background:#f9fafb;">
      <h2 style="font-size:14px; margin:0 0 8px 0; color:#1f2937;">تحلیل رفتار</h2>
      <table style="width:100%; font-size:11px;">
        <tr><td><b>نوع ملک ترجیحی:</b></td><td>${b.likelyPropertyType || "—"}</td></tr>
        <tr><td><b>شهر پرجستجو:</b></td><td>${b.mostFrequentCity || "—"}</td></tr>
        <tr><td><b>استان پرجستجو:</b></td><td>${b.mostFrequentProvince || "—"}</td></tr>
        <tr><td><b>تعداد جستجوها:</b></td><td>${b.totalSearches || 0}</td></tr>
        <tr><td><b>محدوده قیمت:</b></td><td>${b.priceRange || "—"}</td></tr>
        <tr><td><b>محدوده رهن/اجاره:</b></td><td>${b.rentRange || "—"}</td></tr>
        <tr><td><b>پروفایل خریدار:</b></td><td>${b.buyerProfile || "—"}</td></tr>
      </table>
    </div>

    ${b.cityDistribution?.length ? `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;">📊 شهرهای بازدیدشده</h3>
        <table style="width:100%; font-size:10px; border-collapse:collapse;">
          <thead><tr style="background:#f59e0b; color:#fff;"><th>شهر</th><th>تعداد</th><th>درصد</th></tr></thead>
          <tbody>${cityRows}</tbody>
        </table>
      </div>
    ` : ""}

    ${b.districtDistribution?.length ? `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;">🏘 مناطق بازدیدشده</h3>
        <table style="width:100%; font-size:10px; border-collapse:collapse;">
          <thead><tr style="background:#f59e0b; color:#fff;"><th>شهر / منطقه</th><th>تعداد</th><th></th></tr></thead>
          <tbody>${districtRows}</tbody>
        </table>
      </div>
    ` : ""}

    ${report.viewedAds?.length ? `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;">👁 آگهی‌های بازدیدشده (${report.viewedAds.length})</h3>
        <table style="width:100%; font-size:10px; border-collapse:collapse;">
          <thead><tr style="background:#f59e0b; color:#fff;"><th>ردیف</th><th>عنوان</th><th>شهر</th><th>قیمت</th></tr></thead>
          <tbody>${viewedAdsRows}</tbody>
        </table>
      </div>
    ` : ""}

    ${report.favorites?.length ? `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;">❤️ علاقه‌مندی‌ها (${report.favorites.length})</h3>
        <table style="width:100%; font-size:10px; border-collapse:collapse;">
          <thead><tr style="background:#f59e0b; color:#fff;"><th>ردیف</th><th>عنوان</th><th>شهر</th><th>قیمت</th></tr></thead>
          <tbody>${favoriteRows}</tbody>
        </table>
      </div>
    ` : ""}

    <!-- در صورت نیاز بخش‌های دیگر مثل pageViews و auditLogs هم اضافه کنید -->
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, logging: false });
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = contentWidth / canvasWidth;
    const scaledHeight = canvasHeight * ratio;

    let remainingHeight = scaledHeight;
    let sourceY = 0;
    let pageNum = 1;

    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, contentHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = Math.floor(sliceHeight / ratio);
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, sourceY, canvasWidth, sliceCanvas.height, 0, 0, canvasWidth, sliceCanvas.height);
      const imgData = sliceCanvas.toDataURL("image/png");
      if (pageNum > 1) pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, sliceHeight);
      sourceY += sliceCanvas.height;
      remainingHeight -= sliceHeight;
      pageNum++;
    }

    pdf.save(`behavior-report-${userId}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// backend/src/utils/reportFormatters.ts

export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return "";

  const cols = headers || Object.keys(data[0]);
  const rows = data.map((row) =>
    cols.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return "";
      const str = String(val);
      // اگر شامل کاما یا نقل قول است، داخل دابل کوتیشن قرار بده
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );

  return [cols.join(","), ...rows].join("\n");
}

export function convertToTXT(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return "";

  const cols = headers || Object.keys(data[0]);
  const lines = data.map((row) =>
    cols.map((col) => `${col}: ${row[col] ?? ""}`).join(" | ")
  );

  return lines.join("\n");
}

export function generatePDFReport(
  title: string,
  headers: string[],
  rows: any[][],
): string {
  // این تابع می‌تواند یک HTML ساده برای چاپ یا PDF تولید کند
  // برای سادگی فعلاً HTML برمی‌گردانیم
  const tableRows = rows.map((row) => {
    const cells = row.map((cell) => `<td>${cell ?? ""}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `
    <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Vazirmatn, Tahoma, sans-serif; direction: rtl; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f97316; color: white; }
          h1 { text-align: center; color: #ea580c; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}