// backend/src/routes/super-admin.routes.ts
import { Router, Request, Response } from "express";
import {
  protect,
  hasPermission,
  superAdminOnly,
} from "../middleware/auth.middleware";
import { User } from "../models/User.model";
import { adminVerifyUser } from "../controllers/cookieAudit.controller";

import { Ad } from "../models/Ad.model";
import {
  getBackups,
  createBackup,
  deleteBackup,
  downloadBackup,
} from "../controllers/backup.controller";
import { Property } from "../models/Property.model";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller";
import { MarketPlan } from "../models/MarketPlan.model";
import mongoose from "mongoose";
import { VipPlan } from "../models/VipPlan.model";
import { SubscriptionPlan } from "../models/SubscriptionPlan.model";
import {
  getAllAdsForMap,
  getDashboardStats,
  getProvinceMapStats,
  bulkUpdateStatus as bulkUpdateMarketStatus,
  exportAdsData,
  advancedSearch,
  getProvincesList,
  getCitiesByProvince,
  getSuperAdminMapAds,
  getSuperAdminMarketAnalysis,
} from "../controllers/superAdminMarketAnalysis.controller";
import {
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/adBanner.controller";

import {
  getKeywords,
  addKeyword,
  deleteKeyword,
  toggleKeyword,
} from "../controllers/blacklistKeyword.controller";

// ========== لاگ تجاری ==========
import { createAuditLog } from "../services/auditLog.service";
import { AuditLog, AuditAction } from "../models/AuditLog.model";
import { PageView } from "../models/PageView.model";
import {
  getCookieAuditLogs,
  getCookieAuditStats,
  getDailyStats,
  getUserDetailsForAudit,
  revokeSession,
} from "../controllers/cookieAudit.controller";
import {
  getAllConversations,
  getConversationMessages,
  getChatStats,
  deleteConversationAdmin,
  deleteMessageAdmin,
} from "../controllers/conversation.controller";
import {
  getUserBehaviorReport,
  downloadBehaviorReport,
} from "../controllers/super-admin.controller";

const router = Router();

async function getDatabaseSize(): Promise<string> {
  try {
    const db = mongoose.connection.db;
    const stats = await db?.stats();
    const sizeInMB = (stats?.dataSize || 0) / 1024 / 1024;
    if (sizeInMB > 1024) return `${(sizeInMB / 1024).toFixed(1)} GB`;
    return `${Math.round(sizeInMB)} MB`;
  } catch {
    return "نامشخص";
  }
}

// ============ پلن‌ها (با لاگ) ============
router.get("/plans", protect, hasPermission("ads:read"), async (req, res) => {
  const [vip, sub] = await Promise.all([
    VipPlan.find().sort({ price: 1 }).lean(),
    SubscriptionPlan.find().sort({ price: 1 }).lean(),
  ]);
  res.json({ success: true, data: { vip, subscription: sub } });
});

// VIP
router.get(
  "/plans/vip",
  protect,
  hasPermission("ads:read"),
  async (req, res) => {
    const plans = await VipPlan.find().sort({ price: 1 }).lean();
    res.json({ success: true, data: plans });
  },
);
router.post(
  "/plans/vip",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await VipPlan.create(req.body);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "VipPlan",
      resourceId: plan._id.toString(),
      description: `سوپرادمین یک پلن VIP جدید با نام "${plan.name || plan._id}" ایجاد کرد.`,
      req,
    });
    res.status(201).json({ success: true, data: plan });
  },
);
router.put(
  "/plans/vip/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await VipPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "VipPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن VIP با شناسه ${req.params.id} را ویرایش کرد.`,
      metadata: { changes: req.body },
      req,
    });
    res.json({ success: true, data: plan });
  },
);
router.delete(
  "/plans/vip/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    await VipPlan.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "VipPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن VIP با شناسه ${req.params.id} را حذف کرد.`,
      req,
    });
    res.json({ success: true });
  },
);

// Subscription
router.get(
  "/plans/subscription",
  protect,
  hasPermission("ads:read"),
  async (req, res) => {
    const plans = await SubscriptionPlan.find().sort({ price: 1 }).lean();
    res.json({ success: true, data: plans });
  },
);
router.post(
  "/plans/subscription",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await SubscriptionPlan.create(req.body);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "SubscriptionPlan",
      resourceId: plan._id.toString(),
      description: `سوپرادمین یک پلن اشتراک جدید با نام "${(plan as any).name || plan._id}" ایجاد کرد.`,
      req,
    });
    res.status(201).json({ success: true, data: plan });
  },
);
router.put(
  "/plans/subscription/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "SubscriptionPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن اشتراک با شناسه ${req.params.id} را ویرایش کرد.`,
      metadata: { changes: req.body },
      req,
    });
    res.json({ success: true, data: plan });
  },
);
router.delete(
  "/plans/subscription/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "SubscriptionPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن اشتراک با شناسه ${req.params.id} را حذف کرد.`,
      req,
    });
    res.json({ success: true });
  },
);
// ============ Market KPI Stats (برای صفحهٔ تحلیل بازار) ============
router.get("/market-stats", superAdminOnly, async (req, res) => {
  try {
    const [total, active, pending, sold, rejected] = await Promise.all([
      Ad.countDocuments(),
      Ad.countDocuments({ status: "active" }),
      Ad.countDocuments({ status: "pending" }),
      Ad.countDocuments({ status: "sold" }),
      Ad.countDocuments({ status: "rejected" }),
    ]);

    const avgPriceAgg = await Ad.aggregate([
      { $match: { status: "active", price: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$price" } } },
    ]);
    const avgPrice = avgPriceAgg[0]?.avg || 0;

    res.json({
      success: true,
      data: {
        total,
        active,
        pending,
        sold,
        rejected,
        avgPrice,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Market Plan
router.get(
  "/plans/market",
  protect,
  hasPermission("ads:read"),
  async (req, res) => {
    const plans = await MarketPlan.find().sort({ price: 1 }).lean();
    res.json({ success: true, data: plans });
  },
);
router.post(
  "/plans/market",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await MarketPlan.create(req.body);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "MarketPlan",
      resourceId: plan._id.toString(),
      description: `سوپرادمین یک پلن تحلیل بازار جدید با نام "${plan.name || plan._id}" ایجاد کرد.`,
      req,
    });
    res.status(201).json({ success: true, data: plan });
  },
);
router.put(
  "/plans/market/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    const plan = await MarketPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "MarketPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن تحلیل بازار با شناسه ${req.params.id} را ویرایش کرد.`,
      metadata: { changes: req.body },
      req,
    });
    res.json({ success: true, data: plan });
  },
);
router.delete(
  "/plans/market/:id",
  protect,
  hasPermission("ads:write"),
  async (req, res) => {
    await MarketPlan.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "MarketPlan",
      resourceId: req.params.id,
      description: `سوپرادمین پلن تحلیل بازار با شناسه ${req.params.id} را حذف کرد.`,
      req,
    });
    res.json({ success: true });
  },
);

// ============ داشبورد ============
router.get(
  "/dashboard",
  protect,
  hasPermission("ads:read", "users:read"),
  async (req: Request, res: Response) => {
    try {
      const [
        totalUsers,
        totalAdmins,
        totalAds,
        totalProperties,
        pendingAds,
        pendingProperties,
        viewsResult,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: { $in: ["admin", "super_admin"] } }),
        Ad.countDocuments(),
        Property.countDocuments(),
        Ad.countDocuments({ status: "pending" }),
        Property.countDocuments({ status: "pending" }),
        Ad.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      ]);
      const totalViews = viewsResult[0]?.total || 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      const [usersThisMonth, usersLastMonth] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.countDocuments({
          createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
        }),
      ]);
      const monthlyGrowth =
        usersLastMonth > 0
          ? Math.round(
              ((usersThisMonth - usersLastMonth) / usersLastMonth) * 100,
            )
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
          serverUptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
          databaseSize: await getDatabaseSize(),
          monthlyGrowth,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// ============ Page Views (Traffic Logs) ============
router.get(
  "/page-views",
  protect,
  hasPermission("logs:read"),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 25,
        ip,
        path,
        sessionId,
        userId,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const filter: any = {};
      if (ip) filter.ip = { $regex: ip, $options: "i" };
      if (path) filter.path = { $regex: path, $options: "i" };
      if (sessionId) filter.sessionId = sessionId;
      if (userId) {
        if (mongoose.Types.ObjectId.isValid(userId as string))
          filter.userId = new mongoose.Types.ObjectId(userId as string);
      }
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate as string);
        if (endDate) filter.createdAt.$lte = new Date(endDate as string);
      }
      const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };
      const pipeline: any[] = [
        { $match: filter },
        { $sort: sort },
        { $skip: (+page - 1) * +limit },
        { $limit: +limit },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            ip: 1,
            path: 1,
            referrer: 1,
            sessionId: 1,
            userAgent: 1,
            createdAt: 1,
            "user._id": 1,
            "user.firstName": 1,
            "user.lastName": 1,
            "user.phone": 1,
          },
        },
      ];
      const [views, total] = await Promise.all([
        PageView.aggregate(pipeline),
        PageView.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: views,
        meta: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
      });
    } catch (error: any) {
      console.error("❌ Error in /page-views:", error);
      res
        .status(500)
        .json({ success: false, message: "خطا در دریافت لاگ ترافیک" });
    }
  },
);

// ============ بنرها ============
router.get("/banners", protect, hasPermission("ads:read"), getAllBanners);
router.post("/banners", protect, hasPermission("ads:write"), createBanner);
router.put("/banners/:id", protect, hasPermission("ads:write"), updateBanner);
router.delete(
  "/banners/:id",
  protect,
  hasPermission("ads:delete"),
  deleteBanner,
);

// ============ مدیریت ادمین‌ها (با لاگ) ============
router.get(
  "/admins",
  protect,
  hasPermission("users:read"),
  async (req, res) => {
    const admins = await User.find({
      role: { $in: ["admin", "super_admin"] },
    }).select("-password");
    res.json({ success: true, data: admins });
  },
);
router.post(
  "/admins",
  protect,
  hasPermission("users:write"),
  async (req, res) => {
    const { phone, firstName, lastName, role, nationalCode } = req.body;
    const exist = await User.findOne({ phone });
    if (exist)
      return res
        .status(400)
        .json({ success: false, message: "این شماره قبلاً ثبت شده" });
    const user = await User.create({
      phone,
      firstName,
      lastName,
      nationalCode,
      role: role || "admin",
      phoneVerified: true,
      isActive: true,
    });
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: user._id.toString(),
      description: `سوپرادمین ${req.user.firstName || req.user.phone} یک ادمین جدید با شماره ${user.phone} و نقش ${user.role} ایجاد کرد.`,
      req,
    });
    res.status(201).json({ success: true, data: user });
  },
);
router.put(
  "/admins/:id",
  protect,
  hasPermission("users:write"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password");
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین اطلاعات ادمین با شناسه ${req.params.id} را ویرایش کرد.`,
      metadata: { updatedFields: req.body },
      req,
    });
    res.json({ success: true, data: user });
  },
);
router.delete(
  "/admins/:id",
  protect,
  hasPermission("users:delete"),
  async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "ادمین یافت نشد" });
    await User.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین ادمین با شناسه ${req.params.id} (${user.phone}) را حذف کرد.`,
      req,
    });
    res.json({ success: true, message: "ادمین حذف شد" });
  },
);
router.patch(
  "/admins/:id/toggle-status",
  protect,
  hasPermission("users:ban"),
  async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false });
    user.isActive = !user.isActive;
    await user.save();
    await createAuditLog({
      userId: req.user._id.toString(),
      action: user.isActive
        ? AuditAction.ADMIN_USER_UNBAN
        : AuditAction.ADMIN_USER_BAN,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین وضعیت ادمین ${user.firstName || user.phone} را به ${user.isActive ? "فعال" : "غیرفعال"} تغییر داد.`,
      req,
    });
    res.json({ success: true, data: user });
  },
);

// ============ مدیریت کاربران (با لاگ) ============
router.get("/users", protect, hasPermission("users:read"), async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status, // "active" | "banned"
    isVerified, // "true" | "false"
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter: any = {};
  if (search) {
    filter.$or = [
      { phone: new RegExp(search as string, "i") },
      { firstName: new RegExp(search as string, "i") },
      { lastName: new RegExp(search as string, "i") },
      { email: new RegExp(search as string, "i") },
    ];
  }
  if (role && role !== "all") filter.role = role;
  if (status === "active") filter.isBanned = false;
  else if (status === "banned") filter.isBanned = true;
  if (isVerified === "true") filter.phoneVerified = true;
  else if (isVerified === "false") filter.phoneVerified = false;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }

  const sort: any = { [sortBy as string]: sortOrder === "desc" ? -1 : 1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort)
      .select("-password"),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

router.patch(
  "/users/:id/role",
  protect,
  hasPermission("users:write"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true },
    );
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین نقش کاربر با شناسه ${req.params.id} را به ${req.body.role} تغییر داد.`,
      req,
    });
    res.json({ success: true, data: user });
  },
);
router.post(
  "/users/:id/ban",
  protect,
  hasPermission("users:ban"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: req.body.reason, bannedAt: new Date() },
      { new: true },
    );
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.ADMIN_USER_BAN,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین کاربر با شناسه ${req.params.id} را مسدود کرد. دلیل: ${req.body.reason || "نامشخص"}`,
      req,
    });
    res.json({ success: true, data: user });
  },
);
router.post(
  "/users/:id/unban",
  protect,
  hasPermission("users:ban"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null, bannedAt: null },
      { new: true },
    );
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.ADMIN_USER_UNBAN,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین مسدودیت کاربر با شناسه ${req.params.id} را برداشت.`,
      req,
    });
    res.json({ success: true, data: user });
  },
);
router.delete(
  "/users/:id",
  protect,
  hasPermission("users:delete"),
  async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    await User.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "User",
      resourceId: req.params.id,
      description: `سوپرادمین کاربر با شناسه ${req.params.id} (${user.phone}) را حذف کرد.`,
      req,
    });
    res.json({ success: true, message: "کاربر حذف شد" });
  },
);

// ============ مدیریت آگهی‌ها ============
router.get("/ads", protect, hasPermission("ads:read"), async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;
  const filter: any = {};
  if (search)
    filter.$or = [
      { title: new RegExp(search as string, "i") },
      { description: new RegExp(search as string, "i") },
    ];
  if (status) filter.status = status;
  const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };
  const [ads, total] = await Promise.all([
    Ad.find(filter)
      .sort(sort)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate("userId", "firstName lastName phone")
      .lean(),
    Ad.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: ads,
    pagination: {
      page: +page,
      limit: +limit,
      total,
      pages: Math.ceil(total / +limit),
    },
  });
});
router.delete(
  "/ads/:id/force",
  protect,
  hasPermission("ads:delete"),
  async (req, res) => {
    const ad = await Ad.findById(req.params.id);
    if (!ad)
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    await Ad.findByIdAndDelete(req.params.id);
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Ad",
      resourceId: req.params.id,
      description: `سوپرادمین آگهی "${ad.title}" با شناسه ${req.params.id} را به‌اجبار حذف کرد.`,
      req,
    });
    res.json({ success: true, message: "آگهی حذف شد" });
  },
);

// ============ بکاپ‌ها (با لاگ) ============
router.get("/backups", protect, hasPermission("settings:read"), getBackups);
router.post(
  "/backups",
  protect,
  hasPermission("settings:write"),
  async (req, res) => {
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "Backup",
      description: "سوپرادمین یک بکاپ جدید ایجاد کرد.",
      req,
    });
    return createBackup(req, res);
  },
);
router.delete(
  "/backups/:filename",
  protect,
  hasPermission("settings:write"),
  async (req, res) => {
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "Backup",
      resourceId: req.params.filename,
      description: `سوپرادمین بکاپ ${req.params.filename} را حذف کرد.`,
      req,
    });
    return deleteBackup(req, res);
  },
);
router.get(
  "/backups/download/:filename",
  protect,
  hasPermission("settings:read"),
  downloadBackup,
);

// ============ تنظیمات (با لاگ) ============
router.get("/settings", protect, hasPermission("settings:read"), getSettings);
router.put(
  "/settings",
  protect,
  hasPermission("settings:write"),
  async (req, res) => {
    await createAuditLog({
      userId: req.user._id.toString(),
      action: AuditAction.SYSTEM,
      resource: "Settings",
      description: "سوپرادمین تنظیمات سیستم را تغییر داد.",
      metadata: { changes: req.body },
      req,
    });
    return updateSettings(req, res);
  },
);

// ============ Audit Logs (تجاری) ============
router.get(
  "/audit-logs",
  protect,
  hasPermission("logs:read"),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 25,
        action,
        userId,
        resource,
        resourceId,
        startDate,
        endDate,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const filter: any = {};
      if (action) filter.action = { $in: (action as string).split(",") };
      if (userId) filter.user = userId;
      if (resource) filter.resource = resource;
      if (resourceId) filter.resourceId = resourceId;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate as string);
        if (endDate) filter.createdAt.$lte = new Date(endDate as string);
      }
      if (search) filter.description = { $regex: search, $options: "i" };
      const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };
      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate("user", "firstName lastName phone role")
          .sort(sort)
          .skip((+page - 1) * +limit)
          .limit(+limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: logs,
        meta: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
          actions: Object.values(AuditAction),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "خطا در دریافت لاگ‌ها" });
    }
  },
);

// ============ تحلیل بازار ============
router.get(
  "/market-analysis/dashboard",
  protect,
  hasPermission("ads:read"),
  getDashboardStats,
);
router.get(
  "/market-analysis/map",
  protect,
  hasPermission("ads:read"),
  getAllAdsForMap,
);
router.get(
  "/market-analysis/provinces",
  protect,
  hasPermission("ads:read"),
  getProvinceMapStats,
);
router.get(
  "/market-analysis/search",
  protect,
  hasPermission("ads:read"),
  advancedSearch,
);
router.post(
  "/market-analysis/bulk-update",
  protect,
  hasPermission("ads:write"),
  bulkUpdateMarketStatus,
);
router.post(
  "/market-analysis/export",
  protect,
  hasPermission("ads:read"),
  exportAdsData,
);
router.get(
  "/market-analysis/provinces-list",
  protect,
  hasPermission("ads:read"),
  getProvincesList,
);
router.get(
  "/market-analysis/cities/:provinceSlug",
  protect,
  hasPermission("ads:read"),
  getCitiesByProvince,
);
router.get(
  "/market-analysis/analysis",
  protect,
  hasPermission("ads:read"),
  getSuperAdminMarketAnalysis,
);
router.get(
  "/market-analysis/map-ads",
  protect,
  hasPermission("ads:read"),
  getSuperAdminMapAds,
);
// مسیرهای جدید
router.get("/cookie-audits", superAdminOnly, getCookieAuditLogs);
router.get("/cookie-audits/stats", superAdminOnly, getCookieAuditStats);
router.get("/cookie-audits/daily-stats", superAdminOnly, getDailyStats);
router.post("/cookie-audits/revoke-session", superAdminOnly, revokeSession);
router.get(
  "/cookie-audits/user-details/:userId",
  superAdminOnly,
  getUserDetailsForAudit,
);
// ============ Chat Monitoring ============
router.get("/chat/conversations", superAdminOnly, getAllConversations);
router.get(
  "/chat/conversations/:id/messages",
  superAdminOnly,
  getConversationMessages,
);
router.get("/chat/stats", superAdminOnly, getChatStats);
router.delete(
  "/chat/conversations/:id",
  superAdminOnly,
  deleteConversationAdmin,
);
router.delete("/chat/messages/:id", superAdminOnly, deleteMessageAdmin);
router.patch("/users/:userId/verify", superAdminOnly, adminVerifyUser);

// ════════════ مدیریت کلمات سیاه‌لیست ════════════
router.get(
  "/blacklist-keywords",
  protect,
  hasPermission("settings:read"),
  getKeywords,
);
router.post(
  "/blacklist-keywords",
  protect,
  hasPermission("settings:write"),
  addKeyword,
);
router.delete(
  "/blacklist-keywords/:id",
  protect,
  hasPermission("settings:write"),
  deleteKeyword,
);
router.patch(
  "/blacklist-keywords/:id/toggle",
  protect,
  hasPermission("settings:write"),
  toggleKeyword,
);


// ════════════ گزارش رفتار کاربر (برای مدیر ارشد) ════════════
// backend/src/routes/super-admin.routes.ts (قسمت انتهایی)

// ════════════ گزارش رفتار کاربر (برای مدیر ارشد) ════════════
// با استفاده از superAdminOnly
router.get(
  "/user-behavior-report",
  protect,
  superAdminOnly,
  getUserBehaviorReport
);

router.post(
  "/user-behavior-report/download",
  protect,
  superAdminOnly,
  downloadBehaviorReport
);

export default router;