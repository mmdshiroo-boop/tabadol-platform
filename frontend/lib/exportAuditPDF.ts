// lib/exportAuditPDF.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";

interface ExportAuditPDFOptions {
  logs: any[];
  filename?: string;
  title?: string;
}

export async function exportAuditLogsToPDF(
  logs: any[],
  filename?: string,
  title?: string,
) {
  if (!logs || logs.length === 0) {
    throw new Error("هیچ داده‌ای برای خروجی وجود ندارد");
  }

  // صبر می‌کنیم تا فونت‌های سایت (وزیرمتن) کامل لود شوند
  await document.fonts.ready;

  // ساخت یک عنصر مخفی برای رندر
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.width = "1100px";
  container.style.padding = "24px";
  container.style.direction = "rtl";
  container.style.fontFamily = "Vazirmatn, sans-serif";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1f2937";
  container.style.zIndex = "-1";

  // تاریخ و ساعت
  const today = new Date().toLocaleDateString("fa-IR");
  const now = new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ساخت HTML گزارش
  const html = `
    <div style="text-align:center; margin-bottom:24px;">
      <h1 style="font-size:22px; color:#ea580c; margin:0 0 8px 0; font-weight:bold;">
        ${title || "گزارش رصد کوکی و نشست‌ها"}
      </h1>
      <p style="font-size:12px; margin:4px 0;">
        تاریخ: ${today}  •  ساعت: ${now}
      </p>
      <p style="font-size:12px; margin:4px 0;">
        تعداد کل رکوردها: ${logs.length}
      </p>
    </div>
    <table style="width:100%; border-collapse:collapse; font-size:11px; direction:rtl;">
      <thead>
        <tr style="background-color:#f59e0b; color:#ffffff;">
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:center; width:40px;">ردیف</th>
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:right;">کاربر</th>
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:center;">رویداد</th>
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:center;">وضعیت</th>
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:center;">IP</th>
          <th style="padding:10px 6px; border:1px solid #d1d5db; text-align:center;">تاریخ</th>
        </tr>
      </thead>
      <tbody>
        ${logs
          .map((log, index) => {
            const user = log.userId || {};
            const userName =
              user.firstName || user.lastName
                ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                : user.phone || "مهمان";

            return `
              <tr>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:center;">${index + 1}</td>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:right;">${userName}</td>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:center;">${log.type || "—"}</td>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:center;">${log.status || "—"}</td>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:center;">${log.ip || "—"}</td>
                <td style="padding:8px 6px; border:1px solid #e5e7eb; text-align:center;">${
                  log.createdAt
                    ? new Date(log.createdAt).toLocaleString("fa-IR")
                    : "—"
                }</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // تبدیل عنصر HTML به تصویر
    const canvas = await html2canvas(container, {
      scale: 1.5, // کیفیت بالا
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF("landscape", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // ابعاد تصویر
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = contentWidth / canvasWidth;
    const scaledHeight = canvasHeight * ratio;

    // تقسیم تصویر به صفحات
    let remainingHeight = scaledHeight;
    let sourceY = 0;
    let pageNum = 1;

    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, contentHeight);

      // ساخت canvas جداگانه برای هر برش
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
        sliceCanvas.height,
      );

      const imgData = sliceCanvas.toDataURL("image/png");
      if (pageNum > 1) pdf.addPage();
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin,
        contentWidth,
        sliceHeight,
      );

      sourceY += sliceCanvas.height;
      remainingHeight -= sliceHeight;
      pageNum++;
    }

    // ذخیره فایل
    const finalFilename =
      filename ||
      `audit-logs-${format(new Date(), "yyyy-MM-dd", { locale: faIR })}.pdf`;
    pdf.save(finalFilename);
  } finally {
    document.body.removeChild(container);
  }
}