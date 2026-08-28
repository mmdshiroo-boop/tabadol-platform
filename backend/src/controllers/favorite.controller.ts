// backend/src/controllers/favorite.controller.ts
import { Response } from "express";
import { Favorite } from "../models/Favorite.model";
import { Ad } from "../models/Ad.model";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { grantPointsIfNotGranted } from "../services/loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
// ==================== افزودن به نشان شده‌ها ====================
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { adId } = req.body;

    if (!adId) {
      return res
        .status(400)
        .json({ success: false, message: "آیدی آگهی الزامی است" });
    }

    // بررسی وجود آگهی
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    // بررسی تکراری نبودن
    const existing = await Favorite.findOne({ userId, adId });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "این آگهی قبلاً نشان شده است" });
    }

    const favorite = await Favorite.create({ userId, adId });
// 🆕 اعطای امتیاز ذخیره آگهی (فقط یک بار برای هر آگهی)
try {
  await grantPointsIfNotGranted(
    userId.toString(),
    LOYALTY_RULES.FAVORITE,
    `favorite_${adId}`,
    "ذخیره آگهی",
    { adId }
  );
} catch (pointError) {
  console.error("Error granting points for favorite:", pointError);
}
    // ⭐ افزایش شمارنده saves در آگهی
    await Ad.findByIdAndUpdate(adId, { $inc: { saves: 1 } });

    // Audit log
    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM, // می‌توانید FAVORITE_ADDED به Enum اضافه کنید
      resource: "Favorite",
      resourceId: favorite._id.toString(),
      description: `کاربر ${req.user?.firstName || req.user?.phone} آگهی "${ad.title}" را به علاقه‌مندی‌ها اضافه کرد.`,
      metadata: { adId },
      req,
    });

    res.status(201).json({
      success: true,
      data: favorite,
      message: "آگهی به نشان شده‌ها اضافه شد",
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در افزودن به نشان شده‌ها" });
  }
};

// ==================== حذف از نشان شده‌ها ====================
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { adId } = req.params;

    const result = await Favorite.findOneAndDelete({ userId, adId });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "آگهی در نشان شده‌ها یافت نشد" });
    }

    // ⭐ کاهش شمارنده saves در آگهی (اما نه کمتر از ۰)
    await Ad.findByIdAndUpdate(adId, { $inc: { saves: -1 } });
    // Audit log
    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM, // می‌توانید FAVORITE_REMOVED به Enum اضافه کنید
      resource: "Favorite",
      description: `کاربر ${req.user?.firstName || req.user?.phone} یک آگهی را از علاقه‌مندی‌ها حذف کرد.`,
      metadata: { adId },
      req,
    });

    res.json({ success: true, message: "آگهی از نشان شده‌ها حذف شد" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در حذف از نشان شده‌ها" });
  }
};

// ==================== دریافت لیست نشان شده‌ها ====================
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const favorites = await Favorite.find({ userId })
      .populate({
        path: "adId",
        populate: { path: "category", select: "name slug" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Favorite.countDocuments({ userId });

    // استخراج آگهی‌ها از favorites
    const ads = favorites.map((fav) => fav.adId).filter(Boolean);

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
    console.error("Get favorites error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت نشان شده‌ها" });
  }
};

// ==================== بررسی اینکه آگهی نشان شده است یا نه ====================
export const checkFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { adId } = req.params;

    const favorite = await Favorite.findOne({ userId, adId });

    res.json({ success: true, isFavorited: !!favorite });
  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({ success: false, message: "خطا در بررسی نشان شده" });
  }
};
