import { Request, Response } from "express";
import { LoyaltyTier } from "../models/LoyaltyTier";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { User } from "../models/User.model";
import { PointsTransaction } from "../models/PointsTransaction";
// لیست همه سطوح
export const getTiers = async (req: AuthRequest, res: Response) => {
  try {
    const tiers = await LoyaltyTier.find().sort({ minPoints: 1 }).lean();
    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error("Get tiers error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت سطوح" });
  }
};

// ایجاد سطح جدید
export const createTier = async (req: AuthRequest, res: Response) => {
  try {
    const { name, minPoints, maxPoints, benefits, icon, color, isActive } = req.body;

    if (!name || minPoints === undefined) {
      return res.status(400).json({ success: false, message: "نام و حداقل امتیاز الزامی است" });
    }

    // بررسی تکراری بودن نام
    const existing = await LoyaltyTier.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: "سطحی با این نام وجود دارد" });
    }

    const tier = await LoyaltyTier.create({
      name,
      minPoints,
      maxPoints: maxPoints || null,
      benefits: benefits || [],
      icon,
      color,
      isActive: isActive !== undefined ? isActive : true,
    });

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM, // یا اضافه کنید
      resource: "LoyaltyTier",
      resourceId: tier._id.toString(),
      description: `سطح وفاداری "${tier.name}" توسط ${req.user?.firstName || req.user?.phone} ایجاد شد.`,
      req,
    });

    res.status(201).json({ success: true, data: tier, message: "سطح ایجاد شد" });
  } catch (error) {
    console.error("Create tier error:", error);
    res.status(500).json({ success: false, message: "خطا در ایجاد سطح" });
  }
};

// ویرایش سطح
export const updateTier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};
    const allowed = ["name", "minPoints", "maxPoints", "benefits", "icon", "color", "isActive"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const tier = await LoyaltyTier.findByIdAndUpdate(id, updateData, { new: true });
    if (!tier) {
      return res.status(404).json({ success: false, message: "سطح یافت نشد" });
    }

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "LoyaltyTier",
      resourceId: tier._id.toString(),
      description: `سطح وفاداری "${tier.name}" ویرایش شد.`,
      req,
    });

    res.json({ success: true, data: tier, message: "سطح ویرایش شد" });
  } catch (error) {
    console.error("Update tier error:", error);
    res.status(500).json({ success: false, message: "خطا در ویرایش سطح" });
  }
};

// حذف سطح
export const deleteTier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tier = await LoyaltyTier.findByIdAndDelete(id);
    if (!tier) {
      return res.status(404).json({ success: false, message: "سطح یافت نشد" });
    }

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "LoyaltyTier",
      resourceId: tier._id.toString(),
      description: `سطح وفاداری "${tier.name}" حذف شد.`,
      req,
    });

    res.json({ success: true, message: "سطح حذف شد" });
  } catch (error) {
    console.error("Delete tier error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف سطح" });
  }
};

export const adjustUserPoints = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, points, reason, description } = req.body;

    if (!userId || points === undefined || typeof points !== "number") {
      return res.status(400).json({
        success: false,
        message: "شناسه کاربر و مقدار عددی امتیاز الزامی است",
      });
    }

    if (points === 0) {
      return res.status(400).json({
        success: false,
        message: "مقدار امتیاز نمی‌تواند صفر باشد",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    user.loyaltyPoints += points;
    if (user.loyaltyPoints < 0) user.loyaltyPoints = 0;
    await user.save();

    await PointsTransaction.create({
      user: userId,
      points,
      reason: reason || "manual_adjustment",
      description: description || "تنظیم دستی امتیاز توسط ادمین",
      metadata: { adjustedBy: req.user?._id.toString() },
    });

    // به‌روزرسانی سطح کاربر (اختیاری)
    const tiers = await LoyaltyTier.find({ isActive: true }).sort({ minPoints: 1 });
    let newTier = null;
    for (const tier of tiers) {
      if (
        user.loyaltyPoints >= tier.minPoints &&
        (tier.maxPoints === null || user.loyaltyPoints <= tier.maxPoints)
      ) {
        newTier = tier;
        break;
      }
    }
    if (newTier && user.loyaltyTier?.toString() !== newTier._id.toString()) {
      user.loyaltyTier = newTier._id;
      await user.save();
    }

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "LoyaltyPoints",
      resourceId: userId,
      description: `ادمین ${req.user?.firstName || req.user?.phone} امتیاز کاربر ${user.firstName || user.phone} را ${points > 0 ? "افزایش" : "کاهش"} داد (${points} امتیاز).`,
      metadata: { points, reason: reason || "manual_adjustment" },
      req,
    });

    res.json({
      success: true,
      message: "امتیاز کاربر با موفقیت بروزرسانی شد",
      data: { userId, newPoints: user.loyaltyPoints },
    });
  } catch (error) {
    console.error("Adjust user points error:", error);
    res.status(500).json({ success: false, message: "خطا در بروزرسانی امتیاز" });
  }
};
