// backend/src/routes/admin.routes.ts
import { Router } from "express";
import {
  protect,
  hasPermission,
  requireRole,
} from "../middleware/auth.middleware";
import {
  downloadExcelReport,
  downloadPdfReport,
} from "../controllers/adminReport.controller";
import { AdminReport } from "../models/AdminReport.model";
import { Ad, Property, Report, User } from "../models";
import Role from "../models/Role";

const router = Router();

// همه مسیرها نیاز به ورود دارند
router.use(protect);

// ============ آمار داشبورد ادمین ============
router.get(
  "/stats",
  hasPermission("ads:read", "users:read"),
  async (req, res) => {
    try {
      const [
        totalUsers,
        totalAds,
        totalProperties,
        totalReports,
        pendingAds,
        pendingProperties,
      ] = await Promise.all([
        User.countDocuments(),
        Ad.countDocuments(),
        Property.countDocuments(),
        Report.countDocuments(),
        Ad.countDocuments({ status: "pending" }),
        Property.countDocuments({ status: "pending" }),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayAds, todayUsers] = await Promise.all([
        Ad.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ createdAt: { $gte: today } }),
      ]);

      const usersByRole = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]);

      const adsByStatus = await Ad.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: await User.countDocuments({ isActive: true }),
            banned: await User.countDocuments({ isBanned: true }),
            byRole: {
              user: usersByRole.find((u) => u._id === "user")?.count || 0,
              vip: usersByRole.find((u) => u._id === "vip")?.count || 0,
              agent: usersByRole.find((u) => u._id === "agent")?.count || 0,
              expert: usersByRole.find((u) => u._id === "expert")?.count || 0,
              admin: usersByRole.find((u) => u._id === "admin")?.count || 0,
              super_admin:
                usersByRole.find((u) => u._id === "super_admin")?.count || 0,
              developer:
                usersByRole.find((u) => u._id === "developer")?.count || 0,
            },
          },
          ads: {
            total: totalAds,
            active: adsByStatus.find((a) => a._id === "active")?.count || 0,
            pending: pendingAds,
            rejected: adsByStatus.find((a) => a._id === "rejected")?.count || 0,
          },
          properties: {
            total: totalProperties,
            pending: pendingProperties,
          },
          reports: {
            total: totalReports,
          },
          today: {
            ads: todayAds,
            users: todayUsers,
          },
        },
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
    }
  },
);

router.get(
  "/stats/analytics",
  protect,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const labels: string[] = [];
      const usersData: number[] = [];
      const adsData: number[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        labels.push(
          start.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
        );

        const [usersCount, adsCount] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          Ad.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        ]);
        usersData.push(usersCount);
        adsData.push(adsCount);
      }

      res.json({
        success: true,
        data: {
          labels,
          users: usersData,
          ads: adsData,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "خطا در دریافت داده‌های تحلیلی" });
    }
  },
);

// ============ مدیریت کاربران ============
router.get("/users", hasPermission("users:read"), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const query: any = {};

    if (role) query.role = role;
    if (status === "active") query.isActive = true;
    if (status === "banned") query.isBanned = true;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-password"),
      User.countDocuments(query),
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
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "خطا در دریافت کاربران" });
  }
});

router.put(
  "/users/:id/status",
  hasPermission("users:ban"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isBanned, banReason } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { isBanned, banReason, bannedAt: isBanned ? new Date() : null },
        { new: true },
      ).select("-password");

      if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });

      res.json({
        success: true,
        message: isBanned ? "کاربر مسدود شد" : "مسدودیت کاربر رفع شد",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "خطا در تغییر وضعیت کاربر" });
    }
  },
);

router.delete("/users/:id", hasPermission("users:delete"), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: "کاربر یافت نشد" });
    res.json({ success: true, message: "کاربر با موفقیت حذف شد" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "خطا در حذف کاربر" });
  }
});

// ============ مدیریت آگهی‌ها ============
router.get("/ads", hasPermission("ads:read"), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (userId) query.userId = userId;

    const skip = (Number(page) - 1) * Number(limit);
    const [ads, total] = await Promise.all([
      Ad.find(query)
        .populate("userId", "firstName lastName phone")
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
});

router.put(
  "/ads/:id/status",
  hasPermission("ads:approve"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectReason } = req.body;

      const ad = await Ad.findByIdAndUpdate(
        id,
        { status, rejectReason },
        { new: true },
      );
      if (!ad) return res.status(404).json({ error: "آگهی یافت نشد" });

      res.json({
        success: true,
        message: "وضعیت آگهی به‌روزرسانی شد",
        data: ad,
      });
    } catch (error) {
      console.error("Error updating ad status:", error);
      res.status(500).json({ error: "خطا در تغییر وضعیت آگهی" });
    }
  },
);

router.delete("/ads/:id", hasPermission("ads:delete"), async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) return res.status(404).json({ error: "آگهی یافت نشد" });
    res.json({ success: true, message: "آگهی با موفقیت حذف شد" });
  } catch (error) {
    console.error("Error deleting ad:", error);
    res.status(500).json({ error: "خطا در حذف آگهی" });
  }
});

// ============ مدیریت نقش‌ها ============
// مسیرهای نقش‌ها مستقیماً در admin routes با مجوز users:read
router.get("/roles", protect, async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).lean();
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت نقش‌ها" });
  }
});

router.put("/roles/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      id,
      { permissions },
      { new: true },
    ).lean();
    if (!role)
      return res.status(404).json({ success: false, message: "نقش یافت نشد" });
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در بروزرسانی نقش" });
  }
});

// ============ گزارشات ============
router.get("/reports", hasPermission("reports:read"), async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const reports = await AdminReport.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error("Error getting reports:", error);
    res.status(500).json({ error: "خطا در دریافت گزارشات" });
  }
});

router.post(
  "/reports/daily",
  hasPermission("reports:handle"),
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await AdminReport.deleteMany({ type: "daily", "period.start": today });

      const [users, ads, usersByRole, adsByStatus] = await Promise.all([
        User.countDocuments(),
        Ad.countDocuments(),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        Ad.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

      const report = new AdminReport({
        type: "daily",
        period: { start: today, end: tomorrow },
        stats: {
          users: {
            total: users,
            active: await User.countDocuments({ isActive: true }),
            banned: await User.countDocuments({ isBanned: true }),
            byRole: {
              user: usersByRole.find((u) => u._id === "user")?.count || 0,
              vip: usersByRole.find((u) => u._id === "vip")?.count || 0,
              agent: usersByRole.find((u) => u._id === "agent")?.count || 0,
              expert: usersByRole.find((u) => u._id === "expert")?.count || 0,
              admin: usersByRole.find((u) => u._id === "admin")?.count || 0,
              super_admin:
                usersByRole.find((u) => u._id === "super_admin")?.count || 0,
              developer:
                usersByRole.find((u) => u._id === "developer")?.count || 0,
            },
          },
          ads: {
            total: ads,
            active: adsByStatus.find((a) => a._id === "active")?.count || 0,
            pending: adsByStatus.find((a) => a._id === "pending")?.count || 0,
            rejected: adsByStatus.find((a) => a._id === "rejected")?.count || 0,
          },
          revenue: { total: 0 },
        },
      });

      await report.save();
      res.json({
        success: true,
        message: "گزارش روزانه ذخیره شد",
        data: report,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "خطا در تولید گزارش" });
    }
  },
);

// ==================== گزارشات Excel و PDF ====================
router.get(
  "/reports/excel",
  protect,
  requireRole("admin", "super_admin"),
  downloadExcelReport,
);
router.get(
  "/reports/pdf",
  protect,
  requireRole("admin", "super_admin"),
  downloadPdfReport,
);

export default router;
