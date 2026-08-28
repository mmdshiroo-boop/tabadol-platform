// ============================================================
// 3️⃣ BACKEND: controllers/agentReport.controller.ts (کامل)
// ============================================================
// backend/src/controllers/agentReport.controller.ts
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Agent } from "../models/Agent.model";
import { Ad } from "../models/Ad.model";
import { DailyAgentReport } from "../models/DailyAgentReport.model";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";

/* ============================================================
 * توابع کمکی اصلاح چیدمان متون فارسی و اعداد انگلیسی در PDFKit
 * ============================================================ */

/** اصلاح هوشمند متن:
 * - اگر رشته عددی/تاریخی باشد → بدون تغییر (همان انگلیسی) برمی‌گردد
 * - اگر متنی باشد → معکوس می‌شود (برای چیدمان راست‌چین) اما اعداد انگلیسی باقی می‌مانند
 */
const fixPersianSmart = (text: string | number | undefined | null): string => {
  if (text === null || text === undefined) return "";
  let str = String(text).trim();
  if (!str) return "";

  if (/^[\d\-:/\s،٪%،.]+$/.test(str)) {
    return str;
  }

  const words = str.split(/\s+/);
  const processedWords = words.map((w) => {
    if (w.includes("(") || w.includes(")")) {
      return w
        .replace(/\(/g, "TEMP_OPEN")
        .replace(/\)/g, "(")
        .replace(/TEMP_OPEN/g, ")");
    }
    return w;
  });

  return processedWords.reverse().join(" ");
};

/** دریافت تاریخ شمسی استاندارد به فرمت 1405/05/01 با اعداد انگلیسی */
const getFormattedPersianDate = (): string => {
  const now = new Date();
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  }).format(now);
};

/** دریافت زمان به فرمت 17:30 با اعداد انگلیسی */
const getFormattedPersianTime = (): string => {
  const now = new Date();
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    numberingSystem: "latn",
  }).format(now);
};

// ======================== اکسل ========================

export const downloadExcelReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    }

    // دریافت آگهی‌های کاربر
    const ads = await Ad.find({ userId }).lean();

    const totalAds = ads.length;
    const activeAds = ads.filter((a) => a.status === "active").length;
    const soldAds = ads.filter((a) => a.status === "sold").length;
    const pendingAds = ads.filter((a) => a.status === "pending").length;
    const totalViews = ads.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalRevenue = ads
      .filter((a) => a.status === "sold")
      .reduce((sum, a) => sum + (a.price || 0), 0);

    // املاک برتر
    const topProperties = await Ad.find({ userId })
      .sort({ views: -1 })
      .limit(5)
      .select("title views status price city")
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("گزارش عملکرد", {
      views: [{ rightToLeft: true }],
      properties: { defaultRowHeight: 25 },
    });

    // ─── ستون‌ها ───
    sheet.columns = [
      { key: "rowNum", width: 10 },
      { key: "title", width: 35 },
      { key: "price", width: 20 },
      { key: "city", width: 20 },
      { key: "views", width: 16 },
      { key: "status", width: 16 },
    ];

    // ─── هدر ───
    sheet.mergeCells("A1:F2");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "گزارش جامع عملکرد آژانس";
    titleCell.font = { name: "Tahoma", size: 14, bold: true, color: { argb: "FF000000" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };

    // ─── خلاصه ───
    sheet.addRow([]);
    const summaryRow = sheet.addRow(["کل آگهی‌ها", totalAds, "فعال", activeAds, "فروش رفته", soldAds]);
    summaryRow.font = { name: "Tahoma", size: 11, bold: true };
    summaryRow.alignment = { horizontal: "center", vertical: "middle" };
    summaryRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    sheet.addRow([]);

    // ─── هدر جدول ───
    const headerRow = sheet.addRow(["ردیف", "عنوان آگهی", "قیمت", "شهر", "بازدید", "وضعیت"]);
    headerRow.font = { name: "Tahoma", bold: true, size: 11, color: { argb: "FF000000" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAEAEA" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    // ─── داده‌ها ───
    const adsToShow = ads.length > 0 ? ads : topProperties;
    adsToShow.forEach((ad: any, index: number) => {
      const row = sheet.addRow([
        index + 1,
        ad.title || "—",
        ad.price ? ad.price.toLocaleString("en-US") + " تومان" : "—",
        ad.city || "—",
        ad.views || 0,
        ad.status === "active" ? "فعال" : ad.status === "sold" ? "فروش رفته" : "در انتظار",
      ]);

      row.font = { name: "Tahoma", size: 11 };
      row.alignment = { vertical: "middle" };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    });

    // ─── حاشیه‌ها ───
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF888888" } },
      left: { style: "thin", color: { argb: "FF888888" } },
      bottom: { style: "thin", color: { argb: "FF888888" } },
      right: { style: "thin", color: { argb: "FF888888" } },
    };

    for (let R = 4; R <= adsToShow.length + 4; ++R) {
      for (let C = 1; C <= 6; ++C) {
        sheet.getCell(R, C).border = borderStyle;
      }
    }

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM,
      resource: "Report",
      description: `دانلود گزارش اکسل توسط کاربر ${req.user?.firstName || req.user?.phone || "ناشناس"}`,
      req,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agents-report-${new Date().toISOString().slice(0,10)}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel generation error:", error);
    res.status(500).json({ success: false, message: "خطا در تولید فایل اکسل" });
  }
};

// ======================== PDF ========================

export const downloadPdfReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    }

    // ─── مسیر فونت ───
    const assetsDir = path.join(process.cwd(), "assets");
    const fontsDir = path.join(assetsDir, "fonts");
    const regularFontPath = path.join(fontsDir, "Vazirmatn-Regular.ttf");
    const boldFontPath = path.join(fontsDir, "Vazirmatn-Bold.ttf");
    const watermarkPath = path.join(assetsDir, "watermark.png");

    // اگر فونت وجود نداشت، از فونت پیش‌فرض استفاده کن
    const useFallbackFont = !fs.existsSync(regularFontPath);
    if (useFallbackFont) {
      console.warn("⚠️ فونت وزیرمتن یافت نشد، از فونت پیش‌فرض استفاده می‌شود.");
    }

    // ─── دریافت داده‌ها ───
    const ads = await Ad.find({ userId }).lean();
    const totalAds = ads.length;
    const activeAds = ads.filter((a) => a.status === "active").length;
    const soldAds = ads.filter((a) => a.status === "sold").length;
    const pendingAds = ads.filter((a) => a.status === "pending").length;
    const totalViews = ads.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalRevenue = ads
      .filter((a) => a.status === "sold")
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const topProperties = await Ad.find({ userId })
      .sort({ views: -1 })
      .limit(5)
      .select("title views status price city")
      .lean();

    // ─── تنظیمات PDF ───
    const pageW = 595;
    const pageH = 842;
    const margin = 40;
    const rightEdge = pageW - margin;
    const contentWidth = pageW - 2 * margin;

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: { Title: "گزارش عملکرد آژانس", Author: "سیستم یکپارچه" },
    });

    if (!useFallbackFont) {
      doc.registerFont("Vazirmatn", regularFontPath);
      if (fs.existsSync(boldFontPath)) {
        doc.registerFont("Vazirmatn-Bold", boldFontPath);
      } else {
        doc.registerFont("Vazirmatn-Bold", regularFontPath);
      }
    }

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM,
      resource: "Report",
      description: `دانلود گزارش PDF توسط کاربر ${req.user?.firstName || req.user?.phone || "ناشناس"}`,
      req,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agents-report-${new Date().toISOString().slice(0,10)}.pdf`
    );
    doc.pipe(res);

    const fontName = useFallbackFont ? "Helvetica" : "Vazirmatn";
    const boldFontName = useFallbackFont ? "Helvetica-Bold" : "Vazirmatn-Bold";

    const drawRtlText = (
      text: string | number,
      rightX: number,
      y: number,
      opts: { fontSize?: number; bold?: boolean; color?: string } = {}
    ) => {
      const font = opts.bold ? boldFontName : fontName;
      doc
        .font(font)
        .fontSize(opts.fontSize || 10)
        .fillColor(opts.color || "#000000");

      const formattedText = useFallbackFont ? String(text) : fixPersianSmart(text);
      const textWidth = doc.widthOfString(formattedText);
      doc.text(formattedText, rightX - textWidth, y, { lineBreak: false });
    };

    // ─── هدر ───
    drawRtlText("گزارش عملکرد آژانس", rightEdge, margin, { fontSize: 16, bold: true });

    const todayStr = getFormattedPersianDate();
    const timeStr = getFormattedPersianTime();
    drawRtlText(`تاریخ: ${todayStr}`, rightEdge, margin + 35, { fontSize: 9 });
    drawRtlText(`ساعت: ${timeStr}`, rightEdge, margin + 50, { fontSize: 9 });

    doc.moveTo(margin, margin + 70).lineTo(rightEdge, margin + 70).lineWidth(2).stroke("#000000");

    // ─── خلاصه ───
    const summaryY = margin + 90;
    drawRtlText("خلاصه وضعیت:", rightEdge, summaryY, { fontSize: 12, bold: true });

    const boxY = summaryY + 22;
    const boxH = 60;
    doc.rect(margin, boxY, contentWidth, boxH).lineWidth(1).stroke("#666666");

    const colWidth = contentWidth / 4;
    for (let i = 1; i < 4; i++) {
      doc.moveTo(margin + i * colWidth, boxY).lineTo(margin + i * colWidth, boxY + boxH).lineWidth(0.5).stroke("#999999");
    }

    const drawSummaryItem = (xCenter: number, label: string, value: string | number) => {
      doc.font(fontName).fontSize(10).fillColor("#333333");
      const fixedLabel = useFallbackFont ? label : fixPersianSmart(label);
      const labelW = doc.widthOfString(fixedLabel);
      doc.text(fixedLabel, xCenter - labelW / 2, boxY + 12, { lineBreak: false });

      doc.font(boldFontName).fontSize(14).fillColor("#000000");
      const fixedValue = useFallbackFont ? String(value) : fixPersianSmart(value);
      const valueW = doc.widthOfString(fixedValue);
      doc.text(fixedValue, xCenter - valueW / 2, boxY + 32, { lineBreak: false });
    };

    drawSummaryItem(margin + 0.5 * colWidth, "کل آگهی‌ها", totalAds.toLocaleString("en-US"));
    drawSummaryItem(margin + 1.5 * colWidth, "فعال", activeAds.toLocaleString("en-US"));
    drawSummaryItem(margin + 2.5 * colWidth, "فروش رفته", soldAds.toLocaleString("en-US"));
    drawSummaryItem(margin + 3.5 * colWidth, "در انتظار", pendingAds.toLocaleString("en-US"));

    // ─── جدول آگهی‌ها ───
    let tableY = boxY + boxH + 35;
    drawRtlText("لیست آگهی‌ها:", rightEdge, tableY, { fontSize: 12, bold: true });

    tableY += 22;
    const colXs = [
      rightEdge,
      rightEdge - 30,
      rightEdge - 200,
      rightEdge - 310,
      rightEdge - 390,
      rightEdge - 460,
    ];

    doc.rect(margin, tableY, contentWidth, 25).fillAndStroke("#F5F5F5", "#333333");

    const headers = ["ردیف", "عنوان", "قیمت", "شهر", "بازدید", "وضعیت"];
    headers.forEach((h, i) => {
      drawRtlText(h, colXs[i] - 10, tableY + 6, { fontSize: 10, bold: true });
    });

    let rowY = tableY + 25;

    const drawTableGrid = (yStart: number, yEnd: number) => {
      doc.moveTo(margin, yStart).lineTo(margin, yEnd).lineWidth(1).stroke("#333333");
      for (let i = 1; i < 6; i++) {
        doc.moveTo(colXs[i], yStart).lineTo(colXs[i], yEnd).stroke();
      }
      doc.moveTo(rightEdge, yStart).lineTo(rightEdge, yEnd).stroke();
    };

    const itemsToShow = ads.length > 0 ? ads : topProperties;
    itemsToShow.forEach((ad: any, idx: number) => {
      if (rowY > pageH - 90) {
        drawTableGrid(tableY, rowY);
        doc.addPage();
        rowY = margin;
        tableY = margin;
      }

      const statusMap: Record<string, string> = {
        active: "فعال",
        sold: "فروش رفته",
        pending: "در انتظار",
        expired: "منقضی",
        rejected: "رد شده",
      };

      drawRtlText(idx + 1, colXs[0] - 12, rowY + 7);
      drawRtlText(ad.title || "—", colXs[1] - 10, rowY + 7);
      drawRtlText(
        ad.price ? ad.price.toLocaleString("en-US") + " تومان" : "—",
        colXs[2] - 10,
        rowY + 7
      );
      drawRtlText(ad.city || "—", colXs[3] - 10, rowY + 7);
      drawRtlText((ad.views || 0).toLocaleString("en-US"), colXs[4] - 10, rowY + 7);
      drawRtlText(statusMap[ad.status] || ad.status, colXs[5] - 10, rowY + 7);

      doc.moveTo(margin, rowY + 25).lineTo(rightEdge, rowY + 25).lineWidth(1).stroke("#333333");
      rowY += 25;
    });

    drawTableGrid(tableY, rowY);

    // ─── واترمارک و فوتر ───
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      if (fs.existsSync(watermarkPath)) {
        doc.save();
        doc.opacity(0.85);
        const wmWidth = 110;
        const wmX = margin;
        const wmY = pageH - margin - 75;
        doc.image(watermarkPath, wmX, wmY, { width: wmWidth });
        doc.restore();
      }

      const footerY = pageH - 35;
      doc.moveTo(margin, footerY - 10).lineTo(rightEdge, footerY - 10).lineWidth(0.5).stroke("#000000");

      drawRtlText(
        "این گزارش به صورت سیستمی تولید شده است.",
        pageW / 2 + 140,
        footerY,
        { fontSize: 8, color: "#333333" }
      );

      if (range.count > 1) {
        drawRtlText(`صفحه ${i + 1} از ${range.count}`, rightEdge, footerY, { fontSize: 8, color: "#555555" });
      }
    }

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "خطا در تولید فایل PDF" });
    }
  }
};