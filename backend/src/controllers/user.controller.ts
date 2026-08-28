// backend/src/controllers/user.controller.ts
import { Request, Response } from "express";
import { User } from "../models/User.model";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth.middleware";
import { Ad } from "../models/Ad.model";
import bcrypt from "bcryptjs";
import {
  sendNotificationToUser,
  notifyAdmins,
  notifySuperAdmins,
} from "../services/notification.service";
import mongoose from "mongoose";
import { Block } from "../models/Block.model";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { applyReferralCode, generateReferralCode, grantPointsIfNotGranted } from "../services/loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
import { Follow } from "../models/Follow.model";
import { addMemberByUserId } from "../services/agentClub.service";
import { Agent } from "../models/Agent.model";
// ==================== احراز هویت ====================

// ثبت‌نام کاربر جدید (از طریق فرم معمولی - در صورت استفاده)
export const register = async (req: Request, res: Response) => {
  try {
    const {
      phone,
      nationalCode,
      password,
      firstName,
      lastName,
      referralCode, // کد معرف
    } = req.body;

    // بررسی تکراری بودن کاربر
    const existingUser = await User.findOne({
      $or: [{ phone }, { nationalCode }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "کاربر قبلاً ثبت نام کرده است" });
    }

    // ایجاد کاربر جدید
    const user = new User({
      phone,
      nationalCode,
      password,
      firstName,
      lastName,
    });

    await user.save();

    // تولید کد معرف یکتا برای کاربر جدید
    user.referralCode = await generateReferralCode();
    await user.save();

    // اعطای امتیاز ثبت‌نام
    await grantPointsIfNotGranted(
      user._id.toString(),
      LOYALTY_RULES.REGISTRATION,
      "registration",
      "امتیاز ثبت‌نام"
    );

    // اگر کد معرف وارد شده باشد، آن را اعمال کن
    if (referralCode) {
      try {
        await applyReferralCode(user._id.toString(), referralCode);
      } catch (err: any) {
        console.log("Invalid referral code:", err.message);
      }

      // 🆕 افزودن خودکار کاربر به باشگاه مشاور معرف
      const referrer = await User.findOne({
        referralCode: referralCode.toUpperCase(),
      });
      if (referrer && referrer.role === "agent") {
        const agent = await Agent.findOne({ userId: referrer._id });
        if (agent) {
          try {
            await addMemberByUserId(agent._id.toString(), user._id.toString());
            console.log(`✅ کاربر ${user.phone} به باشگاه مشاور ${agent.firstName} اضافه شد`);
          } catch (err) {
            console.error("❌ افزودن به باشگاه ناموفق:", err);
          }
        }
      }
    }

    // ساخت توکن
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    // اطلاع‌رسانی به ادمین‌ها
    await notifyAdmins(
      "👤 کاربر جدید ثبت‌نام کرد",
      `کاربر جدید با شماره ${phone} در سایت ثبت‌نام کرد.`,
      "new_user",
      `/admin/users/${user._id}`,
      { userId: user._id, userPhone: phone },
    );
    await notifySuperAdmins(
      "👤 کاربر جدید ثبت‌نام کرد",
      `کاربر جدید با شماره ${phone} در سایت ثبت‌نام کرد.`,
      "new_user",
      `/super-admin/users/${user._id}`,
      { userId: user._id, userPhone: phone },
    );

    // لاگ تجاری
    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.USER_REGISTER,
      resource: "User",
      resourceId: user._id.toString(),
      description: `کاربری با شماره ${phone} ثبت‌نام کرد.`,
      req,
    });

    // پاسخ نهایی
    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "خطا در ثبت‌نام" });
  }
};

// ورود کاربر (در صورت استفاده از رمز عبور)
export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    // لاگ تجاری: ورود کاربر
    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.USER_LOGIN,
      resource: "User",
      resourceId: user._id.toString(),
      description: `کاربر با شماره ${phone} وارد حساب کاربری خود شد.`,
      req,
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "خطا در ورود" });
  }
};

// ==================== دریافت پروفایل ====================
export const getProfile = async (req: AuthRequest, res: Response) => {
  // ... (بدون تغییر – خواندنی)
  try {
    const userId = req.user?._id;

    const [user, stats] = await Promise.all([
      User.findById(userId).select("-password -refreshToken"),
      Ad.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalAds: { $sum: 1 },
            totalViews: { $sum: "$views" },
          },
        },
      ]),
    ]);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    const userStats = stats[0] || { totalAds: 0, totalViews: 0 };

    const userObj = user.toObject();
    if (!userObj.avatar) {
      userObj.avatar = "/uploads/avatars/user.webp";
    }

    res.json({
      success: true,
      data: {
        ...userObj,
        adsCount: userStats.totalAds,
        totalViews: userStats.totalViews,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت پروفایل" });
  }
};

// ==================== ویرایش پروفایل ====================
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      province,
      city,
      district,
      agencyName,
      nationalCode, // اگر در فرم وجود داشته باشد
    } = req.body;

    // فقط فیلدهایی که واقعاً ارسال شده‌اند را در updateData قرار می‌دهیم
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (province !== undefined) updateData.province = province;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (agencyName !== undefined) updateData.agencyName = agencyName;
    if (nationalCode !== undefined) updateData.nationalCode = nationalCode;

    const user = await User.findByIdAndUpdate(req.user?._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    // 🆕 اعطای امتیاز تکمیل پروفایل (فقط یک بار)
    const isProfileComplete =
      user.firstName && user.lastName && user.email &&
      user.province && user.city && user.district;

    if (isProfileComplete) {
      await grantPointsIfNotGranted(
        req.user?._id.toString(),
        LOYALTY_RULES.COMPLETE_PROFILE,
        "complete_profile",
        "تکمیل پروفایل"
      );
    }

    // لاگ تجاری: ویرایش پروفایل
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.USER_UPDATE_PROFILE,
      resource: "User",
      resourceId: req.user?._id.toString(),
      description: `کاربر ${user.firstName || user.phone} پروفایل خود را ویرایش کرد.`,
      metadata: { updatedFields: req.body },
      req,
    });

    res.json({
      success: true,
      data: user,
      message: "پروفایل با موفقیت به‌روزرسانی شد",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در به‌روزرسانی پروفایل" });
  }
};

// ==================== تغییر رمز عبور ====================
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "احراز هویت نشده" });
    }

    // پشتیبانی از هر دو نام فیلد (قدیمی: oldPassword، جدید: currentPassword)
    const oldPassword = req.body.oldPassword || req.body.currentPassword;
    const { newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "لطفاً رمز عبور فعلی و جدید را وارد کنید",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "حساب شما فاقد رمز عبور است. لطفاً از گزینه فراموشی رمز استفاده کنید.",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "رمز عبور فعلی اشتباه است",
      });
    }

    user.password = newPassword;
    await user.save();

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.USER_CHANGE_PASSWORD,
      resource: "User",
      resourceId: userId.toString(),
      description: `کاربر ${user.firstName || user.phone} رمز عبور خود را تغییر داد.`,
      req,
    });

    return res.json({ success: true, message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (error: any) {
    console.error("❌ Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "خطایی رخ داده است. لطفاً دوباره تلاش کنید.",
    });
  }
};

// ==================== دریافت همه کاربران (فقط ادمین) ====================
export const getAllUsers = async (req: Request, res: Response) => {
  // خواندنی – بدون لاگ
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;

    const query: any = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    if (search) {
      query.$or = [
        { phone: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -refreshToken")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
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
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت کاربران" });
  }
};

// ==================== دریافت کاربر با آیدی (فقط ادمین) ====================
export const getUserById = async (req: Request, res: Response) => {
  // خواندنی
  try {
    const user = await User.findById(req.params.id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user by id error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت کاربر" });
  }
};

// ==================== تغییر نقش کاربر (فقط ادمین) ====================
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = [
      "user",
      "vip",
      "agent",
      "developer",
      "expert",
      "admin",
      "super_admin",
    ];

    if (!validRoles.includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "نقش نامعتبر است" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    // لاگ تجاری: تغییر نقش (ادمین)
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_ROLE_CHANGE,
      resource: "User",
      resourceId: req.params.id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} نقش کاربر ${user.phone} را به ${role} تغییر داد.`,
      req,
    });

    res.json({
      success: true,
      data: user,
      message: `نقش کاربر به ${role} تغییر یافت`,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ success: false, message: "خطا در تغییر نقش کاربر" });
  }
};

// ==================== مسدود کردن کاربر (فقط ادمین) ====================
export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { banReason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, isActive: false, banReason, bannedAt: new Date() },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    // لاگ تجاری: مسدود کردن کاربر (ادمین)
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_USER_BAN,
      resource: "User",
      resourceId: req.params.id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} کاربر ${user.phone} را مسدود کرد. دلیل: ${banReason || "نامشخص"}`,
      req,
    });

    res.json({ success: true, data: user, message: "کاربر مسدود شد" });
  } catch (error) {
    console.error("Ban user error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در مسدود کردن کاربر" });
  }
};

// ==================== رفع مسدودیت کاربر (فقط ادمین) ====================
export const unbanUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, isActive: true, banReason: null, bannedAt: null },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    // لاگ تجاری: رفع مسدودیت (ادمین)
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.ADMIN_USER_UNBAN,
      resource: "User",
      resourceId: req.params.id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} مسدودیت کاربر ${user.phone} را برداشت.`,
      req,
    });

    res.json({ success: true, data: user, message: "کاربر فعال شد" });
  } catch (error) {
    console.error("Unban user error:", error);
    res.status(500).json({ success: false, message: "خطا در فعال کردن کاربر" });
  }
};
// ==================== آمار کاربر ویژه (VIP) ====================
export const getVipStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const allAds = await Ad.find({ userId });
    const totalAds = allAds.length;
    const vipAds = allAds.filter((ad) => ad.isVip === true);
    const vipAdsCount = vipAds.length;
    const vipAdViews = vipAds.reduce((sum, ad) => sum + (ad.views || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayViews = allAds.reduce((sum, ad) => {
      if (ad.createdAt && new Date(ad.createdAt) >= today) {
        return sum + (ad.views || 0);
      }
      return sum;
    }, 0);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekViews = allAds.reduce((sum, ad) => {
      if (
        ad.createdAt &&
        new Date(ad.createdAt) >= lastWeek &&
        new Date(ad.createdAt) < today
      ) {
        return sum + (ad.views || 0);
      }
      return sum;
    }, 0);

    const weeklyGrowth =
      lastWeekViews > 0
        ? Math.round(((todayViews - lastWeekViews) / lastWeekViews) * 100)
        : todayViews > 0
          ? 100
          : 0;

    const Favorite = mongoose.model("Favorite");
    const savedAdsCount = await Favorite.countDocuments({ userId });
    const lastWeekSaved = await Favorite.countDocuments({
      userId,
      createdAt: { $gte: lastWeek, $lt: today },
    });
    const savedIncrease =
      lastWeekSaved > 0
        ? Math.round(((savedAdsCount - lastWeekSaved) / lastWeekSaved) * 100)
        : savedAdsCount > 0
          ? 100
          : 0;

    const allVipUsers = await User.find({ role: "vip" }).select("_id");
    const vipUsersWithAds = await Promise.all(
      allVipUsers.map(async (user) => ({
        userId: user._id,
        vipCount: await Ad.countDocuments({ userId: user._id, isVip: true }),
      })),
    );
    const sorted = vipUsersWithAds.sort((a, b) => b.vipCount - a.vipCount);
    const rank =
      sorted.findIndex((u) => u.userId.toString() === userId.toString()) + 1;

    res.json({
      success: true,
      data: {
        totalAds,
        totalViews: allAds.reduce((sum, ad) => sum + (ad.views || 0), 0),
        vipAdsCount,
        vipAdViews,
        dailyViews: todayViews,
        weeklyGrowth,
        savedAds: savedAdsCount,
        savedIncrease,
        rank: rank || 0,
      },
    });
  } catch (error) {
    console.error("Error in getVipStats:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
  }
};

// ==================== آمار پیشرفته VIP (نمودار) ====================
export const getVipAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { period = "weekly" } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const userAds = await Ad.find({ userId });
    const totalViews = userAds.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const averageViews =
      userAds.length > 0 ? Math.round(totalViews / userAds.length) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const currentWeekViews = userAds.reduce((sum, ad) => {
      if (ad.createdAt && new Date(ad.createdAt) >= lastWeek) {
        return sum + (ad.views || 0);
      }
      return sum;
    }, 0);

    const previousWeekViews = userAds.reduce((sum, ad) => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      if (
        ad.createdAt &&
        new Date(ad.createdAt) >= twoWeeksAgo &&
        new Date(ad.createdAt) < lastWeek
      ) {
        return sum + (ad.views || 0);
      }
      return sum;
    }, 0);

    const growth =
      previousWeekViews > 0
        ? Math.round(
            ((currentWeekViews - previousWeekViews) / previousWeekViews) * 100,
          )
        : 0;

    let daily: { date: string; views: number }[] = [];
    if (period === "daily") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayViews = userAds.reduce((sum, ad) => {
          if (
            ad.createdAt &&
            new Date(ad.createdAt) >= date &&
            new Date(ad.createdAt) < nextDate
          ) {
            return sum + (ad.views || 0);
          }
          return sum;
        }, 0);

        daily.push({
          date: date.toLocaleDateString("fa-IR"),
          views: dayViews,
        });
      }
    }

    let weekly: { week: string; views: number }[] = [];
    if (period === "weekly") {
      for (let i = 4; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const weekViews = userAds.reduce((sum, ad) => {
          if (
            ad.createdAt &&
            new Date(ad.createdAt) >= start &&
            new Date(ad.createdAt) < end
          ) {
            return sum + (ad.views || 0);
          }
          return sum;
        }, 0);

        weekly.push({
          week: `هفته ${4 - i + 1}`,
          views: weekViews,
        });
      }
    }

    let monthly: { month: string; views: number }[] = [];
    if (period === "monthly") {
      const months = [
        "فروردین",
        "اردیبهشت",
        "خرداد",
        "تیر",
        "مرداد",
        "شهریور",
        "مهر",
        "آبان",
        "آذر",
        "دی",
        "بهمن",
        "اسفند",
      ];
      const currentMonth = new Date().getMonth();

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const start = new Date();
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const monthViews = userAds.reduce((sum, ad) => {
          if (
            ad.createdAt &&
            new Date(ad.createdAt) >= start &&
            new Date(ad.createdAt) < end
          ) {
            return sum + (ad.views || 0);
          }
          return sum;
        }, 0);

        monthly.push({
          month: months[monthIndex],
          views: monthViews,
        });
      }
    }

    const topAds = userAds
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((ad) => ({
        title: ad.title,
        views: ad.views || 0,
      }));

    res.json({
      success: true,
      data: {
        daily: period === "daily" ? daily : [],
        weekly: period === "weekly" ? weekly : [],
        monthly: period === "monthly" ? monthly : [],
        totalViews,
        averageViews,
        growth,
        topAds,
      },
    });
  } catch (error) {
    console.error("Error in getVipAnalytics:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
  }
};
// ==================== حذف کاربر (فقط ادمین) ====================
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    await User.findByIdAndDelete(req.params.id);

    // لاگ تجاری: حذف کاربر (ادمین)
    await createAuditLog({
      userId: req.user?._id.toString(),
      action: AuditAction.USER_DELETED, // از Enum جدید استفاده کنید یا SYSTEM
      resource: "User",
      resourceId: req.params.id,
      description: `ادمین ${req.user?.firstName || req.user?.phone} کاربر ${user.phone} را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "کاربر حذف شد" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف کاربر" });
  }
};

// ==================== آمار کاربر ویژه (VIP) ====================
// (بدون تغییر – توابع getVipStats, getVipAnalytics)

// ==================== ارتقا آگهی به ویژه (VIP) ====================
export const upgradeToVipAd = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { adId, duration = 30 } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    if (!adId) {
      return res
        .status(400)
        .json({ success: false, message: "شناسه آگهی الزامی است" });
    }

    const ad = await Ad.findOne({ _id: adId, userId });
    if (!ad) {
      return res.status(404).json({ success: false, message: "آگهی یافت نشد" });
    }

    if (ad.isVip) {
      return res
        .status(400)
        .json({ success: false, message: "این آگهی قبلاً ویژه شده است" });
    }

    const vipExpiry = new Date();
    vipExpiry.setDate(vipExpiry.getDate() + duration);

    ad.isVip = true;
    ad.vipExpiry = vipExpiry;
    await ad.save();

    await sendNotificationToUser(
      userId.toString(),
      "✨ آگهی شما ویژه شد",
      `آگهی "${ad.title}" با موفقیت ویژه شد و تا ${vipExpiry.toLocaleDateString("fa-IR")} در نتایج برجسته نمایش داده می‌شود.`,
      "vip_upgrade",
      `/ad/${adId}`,
      { adId: ad._id.toString(), adTitle: ad.title, vipExpiry },
    );

    await notifyAdmins(
      "✨ آگهی ویژه جدید",
      `آگهی "${ad.title}" توسط کاربر ویژه به سطح VIP ارتقا یافت.`,
      "vip_upgrade",
      `/admin/ads/${adId}`,
    );

    // لاگ تجاری: ارتقا آگهی به ویژه
    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM, // می‌توانید AD_VIP_UPGRADE به Enum اضافه کنید
      resource: "Ad",
      resourceId: ad._id.toString(),
      description: `کاربر ${req.user?.firstName || req.user?.phone} آگهی "${ad.title}" را به VIP ارتقا داد.`,
      req,
    });

    res.json({
      success: true,
      data: {
        adId: ad._id,
        isVip: ad.isVip,
        vipExpiry: ad.vipExpiry,
      },
      message: "آگهی با موفقیت ویژه شد",
    });
  } catch (error) {
    console.error("Error in upgradeToVipAd:", error);
    res.status(500).json({ success: false, message: "خطا در ویژه کردن آگهی" });
  }
};

// ==================== دریافت آگهی‌های کاربری (جدید) ====================
export const getMyAds = async (req: AuthRequest, res: Response) => {
  // ... بدون تغییر
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const ads = await Ad.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ads,
    });
  } catch (error) {
    console.error("Get my ads error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت آگهی‌های کاربر" });
  }
};

// ==================== احراز هویت واقعی شاهکار (جدید) ====================
export const verifyIdentity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { nationalCode } = req.body;

    if (!nationalCode || nationalCode.length !== 10) {
      return res
        .status(400)
        .json({ success: false, message: "کد ملی معتبر نیست" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        nationalCode,
        isVerified: true,
        nationalCodeVerified: true,
      },
      { new: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    // لاگ تجاری: احراز هویت
    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.USER_UPDATE_PROFILE,
      resource: "User",
      resourceId: userId.toString(),
      description: `کاربر ${user.firstName || user.phone} احراز هویت خود را تکمیل کرد.`,
      req,
    });

    res.json({
      success: true,
      isVerified: true,
      message: "احراز هویت با موفقیت در دیتابیس ثبت شد",
    });
  } catch (error) {
    console.error("Verify identity error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در فرآیند احراز هویت" });
  }
};

/**
 * دریافت پروفایل عمومی کاربر (بدون نیاز به احراز هویت)
 * GET /api/users/public/:id
 */
export const getPublicProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select("firstName lastName avatar phone email role isVerified rating createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    const [activeAdsCount, recentAds, followers, following] = await Promise.all([
      Ad.countDocuments({ userId, status: "active" }),
      Ad.find({ userId, status: "active" })
        .select("title price city images createdAt")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);

    res.json({
      success: true,
      data: {
        ...user,
        adsCount: activeAdsCount,
        recentAds,
        followers,
        following,
      },
    });
  } catch (error) {
    console.error("getPublicProfile error:", error);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user._id;
    const { blockedId } = req.body;
    if (blockerId.toString() === blockedId)
      return res
        .status(400)
        .json({ success: false, message: "نمی‌توانید خودتان را بلاک کنید" });

    const existing = await Block.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "این کاربر قبلاً بلاک شده است" });

    await Block.create({ blocker: blockerId, blocked: blockedId });
    res.json({ success: true, message: "کاربر بلاک شد" });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در بلاک کاربر" });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.user._id;
    const { blockedId } = req.body;
    const result = await Block.findOneAndDelete({
      blocker: blockerId,
      blocked: blockedId,
    });
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "بلاکی یافت نشد" });
    res.json({ success: true, message: "بلاک برداشته شد" });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در رفع بلاک" });
  }
};

export const checkBlockStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const isBlocked = await Block.exists({
      blocker: req.user._id,
      blocked: userId,
    });
    res.json({ success: true, data: !!isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در بررسی وضعیت" });
  }
};
