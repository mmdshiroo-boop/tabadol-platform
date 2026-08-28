// backend/src/controllers/ad.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ad ,IAd} from "../models/Ad.model";
import { User } from "../models/User.model";
import { AuthRequest } from "../middleware/auth.middleware";
import multer from "multer";
import path from "node:path";
import fs from "fs";
import sharp from "sharp";
import { grantPoints, grantPointsIfNotGranted } from "../services/loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
import {
  sendNotificationToUser,
  notifyAdmins,
  notifyExperts,
  notifySuperAdmins,
} from "../services/notification.service";
import { WebhookService } from "../services/webhook.service";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { NotificationType } from "../models/Notification.model";
import { PageView } from "../models/PageView.model";
import { Agent } from "../models/Agent.model";
import { recordView } from "../services/agentClub.service";
// ==================== تنظیمات آپلود ====================
const uploadDir = path.join(process.cwd(), "uploads");
const adsUploadDir = path.join(uploadDir, "ads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(adsUploadDir))
  fs.mkdirSync(adsUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, adsUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `ad-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const fileFilter = (req: any, file: any, cb: any) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("فقط فایل‌های تصویری مجاز هستند (jpeg, jpg, png, gif, webp)"));
  }
};


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});


// ==================== آپلود تصویر با واترمارک ====================
export const uploadImageWithWatermark = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const files = (req as any).files;
    if (!files || !files.image) {
      return res
        .status(400)
        .json({ success: false, message: "هیچ فایلی انتخاب نشده است" });
    }

    const file = files.image as any;
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.name).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (!mimetype || !extname) {
      return res
        .status(400)
        .json({ success: false, message: "فقط تصاویر مجاز هستند" });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "حجم تصویر باید کمتر از ۵ مگابایت باشد",
      });
    }

    if (!fs.existsSync(adsUploadDir)) {
      fs.mkdirSync(adsUploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name);
    const filename = `ad-${uniqueSuffix}${ext}`;
    const filePath = path.join(adsUploadDir, filename);

    const watermarkPath = path.join(__dirname, "../../assets/watermark.png");

    if (!fs.existsSync(watermarkPath)) {
      // اگر فایل واترمارک موجود نبود، تصویر را بدون واترمارک ذخیره کن
      await file.mv(filePath);
    } else {
      const imageBuffer = file.data;

      // ۱) ریسایز تصویر اصلی به عرض ۱۰۲۴ پیکسل (مانند بارگذاری فله‌ای)
      const resizedImageBuffer = await sharp(imageBuffer)
        .resize(1024, undefined, { fit: "inside", withoutEnlargement: true })
        .toBuffer();

      // ۲) آماده‌سازی واترمارک با ابعاد ثابت ۲۰۰×۲۰۰ (حفظ نسبت ابعاد)
      const watermarkBuffer = await sharp(watermarkPath)
    .resize(120, 120, { fit: "inside", withoutEnlargement: true })
  .toBuffer();

      // ۳) کامپوزیت واترمارک در پایین سمت چپ (southwest)
      await sharp(resizedImageBuffer)
        .composite([{ input: watermarkBuffer, gravity: "southwest" }])
        .toFile(filePath);
    }

    const port = process.env.PORT || 5001;
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    const imageUrl = `${baseUrl}/uploads/ads/${filename}`;

    res.json({
      success: true,
      data: { url: imageUrl, filename, size: file.size },
      message: "تصویر با موفقیت آپلود شد",
    });
  } catch (error) {
    console.error("Upload image with watermark error:", error);
    res.status(500).json({ success: false, message: "خطا در آپلود تصویر" });
  }
};


export const getAds = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      city,
      district,
      minPrice,
      maxPrice,
      sortBy = "newest",
      isUrgent,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const matchStage: any = { status: "active" };

    if (category) {
      const catStr = String(category);
      if (mongoose.Types.ObjectId.isValid(catStr)) {
        matchStage.category = new mongoose.Types.ObjectId(catStr);
      } else {
        const Category = mongoose.model("Category");
        const cat = (await Category.findOne({ slug: catStr }).select(
          "_id",
        )) as any;
        if (cat && cat._id) {
          matchStage.category = cat._id;
        } else {
          return res.json({
            success: true,
            data: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              pages: 0,
            },
          });
        }
      }
    }

    if (city) matchStage.city = { $regex: new RegExp(String(city), "i") };
    if (district) matchStage.district = String(district);

    if (minPrice || maxPrice) {
      matchStage.price = {};
      if (minPrice) matchStage.price.$gte = Number(minPrice);
      if (maxPrice) matchStage.price.$lte = Number(maxPrice);
    }

    if (isUrgent === "true") matchStage.isUrgent = true;

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1, createdAt: -1 },
      price_desc: { price: -1, createdAt: -1 },
      most_viewed: { views: -1, createdAt: -1 },
      most_saved: { saves: -1, createdAt: -1 },
    };
    const sortStage = sortMap[String(sortBy)] || { createdAt: -1 };

    const [ads, total] = await Promise.all([
      Ad.find(matchStage)
        .sort(sortStage)
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar role"),
      Ad.countDocuments(matchStage),
    ]);

    const sanitizedAds = ads.map((ad) => {
      const adObj = ad.toObject();
      delete adObj.contactPhone;
      delete adObj.contactName;
      return adObj;
    });

    res.json({
      success: true,
      data: sanitizedAds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get ads error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};


// ==================== دریافت لیست آگهی‌ها ====================
export const getAdById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const ad = await Ad.findById(id)
  .populate("category", "name slug")
  .populate("userId", "firstName lastName phone isVerified role avatar") // ✅
  .lean();
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    const ownerId = (ad.userId as any)?._id || ad.userId;
    const isOwner = req.user && ownerId?.toString() === req.user._id.toString();

    if (!isOwner) {
      await Ad.findByIdAndUpdate(id, { $inc: { views: 1 } });
    }

    // ⬇️ ثبت PageView برای تحلیل رفتار
    const userId = req.user?._id || null;
    await PageView.create({
      userId,
      sessionId: req.sessionId || req.cookies?.sessionId || null,
      path: `/ad/${id}`,
      referrer: req.headers.referer || "",
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
    });
// ⬇️ ثبت بازدید باشگاه مشاور
if (!isOwner && req.user) {
  const ownerId = (ad.userId as any)?._id || ad.userId;
  const ownerAgent = await Agent.findOne({ userId: ownerId });
  if (ownerAgent) {
    await recordView(ownerAgent._id.toString(), req.user._id.toString());
  }
}
    res.json({
      success: true,
      data: {
        ...ad,
        sourceUrl: (ad as any).sourceUrl || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};


// ==================== ثبت آگهی جدید ====================
export const createAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const {
      title,
      description,
      price,
      categoryId,
      city,
      contactPhone,
      priceType = "fixed",
      adType = "sale",
      district,
      address,
      images,
      contactName,
      isUrgent = false,
      latitude,
      longitude,
      area,
      rooms,
      buildingAge,
      yearBuilt,
      parkingCount,
      amenities,
      additionalProperties,
    } = req.body;

    const missing = [
      "title",
      "description",
      "price",
      "categoryId",
      "city",
      "contactPhone",
    ].filter((f) => !req.body[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `فیلدهای زیر الزامی هستند: ${missing.join(", ")}`,
      });
    }

    const catId = String(categoryId);
    if (!mongoose.Types.ObjectId.isValid(catId)) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه دسته‌بندی معتبر نیست" });
    }

    const user = await User.findById(userId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // ✅ تشخیص کاربر VIP
    const isVipUser = user?.role === "vip";
    const vipExpiry = isVipUser
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : undefined;

    const adData = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      priceType,
      adType,
      category: catId,
      city: city.trim(),
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      district: district?.trim() || "",
      address: address?.trim() || "",
      images: images || [],
      contactPhone: contactPhone.trim(),
      contactName: contactName?.trim() || user?.firstName || "",
      isUrgent: Boolean(isUrgent),
      userId,
      status: "pending",
      source: "manual",
      sourceId: `manual_${userId.toString().slice(-6)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt,
      views: 0,
      shares: 0,
      saves: 0,
      reports: 0,
      area: area || undefined,
      rooms: rooms || undefined,
      buildingAge: buildingAge || undefined,
      yearBuilt: yearBuilt || undefined,
      parkingCount: parkingCount || undefined,
      amenities: amenities || {},
      additionalProperties: additionalProperties || [],
      // ✅ VIP خودکار برای کاربران ویژه
      isVip: isVipUser,
      vipExpiry: vipExpiry,
    };

    const ad = new Ad(adData);
    await ad.save();

    // 🆕 اعطای امتیاز ثبت آگهی
    await grantPoints(
      userId.toString(),
      LOYALTY_RULES.CREATE_AD,
      "create_ad",
      "ایجاد آگهی",
      { adId: ad._id.toString() }
    );

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.AD_CREATED,
      resource: "Ad",
      resourceId: ad._id.toString(),
      description: `آگهی «${ad.title}» توسط کاربر ${req.user?.firstName || req.user?.phone} ایجاد شد.`,
      req,
    });

    await WebhookService.dispatchEvent("ad.created", {
      adId: ad._id,
      title: ad.title,
      price: ad.price,
      userId: ad.userId,
      createdAt: ad.createdAt,
    });

    const userName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.phone ||
      userId.toString();

    // ✅ پیام مناسب برای کاربران VIP
    const successMessage = isVipUser
      ? "آگهی با موفقیت ثبت شد و به‌طور خودکار VIP شد"
      : "آگهی با موفقیت ثبت شد و در انتظار تایید است";

    await sendNotificationToUser(
      userId.toString(),
      isVipUser ? "✨ آگهی VIP شما ثبت شد" : "📋 آگهی شما ثبت شد",
      isVipUser
        ? `آگهی "${ad.title}" با موفقیت ثبت و به‌طور خودکار VIP شد.`
        : `آگهی "${ad.title}" با موفقیت ثبت شد و در انتظار بررسی است.`,
      isVipUser ? "vip_upgrade" : "ad_submitted",
      `/panel/user/my-ads`,
      { adId: ad._id.toString(), adTitle: title },
    );
    await notifyAdmins(
      isVipUser ? "✨ آگهی VIP جدید ثبت شد" : "📢 آگهی جدید در انتظار تایید",
      isVipUser
        ? `آگهی VIP "${ad.title}" توسط ${userName} ثبت شد.`
        : `آگهی "${ad.title}" توسط ${userName} ثبت شد.`,
      "new_ad_pending",
      `/admin/ads/${ad._id}`,
      { adId: ad._id.toString(), adTitle: title, userName },
    );
    await notifySuperAdmins(
      isVipUser ? "✨ آگهی VIP جدید ثبت شد" : "📢 آگهی جدید در انتظار تایید",
      isVipUser
        ? `آگهی VIP "${ad.title}" توسط ${userName} ثبت شد.`
        : `آگهی "${ad.title}" توسط ${userName} ثبت شد.`,
      "new_ad_pending",
      `/super-admin/ads/${ad._id}`,
      { adId: ad._id.toString(), adTitle: title, userName },
    );
    await notifyExperts(
      "📋 آگهی جدید برای بررسی",
      `آگهی "${ad.title}" توسط ${userName} ثبت شد.`,
      "ad_assigned",
      `/panel/expert/pending-ads/${ad._id}`,
      { adId: ad._id.toString(), adTitle: title, userName },
    );

    res.status(201).json({
      success: true,
      data: ad,
      message: successMessage,
    });
  } catch (error: any) {
    console.error("❌ Create ad error:", error);
    if (error.code === 11000)
      return res
        .status(400)
        .json({ success: false, message: "این آگهی قبلاً ثبت شده است." });
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "خطا در ایجاد آگهی" });
  }
};
// ==================== آپلود تصویر ====================
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const files = (req as any).files;
    if (!files || !files.image) {
      return res
        .status(400)
        .json({ success: false, message: "هیچ فایلی انتخاب نشده است" });
    }

    const file = files.image as any;
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.name).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (!mimetype || !extname) {
      return res
        .status(400)
        .json({ success: false, message: "فقط تصاویر مجاز هستند" });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "حجم تصویر باید کمتر از ۵ مگابایت باشد",
      });
    }

    if (!fs.existsSync(adsUploadDir)) {
      fs.mkdirSync(adsUploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name);
    const filename = `ad-${uniqueSuffix}${ext}`;
    const filePath = path.join(adsUploadDir, filename);

    const watermarkPath = path.resolve(
      process.cwd(),
      "assets",
      "watermark.png",
    );

    if (fs.existsSync(watermarkPath)) {
      const imageMetadata = await sharp(file.data).metadata();
      const imgWidth = imageMetadata.width || 800;
      const wmWidth = Math.min(500, Math.max(150, Math.floor(imgWidth * 0.35)));
    const resizedWm = await sharp(watermarkPath)
  .resize(120, 120, { fit: "inside", withoutEnlargement: true })
  .toBuffer();
      const finalBuffer = await sharp(file.data)
        .composite([{ input: resizedWm, gravity: "southwest" }])
        .toBuffer();
      fs.writeFileSync(filePath, finalBuffer);
    } else {
      await sharp(file.data).toFile(filePath);
    }

    const port = process.env.PORT || 5001;
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    const imageUrl = `${baseUrl}/uploads/ads/${filename}`;

    res.json({
      success: true,
      data: { url: imageUrl, filename, size: file.size },
      message: "تصویر با موفقیت آپلود شد",
    });
  } catch (error) {
    console.error("❌ Upload image error:", error);
    res.status(500).json({ success: false, message: "خطا در آپلود تصویر" });
  }
};

// ==================== به‌روزرسانی آگهی ====================
export const updateAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه آگهی معتبر نیست" });
    }

    const ad = await Ad.findById(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });

    if (ad.userId.toString() !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "شما اجازه ویرایش این آگهی را ندارید",
      });
    }

    const {
      userId: _u,
      source: _s,
      sourceId: _si,
      status: _st,
      ...safeBody
    } = req.body;
    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      { ...safeBody, updatedAt: new Date() },
      { new: true, runValidators: true },
    );

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: id,
      description: `کاربر ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را ویرایش کرد.`,
      metadata: { updatedFields: safeBody },
      req,
    });

    res.json({ success: true, data: updatedAd });
  } catch (error) {
    console.error("Update ad error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در به‌روزرسانی آگهی" });
  }
};

// ==================== حذف تصویر ====================
export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const filename = String(req.params.filename);
    if (!filename)
      return res
        .status(400)
        .json({ success: false, message: "نام فایل مشخص نشده است" });

    const filePath = path.join(adsUploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: "تصویر با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف تصویر" });
  }
};

// ==================== آگهی‌های کاربر ====================
export const getUserAds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = { userId };
    if (status && status !== "all") query.status = String(status);

    const skip = (Number(page) - 1) * Number(limit);
    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get user ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های کاربر" });
  }
};

// ==================== همه آگهی‌ها ====================
export const getAllAds = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, userId, search } = req.query;
    const query: any = {};
    if (status) query.status = String(status);
    if (userId) query.userId = String(userId);

    const skip = (Number(page) - 1) * Number(limit);
    let adsQuery = Ad.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("category", "name slug")
      .populate("userId", "firstName lastName phone");

    if (search && typeof search === "string")
      adsQuery = adsQuery.find({ $text: { $search: search } });

    const [ads, total] = await Promise.all([
      adsQuery,
      Ad.countDocuments(query),
    ]);
    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all ads error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

// ==================== آگهی‌های ویژه ====================
export const getSpecialAds = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, city, category } = req.query;
    const query: any = { status: "active", isUrgent: true };
    if (city) query.city = String(city);
    if (category) query.category = String(category);

    const skip = (Number(page) - 1) * Number(limit);
    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get special ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های ویژه" });
  }
};

// ==================== تغییر وضعیت توسط کاربر ====================
export const updateMyAdStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const id = String(req.params.id);
    const { status } = req.body;

    if (!["sold", "expired"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "وضعیت مجاز نیست" });
    }

    const ad = await Ad.findOne({ _id: id, userId });
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });

    const oldStatus = ad.status;
    ad.status = status;
    await ad.save();

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.AD_STATUS_CHANGED,
      resource: "Ad",
      resourceId: id,
      description: `کاربر آگهی «${ad.title}» را از «${oldStatus}» به «${status}» تغییر داد.`,
      req,
    });

    if (status === "expired") {
      await sendNotificationToUser(
        userId.toString(),
        "⏰ آگهی شما منقضی شد",
        `آگهی "${ad.title}" منقضی شده است. می‌توانید آن را تمدید کنید.`,
        "ad_expired",
        `/panel/user/my-ads`,
        { adId: ad._id.toString(), adTitle: ad.title },
      );
    }

    res.json({ success: true, data: ad, message: "وضعیت آگهی تغییر یافت" });
  } catch (error) {
    console.error("Update my ad status error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در تغییر وضعیت آگهی" });
  }
};

// ==================== تغییر وضعیت توسط ادمین ====================
export const updateAdStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const id = String(req.params.id);
    const { status, rejectReason } = req.body;

    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی به این بخش ندارید" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه آگهی معتبر نیست" });
    }

    const ad = await Ad.findById(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });

    const oldStatus = ad.status;
    ad.status = status;
    if (status === "rejected" && rejectReason) ad.rejectReason = rejectReason;
    if (status === "active") ad.verifiedAt = new Date();
    await ad.save();

    try {
      if (status === "active" && oldStatus !== "active") {
        await sendNotificationToUser(
          ad.userId.toString(),
          "✅ آگهی شما تایید شد",
          `آگهی "${ad.title}" با موفقیت تایید و منتشر شد.`,
          "ad_approved",
          `/ad/${ad._id}`,
          { adId: ad._id.toString(), adTitle: ad.title },
        );
      } else if (status === "rejected" && oldStatus !== "rejected") {
        await sendNotificationToUser(
          ad.userId.toString(),
          "❌ آگهی شما رد شد",
          `آگهی "${ad.title}" به دلیل "${rejectReason || "دلیل مشخص نشده"}" رد شد. لطفاً ویرایش کنید.`,
          "ad_rejected",
          `/panel/user/my-ads`,
          { adId: ad._id.toString(), adTitle: ad.title, reason: rejectReason },
        );
      } else if (status === "expired" && oldStatus !== "expired") {
        await sendNotificationToUser(
          ad.userId.toString(),
          "⏰ آگهی شما منقضی شد",
          `آگهی "${ad.title}" منقضی شده است. می‌توانید آن را تمدید کنید.`,
          "ad_expired",
          `/panel/user/my-ads`,
          { adId: ad._id.toString(), adTitle: ad.title },
        );
      }
    } catch (notifError) {
      console.error("❌ Notification error in updateAdStatus:", notifError);
    }

    res.json({ success: true, data: ad, message: "وضعیت آگهی تغییر یافت" });
  } catch (error) {
    console.error("Update ad status error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در بروزرسانی وضعیت آگهی" });
  }
};

export const getMyAds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });

    const ads = await Ad.find({ userId })
      .sort({ createdAt: -1 })
      .populate("category", "name")
      .lean();

    res.json({ success: true, data: ads });
  } catch (error) {
    console.error("Error in getMyAds:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

// ==================== تایید آگهی ====================
export const approveAd = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const id = String(req.params.id);

    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const ad = await Ad.findById(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    if (ad.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "آگهی قبلاً بررسی شده" });
    }

    ad.status = "active";
    ad.verifiedAt = new Date();
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_STATUS_CHANGED,
      resource: "Ad",
      resourceId: id,
      description: `${userRole === "expert" ? "کارشناس" : "ادمین"} ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را تأیید کرد.`,
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "✅ آگهی شما تأیید شد",
      `آگهی "${ad.title}" با موفقیت تأیید و منتشر شد.`,
      "ad_approved",
      `/ad/${ad._id}`,
      { adId: ad._id.toString(), adTitle: ad.title },
    );

    res.json({ success: true, data: ad, message: "آگهی تأیید شد" });
  } catch (error) {
    console.error("❌ Approve ad error:", error);
    res.status(500).json({ success: false, message: "خطا در تأیید آگهی" });
  }
};

// ==================== رد آگهی ====================
export const rejectAd = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const id = String(req.params.id);
    const { reason } = req.body;

    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const ad = await Ad.findById(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    if (ad.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "آگهی قبلاً بررسی شده" });
    }

    ad.status = "rejected";
    ad.rejectReason = reason || "دلیل مشخص نشده است";
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_STATUS_CHANGED,
      resource: "Ad",
      resourceId: id,
      description: `${userRole === "expert" ? "کارشناس" : "ادمین"} ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را رد کرد. دلیل: ${ad.rejectReason}`,
      metadata: { reason: ad.rejectReason },
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "❌ آگهی شما رد شد",
      `آگهی "${ad.title}" به دلیل "${ad.rejectReason}" رد شد. لطفاً ویرایش کنید.`,
      "ad_rejected",
      `/panel/user/my-ads`,
      { adId: ad._id.toString(), adTitle: ad.title, reason: ad.rejectReason },
    );

    res.json({ success: true, data: ad, message: "آگهی با موفقیت رد شد" });
  } catch (error) {
    console.error("Reject ad error:", error);
    res.status(500).json({ success: false, message: "خطا در رد آگهی" });
  }
};

// ==================== فیلتر پیشرفته ====================
export const filterAds = async (req: Request, res: Response) => {
  try {
    const options: any = {
      search: req.query.search,
      minPrice: req.query.minPrice
        ? parseInt(String(req.query.minPrice))
        : undefined,
      maxPrice: req.query.maxPrice
        ? parseInt(String(req.query.maxPrice))
        : undefined,
      priceType: req.query.priceType,
      adType: req.query.adType,
      category: req.query.category,
      city: req.query.city,
      district: req.query.district,
      status: req.query.status || "active",
      isUrgent:
        req.query.isUrgent === "true"
          ? true
          : req.query.isUrgent === "false"
            ? false
            : undefined,
      userId: req.query.userId,
      sortBy: req.query.sortBy,
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      limit: req.query.limit ? parseInt(String(req.query.limit)) : 20,
    };

    const result = await AdFilterService.applyFilters(Ad, options, [
      "category",
      "userId",
    ]);
    res.json({
      success: true,
      data: result.ads,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Filter ads error:", error);
    res.status(500).json({ success: false, message: "خطا در جستجوی آگهی‌ها" });
  }
};

// ==================== دسته‌بندی‌های محبوب ====================
export const getPopularCategories = async (req: Request, res: Response) => {
  try {
    const popularCategories = await Ad.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          _id: 1,
          name: "$categoryInfo.name",
          slug: "$categoryInfo.slug",
          count: 1,
        },
      },
    ]);

    res.json({ success: true, data: popularCategories });
  } catch (error) {
    console.error("Get popular categories error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت دسته‌بندی‌های محبوب" });
  }
};

// ==================== محدوده قیمت ====================
export const getPriceRangeByCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = String(req.params.categoryId);
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه دسته‌بندی معتبر نیست" });
    }

    const priceRange = await Ad.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          status: "active",
          price: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: priceRange[0] ?? {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        count: 0,
      },
    });
  } catch (error) {
    console.error("Get price range error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت محدوده قیمت" });
  }
};

// ==================== حذف اجباری ====================
export const forceDeleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const id = String(req.params.id);

    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما اجازه حذف اجباری ندارید" });
    }

    const ad = await Ad.findByIdAndDelete(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Ad",
      resourceId: id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را به‌اجبار حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "آگهی با موفقیت حذف شد" });
  } catch (error) {
    console.error("Force delete ad error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف آگهی" });
  }
};

// ==================== حذف آگهی ====================
export const deleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const id = String(req.params.id);

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه آگهی معتبر نیست" });
    }

    const ad = await Ad.findById(id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });

    const isOwner = ad.userId.toString() === userId.toString();
    const isAdmin = ["admin", "super_admin"].includes(userRole || "");

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "شما اجازه حذف این آگهی را ندارید" });
    }

    await Ad.findByIdAndDelete(id);

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Ad",
      resourceId: id,
      description: `${isAdmin ? "ادمین" : "کاربر"} ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "آگهی با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete ad error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف آگهی" });
  }
};

// ==================== ارتقا به VIP ====================
export const upgradeToVipAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { adId, duration = 30 } = req.body;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    if (!adId)
      return res
        .status(400)
        .json({ success: false, message: "شناسه آگهی الزامی است" });

    const ad = await Ad.findOne({ _id: adId, userId });
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    if (ad.isVip)
      return res
        .status(400)
        .json({ success: false, message: "این آگهی قبلاً ویژه شده است" });

    const vipExpiry = new Date();
    vipExpiry.setDate(vipExpiry.getDate() + duration);
    ad.isVip = true;
    ad.isVip = false;
    await ad.save();

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM,
      resource: "Ad",
      resourceId: adId,
      description: `کاربر آگهی «${ad.title}» را به VIP ارتقا داد.`,
      req,
    });

    await sendNotificationToUser(
      userId.toString(),
      "✨ آگهی شما ویژه شد",
      `آگهی "${ad.title}" با موفقیت ویژه شد.`,
      "vip_upgrade",
      `/ad/${adId}`,
      { adId: ad._id.toString(), adTitle: ad.title, vipExpiry },
    );

    res.json({
      success: true,
      data: { adId: ad._id, isVip: ad.isVip, vipExpiry: ad.vipExpiry },
      message: "آگهی با موفقیت ویژه شد",
    });
  } catch (error) {
    console.error("Error in upgradeToVipAd:", error);
    res.status(500).json({ success: false, message: "خطا در ویژه کردن آگهی" });
  }
};

// ==================== همه آگهی‌ها برای مدیریت ====================
export const getAllAdsForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (
      !["admin", "super_admin", "expert", "developer"].includes(userRole || "")
    ) {
      return res.status(403).json({
        success: false,
        message: `شما دسترسی به این بخش ندارید. نقش شما: ${userRole}`,
      });
    }

    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = {};

    if (userRole === "expert" && !status) {
      query.status = "pending";
    } else if (status && status !== "all") {
      query.status = String(status);
    }

    if (search && typeof search === "string" && search.trim()) {
      query.title = { $regex: search, $options: "i" };
    }

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get all ads for admin error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

// ==================== آگهی‌های در انتظار ====================
export const getPendingAds = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res.status(403).json({
        success: false,
        message: `شما دسترسی به این بخش ندارید. نقش شما: ${userRole}`,
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [ads, total] = await Promise.all([
      Ad.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments({ status: "pending" }),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get pending ads error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

// ==================== آگهی‌های در انتظار برای Expert ====================
export const getExpertPendingAds = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { status: "pending" };

    if (search && typeof search === "string" && search.trim()) {
      query.title = { $regex: search, $options: "i" };
    }

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get expert pending ads error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

// ==================== آگهی‌های تایید شده ====================
export const getApprovedAds = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی به این بخش ندارید" });
    }

    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { status: "active" };
    if (search && typeof search === "string" && search.trim())
      query.title = { $regex: search, $options: "i" };

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get approved ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های تایید شده" });
  }
};

// ==================== آگهی‌های رد شده ====================
export const getRejectedAds = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin", "expert"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی به این بخش ندارید" });
    }

    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { status: "rejected" };
    if (search && typeof search === "string" && search.trim())
      query.title = { $regex: search, $options: "i" };

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get rejected ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های رد شده" });
  }
};

// ==================== آگهی‌های تایید شده برای Expert ====================
export const getExpertApprovedAds = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (
      !["expert", "admin", "super_admin", "developer"].includes(userRole || "")
    ) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی به این بخش ندارید" });
    }

    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { status: "active" };
    if (search && typeof search === "string" && search.trim())
      query.title = { $regex: search, $options: "i" };

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get expert approved ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های تایید شده" });
  }
};

// ==================== آگهی‌های رد شده برای Expert ====================
export const getExpertRejectedAds = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (
      !["expert", "admin", "super_admin", "developer"].includes(userRole || "")
    ) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی به این بخش ندارید" });
    }

    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { status: "rejected" };
    if (search && typeof search === "string" && search.trim())
      query.title = { $regex: search, $options: "i" };

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar"),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get expert rejected ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های رد شده" });
  }
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==================== جستجوی پیشرفته (اصلاح‌شده) ====================
export const advancedSearch = async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      province,
      city,
      district,
      minPrice,
      maxPrice,
      adType,
      propertyType,
      minArea,
      maxArea,
      rooms,
      floor,
      minYearBuilt,
      maxYearBuilt,
      hasElevator,
      hasParking,
      hasStorage,
      hasBalcony,
      hasPool,
      hasSauna,
      hasImage,
      isUrgent,
      isVerified,
      sortBy,
      page,
      limit,
      area,
    } = req.query;

    // ── ۱. شرط‌های اجباری (برای همه آگهی‌ها) ──
    const requiredConditions: any[] = [{ status: "active" }];

    // ── ۲. شرط‌های متنی و موقعیتی (OR) ──
    const textSearchConditions: any[] = [];

    // ۲.۱. جستجوی آزاد (q)
    if (q && typeof q === "string" && q.trim()) {
      const safeQ = escapeRegex(q.trim());
      textSearchConditions.push(
        { title: { $regex: safeQ, $options: "i" } },
        { description: { $regex: safeQ, $options: "i" } },
      );
    }

    // ۲.۲. دسته‌بندی (category)
    if (category && typeof category === "string") {
      if (mongoose.Types.ObjectId.isValid(category) && category.length === 24) {
        requiredConditions.push({
          category: new mongoose.Types.ObjectId(category),
        });
      } else {
        const Category = mongoose.model("Category");
        const catDoc = (await Category.findOne({ slug: category }).select(
          "name _id",
        )) as any;
        if (catDoc && catDoc._id) {
          textSearchConditions.push(
            { category: catDoc._id },
            {
              categoryName: {
                $regex: new RegExp(`^${escapeRegex(catDoc.name)}$`, "i"),
              },
            },
          );
        }
      }
    }

    // ۲.۳. استان (province) – هم در فیلد province و هم city جستجو شود
    if (province && typeof province === "string" && province.trim() !== "all") {
      const safeProv = escapeRegex(province.trim());
      textSearchConditions.push(
        { province: { $regex: new RegExp(safeProv, "i") } },
        { city: { $regex: new RegExp(safeProv, "i") } },
        { address: { $regex: new RegExp(safeProv, "i") } },
        { title: { $regex: new RegExp(safeProv, "i") } },
        { description: { $regex: new RegExp(safeProv, "i") } },
        {
          "additionalProperties.value": { $regex: new RegExp(safeProv, "i") },
        },
      );
    }

    // ۲.۴. شهر (city)
    if (city && typeof city === "string" && city.trim() !== "all") {
      const safeCity = escapeRegex(city.trim());
      textSearchConditions.push(
        { city: { $regex: new RegExp(safeCity, "i") } },
        { district: { $regex: new RegExp(safeCity, "i") } },
      );
    }

    // ۲.۵. محله (district)
    if (
      district &&
      typeof district === "string" &&
      district.trim() !== "none"
    ) {
      textSearchConditions.push({
        district: { $regex: new RegExp(escapeRegex(district.trim()), "i") },
      });
    }

    // ۲.۶. نوع معامله (adType)
    if (adType && typeof adType === "string") {
      requiredConditions.push({ adType });
    }

    // ۲.۷. نوع ملک (propertyType) – گسترش‌یافته با مترادف‌های فارسی
    if (
      propertyType &&
      typeof propertyType === "string" &&
      propertyType !== "none"
    ) {
      const propTypeMap: Record<string, string[]> = {
        apartment: ["آپارتمان", "اپارتمان", "apartment", "ساختمان", "مسکونی"],
        villa: ["ویلا", "villa", "باغ ویلا", "ویلایی", "خانه ویلایی"],
        house: ["خانه", "house", "حیاط‌دار", "کلنگی"],
        land: ["زمین", "land", "قطعه", "اراضی"],
        suite: ["سوئیت", "suite", "استودیو"],
        office: ["اداری", "office", "دفتر"],
        commercial: ["تجاری", "commercial", "مغازه", "فروشگاه"],
        bare_land: ["کلنگی", "bare land", "بازسازی"],
        penthouse: ["پنت", "penthouse", "پنت‌هاوس"],
        duplex: ["دوبلکس", "duplex"],
        garden: ["باغ", "garden"],
        hotel: ["هتل", "hotel", "مهمان‌پذیر"],
      };

      const searchTerms = propTypeMap[propertyType] || [propertyType];
      const pattern = searchTerms
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      const regex = new RegExp(pattern, "i");

      textSearchConditions.push(
        { propertyType: propertyType },
        { categoryName: { $regex: regex } },
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { "additionalProperties.value": { $regex: regex } },
      );
    }

    // ── ۳. فیلترهای عددی (AND) ──
    const numericConditions: any[] = [];

    // قیمت
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      const min = Number(minPrice);
      const max = Number(maxPrice);
      if (!isNaN(min) && min > 0) priceFilter.$gte = min;
      if (!isNaN(max) && max > 0) priceFilter.$lte = max;
      if (Object.keys(priceFilter).length > 0)
        numericConditions.push({ price: priceFilter });
    }

    // متراژ
    const effectiveMinArea = minArea || area;
    if (effectiveMinArea || maxArea) {
      const areaFilter: any = {};
      const minA = Number(effectiveMinArea);
      const maxA = Number(maxArea);
      if (!isNaN(minA) && minA > 0) areaFilter.$gte = minA;
      if (!isNaN(maxA) && maxA > 0) areaFilter.$lte = maxA;
      if (Object.keys(areaFilter).length > 0)
        numericConditions.push({ area: areaFilter });
    }

    // تعداد اتاق
    if (rooms && rooms !== "any" && rooms !== "0") {
      const rn = Number(rooms);
      if (!isNaN(rn)) {
        if (rn >= 5) numericConditions.push({ rooms: { $gte: 5 } });
        else numericConditions.push({ rooms: rn });
      }
    }

    // سال ساخت / سن بنا
    if (minYearBuilt || maxYearBuilt) {
      const yf: any = {};
      const my = Number(minYearBuilt);
      const xy = Number(maxYearBuilt);
      if (!isNaN(my) && my > 0) yf.$gte = my;
      if (!isNaN(xy) && xy > 0) yf.$lte = xy;
      if (Object.keys(yf).length > 0) {
        numericConditions.push({
          $or: [{ yearBuilt: yf }, { buildingAge: yf }],
        });
      }
    }

    // ── ۴. فیلترهای Boolean (AND) ──
    const booleanConditions: any[] = [];
    if (hasElevator === "true")
      booleanConditions.push({ "amenities.elevator": true });
    if (hasParking === "true")
      booleanConditions.push({ "amenities.parking": true });
    if (hasStorage === "true")
      booleanConditions.push({ "amenities.storage": true });
    if (hasBalcony === "true")
      booleanConditions.push({ "amenities.balcony": true });
    if (hasPool === "true") booleanConditions.push({ "amenities.pool": true });
    if (hasSauna === "true")
      booleanConditions.push({ "amenities.sauna": true });
    if (hasImage === "true")
      booleanConditions.push({ images: { $exists: true, $ne: [] } });
    if (isUrgent === "true") booleanConditions.push({ isUrgent: true });
    if (isVerified === "true") booleanConditions.push({ isVerified: true });

    // ── ۵. ترکیب نهایی ──
    const andClauses: any[] = [...requiredConditions];

    if (textSearchConditions.length > 0) {
      andClauses.push({ $or: textSearchConditions });
    }
    if (numericConditions.length > 0) {
      // هر فیلتر عددی یک شرط جداگانه است → همه باید برقرار باشند
      andClauses.push(...numericConditions);
    }
    if (booleanConditions.length > 0) {
      andClauses.push(...booleanConditions);
    }

    const query = andClauses.length > 0 ? { $and: andClauses } : {};

    // 👇 لاگ کوئری نهایی برای دیباگ (می‌توانید بعداً حذف کنید)
    console.log(
      "🔎 Final query:",
      JSON.stringify(query, null, 2).slice(0, 500),
    );

    // مرتب‌سازی
    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1, createdAt: -1 },
      price_desc: { price: -1, createdAt: -1 },
      most_viewed: { views: -1, createdAt: -1 },
      most_saved: { saves: -1, createdAt: -1 },
      popular: { saves: -1, views: -1, createdAt: -1 },
    };
    const sort = sortMap[String(sortBy)] || sortMap.newest;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const AdModel = mongoose.model("Ad");
    const [ads, total] = await Promise.all([
      AdModel.find(query)
        .populate("category", "name slug")
        .populate("userId", "firstName lastName phone avatar role")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdModel.countDocuments(query),
    ]);

    const sanitizedAds = ads.map((ad: any) => {
      delete ad.contactPhone;
      delete ad.contactName;
      return ad;
    });

    res.json({
      success: true,
      data: sanitizedAds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("❌ Advanced search error:", error);
    res.status(500).json({ success: false, message: "خطا در جستجو" });
  }
};

export const getSearchFilters = async (req: Request, res: Response) => {
  try {
    const Category = mongoose.model("Category");
    const AdModel = mongoose.model("Ad");

    const allCategories = (await Category.find({
      isActive: true,
    }).lean()) as any[];

    const categoriesWithAds = await AdModel.aggregate([
      {
        $match: {
          status: "active",
          categoryName: { $exists: true, $nin: [null, ""] },
        },
      },
      { $group: { _id: "$categoryName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categoryNamesWithAds = new Set(
      categoriesWithAds.map((c: any) => c._id),
    );

    const filteredCategories = allCategories
      .filter((cat: any) => categoryNamesWithAds.has(cat.name))
      .map((cat: any) => {
        const adData = categoriesWithAds.find((ad: any) => ad._id === cat.name);
        return { ...cat, adCount: adData?.count || 0 };
      });

    const citiesWithCount = await AdModel.aggregate([
      {
        $match: { status: "active", city: { $exists: true, $nin: ["", null] } },
      },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const priceRange = await AdModel.aggregate([
      { $match: { status: "active", price: { $exists: true, $gt: 0 } } },
      {
        $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } },
      },
    ]);

    const areaRange = await AdModel.aggregate([
      { $match: { status: "active", area: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, min: { $min: "$area" }, max: { $max: "$area" } } },
    ]);

    res.json({
      success: true,
      data: {
        cities: citiesWithCount.map((c: any) => ({
          name: c._id,
          count: c.count,
        })),
        categories: filteredCategories,
        priceRange: {
          min: priceRange[0]?.min ?? 0,
          max: priceRange[0]?.max ?? 1_000_000_000,
        },
        areaRange: {
          min: areaRange[0]?.min ?? 0,
          max: areaRange[0]?.max ?? 1000,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get search filters error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت فیلترها" });
  }
};

export const getCategoryNames = async (req: Request, res: Response) => {
  try {
    const categoryNames = await Ad.distinct("categoryName", {
      status: "active",
      categoryName: { $exists: true, $nin: [null, ""] },
    });

    const filteredNames = categoryNames.filter(
      (name: string) => name && name !== "متفرقه" && name !== "سایر املاک",
    );

    const categoriesWithCount = await Ad.aggregate([
      { $match: { status: "active", categoryName: { $in: filteredNames } } },
      { $group: { _id: "$categoryName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: categoriesWithCount.map((c: any) => ({
        name: c._id,
        count: c.count,
      })),
    });
  } catch (error) {
    console.error("Get category names error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت دسته‌بندی‌ها" });
  }
};

export interface AdFilterOptions {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  priceType?: "fixed" | "negotiable" | "auction";
  adType?: "sale" | "rent" | "daily_rent" | "exchange" | "mortgage";
  category?: string;
  categories?: string[];
  city?: string;
  district?: string;
  province?: string;
  status?: "pending" | "active" | "sold" | "expired" | "rejected";
  isUrgent?: boolean;
  hasImage?: boolean;
  hasVideo?: boolean;
  userId?: string;
  isVip?: boolean;
  sortBy?:
    | "price_asc"
    | "price_desc"
    | "newest"
    | "oldest"
    | "most_viewed"
    | "most_saved";
  page?: number;
  limit?: number;
}

export class AdFilterService {
  static buildFilterQuery(options: AdFilterOptions): any {
    const filter: any = {};

    if (options.status) filter.status = options.status;

    if (options.search && options.search.trim()) {
      const safeSearch = options.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      filter.price = {};
      if (options.minPrice !== undefined) filter.price.$gte = options.minPrice;
      if (options.maxPrice !== undefined) filter.price.$lte = options.maxPrice;
    }

    if (options.priceType) filter.priceType = options.priceType;
    if (options.adType) filter.adType = options.adType;

    if (options.categories && options.categories.length > 0) {
      const objectIds = options.categories
        .filter((c) => mongoose.Types.ObjectId.isValid(c))
        .map((c) => new mongoose.Types.ObjectId(c));
      const names = options.categories.filter(
        (c) => !mongoose.Types.ObjectId.isValid(c),
      );
      const catConds: any[] = [];
      if (objectIds.length > 0) catConds.push({ category: { $in: objectIds } });
      if (names.length > 0) {
        catConds.push({
          categoryName: {
            $in: names.map(
              (n) =>
                new RegExp(
                  `^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                  "i",
                ),
            ),
          },
        });
      }
      if (catConds.length === 1) Object.assign(filter, catConds[0]);
      else if (catConds.length > 1)
        filter.$and = [...(filter.$and || []), { $or: catConds }];
    } else if (options.category) {
      if (mongoose.Types.ObjectId.isValid(options.category)) {
        filter.category = new mongoose.Types.ObjectId(options.category);
      } else {
        filter.categoryName = {
          $regex: new RegExp(
            `^${options.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        };
      }
    }

    if (options.province)
      filter.province = {
        $regex: new RegExp(
          options.province.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      };
    if (options.city)
      filter.city = {
        $regex: new RegExp(
          options.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      };
    if (options.district)
      filter.district = {
        $regex: new RegExp(
          options.district.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      };
    if (options.isUrgent !== undefined) filter.isUrgent = options.isUrgent;
    if (options.hasImage) filter.images = { $exists: true, $not: { $size: 0 } };
    if (options.hasVideo) filter.video = { $exists: true, $ne: null };
    if (options.userId) filter.userId = options.userId;
    if (options.isVip !== undefined) filter.isVip = options.isVip;

    return filter;
  }

  static buildSort(options: AdFilterOptions): any {
    switch (options.sortBy) {
      case "price_asc":
        return { price: 1, createdAt: -1 };
      case "price_desc":
        return { price: -1, createdAt: -1 };
      case "newest":
        return { createdAt: -1 };
      case "oldest":
        return { createdAt: 1 };
      case "most_viewed":
        return { views: -1, createdAt: -1 };
      case "most_saved":
        return { saves: -1, createdAt: -1 };
      default:
        return { isUrgent: -1, createdAt: -1 };
    }
  }

  static buildPagination(options: AdFilterOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  static async applyFilters(
    model: any,
    options: AdFilterOptions,
    additionalPopulate?: string[],
  ) {
    const filter = this.buildFilterQuery(options);
    const sort = this.buildSort(options);
    const { page, limit, skip } = this.buildPagination(options);

    let query = model.find(filter).sort(sort).skip(skip).limit(limit).lean();
    if (additionalPopulate && additionalPopulate.length > 0) {
      additionalPopulate.forEach((field) => {
        query = query.populate(field);
      });
    }

    const [ads, total] = await Promise.all([
      query.exec(),
      model.countDocuments(filter),
    ]);

    return {
      ads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filter: {
        applied: Object.keys(filter).filter(
          (k) => filter[k] !== undefined && filter[k] !== null,
        ),
      },
    };
  }
}

// ==================== مدیریت VIP ====================

export const activateVip = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const adId = req.params.id;
    const { durationDays = 30 } = req.body;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);

    ad.isVip = true;
    ad.vipExpiry = expiry;
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `ادمین ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را به VIP فعال کرد. مدت: ${durationDays} روز`,
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "✨ آگهی شما ویژه (VIP) شد",
      `آگهی "${ad.title}" توسط ادمین ویژه شد. تا ${expiry.toLocaleDateString("fa-IR")} فعال است.`,
      "ad_updated" as NotificationType,
      `/ad/${adId}`,
      { adId, adTitle: ad.title },
    );

    res.json({
      success: true,
      message: "VIP با موفقیت فعال شد",
      data: { isVip: ad.isVip, vipExpiry: ad.vipExpiry },
    });
  } catch (error) {
    console.error("❌ Activate VIP error:", error);
    res.status(500).json({ success: false, message: "خطا در فعال‌سازی VIP" });
  }
};

export const deactivateVip = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const adId = req.params.id;
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    ad.isVip = false;
    ad.vipExpiry = null;
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `ادمین ${req.user?.firstName || req.user?.phone} VIP آگهی «${ad.title}» را غیرفعال کرد.`,
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "⛔ VIP آگهی شما غیرفعال شد",
      `VIP آگهی "${ad.title}" توسط ادمین غیرفعال شد.`,
      "ad_updated" as NotificationType,
      `/ad/${adId}`,
      { adId, adTitle: ad.title },
    );

    res.json({
      success: true,
      message: "VIP با موفقیت غیرفعال شد",
      data: { isVip: ad.isVip, vipExpiry: ad.vipExpiry },
    });
  } catch (error) {
    console.error("❌ Deactivate VIP error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در غیرفعال‌سازی VIP" });
  }
};

export const extendVip = async (req: AuthRequest, res: Response) => {
  try {
    const adId = req.params.id;
    const { extraDays = 30 } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    const isOwner = ad.userId.toString() === userId?.toString();
    const isAdmin = ["admin", "super_admin"].includes(userRole || "");
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "شما اجازه تمدید این آگهی را ندارید",
      });
    }

    if (!ad.isVip) {
      return res
        .status(400)
        .json({ success: false, message: "این آگهی VIP نیست" });
    }

    const now = new Date();
    const currentExpiry = ad.vipExpiry || now;
    const newExpiry = new Date(
      Math.max(now.getTime(), currentExpiry.getTime()),
    );
    newExpiry.setDate(newExpiry.getDate() + extraDays);

    ad.vipExpiry = newExpiry;
    await ad.save();

    await createAuditLog({
      userId: userId?.toString() || "system",
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `${isAdmin ? "ادمین" : "کاربر"} VIP آگهی «${ad.title}» را به مدت ${extraDays} روز تمدید کرد.`,
      req,
    });

    res.json({
      success: true,
      message: "VIP با موفقیت تمدید شد",
      data: { isVip: ad.isVip, vipExpiry: ad.vipExpiry },
    });
  } catch (error) {
    console.error("❌ Extend VIP error:", error);
    res.status(500).json({ success: false, message: "خطا در تمدید VIP" });
  }
};

// ==================== مدیریت فوری (Urgent) ====================
export const activateUrgent = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const adId = req.params.id;
    const { durationDays = 7 } = req.body;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + durationDays);

    ad.isUrgent = true;
    ad.urgentExpiry = expiry;
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `ادمین ${req.user?.firstName || req.user?.phone} آگهی «${ad.title}» را به فوری فعال کرد. مدت: ${durationDays} روز`,
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "🔥 آگهی شما فوری شد",
      `آگهی "${ad.title}" توسط ادمین به حالت فوری درآمد. تا ${expiry.toLocaleDateString("fa-IR")} فعال است.`,
      "ad_updated" as NotificationType,
      `/ad/${adId}`,
      { adId, adTitle: ad.title },
    );

    res.json({
      success: true,
      message: "فوری با موفقیت فعال شد",
      data: { isUrgent: ad.isUrgent, urgentExpiry: ad.urgentExpiry },
    });
  } catch (error) {
    console.error("❌ Activate Urgent error:", error);
    res.status(500).json({ success: false, message: "خطا در فعال‌سازی فوری" });
  }
};

export const deactivateUrgent = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const adId = req.params.id;
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    ad.isUrgent = false;
    ad.urgentExpiry = null;
    await ad.save();

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `ادمین ${req.user?.firstName || req.user?.phone} فوری آگهی «${ad.title}» را غیرفعال کرد.`,
      req,
    });

    await sendNotificationToUser(
      ad.userId.toString(),
      "⛔ فوری آگهی شما غیرفعال شد",
      `حالت فوری آگهی "${ad.title}" توسط ادمین غیرفعال شد.`,
      "ad_updated" as NotificationType,
      `/ad/${adId}`,
      { adId, adTitle: ad.title },
    );

    res.json({
      success: true,
      message: "فوری با موفقیت غیرفعال شد",
      data: { isUrgent: ad.isUrgent, urgentExpiry: ad.urgentExpiry },
    });
  } catch (error) {
    console.error("❌ Deactivate Urgent error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در غیرفعال‌سازی فوری" });
  }
};

export const extendUrgent = async (req: AuthRequest, res: Response) => {
  try {
    const adId = req.params.id;
    const { extraDays = 7 } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    const isOwner = ad.userId.toString() === userId?.toString();
    const isAdmin = ["admin", "super_admin"].includes(userRole || "");
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "شما اجازه تمدید این آگهی را ندارید",
      });
    }

    if (!ad.isUrgent) {
      return res
        .status(400)
        .json({ success: false, message: "این آگهی فوری نیست" });
    }

    const now = new Date();
    const currentExpiry = ad.urgentExpiry || now;
    const newExpiry = new Date(
      Math.max(now.getTime(), currentExpiry.getTime()),
    );
    newExpiry.setDate(newExpiry.getDate() + extraDays);

    ad.urgentExpiry = newExpiry;
    await ad.save();

    await createAuditLog({
      userId: userId?.toString() || "system",
      action: AuditAction.AD_UPDATED,
      resource: "Ad",
      resourceId: adId,
      description: `${isAdmin ? "ادمین" : "کاربر"} فوری آگهی «${ad.title}» را به مدت ${extraDays} روز تمدید کرد.`,
      req,
    });

    res.json({
      success: true,
      message: "فوری با موفقیت تمدید شد",
      data: { isUrgent: ad.isUrgent, urgentExpiry: ad.urgentExpiry },
    });
  } catch (error) {
    console.error("❌ Extend Urgent error:", error);
    res.status(500).json({ success: false, message: "خطا در تمدید فوری" });
  }
};

export const getSpecialAdsForAdmin = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userRole = req.user?.role;
    if (!["admin", "super_admin"].includes(userRole || "")) {
      return res
        .status(403)
        .json({ success: false, message: "شما دسترسی ندارید" });
    }

    const { type, status, page = 1, limit = 20, search } = req.query;
    const filter: any = {};

    if (type === "vip") {
      filter.isVip = true;
      if (status === "active") {
        filter.$or = [{ vipExpiry: null }, { vipExpiry: { $gt: new Date() } }];
      } else if (status === "expired") {
        filter.vipExpiry = { $lte: new Date(), $ne: null };
      }
    } else if (type === "urgent") {
      filter.isUrgent = true;
      if (status === "active") {
        filter.$or = [
          { urgentExpiry: null },
          { urgentExpiry: { $gt: new Date() } },
        ];
      } else if (status === "expired") {
        filter.urgentExpiry = { $lte: new Date(), $ne: null };
      }
    } else {
      filter.$or = [{ isVip: true }, { isUrgent: true }];
      if (status === "active") {
        filter.$or = [
          {
            isVip: true,
            $or: [{ vipExpiry: null }, { vipExpiry: { $gt: new Date() } }],
          },
          {
            isUrgent: true,
            $or: [
              { urgentExpiry: null },
              { urgentExpiry: { $gt: new Date() } },
            ],
          },
        ];
      } else if (status === "expired") {
        filter.$or = [
          { isVip: true, vipExpiry: { $lte: new Date(), $ne: null } },
          { isUrgent: true, urgentExpiry: { $lte: new Date(), $ne: null } },
        ];
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.title = { $regex: search, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .populate("userId", "firstName lastName phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Ad.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get special ads for admin error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های ویژه" });
  }
};
// ==================== اشتراک‌گذاری آگهی ====================
export const shareAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const adId = String(req.params.id);

    if (!userId) {
      return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    await grantPointsIfNotGranted(
      userId.toString(),
      LOYALTY_RULES.SHARE,
      `share_${adId}`,
      "اشتراک‌گذاری آگهی",
      { adId }
    );

    res.json({ success: true, message: "امتیاز اشتراک‌گذاری ثبت شد" });
  } catch (error) {
    console.error("Share ad error:", error);
    res.status(500).json({ success: false, message: "خطا در ثبت اشتراک‌گذاری" });
  }
};