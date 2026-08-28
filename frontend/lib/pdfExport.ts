import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportLogsToPDF(
  logs: any[],
  filename?: string,
  title?: string,
) {
  if (!logs || logs.length === 0) {
    throw new Error("هیچ لاگی برای خروجی وجود ندارد");
  }

  await ensureVazirmatnFont();
  const html = buildLogsHTML(logs, title);
  await generatePDFFromHTML(html, filename || `logs-${getDateString()}.pdf`);
}

async function ensureVazirmatnFont() {
  const fontUrl =
    "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css";
  try {
    if (!document.querySelector(`link[href="${fontUrl}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl;
      document.head.appendChild(link);
    }
    await document.fonts.ready;
    await document.fonts.load("14px Vazirmatn");
  } catch {
    // Fallback
  }
}

function getDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10) + "-" + now.toTimeString().slice(0, 8).replace(/:/g, "");
}

function buildLogsHTML(logs: any[], title?: string): string {
  const today = new Date().toLocaleDateString("fa-IR");
  const now = new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = logs.map((log) => {
    const statusColor = log.statusCode < 300
      ? "#10b981"
      : log.statusCode < 400
      ? "#3b82f6"
      : log.statusCode < 500
      ? "#f59e0b"
      : "#ef4444";

    return `
      <tr>
        <td class="method">${log.method || ""}</td>
        <td class="endpoint">${log.endpoint || ""}</td>
        <td class="status" style="color:${statusColor};font-weight:700;">${log.statusCode || ""}</td>
        <td class="time">${log.responseTime || ""}ms</td>
        <td class="ip">${log.ip || "-"}</td>
        <td class="date">${log.timestamp ? new Date(log.timestamp).toLocaleString("fa-IR") : "-"}</td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${title || "گزارش لاگ‌های API"}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
      background: #ffffff;
      color: #1f2937;
      font-size: 10px;
      line-height: 1.7;
      direction: rtl;
      padding: 20px 30px;
    }
    .page-container {
      max-width: 794px;
      margin: 0 auto;
      background: #ffffff;
      padding: 20px 25px 40px;
      position: relative;
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 3px double #9ca3af;
    }
    .header-title h1 {
      font-size: 20px;
      font-weight: 900;
      color: #111827;
      margin-bottom: 4px;
    }
    .header-title p {
      font-size: 10px;
      color: #4b5563;
      font-weight: 500;
    }
    .header-meta {
      text-align: right;
      font-size: 9px;
      color: #6b7280;
      line-height: 1.8;
      border-right: 2px solid #e5e7eb;
      padding-right: 12px;
    }
    .table-wrapper { overflow-x: auto; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #d1d5db; }
    thead th {
      background: #f3f4f6;
      color: #1f2937;
      font-weight: 700;
      padding: 8px 6px;
      border: 1px solid #d1d5db;
      text-align: center;
    }
    tbody td {
      padding: 6px 4px;
      border: 1px solid #d1d5db;
      text-align: right;
      vertical-align: middle;
    }
    .method { text-align: center; font-weight: 700; }
    .endpoint { font-family: monospace; font-size: 8px; direction: ltr; text-align: left; word-break: break-all; }
    .status { text-align: center; font-weight: 700; }
    .time { text-align: center; }
    .ip { text-align: center; font-family: monospace; font-size: 8px; direction: ltr; }
    .date { text-align: center; font-size: 8px; }
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #6b7280;
    }
    .summary {
      margin-top: 10px;
      padding: 10px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 10px;
    }
    .summary-item { display: flex; align-items: center; gap: 6px; }
    .summary-item strong { font-weight: 700; color: #111827; }
    @media print {
      body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div class="header-title">
        <img src="/images/tabadol-logo-light.PNG" alt="تبادل" style="height:40px; margin-bottom:8px;" />
        <h1>${title || "گزارش لاگ‌های API"}</h1>
        <p>پلتفرم تبادل — سیستم یکپارچه</p>
      </div>
      <div class="header-meta">
        <div>تاریخ چاپ: ${today}</div>
        <div>ساعت: ${now}</div>
        <div>تعداد رکورد: <strong>${logs.length.toLocaleString("fa-IR")}</strong></div>
      </div>
    </div>
    <div class="summary">
      <div class="summary-item">
        <strong>📊 کل درخواست‌ها:</strong> ${logs.length.toLocaleString("fa-IR")}
      </div>
      <div class="summary-item">
        <strong>✅ موفق (۲xx):</strong> ${logs.filter((l) => l.statusCode < 300).length.toLocaleString("fa-IR")}
      </div>
      <div class="summary-item">
        <strong>⚠️ خطای ۴xx:</strong> ${logs.filter((l) => l.statusCode >= 400 && l.statusCode < 500).length.toLocaleString("fa-IR")}
      </div>
      <div class="summary-item">
        <strong>❌ خطای ۵xx:</strong> ${logs.filter((l) => l.statusCode >= 500 && l.statusCode < 600).length.toLocaleString("fa-IR")}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>متد</th>
            <th style="text-align:right;">Endpoint</th>
            <th>وضعیت</th>
            <th>زمان</th>
            <th>IP</th>
            <th>تاریخ</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    <div class="footer">
      <div>تولید شده توسط سیستم یکپارچه تبادل</div>
      <div>${today} — ${now}</div>
    </div>
  </div>
</body>
</html>
  `;
}

async function generatePDFFromHTML(html: string, filename: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) throw new Error("عدم دسترسی به سند Iframe");

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const element = doc.querySelector(".page-container") as HTMLElement;
    if (!element) {
      throw new Error("عنصر صفحه (page-container) یافت نشد.");
    }

    iframe.style.height = `${element.scrollHeight + 50}px`;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: 794,
      windowWidth: 794,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("خطا: محتوای تولید شده برای چاپ خالی است.");
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (isNaN(imgHeight) || imgHeight <= 0) {
      throw new Error("خطا در محاسبه ابعاد تصویر PDF.");
    }

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}