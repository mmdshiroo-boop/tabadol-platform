// backend/src/controllers/agent.controller.ts
import { Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.model";
import { Property } from "../models/Property.model";
import { Agent } from "../models/Agent.model";
import { AuthRequest } from "../middleware/auth.middleware";
import bcrypt from "bcryptjs";
import {
  notifyAdmins,
  notifyExperts,
  sendNotificationToUser,
} from "../services/notification.service";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { Ad } from "../models";
import { DailyAgentReport } from "../models/DailyAgentReport.model";

// backend/src/controllers/agent.controller.ts (قسمت اصلاح‌شده)
// ==================== آمار آژانس ====================
export const generateDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const userIdStr = userId.toString();
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

   const existing = await DailyAgentReport.findOne({
  userId: userIdStr,
  date: { $gte: today, $lt: tomorrow },
} as any);
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "گزارش امروز قبلاً ذخیره شده است",
        data: existing,
      });
    }

    // ✅ استفاده از userIdObj در aggregate (چون در Ad فیلد userId از نوع ObjectId است)
    const stats = await Ad.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: null,
          totalAds: { $sum: 1 },
          activeAds: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          soldAds: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
          pendingAds: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          expiredAds: {
            $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] },
          },
          totalViews: { $sum: "$views" },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] },
          },
          soldCount: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
        },
      },
    ]);

    const data = stats[0] || {
      totalAds: 0,
      activeAds: 0,
      soldAds: 0,
      pendingAds: 0,
      expiredAds: 0,
      totalViews: 0,
      totalRevenue: 0,
      soldCount: 0,
    };

    // ✅ استفاده از userIdStr در create
    const newReport = await DailyAgentReport.create({
      userId: userIdStr,
      date: today,
      totalAds: data.totalAds,
      totalViews: data.totalViews || 0,
      activeAds: data.activeAds,
      soldAds: data.soldAds,
      totalRevenue: data.totalRevenue || 0,
    });

    try {
      await createAuditLog({
        userId: userIdStr,
        action: AuditAction.SYSTEM,
        resource: "DailyAgentReport",
        resourceId: newReport._id.toString(),
        description: `کاربر ${req.user?.firstName || req.user?.phone} گزارش روزانه خود را ذخیره کرد.`,
        req,
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: "گزارش روزانه با موفقیت ذخیره شد",
      data: newReport,
    });
  } catch (error: any) {
    console.error("Generate daily report error:", error);
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "گزارش امروز قبلاً ذخیره شده است",
      });
    }
    res.status(500).json({ success: false, message: "خطا در ذخیره گزارش" });
  }
};
export const getAgentStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    // ۱. آمار از مدل Ad (اصلی)
    const adStats = await Ad.aggregate([
      { $match: { userId: objectUserId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          sold: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
          totalViews: { $sum: "$views" },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] },
          },
          soldCount: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
        },
      },
    ]);

    const adData = adStats[0] || {
      total: 0,
      active: 0,
      sold: 0,
      pending: 0,
      expired: 0,
      totalViews: 0,
      totalRevenue: 0,
      soldCount: 0,
    };

    // ۲. لیدها (در صورت وجود مدل Consulting)
    let leadsTotal = 0,
      leadsNew = 0,
      leadsConverted = 0;
    try {
      const Consulting = mongoose.model("Consulting");
      const leadStats = await Consulting.aggregate([
        { $match: { agentId: objectUserId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            new: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
            converted: {
              $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] },
            },
          },
        },
      ]);
      if (leadStats.length > 0) {
        leadsTotal = leadStats[0].total;
        leadsNew = leadStats[0].new;
        leadsConverted = leadStats[0].converted;
      }
    } catch {
      // اگر مدل Consulting وجود نداشت، تخمین بر اساس فروش‌ها
      leadsTotal = adData.soldCount * 2; // فرضی
      leadsNew = adData.active;
      leadsConverted = adData.soldCount;
    }

    const conversionRate =
      leadsTotal > 0 ? Math.round((leadsConverted / leadsTotal) * 100) : 0;

    // ۳. بازدیدها
    const totalViews = adData.totalViews || 0;
    const totalProperties = adData.total || 1;
    const avgViewsPerProperty =
      totalProperties > 0 ? Math.round(totalViews / totalProperties) : 0;

    // ۴. درآمد و کمیسیون
    const totalRevenue = adData.totalRevenue || 0;
    const commission = Math.round(totalRevenue * 0.02); // ۲٪ کمیسیون
    const averagePerSale =
      adData.soldCount > 0 ? Math.round(totalRevenue / adData.soldCount) : 0;

    // ۵. املاک برتر (بر اساس بازدید)
    const topProperties = await Ad.find({ userId: objectUserId })
      .sort({ views: -1 })
      .limit(5)
      .select("title views status")
      .lean();

    res.json({
      success: true,
      data: {
        properties: {
          total: adData.total,
          active: adData.active,
          sold: adData.sold,
          pending: adData.pending,
          expired: adData.expired,
        },
        views: {
          total: totalViews,
          averagePerProperty: avgViewsPerProperty,
        },
        leads: {
          total: leadsTotal,
          new: leadsNew,
          converted: leadsConverted,
          conversionRate,
        },
        revenue: {
          total: totalRevenue,
          commission,
          averagePerSale,
        },
        topProperties: topProperties.map((p: any) => ({
          id: p._id.toString(),
          title: p.title,
          views: p.views || 0,
          status: p.status,
        })),
      },
    });
  } catch (error) {
    console.error("getAgentStats error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار" });
  }
};

// ==================== دریافت لیست مشاوران آژانس ====================
export const getAgencyAgents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const agents = await Agent.find({ agencyId: userId })
      .select("-password")
      .lean();

    const agentsWithCount = await Promise.all(
      agents.map(async (agent) => {
        const propertiesCount = await Property.countDocuments({
          agentId: agent._id,
        });
        return { ...agent, propertiesCount };
      }),
    );

    res.json({ success: true, data: agentsWithCount });
  } catch (error) {
    console.error("Error in getAgencyAgents:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت مشاوران" });
  }
};

// ==================== ثبت مشاور جدید ====================
export const createAgent = async (req: AuthRequest, res: Response) => {
  try {
    let { firstName, lastName, phone, email, nationalCode, password } =
      req.body;

    let formattedPhone = phone?.trim() || "";
    if (formattedPhone.length === 10 && formattedPhone.startsWith("9")) {
      formattedPhone = "0" + formattedPhone;
    } else if (
      formattedPhone.length !== 11 ||
      !formattedPhone.startsWith("0")
    ) {
      return res.status(400).json({
        success: false,
        message: "شماره تماس باید ۱۱ رقمی و با ۰ شروع شود",
      });
    }

    if (!firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: "نام، نام خانوادگی و رمز عبور الزامی هستند",
      });
    }

    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "این شماره تماس قبلاً در سیستم ثبت شده است",
      });
    }

    const existingAgent = await Agent.findOne({ phone: formattedPhone });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: "این شماره تماس قبلاً برای یک کارشناس ثبت شده است",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      phone: formattedPhone,
      email: email || undefined,
      nationalCode: nationalCode || undefined,
      password: password,
      role: "agent",
      isActive: true,
    });
    await newUser.save();

const agent = new Agent({
  userId: newUser._id, // ✅
  firstName,
  lastName,
  phone: formattedPhone,
  email: email || undefined,
  nationalCode: nationalCode || undefined,
  agencyId: req.user!._id,
  password: hashedPassword,
  status: "active",
  propertiesCount: 0,
});
    await agent.save();

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "Agent",
      resourceId: agent._id.toString(),
      description: `آژانس ${req.user?.firstName || req.user?.phone} کارشناس جدید "${firstName} ${lastName}" را ثبت کرد.`,
      req,
    });

    await sendNotificationToUser(
      newUser._id.toString(),
      "👥 به آژانس اضافه شدید",
      `شما به عنوان کارشناس به آژانس ${req.user?.firstName || req.user?.phone} اضافه شدید.`,
      "new_agent",
      "/panel/agent/dashboard",
    );

    await notifyAdmins(
      "👥 مشاور جدید ثبت شد",
      `مشاور "${firstName} ${lastName}" توسط آژانس ${req.user?.firstName || req.user?.phone} ثبت شد.`,
      "new_agent",
      `/admin/agents`,
    );

    return res.status(201).json({
      success: true,
      message: "کارشناس با موفقیت ثبت شد",
      data: agent,
    });
  } catch (error: any) {
    console.error("❌ Create agent error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "اطلاعات تکراری است" });
    }
    return res
      .status(500)
      .json({ success: false, message: "خطای سرور در ثبت کارشناس" });
  }
};

// ==================== ثبت ملک جدید ====================
export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });

    const {
      title,
      description,
      price,
      priceType,
      propertyType,
      city,
      address,
      area,
      rooms,
      yearBuilt,
      images,
      categoryId,
    } = req.body;

    if (!title || !price || !city || !address) {
      return res.status(400).json({
        success: false,
        message: "عنوان، قیمت، شهر و آدرس الزامی است",
      });
    }

    const property = await Property.create({
      title,
      description,
      price: Number(price),
      priceType: priceType || "sale",
      propertyType: propertyType || "apartment",
      city,
      address,
      area: Number(area) || 0,
      rooms: Number(rooms) || 0,
      yearBuilt: Number(yearBuilt) || 0,
      images: images || [],
      categoryId: categoryId || null,
      agentId: userId,
      status: "pending",
    });

    await sendNotificationToUser(
      userId.toString(),
      "🏠 ملک جدید ثبت شد",
      `ملک "${title}" با موفقیت ثبت شد و در انتظار تایید است.`,
      "property_submitted",
      `/panel/agent/properties/${property._id}`,
      { propertyId: property._id.toString(), propertyTitle: title },
    );

    await notifyAdmins(
      "🏠 ملک جدید در انتظار تایید",
      `ملک "${title}" توسط آژانس ثبت شد. لطفاً بررسی کنید.`,
      "new_property_pending",
      `/admin/properties/${property._id}`,
      { propertyId: property._id.toString(), propertyTitle: title },
    );

    await notifyExperts(
      "🏠 ملک جدید برای بررسی",
      `ملک "${title}" ثبت شده و نیاز به بررسی دارد.`,
      "property_assigned",
      `/panel/expert/properties/${property._id}`,
      { propertyId: property._id.toString(), propertyTitle: title },
    );

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.AD_CREATED,
      resource: "Property",
      resourceId: property._id.toString(),
      description: `آژانس ${req.user?.firstName || req.user?.phone} ملک "${property.title}" را ثبت کرد.`,
      req,
    });

    res
      .status(201)
      .json({ success: true, data: property, message: "ملک با موفقیت ثبت شد" });
  } catch (error) {
    console.error("Error in createProperty:", error);
    res.status(500).json({ success: false, message: "خطا در ثبت ملک" });
  }
};

// ==================== ویرایش مشاور ====================
export const updateAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id); // ✅ تبدیل به رشته
    const {
      firstName,
      lastName,
      phone,
      email,
      nationalCode,
      password,
      agencyName,
    } = req.body;

    // ✅ استفاده از as any برای انعطاف‌پذیری
    const agent = (await Agent.findById(id)) as any;
    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "کارشناس یافت نشد" });

    if ((agent.agencyId || agent._id).toString() !== req.user!._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "دسترسی غیرمجاز" });
    }

    if (firstName) agent.firstName = firstName;
    if (lastName) agent.lastName = lastName;
    if (phone) agent.phone = phone;
    if (email) agent.email = email;
    if (nationalCode) agent.nationalCode = nationalCode;
    if (agencyName) agent.agencyName = agencyName;
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      agent.password = await bcrypt.hash(password, salt);
    }
    await agent.save();

    // ✅ در صورت وجود userId در agent
    if ((agent as any).userId) {
      const user = await User.findById((agent as any).userId).select(
        "+password",
      );
      if (user) {
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (email) user.email = email;
        if (nationalCode) user.nationalCode = nationalCode;
        if (password && password.length >= 6) user.password = password;
        await user.save();
      }
    }

    const agentObj = agent.toObject() as any;
    delete agentObj.password;

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "Agent",
      resourceId: agent._id.toString(),
      description: `آژانس ${req.user?.firstName || req.user?.phone} اطلاعات کارشناس "${agent.firstName} ${agent.lastName}" را ویرایش کرد.`,
      metadata: { changes: req.body },
      req,
    });

    await sendNotificationToUser(
      (agent as any).userId?.toString(),
      "✏️ اطلاعات شما ویرایش شد",
      `اطلاعات پروفایل شما توسط آژانس ${req.user?.firstName || req.user?.phone} به‌روزرسانی شد.`,
      "info",
      "/panel/agent/profile",
    );

    return res.status(200).json({
      success: true,
      message: "اطلاعات کارشناس به‌روزرسانی شد",
      data: agentObj,
    });
  } catch (error: any) {
    console.error("❌ Update agent error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "این شماره تلفن قبلاً ثبت شده است" });
    }
    return res
      .status(500)
      .json({ success: false, message: "خطای سرور در ویرایش کارشناس" });
  }
};

// ==================== حذف مشاور ====================
export const deleteAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id); // ✅

    // ✅ استفاده از as any
    const agent = (await Agent.findById(id)) as any;
    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "کارشناس یافت نشد" });

    if ((agent.agencyId || agent._id).toString() !== req.user!._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "دسترسی غیرمجاز" });
    }

    const agentName = `${agent.firstName} ${agent.lastName}`;
    const agentUserId = (agent as any).userId; // 🆕 ذخیره userId قبل از حذف

    if ((agent as any).userId) {
      await User.findByIdAndDelete((agent as any).userId);
    }

    await Agent.findByIdAndDelete(id);

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.ADMIN_DELETED,
      resource: "Agent",
      resourceId: id,
      description: `آژانس ${req.user?.firstName || req.user?.phone} کارشناس "${agentName}" را حذف کرد.`,
      req,
    });

    if (agentUserId) {
      await sendNotificationToUser(
        agentUserId.toString(),
        "🚫 دسترسی شما لغو شد",
        `دسترسی شما به آژانس ${req.user?.firstName || req.user?.phone} لغو گردید.`,
        "warning",
        "/",
      );
    }

    await notifyAdmins(
      "👥 یک مشاور حذف شد",
      `مشاور "${agentName}" توسط آژانس ${req.user?.firstName || req.user?.phone} حذف شد.`,
      "info",
      `/admin/agents`,
    );

    return res.status(200).json({
      success: true,
      message: "کارشناس و حساب کاربری مرتبط با موفقیت حذف شدند",
    });
  } catch (error) {
    console.error("❌ Delete agent error:", error);
    return res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ==================== تغییر وضعیت مشاور ====================
export const toggleAgentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id); // ✅

    // ✅ استفاده از as any
    const agent = (await Agent.findById(id)) as any;
    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "کارشناس یافت نشد" });

    if ((agent.agencyId || agent._id).toString() !== req.user!._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "دسترسی غیرمجاز" });
    }

    const oldStatus = agent.status;
    agent.status = agent.status === "active" ? "inactive" : "active";
    await agent.save();

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action:
        oldStatus === "active"
          ? AuditAction.ADMIN_USER_BAN
          : AuditAction.ADMIN_USER_UNBAN,
      resource: "Agent",
      resourceId: agent._id.toString(),
      description: `آژانس ${req.user?.firstName || req.user?.phone} وضعیت کارشناس "${agent.firstName} ${agent.lastName}" را به ${agent.status === "active" ? "فعال" : "غیرفعال"} تغییر داد.`,
      req,
    });

    await sendNotificationToUser(
      (agent as any).userId?.toString(),
      agent.status === "active"
        ? "✅ حساب شما فعال شد"
        : "⏸️ حساب شما غیرفعال شد",
      agent.status === "active"
        ? `حساب شما مجدداً توسط آژانس ${req.user?.firstName || req.user?.phone} فعال گردید.`
        : `حساب شما توسط آژانس ${req.user?.firstName || req.user?.phone} غیرفعال شد.`,
      agent.status === "active" ? "success" : "warning",
      "/panel/agent/dashboard",
    );

    return res.status(200).json({
      success: true,
      data: agent,
      message: `وضعیت کارشناس به ${agent.status === "active" ? "فعال" : "غیرفعال"} تغییر یافت`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ==================== گزارشات فروش آژانس ====================
export const getAgentReports = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { year = new Date().getFullYear(), period = "monthly" } = req.query;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });

    const allProperties = await Property.find({ agentId: userId });
    const totalProperties = allProperties.length;
    const soldProperties = allProperties.filter(
      (p) => p.status === "sold",
    ).length;
    const activeProperties = allProperties.filter(
      (p) => p.status === "active",
    ).length;
    const pendingProperties = allProperties.filter(
      (p) => p.status === "pending",
    ).length;
    const totalViews = allProperties.reduce(
      (sum, p) => sum + (p.views || 0),
      0,
    );
    const totalRevenue = allProperties
      .filter((p) => p.status === "sold")
      .reduce((sum, p) => sum + (p.price || 0), 0);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const currentMonthSales = await Property.countDocuments({
      agentId: userId,
      status: "sold",
      createdAt: { $gte: currentMonth },
    });

    const currentMonthRevenue = await Property.aggregate([
      {
        $match: {
          agentId: userId,
          status: "sold",
          createdAt: { $gte: currentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const lastMonthSales = await Property.countDocuments({
      agentId: userId,
      status: "sold",
      createdAt: { $gte: lastMonth, $lt: currentMonth },
    });

    const monthlyGrowth =
      lastMonthSales > 0
        ? Math.round(
            ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100,
          )
        : currentMonthSales > 0
          ? 100
          : 0;

    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const start = new Date(Number(year), i, 1);
      const end = new Date(Number(year), i + 1, 1);
      const monthSales = await Property.countDocuments({
        agentId: userId,
        status: "sold",
        createdAt: { $gte: start, $lt: end },
      });
      const monthRevenue = await Property.aggregate([
        {
          $match: {
            agentId: userId,
            status: "sold",
            createdAt: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]);
      const monthNames = [
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
      monthlyData.push({
        month: monthNames[i],
        sales: monthSales,
        revenue: monthRevenue[0]?.total || 0,
      });
    }

    const agents = await Agent.find({ agencyId: userId });
    const agentsPerformance = await Promise.all(
      agents.map(async (agent) => {
        const agentProperties = await Property.find({ agentId: agent._id });
        const soldCount = agentProperties.filter(
          (p) => p.status === "sold",
        ).length;
        const totalRevenue = agentProperties
          .filter((p) => p.status === "sold")
          .reduce((sum, p) => sum + (p.price || 0), 0);
        const totalViews = agentProperties.reduce(
          (sum, p) => sum + (p.views || 0),
          0,
        );
        return {
          _id: agent._id,
          name: `${agent.firstName} ${agent.lastName}`,
          phone: agent.phone,
          email: agent.email,
          propertiesCount: agentProperties.length,
          soldCount,
          totalRevenue,
          totalViews,
          status: agent.status,
        };
      }),
    );

    const soldPropertiesList = await Property.find({
      agentId: userId,
      status: "sold",
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("title price city address createdAt updatedAt");

    res.json({
      success: true,
      data: {
        summary: {
          totalProperties,
          soldProperties,
          activeProperties,
          pendingProperties,
          totalViews,
          totalRevenue,
          currentMonthSales,
          currentMonthRevenue: currentMonthRevenue[0]?.total || 0,
          monthlyGrowth,
        },
        monthlyData,
        agentsPerformance,
        recentSoldProperties: soldPropertiesList,
      },
    });
  } catch (error) {
    console.error("Error in getAgentReports:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت گزارشات" });
  }
};

// ==================== گزارش عملکرد مشاور خاص ====================
export const getAgentPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const agentId = String(req.params.agentId); // ✅

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });

    const agent = await Agent.findOne({ _id: agentId, agencyId: userId });
    if (!agent)
      return res
        .status(404)
        .json({ success: false, message: "مشاور یافت نشد" });

    const properties = await Property.find({ agentId: agent._id });
    const soldProperties = properties.filter((p) => p.status === "sold");
    const activeProperties = properties.filter((p) => p.status === "active");
    const totalRevenue = soldProperties.reduce(
      (sum, p) => sum + (p.price || 0),
      0,
    );
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlySales = await Property.countDocuments({
      agentId: agent._id,
      status: "sold",
      createdAt: { $gte: currentMonth },
    });

    res.json({
      success: true,
      data: {
        agent: {
          _id: agent._id,
          name: `${agent.firstName} ${agent.lastName}`,
          phone: agent.phone,
          email: agent.email,
          status: agent.status,
          joinedAt: agent.createdAt,
        },
        stats: {
          totalProperties: properties.length,
          soldProperties: soldProperties.length,
          activeProperties: activeProperties.length,
          totalRevenue,
          totalViews,
          monthlySales,
        },
        recentProperties: properties.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Error in getAgentPerformance:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در دریافت عملکرد مشاور" });
  }
};

export const agentAdvancedSearch = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "لطفاً وارد شوید" });

    const {
      q,
      province,
      city,
      district,
      neighborhood,
      propertyType,
      adType,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      rooms,
      status,
      startDate,
      endDate,
      sortBy = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const conditions: any[] = [{ userId: new mongoose.Types.ObjectId(userId) }];

    if (q && typeof q === "string" && q.trim()) {
      const safeQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({
        $or: [
          { title: { $regex: safeQ, $options: "i" } },
          { description: { $regex: safeQ, $options: "i" } },
        ],
      });
    }

    if (province)
      conditions.push({
        province: { $regex: new RegExp(String(province), "i") },
      });
    if (city)
      conditions.push({ city: { $regex: new RegExp(String(city), "i") } });
    if (district)
      conditions.push({
        district: { $regex: new RegExp(String(district), "i") },
      });
    if (neighborhood)
      conditions.push({
        neighborhood: { $regex: new RegExp(String(neighborhood), "i") },
      });
    if (propertyType) conditions.push({ propertyType });
    if (adType) conditions.push({ adType });

    if (minPrice || maxPrice) {
      const pf: any = {};
      const mn = Number(minPrice),
        mx = Number(maxPrice);
      if (!isNaN(mn) && mn > 0) pf.$gte = mn;
      if (!isNaN(mx) && mx > 0) pf.$lte = mx;
      if (Object.keys(pf).length > 0) conditions.push({ price: pf });
    }

    if (minArea || maxArea) {
      const af: any = {};
      const mn = Number(minArea),
        mx = Number(maxArea);
      if (!isNaN(mn) && mn > 0) af.$gte = mn;
      if (!isNaN(mx) && mx > 0) af.$lte = mx;
      if (Object.keys(af).length > 0) conditions.push({ area: af });
    }

    if (rooms) conditions.push({ rooms: Number(rooms) });
    if (status && status !== "all") conditions.push({ status });
    if (startDate || endDate) {
      const df: any = {};
      if (startDate) df.$gte = new Date(String(startDate));
      if (endDate) df.$lte = new Date(String(endDate));
      conditions.push({ createdAt: df });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
    };
    const sort = sortMap[String(sortBy)] || { createdAt: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [ads, total] = await Promise.all([
      Ad.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
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
    console.error("Agent advanced search error:", error);
    res.status(500).json({ success: false, message: "خطا در جستجوی آگهی‌ها" });
  }
};
