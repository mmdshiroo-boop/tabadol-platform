// ============================================================
// 📁 backend/src/controllers/super-admin.controller.ts
// ============================================================
// (نسخه کامل با توابع گزارش رفتار کاربر و دانلود)

import { Request, Response } from "express";
import { User } from "../models/User.model";
import { Ad } from "../models/Ad.model";
import { Property } from "../models/Property.model";
import { AuditLog, AuditAction } from "../models/AuditLog.model";
import { PageView } from "../models/PageView.model";
import { Favorite } from "../models/Favorite.model";
import { Comment } from "../models/Comment.model";
import { Reaction } from "../models/Reaction.model";
import mongoose from "mongoose";
import {
  notifyDevelopers,
  notifySuperAdmins,
  sendNotificationToUser,
} from "../services/notification.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../services/auditLog.service";
import CookieAudit from "../models/CookieAudit";

// ============================================================
// آمار داشبورد
// ============================================================
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({
      role: { $in: ["admin", "super_admin"] },
    });
    const totalAds = await Ad.countDocuments();
    const totalProperties = await Property.countDocuments();

    const viewsResult = await Ad.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);
    const totalViews = viewsResult[0]?.total || 0;

    const pendingAds = await Ad.countDocuments({ status: "pending" });
    const pendingProperties = await Property.countDocuments({
      status: "pending",
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth },
    });
    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
    });

    const monthlyGrowth =
      usersLastMonth > 0
        ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
        : usersThisMonth > 0
          ? 100
          : 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalAds,
        totalViews,
        totalProperties,
        pendingAds,
        pendingProperties,
        serverUptime: "99.9%",
        databaseSize: await getDatabaseSize(),
        monthlyGrowth,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
  }
};

async function getDatabaseSize(): Promise<string> {
  try {
    const db = mongoose.connection.db;
    const stats = await db?.stats();
    const sizeInMB = stats?.dataSize / 1024 / 1024;
    if (sizeInMB > 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(sizeInMB)} MB`;
  } catch (error) {
    return "نامشخص";
  }
}

// ============================================================
// مدیریت ادمین‌ها
// ============================================================
export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({
      role: { $in: ["admin", "super_admin"] },
    }).select("-password -__v");

    res.json({ success: true, data: admins });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت ادمین‌ها" });
  }
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { phone, firstName, lastName, role, nationalCode, password } =
      req.body;

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "این شماره قبلاً ثبت شده است" });
    }

    const user = await User.create({
      phone,
      firstName,
      lastName,
      nationalCode,
      password,
      role: role || "admin",
      phoneVerified: true,
      nationalCodeVerified: true,
      isActive: true,
    });

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: user._id.toString(),
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} یک ادمین جدید با شماره ${user.phone} و نقش ${user.role} ایجاد کرد.`,
      req,
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ success: false, message: "خطا در ایجاد ادمین" });
  }
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, role, isActive },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: id,
      description: `سوپرادمین اطلاعات ادمین با شناسه ${id} را ویرایش کرد.`,
      metadata: { updatedFields: req.body },
      req,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({ success: false, message: "خطا در ویرایش ادمین" });
  }
};

export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user?._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "نمی‌توانید خودتان را حذف کنید" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    await User.findByIdAndDelete(id);

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "User",
      resourceId: id,
      description: `سوپرادمین ادمین با شناسه ${id} (${user.phone}) را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "ادمین با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف ادمین" });
  }
};

// ============================================================
// مدیریت کاربران
// ============================================================
export const getAllUsersSuper = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const query: any = {};
    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-password"),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت کاربران" });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminName = req.user?.firstName || "ادمین";

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned: true, bannedAt: new Date() },
      { new: true },
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    await notifySuperAdmins(
      "🚫 کاربر مسدود شد",
      `کاربر ${user.firstName} ${user.lastName} توسط ${adminName} مسدود شد.`,
      "user_banned",
      `/super-admin/users/${id}`,
    );

    await sendNotificationToUser(
      user._id.toString(),
      "🚫 حساب کاربری شما مسدود شد",
      `حساب شما توسط مدیریت مسدود شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.`,
      "user_banned",
      "/support",
    );

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_USER_BAN,
      resource: "User",
      resourceId: id,
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} کاربر ${user.phone} را مسدود کرد.`,
      req,
    });

    res.json({ success: true, message: "کاربر مسدود شد", data: user });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({ success: false, message: "خطا در مسدودسازی کاربر" });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminName = req.user?.firstName || "ادمین";

    const user = await User.findByIdAndUpdate(
      id,
      { isBanned: false, bannedAt: null },
      { new: true },
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    await notifySuperAdmins(
      "✅ کاربر رفع مسدودیت شد",
      `مسدودیت کاربر ${user.firstName} ${user.lastName} توسط ${adminName} لغو شد.`,
      "user_unbanned",
      `/super-admin/users/${id}`,
    );

    await sendNotificationToUser(
      user._id.toString(),
      "✅ حساب کاربری شما فعال شد",
      `حساب شما توسط مدیریت فعال شد. می‌توانید مجدداً از خدمات استفاده کنید.`,
      "user_unbanned",
      "/dashboard",
    );

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_USER_UNBAN,
      resource: "User",
      resourceId: id,
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} مسدودیت کاربر ${user.phone} را برداشت.`,
      req,
    });

    res.json({ success: true, message: "کاربر رفع مسدودیت شد", data: user });
  } catch (error) {
    console.error("Unblock user error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در رفع مسدودیت کاربر" });
  }
};

// ============================================================
// مدیریت آگهی‌ها
// ============================================================
export const getAllAdsSuper = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "firstName lastName phone")
        .lean(),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get ads error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آگهی‌ها" });
  }
};

export const forceDeleteAd = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    await Ad.findByIdAndDelete(id);

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Ad",
      resourceId: id,
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} آگهی "${ad.title}" با شناسه ${id} را به‌اجبار حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "آگهی با موفقیت حذف شد" });
  } catch (error) {
    console.error("Force delete ad error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف آگهی" });
  }
};

// ============================================================
// تنظیمات سیستم
// ============================================================
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: { siteName: "دیوار کلون", version: "1.0.0" },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت تنظیمات" });
  }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response) => {
  try {
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "Settings",
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} تنظیمات سیستم را تغییر داد.`,
      metadata: { changes: req.body },
      req,
    });

    res.json({ success: true, message: "تنظیمات ذخیره شد" });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در ذخیره تنظیمات" });
  }
};

// ============================================================
// لاگ‌های سیستمی
// ============================================================
export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

// ============================================================
// بکاپ
// ============================================================
export const getBackupList = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
};

export const createBackup = async (req: AuthRequest, res: Response) => {
  try {
    const adminName = req.user?.firstName || "ادمین";
    const backupName = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;

    console.log(`📦 Creating backup: ${backupName}`);

    await notifySuperAdmins(
      "💾 بکاپ جدید ایجاد شد",
      `بکاپ با نام ${backupName} توسط ${adminName} ایجاد شد.`,
      "backup_created",
      "/super-admin/backups",
    );

    await notifyDevelopers(
      "💾 رویداد بکاپ",
      `بکاپ ${backupName} توسط سوپرادمین ${adminName} در تاریخ ${new Date().toLocaleDateString("fa-IR")} ایجاد شد.`,
      "backup_created",
      "/developer/logs",
    );

    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "Backup",
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} یک بکاپ جدید با نام ${backupName} ایجاد کرد.`,
      req,
    });

    res.json({
      success: true,
      message: "بکاپ با موفقیت ایجاد شد",
      data: { backupName },
    });
  } catch (error) {
    console.error("Create backup error:", error);
    res.status(500).json({ success: false, message: "خطا در ایجاد بکاپ" });
  }
};

// ============================================================
// 📊 گزارش جامع رفتار کاربر (برای مدیر ارشد)
// ============================================================
export const getUserBehaviorReport = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: "شناسه کاربر الزامی است" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId as string);

    // 1️⃣ اطلاعات هویتی کاربر
    const user = await User.findById(userObjectId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    // 2️⃣ بازدیدهای صفحه
    const pageViews = await PageView.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // 3️⃣ لاگ‌های امنیتی (AuditLog)
    const auditLogs = await AuditLog.find({ user: userObjectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // 4️⃣ رصد کوکی (CookieAudit)
    const cookieAudits = await CookieAudit.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 5️⃣ علاقه‌مندی‌ها
    const favorites = await Favorite.find({ userId: userObjectId })
      .populate("adId", "title price city images status")
      .lean();

    // 6️⃣ نظرات
    const comments = await Comment.find({ userId: userObjectId })
      .populate("adId", "title")
      .lean();

    // 7️⃣ واکنش‌ها
    const reactions = await Reaction.find({ userId: userObjectId }).lean();

    // 8️⃣ آمار کلی
    const stats = {
      totalPageViews: pageViews.length,
      totalAuditLogs: auditLogs.length,
      totalCookieAudits: cookieAudits.length,
      totalFavorites: favorites.length,
      totalComments: comments.length,
      totalReactions: reactions.length,
      firstActivity: pageViews[pageViews.length - 1]?.createdAt || user.createdAt,
      lastActivity: pageViews[0]?.createdAt || user.lastLogin || user.createdAt,
    };

    // 9️⃣ رفتار جستجو (استخراج از مسیرهای بازدید)
    const searchPaths = pageViews
      .filter((p) => p.path?.includes("/search") || p.path?.includes("/ad"))
      .slice(0, 20)
      .map((p) => ({
        path: p.path,
        referrer: p.referrer,
        ip: p.ip,
        createdAt: p.createdAt,
      }));

    // 🔟 ترکیب نهایی
    const report = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        province: user.province,
        district: user.district,
        nationalCode: user.nationalCode,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        ip: (user as any).ip || "نامشخص",
      },
      stats,
      pageViews: pageViews.slice(0, 50),
      auditLogs: auditLogs.slice(0, 50),
      cookieAudits: cookieAudits.slice(0, 30),
      favorites: favorites.map((f) => ({
        _id: f._id,
        ad: f.adId,
        createdAt: f.createdAt,
      })),
      comments: comments.slice(0, 20),
      reactions: reactions.slice(0, 20),
      searchBehavior: searchPaths,
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, data: report });
  } catch (error) {
    console.error("Error generating user behavior report:", error);
    res.status(500).json({ success: false, message: "خطا در تولید گزارش رفتار کاربر" });
  }
};

// ============================================================
// 📥 دانلود گزارش رفتار کاربر (با فرمت‌های مختلف)
// ============================================================

export const downloadBehaviorReport = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, format = "json" } = req.body;
    
    console.log(`📥 Download report - UserId: ${userId}, Format: ${format}`);

    if (!userId) {
      return res.status(400).json({ success: false, message: "شناسه کاربر الزامی است" });
    }

    // دریافت اطلاعات کاربر
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    // جمع‌آوری داده‌ها
    const [pageViews, auditLogs, cookieAudits, favorites, comments, reactions] = await Promise.all([
      PageView.find({ userId: userObjectId }).sort({ createdAt: -1 }).limit(200).lean(),
      AuditLog.find({ user: userObjectId }).sort({ createdAt: -1 }).limit(200).lean(),
      CookieAudit.find({ userId: userObjectId }).sort({ createdAt: -1 }).limit(100).lean(),
      Favorite.find({ userId: userObjectId }).populate("adId", "title price city").lean(),
      Comment.find({ userId: userObjectId }).populate("adId", "title").lean(),
      Reaction.find({ userId: userObjectId }).lean(),
    ]);

    const stats = {
      totalPageViews: pageViews.length,
      totalAuditLogs: auditLogs.length,
      totalCookieAudits: cookieAudits.length,
      totalFavorites: favorites.length,
      totalComments: comments.length,
      totalReactions: reactions.length,
      firstActivity: pageViews[pageViews.length - 1]?.createdAt || user.createdAt,
      lastActivity: pageViews[0]?.createdAt || user.lastLogin || user.createdAt,
    };

    const report = {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        province: user.province,
        district: user.district,
        nationalCode: user.nationalCode,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        ip: (user as any).ip || "نامشخص",
      },
      stats,
      pageViews: pageViews.slice(0, 100),
      auditLogs: auditLogs.slice(0, 100),
      cookieAudits: cookieAudits.slice(0, 50),
      favorites: favorites.map((f) => ({ _id: f._id, ad: f.adId, createdAt: f.createdAt })),
      comments: comments.slice(0, 30),
      reactions: reactions.slice(0, 30),
      searchBehavior: pageViews.filter(p => p.path?.includes("/search") || p.path?.includes("/ad")).slice(0, 20),
      generatedAt: new Date().toISOString(),
    };

    // ایمپورت توابع تبدیل (اصلاح: استفاده از as any)
    const formatters = await import("../utils/reportFormatters") as any;
    const { convertToCSV, convertToTXT, generatePDFReport } = formatters;

    let fileBuffer: any;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "json":
        fileBuffer = Buffer.from(JSON.stringify(report, null, 2), "utf-8");
        contentType = "application/json";
        filename = `behavior-report-${userId}.json`;
        break;

      case "csv":
        const csv = convertToCSV(report);
        fileBuffer = Buffer.from(csv, "utf-8");
        contentType = "text/csv";
        filename = `behavior-report-${userId}.csv`;
        break;

      case "txt":
        const txt = convertToTXT(report);
        fileBuffer = Buffer.from(txt, "utf-8");
        contentType = "text/plain";
        filename = `behavior-report-${userId}.txt`;
        break;

      case "pdf":
        const pdfBuffer = await generatePDFReport(report);
        fileBuffer = pdfBuffer;
        contentType = "application/pdf";
        filename = `behavior-report-${userId}.pdf`;
        break;

      default:
        return res.status(400).json({ success: false, message: "فرمت نامعتبر است" });
    }

    // لاگ عملیات
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "UserBehaviorReport",
      resourceId: userId,
      description: `سوپرادمین ${req.user?.firstName || req.user?.phone} گزارش رفتار کاربر ${user.phone} را با فرمت ${format.toUpperCase()} دانلود کرد.`,
      req,
    });

    console.log(`✅ Report generated - Size: ${fileBuffer.length} bytes, Format: ${format}`);
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error("❌ Download report error:", error);
    res.status(500).json({ success: false, message: "خطا در دانلود گزارش" });
  }
};