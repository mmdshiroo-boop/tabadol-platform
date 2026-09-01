// backend/src/controllers/bulkAd.controller.ts
import { Response } from "express";
import fs from "fs";
import AdmZip from "adm-zip";
import path from "path";
import sharp from "sharp";
import https from "https";
import http from "http";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendNotificationToUser } from "../services/notification.service";
import { Ad, Category } from "../models";
import { BulkTask } from "../models/BulkTask.model";
import { AuditAction, AuditLog } from "../models/AuditLog.model";

// ═══════════️ واترمارک و ابزارهای تصویر ════════════
const adsUploadDir = path.resolve(process.cwd(), "uploads", "ads");
const watermarkPath = path.resolve(process.cwd(), "assets", "watermark.png");
let cachedWatermark: Buffer | null = null;

// ✅ BASE_URL سراسری — جلوگیری از localhost در Production
const PORT = process.env.PORT || 5001;
const BASE_URL =
  process.env.BASE_URL ||
  process.env.RAILWAY_PUBLIC_URL ||
  `http://localhost:${PORT}`;

async function getWatermark(): Promise<Buffer> {
  if (cachedWatermark) return cachedWatermark;
  if (!fs.existsSync(watermarkPath)) throw new Error("فایل واترمارک یافت نشد");
  cachedWatermark = await sharp(watermarkPath)
    .resize(500, undefined, { fit: "inside", withoutEnlargement: true })
    .toBuffer();
  return cachedWatermark!;
}

async function asyncPool<T>(
  concurrency: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<any>,
): Promise<any[]> {
  const ret: Promise<any>[] = [];
  const executing: Promise<any>[] = [];
  for (const [i, item] of items.entries()) {
    const p = Promise.resolve().then(() => iteratorFn(item, i));
    ret.push(p);
    if (concurrency <= items.length) {
      const e: any = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

function downloadImageBuffer(url: string, attempt = 0): Promise<Buffer> {
  const maxRetries = 2;
  return new Promise((resolve, reject) => {
    let referer = url;
    try {
      const parsed = new URL(url);
      referer = parsed.origin;
      if (url.includes("divarcdn.com") || url.includes("divar.ir"))
        referer = "https://divar.ir";
      else if (url.includes("sheypoor.com") || url.includes("cdn.sheypoor.com"))
        referer = "https://www.sheypoor.com";
    } catch {}
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        agent: url.startsWith("https") ? httpsAgent : httpAgent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: referer,
          Accept: "image/webp,image/*,*/*;q=0.8",
          "Accept-Encoding": "identity",
        },
        timeout: 10000,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadImageBuffer(res.headers.location, attempt)
            .then(resolve)
            .catch(reject);
        }
        if (!res.statusCode || res.statusCode !== 200) {
          if (attempt < maxRetries) {
            setTimeout(
              () =>
                downloadImageBuffer(url, attempt + 1)
                  .then(resolve)
                  .catch(reject),
              500,
            );
          } else reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", (err) => {
          if (attempt < maxRetries) {
            setTimeout(
              () =>
                downloadImageBuffer(url, attempt + 1)
                  .then(resolve)
                  .catch(reject),
              500,
            );
          } else reject(err);
        });
      },
    );
    req.on("error", (err) => {
      if (attempt < maxRetries) {
        setTimeout(
          () => downloadImageBuffer(url, attempt + 1).then(resolve).catch(reject),
          500,
        );
      } else reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      if (attempt < maxRetries) {
        setTimeout(
          () => downloadImageBuffer(url, attempt + 1).then(resolve).catch(reject),
          500,
        );
      } else reject(new Error("timeout after retries"));
    });
  });
}

async function downloadAndWatermarkImage(
  imageUrl: string,
  adIndex: number,
  imgIndex: number,
): Promise<string> {
  try {
    if (imageUrl.includes("/uploads/ads/")) return imageUrl;
    if (!imageUrl || typeof imageUrl !== "string") return imageUrl;
    const imageBuffer = await downloadImageBuffer(imageUrl);
    if (!imageBuffer || imageBuffer.length < 1000) return imageUrl;
    if (!fs.existsSync(adsUploadDir)) fs.mkdirSync(adsUploadDir, { recursive: true });
    const filename = `bulk-${adIndex}-${imgIndex}-${Date.now()}.webp`;
    const filePath = path.join(adsUploadDir, filename);
    const wm = await getWatermark();
    const resizedWm = await sharp(wm)
      .resize(120, 120, { fit: "inside", withoutEnlargement: true })
      .toBuffer();
    // اصلاح: حذف گزینه failOnError که در Sharp پشتیبانی نمی‌شود
    await sharp(imageBuffer)
      .resize(1024, undefined, { fit: "inside", withoutEnlargement: true })
      .composite([{ input: resizedWm, gravity: "southwest" }])
      .webp({ quality: 70 })
      .toFile(filePath);
    return `${BASE_URL}/uploads/ads/${filename}`;
  } catch (err: any) {
    console.error(`❌ خطا در واترمارک: ${err?.message}`);
    return imageUrl;
  }
}

async function processAdImages(images: string[], adIndex: number): Promise<string[]> {
  if (!Array.isArray(images) || images.length === 0) return images;
  return asyncPool(50, images, (url, idx) =>
    downloadAndWatermarkImage(url, adIndex, idx),
  );
}

// ═══════════️ ابزارهای عددی ════════════
function parseNumber(str: any): number {
  if (!str) return 0;
  if (typeof str === "number") return str;
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  let cleaned = str.toString();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(persianDigits[i], String(i));
    cleaned = cleaned.replaceAll(arabicDigits[i], String(i));
  }
  cleaned = cleaned.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// ═══════════️ استخراج قیمت از متن ════════════
function extractPriceFromText(text: string): number | null {
  if (!text) return null;
  const cleaned = text
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const patterns = [
    /(?:قیمت\s*(?:کل|نهایی|فروش|رهن)?\s*[:\-–]?\s*)([\d,،٫]+)\s*تومان/i,
    /([\d,،٫]{5,})\s*تومان/i,
    /(?:ودیعه|رهن)\s*[:\-–]?\s*([\d,،٫]+)\s*تومان/i,
    /(?:اجاره(?:\s*ماهانه)?)\s*[:\-–]?\s*([\d,،٫]+)\s*تومان/i,
    /(?:پیش\s*پرداخت)\s*[:\-–]?\s*([\d,،٫]+)\s*تومان/i,
    /(\d[\d,،٫]*)\s*میلیارد\s*تومان/i,
    /(\d[\d,،٫]*)\s*میلیون\s*تومان/i,
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      let num = parseNumber(m[1]);
      if (num > 0) {
        if (m[0].includes("میلیارد")) num *= 1_000_000_000;
        else if (m[0].includes("میلیون")) num *= 1_000_000;
        return num;
      }
    }
  }
  const numbers = cleaned.match(/\d[\d,،٫]*\d/g);
  if (numbers) {
    for (const nStr of numbers) {
      const n = parseNumber(nStr);
      if (n > 10000) return n;
    }
  }
  return null;
}

// ═══════════️ استخراج قیمت اصلی ════════════
function extractPrice(d: any, attrs: Record<string, string>): number {
  if (d.rawJsonLd?.offers?.Price && typeof d.rawJsonLd.offers.Price === "number" && d.rawJsonLd.offers.Price > 0) {
    return d.rawJsonLd.offers.Price;
  }
  if (d.rawJsonLd?.price && typeof d.rawJsonLd.price === "number" && d.rawJsonLd.price > 0) {
    return d.rawJsonLd.price;
  }

  if (d.rawData?.sections?.LIST_DATA) {
    for (const widget of d.rawData.sections.LIST_DATA) {
      if (widget.widgetType === "RENT_SLIDER") {
        const credit = parseNumber(widget.dto?.data?.credit?.value);
        if (credit > 0) return credit;
      }
    }
  }

  if (typeof d.price === "number" && d.price > 0) return d.price;

  if (typeof d.price === "string") {
    if (/توافقی|negotiable|رایگان|free/i.test(d.price.trim())) return 0;
    const n = parseNumber(d.price);
    if (n > 0) return n;
  }

  const attrPriceKeys = ["قیمت کل", "قیمت", "ودیعه", "اجارهٔ ماهانه", "اجاره ماهانه", "پیش پرداخت"];
  for (const key of attrPriceKeys) {
    const v = parseNumber(attrs[key]);
    if (v > 0) return v;
  }

  if (d.rawData?.sections?.LIST_DATA) {
    for (const widget of d.rawData.sections.LIST_DATA) {
      if (widget.widgetType === "UNEXPANDABLE_ROW" || widget.widgetType === "DESCRIPTION_ROW") {
        const title = widget.dto?.data?.title;
        const value = widget.dto?.data?.value;
        if (title && value && /قیمت|ودیعه|اجاره|پیش‌پرداخت|روزهای عادی|آخر هفته|روزهای خاص|هزینه/i.test(title)) {
          continue;
        }
      }
    }
  }

  if (d.rawData?.seo) {
    const seoTitle = d.rawData.seo.title || "";
    const seoDesc = d.rawData.seo.description || "";
    const combinedSeo = `${seoTitle} ${seoDesc}`;
    const seoPrice = extractPriceFromText(combinedSeo);
    if (seoPrice) return seoPrice;
  }
  const descPrice = extractPriceFromText(d.description);
  if (descPrice) return descPrice;
  const titlePrice = extractPriceFromText(d.title);
  if (titlePrice) return titlePrice;

  const numbers = (d.description || "").match(/\d[\d,،٫]*\d/g);
  if (numbers) {
    let max = 0;
    for (const nStr of numbers) {
      const n = parseNumber(nStr);
      if (n > max) max = n;
    }
    if (max > 10000) return max;
  }
  return 0;
}

function detectPriceType(d: any, attrs: Record<string, string>): string {
  const priceStr = String(d.price ?? "").trim();
  if (/توافقی|negotiable|رایگان|free/i.test(priceStr)) return "negotiable";
  for (const key of ["قیمت کل", "قیمت", "ودیعه"]) {
    if (attrs[key] && /توافقی|رایگان/i.test(String(attrs[key]))) return "negotiable";
  }
  return extractPrice(d, attrs) === 0 ? "negotiable" : "fixed";
}

// ═══════════️ کش دسته‌بندی ════════════
let categoryCache: any[] | null = null;
async function getCategoryId(title: string, description: string): Promise<string | null> {
  if (!categoryCache) {
    categoryCache = await Category.find({}).lean();
  }
  const combined = (title + " " + description).toLowerCase();
  for (const cat of categoryCache) {
    if (cat.name && combined.includes(cat.name.toLowerCase())) {
      return cat._id.toString();
    }
  }
  return categoryCache?.[0]?._id.toString() || null;
}

// ═══════════️ تشخیص آگهی غیرفعال ════════════
function isAdUnavailable(d: any): boolean {
  if (d.status === "sold" || d.status === "expired" || d.status === "deleted") return true;
  if (d.sold === true || d.expired === true) return true;
  return false;
}

function getSourceId(item: any): string {
  const d = item.data || item;
  return d.token || d.id || item.id || `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
}

// ═══════════️ نگاشت نهایی ════════════
function mapToAdPayload(
  item: any,
  uploaderId: string,
  expertPhone: string,
  expertName: string,
  categoryId: string,
) {
  const d = item.data || item;
  const isDivar = !!d.rawData;
  const isSheypoor = !!d.rawJsonLd;

  let title = (d.title || "").substring(0, 200) || "بدون عنوان";

  let description = d.description || "";
  if (isDivar && (!description || description === "توضیحات" || description.trim().length < 10)) {
    const seoDesc = d.rawData?.seo?.description;
    if (seoDesc && seoDesc.trim().length > 10) {
      description = seoDesc.trim();
    } else {
      try {
        const descWidgets = d.rawData?.sections?.DESCRIPTION;
        if (Array.isArray(descWidgets)) {
          const real = descWidgets
            .filter((w: any) => w.widgetType === "DESCRIPTION_ROW")
            .map((w: any) => w.dto?.data?.text)
            .join("\n")
            .trim();
          if (real) description = real;
        }
      } catch {}
    }
  }

  let city = "", province = "", district = "", latitude: number | undefined, longitude: number | undefined;
  if (isDivar) {
    city = d.city || d.rawData?.city?.name || "";
    district = d.district || "";
    if (d.coordinates) {
      latitude = d.coordinates.lat;
      longitude = d.coordinates.lng;
    } else if (d.location?.exact_data?.point) {
      latitude = d.location.exact_data.point.latitude;
      longitude = d.location.exact_data.point.longitude;
    }
  } else if (isSheypoor) {
    const geo = d.rawJsonLd?.itemOffered?.geo || d.rawJsonLd?.geo;
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
    }
    const addressData = d.rawJsonLd?.itemOffered?.address || d.rawJsonLd?.geo?.address;
    if (typeof addressData === "string") {
      const parts = addressData.split(" ");
      province = parts[0] || "";
      city = parts.slice(1).join(" ") || "";
    } else if (addressData && typeof addressData === "object") {
      province = addressData.addressRegion || "";
      city = addressData.addressLocality || "";
      district = addressData.streetAddress || "";
    }
    if (!city) city = d.location || "";
    if (!province) province = d.province || "";
  }

  let images: string[] = [];
  if (Array.isArray(d.images) && d.images.length > 0) {
    images = d.images;
  }
  if (images.length === 0 && isDivar && d.rawData?.sections?.IMAGE) {
    for (const widget of d.rawData.sections.IMAGE) {
      if (widget.widgetType === "IMAGE_CAROUSEL" && widget.dto?.data?.items) {
        for (const imgItem of widget.dto.data.items) {
          if (imgItem.image?.url) images.push(imgItem.image.url);
        }
      }
    }
  }
  if (images.length === 0 && d.rawMeta?.image) {
    images = [d.rawMeta.image];
  }
  if (images.length === 0 && typeof d.image === "string" && d.image.length > 0) {
    images = [d.image];
  }

  let adType = "sale";
  if (isDivar) {
    const cat = d.category || "";
    if (cat.includes("اجاره")) {
      adType = cat.includes("روزانه") || cat.includes("کوتاه‌مدت") ? "daily_rent" : "rent";
    }
  } else if (isSheypoor) {
    if (d.category === "forSale") adType = "sale";
    else if (d.category === "forRent" || d.category?.includes("اجاره")) adType = "rent";
  }

  let attrs: Record<string, string> = {};
  if (isDivar && Array.isArray(d.attributes)) {
    d.attributes.forEach((attr: any) => {
      if (attr.key) attrs[attr.key] = attr.value || "true";
    });
  }
  if (isSheypoor) {
    const addProps = d.rawJsonLd?.itemOffered?.additionalProperty || d.rawJsonLd?.additionalProperty;
    if (Array.isArray(addProps)) {
      addProps.forEach((prop: any) => {
        if (prop.name && prop.value !== undefined) attrs[prop.name] = String(prop.value);
      });
    }
    if (Array.isArray(d.attributes)) {
      d.attributes.forEach((attr: any) => {
        if (attr.key) attrs[attr.key] = attr.value || "true";
      });
    }
  }

  if (isDivar && adType === "rent") {
    if (attrs["ظرفیت استاندارد"] || attrs["ظرفیت اضافه"] || attrs["روزهای عادی"] || attrs["آخر هفته"]) {
      adType = "daily_rent";
    }
  }

  const price = extractPrice(d, attrs);
  const priceType = detectPriceType(d, attrs);

  let deposit = parseNumber(attrs["ودیعه"] || attrs["پیش پرداخت"]);
  let monthlyRent = parseNumber(attrs["اجارهٔ ماهانه"] || attrs["اجاره ماهانه"]);

  if (isDivar && d.rawData?.sections?.LIST_DATA) {
    for (const widget of d.rawData.sections.LIST_DATA) {
      if (widget.widgetType === "RENT_SLIDER") {
        deposit = parseNumber(widget.dto?.data?.credit?.value) || deposit;
        monthlyRent = parseNumber(widget.dto?.data?.rent?.value) || monthlyRent;
      }
    }
  }

  if ((adType === "rent" || adType === "daily_rent") && (deposit > 0 || monthlyRent > 0)) {
    const priceLines = [];
    if (deposit > 0) priceLines.push(`ودیعه: ${deposit.toLocaleString("fa-IR")} تومان`);
    if (monthlyRent > 0) priceLines.push(`اجاره ماهانه: ${monthlyRent.toLocaleString("fa-IR")} تومان`);
    if (priceLines.length > 0) description = priceLines.join(" | ") + "\n\n" + description;
  }

  if (adType === "daily_rent") {
    const dailyPrices = [];
    if (attrs["روزهای عادی"]) dailyPrices.push(`روزهای عادی: ${attrs["روزهای عادی"]}`);
    if (attrs["آخر هفته"]) dailyPrices.push(`آخر هفته: ${attrs["آخر هفته"]}`);
    if (attrs["روزهای خاص"]) dailyPrices.push(`روزهای خاص: ${attrs["روزهای خاص"]}`);
    if (attrs["هزینهٔ هر نفر اضافه"]) dailyPrices.push(`هر نفر اضافه: ${attrs["هزینهٔ هر نفر اضافه"]}`);
    if (dailyPrices.length > 0) {
      description = "💰 هزینه‌ها:\n" + dailyPrices.join("\n") + "\n\n" + description;
    }
  }

  let rooms = parseNumber(d.rooms || attrs["اتاق"] || attrs["تعداد اتاق"]);
  let area = parseNumber(d.area || attrs["متراژ"] || attrs["متراژ ویلا"] || attrs["متراژ زمین"]);
  if (isSheypoor && d.area && typeof d.area === "number") area = d.area;

  let amenities: any = {};
  if (isDivar && d.features) {
    d.features.forEach((f: any) => {
      const name = f.name?.toLowerCase() || "";
      if (name.includes("آسانسور")) amenities.elevator = f.available;
      else if (name.includes("پارکینگ")) amenities.parking = f.available;
      else if (name.includes("انباری")) amenities.storage = f.available;
      else if (name.includes("بالکن")) amenities.balcony = f.available;
    });
  } else if (isSheypoor && d.rawJsonLd?.amenityFeature) {
    d.rawJsonLd.amenityFeature.forEach((f: any) => {
      const name = f.name?.toLowerCase() || "";
      if (name === "parking") amenities.parking = f.value;
      else if (name === "storage") amenities.storage = f.value;
      else if (name === "elevator") amenities.elevator = f.value;
    });
  }

  const contactPhone = d.phone || "";
  const sellerName = d.seller || d.consultant || expertName;

  const baseSlug = (title || "ad")
    .replace(/[^\w\u0600-\u06FF\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 60);
  const slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;

  const sourceId = getSourceId(item);

  return {
    title,
    description,
    priceType,
    adType,
    price,
    city: city || "نامشخص",
    province: province || "",
    district,
    images,
    source: isSheypoor ? "sheypoor" : isDivar ? "divar" : "manual",
    sourceUrl: item.url || d.url || "",
    sourceId,
    contactPhone,
    contactName: sellerName,
    sellerName,
    rooms,
    area,
    floor: attrs["طبقه"] || d.floor || "",
    latitude,
    longitude,
    amenities,
    additionalProperties: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    rawData: d,
    status: "active",
    isUrgent: false,
    userId: uploaderId,
    uploadedBy: uploaderId,
    slug,
    category: categoryId,
    expiresAt: (() => { const exp = new Date(); exp.setDate(exp.getDate() + 30); return exp; })(),
  };
}

function isAdValid(payload: any): boolean {
  if (!payload.title || payload.title.trim().length < 3) return false;
  const hasDesc = payload.description && payload.description.trim().length > 5;
  const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
  const hasPrice = payload.price > 0;
  return hasDesc || hasImages || hasPrice;
}

// ═══════════️ کنترلرهای Express ════════════
export const uploadBulkAds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    const files = (req as any).files;
    if (!files || !files.zipFile) return res.status(400).json({ success: false, message: "فایل ZIP الزامی است" });
    const zipFile = files.zipFile as any;
    if (!zipFile.name.endsWith(".zip")) return res.status(400).json({ success: false, message: "فقط فایل‌های ZIP مجاز هستند" });

    const tempDir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `bulk-${Date.now()}.zip`);
    await zipFile.mv(tempPath);

    const task = await BulkTask.create({
      userId,
      fileName: tempPath,
      originalName: zipFile.name,
      status: "pending",
      progress: { total: 0, processed: 0, success: 0, errors: 0, skipped: 0 },
      errorLog: [],
    });

    return res.status(202).json({
      success: true,
      message: "فایل دریافت شد. پردازش در صف قرار گرفت.",
      data: { taskId: task._id },
    });
  } catch (error: any) {
    console.error("❌ خطا در دریافت فایل:", error);
    return res.status(500).json({ success: false, message: "خطا در دریافت فایل" });
  }
};

export const getTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await BulkTask.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "وظیفه یافت نشد" });
    const total = task.progress.total || 0;
    const processed = task.progress.processed || 0;
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
    const taskObj = task.toObject();
    res.json({
      success: true,
      data: {
        status: task.status,
        progress: { ...taskObj.progress, percent },
        errorLog: task.errorLog,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت وضعیت" });
  }
};

let isWorkerRunning = false;
export function startBulkWorker() {
  setInterval(async () => {
    if (isWorkerRunning) return;
    isWorkerRunning = true;
    try {
      const pendingTask = await BulkTask.findOne({ status: "pending" }).sort({ createdAt: 1 });
      if (!pendingTask) { isWorkerRunning = false; return; }
      await processBulkTask(pendingTask._id);
    } catch (err) {
      console.error("Bulk worker error:", err);
    } finally {
      isWorkerRunning = false;
    }
  }, 5000);
}

async function processBulkTask(taskId: any) {
  const task = await BulkTask.findOneAndUpdate(
    { _id: taskId, status: "pending" },
    { status: "processing" },
    { new: true },
  );
  if (!task) return;

  try {
    if (!fs.existsSync(task.fileName)) throw new Error("فایل ZIP یافت نشد");

    const zip = new AdmZip(task.fileName);
    const entries = zip.getEntries();
    const jsonFiles = entries.filter((e) => !e.isDirectory && e.entryName.endsWith(".json"));
    if (jsonFiles.length === 0) throw new Error("هیچ فایل JSON در ZIP یافت نشد");

    let totalItems = 0;
    for (const entry of jsonFiles) {
      try {
        const content = entry.getData().toString("utf8");
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        totalItems += items.length;
      } catch (e) {}
    }

    await BulkTask.findByIdAndUpdate(taskId, { "progress.total": totalItems });

    const expert = await (await import("../models/Expert.model")).Expert.findOne({ userId: task.userId });
    const expertPhone = expert?.phone || "09120000000";
    const expertName = `${expert?.firstName || ""} ${expert?.lastName || ""}`.trim() || expertPhone;

    const existingSourceIds = new Set(
      (await Ad.find(
        { source: { $in: ["divar", "sheypoor", "bama", "manual"] } },
        { sourceId: 1 }
      ).lean()).map((ad: any) => ad.sourceId)
    );

    let successCount = 0, errorCount = 0, skipCount = 0;
    let processedCount = 0;
    const errorLog: any[] = [];
    let lastSaveTime = Date.now();

    const maybeSaveTask = async () => {
      const now = Date.now();
      if (processedCount % 50 === 0 || now - lastSaveTime > 10000) {
        await BulkTask.findByIdAndUpdate(taskId, {
          $set: {
            "progress.processed": Math.min(processedCount, totalItems),
            "progress.success": successCount,
            "progress.errors": errorCount,
            "progress.skipped": skipCount,
          },
        }).catch((e) => console.error("save task error:", e));
        lastSaveTime = now;
      }
    };

    const BATCH_SIZE = 200;
    let adBatch: any[] = [];
    let auditLogBatch: any[] = [];

    // تابع فلاش دسته‌ای که تعداد واقعی درج شده را برمی‌گرداند
    const flushBatches = async (): Promise<number> => {
      if (adBatch.length === 0) return 0;
      let insertedCount = 0;
      try {
        const inserted = await Ad.insertMany(adBatch, { ordered: false });
        insertedCount = inserted.length;
        // به‌روزرسانی resourceId برای audit logs
        auditLogBatch.forEach((log, idx) => {
          if (inserted[idx]) log.resourceId = inserted[idx]._id;
        });
        // درج لاگ‌ها
        if (auditLogBatch.length > 0) {
          await AuditLog.insertMany(auditLogBatch, { ordered: false });
        }
      } catch (insertErr: any) {
        // اگر خطایی رخ دهد، ممکن است برخی اسناد درج شده باشند
        if (insertErr.insertedDocs) {
          insertedCount = insertErr.insertedDocs.length;
          // ثبت خطا برای هر سند ناموفق (در صورت امکان)
        }
        console.error("❌ Batch insert error:", insertErr);
        // ثبت خطا در errorLog
        errorLog.push({
          row: "batch",
          index: 0,
          type: "error",
          message: `خطا در درج دسته‌ای: ${insertErr.message}`,
        });
        // افزایش errorCount به تعداد اسناد ناموفق
        errorCount += adBatch.length - insertedCount;
      } finally {
        // پاکسازی آرایه‌ها
        adBatch = [];
        auditLogBatch = [];
      }
      return insertedCount;
    };

    for (const entry of jsonFiles) {
      try {
        const content = entry.getData().toString("utf8");
        const parsed = JSON.parse(content);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const identifier = `${entry.entryName}[${idx}]`;

          try {
            const d = item.data || item;
            if (isAdUnavailable(d)) {
              skipCount++;
              errorLog.push({ row: identifier, index: idx + 1, type: "skip", message: "آگهی در منبع اصلی فروخته یا حذف شده است" });
              processedCount++;
              await maybeSaveTask();
              continue;
            }

            const sourceId = getSourceId(item);
            if (existingSourceIds.has(sourceId)) {
              skipCount++;
              errorLog.push({ row: identifier, index: idx + 1, type: "skip", message: "آگهی تکراری (قبلاً ثبت شده)" });
              processedCount++;
              await maybeSaveTask();
              continue;
            }
            if (adBatch.some((ad) => ad.sourceId === sourceId)) {
              skipCount++;
              errorLog.push({ row: identifier, index: idx + 1, type: "skip", message: "آگهی تکراری (در همین فایل)" });
              processedCount++;
              await maybeSaveTask();
              continue;
            }

            const categoryId = await getCategoryId(d.title || "", d.description || "");
            const catId = categoryId || "000000000000000000000000";
            const adPayload = mapToAdPayload(item, task.userId.toString(), expertPhone, expertName, catId);

            if (!isAdValid(adPayload)) {
              skipCount++;
              errorLog.push({ row: identifier, index: idx + 1, type: "skip", message: "اطلاعات کافی نیست" });
              processedCount++;
              await maybeSaveTask();
              continue;
            }

            if (Array.isArray(adPayload.images) && adPayload.images.length > 0) {
              adPayload.images = await processAdImages(adPayload.images, idx);
            }

            adBatch.push(adPayload);
            auditLogBatch.push({
              userId: task.userId,
              action: AuditAction.AD_CREATED,
              resource: "Ad",
              resourceId: null,
              description: `کارشناس ${expertName} آگهی فله‌ای «${adPayload.title}» را ایجاد کرد.`,
              metadata: { source: adPayload.source, originalId: adPayload.sourceId },
              createdAt: new Date(),
            });
            existingSourceIds.add(sourceId);

            // اگر batch پر شد، flush کن و تعداد موفق را اضافه کن
            if (adBatch.length >= BATCH_SIZE) {
              const insertedNow = await flushBatches();
              successCount += insertedNow;
            }
          } catch (itemErr: any) {
            errorCount++;
            errorLog.push({ row: identifier, index: idx + 1, type: "error", message: itemErr.message });
          } finally {
            processedCount++;
            await maybeSaveTask();
          }
        }
      } catch (fileErr: any) {
        errorCount++;
        errorLog.push({ row: entry.entryName, index: 0, type: "error", message: `خطا در پردازش فایل JSON: ${fileErr.message}` });
      }
    }

    // فلاش باقی‌مانده
    const remainingInserted = await flushBatches();
    successCount += remainingInserted;

    fs.unlink(task.fileName, () => {});

    await BulkTask.findByIdAndUpdate(taskId, {
      $set: {
        status: "completed",
        progress: {
          total: totalItems,
          processed: totalItems,
          success: successCount,
          errors: errorCount,
          skipped: skipCount,
        },
        errorLog: errorLog,
      },
    });

    await sendNotificationToUser(
      task.userId.toString(),
      "تکمیل بارگذاری فله‌ای",
      `${successCount} آگهی ایجاد شد.${errorCount ? ` (${errorCount} خطا)` : ""}${skipCount ? ` (${skipCount} رد شده)` : ""}`,
      "info",
      "/panel/expert/bulk-upload",
      { success: successCount, errors: errorCount, skipped: skipCount },
    );
  } catch (err: any) {
    console.error("Bulk task failed:", err);
    await BulkTask.findByIdAndUpdate(taskId, {
      $set: { status: "failed" },
      $push: { errorLog: { row: "system", index: 0, type: "error", message: err.message } },
    });
  }
}