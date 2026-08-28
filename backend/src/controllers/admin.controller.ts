import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AdminReportService } from "../services/adminReport.service";
import { User } from "../models/User.model";
import { Ad } from "../models/Ad.model";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";

// دریافت آمار سیستم
export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await AdminReportService.getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error getting system stats:", error);
    res.status(500).json({ error: "خطا در دریافت آمار سیستم" });
  }
};

// دریافت گزارشات ذخیره شده
export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 30 } = req.query;
    const reports = await AdminReportService.getReports(Number(limit));
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({ error: "خطا در دریافت گزارشات" });
  }
};

// تولید گزارش روزانه
export const generateDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const report = await AdminReportService.generateDailyReport();

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "Report",
      description: `ادمین ${req.user?.firstName || req.user?.phone || "ناشناس"} یک گزارش روزانه جدید تولید کرد.`,
      req,
    });

    res.json({ success: true, message: "گزارش روزانه ذخیره شد", data: report });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "خطا در تولید گزارش" });
  }
};

// تغییر وضعیت کاربر (فعال/مسدود)
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isBanned, banReason } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned, banReason, bannedAt: isBanned ? new Date() : null },
      { new: true },
    );

    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: isBanned
        ? AuditAction.ADMIN_USER_BAN
        : AuditAction.ADMIN_USER_UNBAN,
      resource: "User",
      resourceId: id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} کاربر ${user.phone} را ${isBanned ? "مسدود" : "رفع مسدودیت"} کرد.${banReason ? ` دلیل: ${banReason}` : ""}`,
      req,
    });

    res.json({
      success: true,
      message: isBanned ? "کاربر مسدود شد" : "مسدودیت کاربر رفع شد",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "خطا در تغییر وضعیت کاربر" });
  }
};

// حذف کاربر
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.USER_DELETED, // یا SYSTEM
      resource: "User",
      resourceId: id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} کاربر ${user.phone} را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "کاربر با موفقیت حذف شد" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "خطا در حذف کاربر" });
  }
};

// دریافت لیست آگهی‌ها
export const getAds = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (userId) query.userId = userId;

    const skip = (Number(page) - 1) * Number(limit);
    const [ads, total] = await Promise.all([
      Ad.find(query)
        .populate("userId", "firstName lastName phone isVerified role") // ✅ isVerified اضافه شد
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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
    console.error("Error getting ads:", error);
    res.status(500).json({ error: "خطا در دریافت آگهی‌ها" });
  }
};

// تغییر وضعیت آگهی
export const updateAdStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    const ad = await Ad.findByIdAndUpdate(
      id,
      { status, rejectReason },
      { new: true },
    );
    if (!ad) return res.status(404).json({ error: "آگهی یافت نشد" });

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.AD_STATUS_CHANGED,
      resource: "Ad",
      resourceId: id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} وضعیت آگهی "${ad.title}" را به "${status}" تغییر داد.${rejectReason ? ` دلیل: ${rejectReason}` : ""}`,
      req,
    });

    res.json({ success: true, message: "وضعیت آگهی به‌روزرسانی شد", data: ad });
  } catch (error) {
    console.error("Error updating ad status:", error);
    res.status(500).json({ error: "خطا در تغییر وضعیت آگهی" });
  }
};

// حذف آگهی
export const deleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) return res.status(404).json({ error: "آگهی یافت نشد" });

    // Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Ad",
      resourceId: id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} آگهی "${ad.title}" را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "آگهی با موفقیت حذف شد" });
  } catch (error) {
    console.error("Error deleting ad:", error);
    res.status(500).json({ error: "خطا در حذف آگهی" });
  }
};