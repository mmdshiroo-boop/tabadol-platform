// behaviorReportExport.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CITIES, PROVINCES } from "@/lib/iranLocations";

// ─── توابع کمکی ───
const formatDate = (date: string | Date | null | undefined): string => {
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

// ─── پیدا کردن استان از روی نام شهر ───
const getProvinceFromCity = (cityName: string): string => {
  if (!cityName) return "نامشخص";
  const city = CITIES.find((c) => c.name === cityName);
  if (!city) return "نامشخص";
  const province = PROVINCES.find((p) => p.id === city.province_id);
  return province ? province.name : "نامشخص";
};

// ─── محاسبه محدوده قیمت از آگهی‌های بازدیدشده و علاقه‌مندی‌ها ───
const calculatePriceRangeFromAds = (ads: any[]): string => {
  const prices = ads
    .map((ad) => ad.price)
    .filter((price) => price && price > 0);

  if (prices.length === 0) return "نامشخص";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} - ${formatPrice(max)}`;
};

// ─── نرمال‌سازی رفتار: اصلاح استان و محدوده قیمت ───
const normalizeBehavior = (report: any): any => {
  const behavior = report.behavior || {};

  // ۱) اصلاح استان از روی شهر پرتکرار
  let mostFrequentProvince = behavior.mostFrequentProvince;
  const cityProvince = getProvinceFromCity(behavior.mostFrequentCity);
  if (cityProvince !== "نامشخص") {
    mostFrequentProvince = cityProvince;
  } else if (
    mostFrequentProvince &&
    PROVINCES.some((p) => p.name === mostFrequentProvince)
  ) {
    mostFrequentProvince = mostFrequentProvince;
  } else {
    mostFrequentProvince = "نامشخص";
  }

  // ۲) اصلاح محدوده قیمت (اگر از فیلترها به دست نیامده، از آگهی‌های بازدیدشده/علاقه‌مندی‌ها محاسبه کن)
  let priceRange = behavior.priceRange;
  if (!priceRange || priceRange === "نامشخص") {
    const allAds = [
      ...(report.viewedAds || []),
      ...(report.favorites?.map((f: any) => f.ad || f) || []),
    ];
    priceRange = calculatePriceRangeFromAds(allAds);
  }

  // ۳) ساخت توزیع استان‌ها بر اساس توزیع شهرها
  const cityDistribution = behavior.cityDistribution || [];
  const provinceCountMap: Record<string, number> = {};
  cityDistribution.forEach((c: any) => {
    const provName = getProvinceFromCity(c.city);
    if (provName !== "نامشخص") {
      provinceCountMap[provName] = (provinceCountMap[provName] || 0) + c.count;
    }
  });

  const provinceDistribution = Object.entries(provinceCountMap)
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count);

  return {
    ...report,
    behavior: {
      ...behavior,
      mostFrequentProvince,
      priceRange,
      provinceDistribution,
    },
  };
};

// ─── JSON ───
export function exportBehaviorReportToJSON(report: any, userId: string) {
  const normalizedReport = normalizeBehavior(report);
  const json = JSON.stringify(normalizedReport, null, 2);
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
  const normalizedReport = normalizeBehavior(report);
  const rows: string[][] = [];
  const u = normalizedReport.user;
  const b = normalizedReport.behavior || {};

  rows.push(["اطلاعات کاربر"]);
  rows.push(["نام", `${u.firstName || ""} ${u.lastName || ""}`]);
  rows.push(["تلفن", u.phone || ""]);
  rows.push(["ایمیل", u.email || ""]);
  rows.push(["نقش", u.role || ""]);
  rows.push(["شهر", u.city || ""]);
  rows.push(["استان", b.mostFrequentProvince || u.province || ""]);
  rows.push([]);

  rows.push(["تحلیل رفتار"]);
  rows.push(["نوع ملک ترجیحی", b.likelyPropertyType || "نامشخص"]);
  rows.push(["شهر پرجستجو", b.mostFrequentCity || "نامشخص"]);
  rows.push(["محدوده قیمت", b.priceRange || "نامشخص"]);
  rows.push(["پروفایل خریدار", b.buyerProfile || "نامشخص"]);
  rows.push([]);

  if (b.cityDistribution?.length) {
    rows.push(["توزیع شهرهای بازدیدشده"]);
    rows.push(["شهر", "تعداد", "درصد"]);
    b.cityDistribution.forEach((c: any) => {
      rows.push([c.city, c.count, `${c.percent}%`]);
    });
    rows.push([]);
  }

  if (b.provinceDistribution?.length) {
    rows.push(["توزیع استان‌ها"]);
    rows.push(["استان", "تعداد"]);
    b.provinceDistribution.forEach((p: any) => {
      rows.push([p.province, p.count]);
    });
    rows.push([]);
  }

  if (b.districtDistribution?.length) {
    rows.push(["مناطق بازدیدشده"]);
    rows.push(["شهر", "منطقه", "تعداد"]);
    b.districtDistribution.forEach((d: any) => {
      d.districts?.forEach((dist: any) => {
        rows.push([d.city, dist.name, dist.count]);
      });
    });
    rows.push([]);
  }

  if (report.viewedAds?.length) {
    rows.push(["آگهی‌های بازدیدشده"]);
    rows.push(["عنوان", "شهر", "قیمت"]);
    report.viewedAds.forEach((ad: any) => {
      rows.push([ad.title || "—", ad.city || "—", formatPrice(ad.price)]);
    });
    rows.push([]);
  }

  if (report.favorites?.length) {
    rows.push(["علاقه‌مندی‌ها"]);
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
  const normalizedReport = normalizeBehavior(report);
  const lines: string[] = [];
  const u = normalizedReport.user;
  const b = normalizedReport.behavior || {};

  lines.push("════════════════════════════════════════");
  lines.push("📋 گزارش جامع رفتار کاربر");
  lines.push("════════════════════════════════════════");
  lines.push(`👤 نام: ${u.firstName || ""} ${u.lastName || ""}`);
  lines.push(`📱 تلفن: ${u.phone || "—"}`);
  lines.push(`📧 ایمیل: ${u.email || "—"}`);
  lines.push(`📍 شهر: ${u.city || "—"} - استان: ${b.mostFrequentProvince || u.province || "—"}`);
  lines.push("");
  lines.push("🔍 تحلیل رفتار");
  lines.push("════════════════════════════════════════");
  lines.push(`   • نوع ملک ترجیحی: ${b.likelyPropertyType || "—"}`);
  lines.push(`   • شهر پرجستجو: ${b.mostFrequentCity || "—"}`);
  lines.push(`   • محدوده قیمت: ${b.priceRange || "—"}`);
  lines.push(`   • پروفایل خریدار: ${b.buyerProfile || "—"}`);
  lines.push("");

  if (b.cityDistribution?.length) {
    lines.push("📊 شهرهای بازدیدشده:");
    b.cityDistribution.forEach((c: any) => {
      lines.push(`   • ${c.city}: ${c.count} بازدید (${c.percent}%)`);
    });
    lines.push("");
  }

  if (b.provinceDistribution?.length) {
    lines.push("🏛️ استان‌های بازدیدشده:");
    b.provinceDistribution.forEach((p: any) => {
      lines.push(`   • ${p.province}: ${p.count} بازدید`);
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

// ─── PDF (نسخه حرفه‌ای با محدوده قیمت واقعی) ───
export async function exportBehaviorReportToPDF(report: any, userId: string) {
  const normalizedReport = normalizeBehavior(report);
  await document.fonts.ready;

  const u = normalizedReport.user || {};
  const b = normalizedReport.behavior || {};
  const viewedAds = normalizedReport.viewedAds || [];
  const favorites = normalizedReport.favorites || [];
  const score = normalizedReport.interactionScore || 0;

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 1200px;
    direction: rtl;
    font-family: 'Vazirmatn', 'Tahoma', sans-serif;
    background: #ffffff;
    color: #1f2937;
    line-height: 1.6;
    padding: 0;
    box-sizing: border-box;
  `;

  const sectionTitle = (title: string, icon: string) => `
    <div style="margin: 28px 0 12px; border-bottom: 2px solid #ea580c; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px; font-weight: bold; color: #ea580c;">${icon}</span>
      <span style="font-size: 16px; font-weight: bold; color: #1f2937;">${title}</span>
    </div>
  `;

  const userInfoHtml = sectionTitle("اطلاعات کاربر", "👤") + `
    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 12px;">
        <div><b>نام کامل:</b> ${u.firstName || ""} ${u.lastName || ""}</div>
        <div><b>شماره تماس:</b> ${u.phone || "—"}</div>
        <div><b>ایمیل:</b> ${u.email || "—"}</div>
        <div><b>نقش:</b> ${u.role || "—"}</div>
        <div><b>شهر / استان:</b> ${u.city || "—"} - ${b.mostFrequentProvince || u.province || "—"}</div>
        <div><b>آخرین ورود:</b> ${formatDate(u.lastLogin)}</div>
      </div>
    </div>
  `;

  const statsCardsHtml = `
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${normalizedReport.viewedAdsCount || 0}</div>
        <div style="font-size: 11px; color: #4b5563;">بازدید آگهی</div>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${normalizedReport.favoritesCount || 0}</div>
        <div style="font-size: 11px; color: #4b5563;">علاقه‌مندی</div>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${b.totalSearches || 0}</div>
        <div style="font-size: 11px; color: #4b5563;">جستجو</div>
      </div>
      <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 12px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #9333ea;">${score}</div>
        <div style="font-size: 11px; color: #4b5563;">امتیاز تعامل</div>
      </div>
    </div>
  `;

  const behaviorRows = [
    ["نوع ملک ترجیحی", b.likelyPropertyType || "نامشخص"],
    ["شهر پرجستجو", b.mostFrequentCity || "نامشخص"],
    ["استان پرجستجو", b.mostFrequentProvince || "نامشخص"],
    ["محدوده قیمت", b.priceRange || "نامشخص"],
    ["پروفایل خریدار", b.buyerProfile || "نامشخص"],
  ];
  const behaviorHtml = sectionTitle("تحلیل رفتار", "🔍") + `
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
      ${behaviorRows.map(([label, value]) => `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb; background: #f9fafb; width: 200px; font-weight: bold;">${label}</td>
          <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${value || "—"}</td>
        </tr>
      `).join("")}
    </table>
  `;

  const buildTable = (headers: string[], rows: string[][], width = "100%") => `
    <table style="width: ${width}; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: #f59e0b; color: #fff;">
          ${headers.map(h => `<th style="padding: 8px; border: 1px solid #d97706;">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fafb'};">
            ${row.map(cell => `<td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${cell}</td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  let cityDistributionHtml = "";
  if (b.cityDistribution?.length) {
    const rows = b.cityDistribution.map((c: any, i: number) => [
      String(i + 1),
      c.city,
      String(c.count),
      `${c.percent}%`
    ]);
    cityDistributionHtml = sectionTitle("شهرهای بازدیدشده", "📊") + buildTable(["ردیف", "شهر", "تعداد بازدید", "درصد"], rows);
  }

  let provinceDistributionHtml = "";
  if (b.provinceDistribution?.length) {
    const rows = b.provinceDistribution.map((p: any, i: number) => [
      String(i + 1),
      p.province,
      String(p.count)
    ]);
    provinceDistributionHtml = sectionTitle("استان‌های بازدیدشده", "🏛️") + buildTable(["ردیف", "استان", "تعداد بازدید"], rows);
  }

  let districtHtml = "";
  if (b.districtDistribution?.length) {
    districtHtml = sectionTitle("مناطق بازدیدشده", "🏘️");
    b.districtDistribution.forEach((cityItem: any) => {
      const rows = (cityItem.districts || []).map((d: any) => [d.name, String(d.count)]);
      districtHtml += `
        <div style="margin-bottom: 12px;">
          <p style="font-weight: bold; margin: 8px 0 4px; color: #ea580c;">${cityItem.city}</p>
          ${buildTable(["نام منطقه", "تعداد بازدید"], rows)}
        </div>
      `;
    });
  }

  let dealTypeHtml = "";
  if (b.dealTypeDistribution?.length) {
    const rows = b.dealTypeDistribution.map((d: any) => [d.type, String(d.count), `${d.percent}%`]);
    dealTypeHtml = sectionTitle("توزیع نوع معامله", "💼") + buildTable(["نوع معامله", "تعداد", "درصد"], rows);
  }

  let propertyTypeHtml = "";
  if (b.propertyTypeDistribution?.length) {
    const rows = b.propertyTypeDistribution.map((p: any) => [p.type, String(p.count)]);
    propertyTypeHtml = sectionTitle("نوع ملک‌های مورد علاقه", "🏠") + buildTable(["نوع ملک", "تعداد بازدید"], rows);
  }

  let areaHtml = "";
  if (b.areaDistribution?.length) {
    const rows = b.areaDistribution.map((a: any) => [a.range, String(a.count), `${a.percent}%`]);
    areaHtml = sectionTitle("محدوده متراژی", "📐") + buildTable(["محدوده (متر)", "تعداد", "درصد"], rows);
  }

  let viewedAdsHtml = "";
  if (viewedAds.length) {
    const rows = viewedAds.map((ad: any, i: number) => [
      String(i + 1),
      ad.title || "—",
      ad.city || "—",
      formatPrice(ad.price)
    ]);
    viewedAdsHtml = sectionTitle("آگهی‌های بازدیدشده", "👁️") + buildTable(["ردیف", "عنوان آگهی", "شهر", "قیمت"], rows);
  }

  let favoritesHtml = "";
  if (favorites.length) {
    const rows = favorites.map((fav: any, i: number) => {
      const ad = fav.ad || fav;
      return [
        String(i + 1),
        ad.title || "—",
        ad.city || "—",
        formatPrice(ad.price)
      ];
    });
    favoritesHtml = sectionTitle("علاقه‌مندی‌ها", "❤️") + buildTable(["ردیف", "عنوان آگهی", "شهر", "قیمت"], rows);
  }

// در تابع exportBehaviorReportToPDF
const headerHtml = `
  <div style="background: linear-gradient(135deg, #ea580c, #f97316); padding: 24px 40px; text-align: center;">
    <img src="/images/tabadol-logo-light.PNG" alt="تبادل" style="height:40px; margin-bottom:12px;" />
    <h1 style="font-size: 26px; color: #ffffff; margin: 0;">گزارش جامع رفتار کاربر در تبادل</h1>
    <p style="font-size: 12px; color: #fff7ed; margin: 6px 0 0;">
      تاریخ تولید: ${new Date().toLocaleString("fa-IR")}
    </p>
  </div>
`;

  container.innerHTML = `
    ${headerHtml}
    <div style="padding: 0 40px 20px;">
      ${statsCardsHtml}
      ${userInfoHtml}
      ${behaviorHtml}
      ${cityDistributionHtml}
      ${provinceDistributionHtml}
      ${districtHtml}
      ${dealTypeHtml}
      ${propertyTypeHtml}
      ${areaHtml}
      ${viewedAdsHtml}
      ${favoritesHtml}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

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
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvasWidth,
        sliceCanvas.height,
        0,
        0,
        canvasWidth,
        sliceCanvas.height
      );
      const imgData = sliceCanvas.toDataURL("image/png");
      if (pageNum > 1) pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, sliceHeight);
      sourceY += sliceCanvas.height;
      remainingHeight -= sliceHeight;
      pageNum++;
    }

    pdf.save(`behavior-report-${userId}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("خطا در تولید فایل PDF");
  } finally {
    document.body.removeChild(container);
  }
}