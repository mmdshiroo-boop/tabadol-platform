// backend/src/controllers/cookieAudit.controller.ts
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";
import CookieAudit from "../models/CookieAudit";
import { AuditAction } from "../models/AuditLog.model";
import { createAuditLog } from "../services/auditLog.service";
import { CookieMonitorService } from "../services/cookieMonitor.service";
import Session from "../models/Session";
import { getIO } from "../socket";
import { Ad, User } from "../models";
import { Favorite } from "../models/Favorite.model";
import { PageView } from "../models/PageView.model";

// ─── مپ‌های کمکی ───
const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartment: "آپارتمان",
  villa: "ویلا",
  house: "خانه",
  land: "زمین",
  commercial: "تجاری",
  office: "اداری",
  industrial: "صنعتی",
  agricultural: "کشاورزی",
  garden: "باغ",
  penthouse: "پنت‌هاوس",
  duplex: "دوبلکس",
  hotel: "هتل",
  apartment_complex: "مجتمع مسکونی",
};

const DEAL_TYPE_MAP: Record<string, string> = {
  sale: "خرید (فروش)",
  rent: "رهن و اجاره",
  daily_rent: "اجاره روزانه",
  exchange: "معاوضه",
  full_rent: "رهن کامل",
  mortgage: "رهن و اجاره",
};

const PRICE_RANGE_LABEL_MAP: Record<string, string> = {
  "0-5": "تا ۵ میلیارد",
  "5-10": "۵-۱۰ میلیارد",
  "10-20": "۱۰-۲۰ میلیارد",
  "20+": "بالای ۲۰ میلیارد",
};

const RENT_DEPOSIT_LABEL_MAP: Record<string, string> = {
  "0-500": "تا ۵۰۰ میلیون",
  "500-1000": "۵۰۰ تا ۱ میلیارد",
  "1000-2000": "۱ تا ۲ میلیارد",
  "2000+": "بالای ۲ میلیارد",
};

const RENT_MONTHLY_LABEL_MAP: Record<string, string> = {
  "0-10": "تا ۱۰ میلیون",
  "10-20": "۱۰ تا ۲۰ میلیون",
  "20-50": "۲۰ تا ۵۰ میلیون",
  "50+": "بالای ۵۰ میلیون",
};

function formatPrice(value: number | null | undefined): string {
  if (!value || value === 0) return "توافقی";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} میلیارد`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} میلیون`;
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function extractQueryParamsFromPath(path: string): URLSearchParams {
  try {
    const url = new URL(path, "http://localhost");
    return new URLSearchParams(url.search);
  } catch {
    return new URLSearchParams();
  }
}

function extractAdIdFromPath(path: string): string | null {
  const match = path?.match(/\/(?:ad|ads|property|properties)\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════
// GET Cookie Audit Logs
// ═══════════════════════════════════════════════════════════
export const getCookieAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId,
      type,
      sessionId,
      startDate,
      endDate,
      status,
      ip,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter: any = {};

    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      filter.userId = new mongoose.Types.ObjectId(String(userId));
    }

    if (type) filter.type = type;
    if (sessionId) filter.sessionId = sessionId;
    if (status) filter.status = status;
    if (ip) filter.ip = { $regex: ip, $options: "i" };

    if (req.query.role && req.query.role !== "all") {
      const roleFilter = Array.isArray(req.query.role)
        ? req.query.role
        : [req.query.role];
      // اصلاح: cast به any
      const roleUserIds = await User.find({ role: { $in: roleFilter as any } })
        .select("_id")
        .lean()
        .then((users) => users.map((u) => u._id));
      if (roleUserIds.length > 0) {
        filter.userId = { $in: roleUserIds };
      } else {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        });
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(String(startDate));
      if (endDate) filter.createdAt.$lte = new Date(String(endDate));
    }

    const pipeline: any[] = [{ $match: filter }];

    const sort: any = {};
    sort[String(sortBy)] = sortOrder === "asc" ? 1 : -1;
    pipeline.push({ $sort: sort });

    pipeline.push({
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    });
    pipeline.push({ $unwind: { path: "$user", preserveNullAndEmptyArrays: true } });

    if (search) {
      const searchRegex = new RegExp(String(search), "i");
      pipeline.push({
        $match: {
          $or: [
            { "user.phone": searchRegex },
            { "user.firstName": searchRegex },
            { "user.lastName": searchRegex },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await CookieAudit.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const pageNum = Math.max(1, +page);
    const limitNum = Math.min(100, +limit || 20);
    pipeline.push({ $skip: (pageNum - 1) * limitNum });
    pipeline.push({ $limit: limitNum });

    pipeline.push({
      $project: {
        _id: 1,
        userId: "$user",
        sessionId: 1,
        type: 1,
        ip: 1,
        userAgent: 1,
        fingerprint: 1,
        cookieName: 1,
        status: 1,
        metadata: 1,
        navigation: 1,
        cookieData: 1,
        createdAt: 1,
      },
    });

    const logs = await CookieAudit.aggregate(pipeline);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("❌ Get cookie audit logs error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در دریافت لاگ‌ها",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET Cookie Audit Stats
// ═══════════════════════════════════════════════════════════
export const getCookieAuditStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalLogins, suspiciousCount, activeSessions, uniqueIPsCount, recentSuspicious] =
      await Promise.all([
        CookieAudit.countDocuments({ type: "login" }),
        CookieAudit.countDocuments({ type: "suspicious", createdAt: { $gte: last24h } }),
        CookieAudit.distinct("sessionId", { type: "login" }).then((arr) => arr.length),
        CookieAudit.distinct("ip").then((arr) => arr.length),
        CookieAudit.find({ type: "suspicious" })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("userId", "phone firstName lastName")
          .lean(),
      ]);

    res.json({
      success: true,
      data: {
        totalLogins,
        suspiciousLast24h: suspiciousCount,
        activeSessionCount: activeSessions,
        uniqueIPs: uniqueIPsCount,
        recentSuspicious: recentSuspicious.map((s: any) => ({
          _id: s._id,
          ip: s.ip,
          reason: s.metadata?.reason,
          user: s.userId
            ? `${s.userId.firstName || ""} ${s.userId.lastName || ""} (${s.userId.phone || ""})`
            : "ناشناس",
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ Get cookie audit stats error:", error);
    res.status(500).json({
      success: false,
      message: "خطا در دریافت آمار",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═══════════════════════════════════════════════════════════
// GET Daily Stats
// ═══════════════════════════════════════════════════════════
export const getDailyStats = async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(String(req.query.days)) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          logins: { $sum: { $cond: [{ $eq: ["$type", "login"] }, 1, 0] } },
          suspicious: { $sum: { $cond: [{ $eq: ["$type", "suspicious"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const data = await (CookieAudit as any).aggregate(pipeline);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت آمار روزانه" });
  }
};

// ═══════════════════════════════════════════════════════════
// Revoke Session
// ═══════════════════════════════════════════════════════════
export const revokeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "شناسه نشست الزامی است" });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "نشست یافت نشد" });

    const targetUserId = session.user?.toString();

    await Session.findByIdAndDelete(sessionId);

    await CookieMonitorService.logEvent({
      userId: targetUserId || null,
      sessionId,
      type: "logout",
      ip: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "",
      cookieName: "access_token",
      status: "revoked",
      reason: `توسط سوپر ادمین ${req.user.phone} باطل شد`,
    });

    if (targetUserId) {
      const io = getIO();
      if (io) {
        io.to(`user_${targetUserId}`).emit("session:revoked", {
          message: "نشست شما توسط مدیر سیستم باطل شد. لطفاً دوباره وارد شوید.",
        });
      }
    }

    res.json({ success: true, message: "نشست با موفقیت باطل شد. کاربر از سیستم خارج می‌شود." });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ success: false, message: "خطا در باطل‌سازی نشست" });
  }
};

// ═══════════════════════════════════════════════════════════
// GET User Details for Audit
// ═══════════════════════════════════════════════════════════
export const getUserDetailsForAudit = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "شناسه کاربر معتبر نیست" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ۱. اطلاعات کاربر
    const user = await User.findById(userObjectId)
      .select(
        "firstName lastName phone email avatar nationalCode role isVerified phoneVerified nationalCodeVerified createdAt lastLogin province city district agencyName rating adsCount totalViews",
      )
      .lean();
    if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد" });

    // ۲. دریافت IP از آخرین لاگ
    const lastAudit = await CookieAudit.findOne({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .select("ip")
      .lean();
    const userIP = lastAudit?.ip || "نامشخص";

    // ۳. تعداد نشست‌ها
    const sessionCount = await CookieAudit.countDocuments({ userId: userObjectId, type: "login" });

    // ۴. بازدیدهای صفحه (PageView)
    const pageViews = await PageView.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    // ۵. علاقه‌مندی‌ها
    const favorites = await Favorite.find({ userId: userObjectId })
      .populate("adId", "title price city district area rooms adType images status")
      .sort({ createdAt: -1 })
      .lean();

    // ۶. آگهی‌های بازدیدشده (از PageView)
    const viewedAdIds = pageViews
      .map((pv: any) => extractAdIdFromPath(pv.path))
      .filter((id): id is string => !!id);
    const uniqueViewedAdIds = [...new Set(viewedAdIds)];

  const viewedAds = uniqueViewedAdIds.length
  ? await Ad.find({ _id: { $in: uniqueViewedAdIds } })
      .select("title price city district area rooms adType images status province")
      .populate("province", "name slug")   // ✅ اضافه شد
      .lean()
  : [];

    // ۷. شمارش استان‌ها از آگهی‌های بازدیدشده
    const provinceCountFromAds: Record<string, number> = {};
viewedAds.forEach((ad: any) => {
  let prov = "";

  // اگر استان populate شده باشد → آبجکت با name
  if (ad.province && typeof ad.province === "object" && ad.province.name) {
    prov = ad.province.name;
  } 
  // اگر استان به‌صورت رشته باشد
  else if (ad.province) {
    prov = String(ad.province);
  }

  if (prov) {
    provinceCountFromAds[prov] = (provinceCountFromAds[prov] || 0) + 1;
  }
});

    // ۸. تحلیل رفتار با ادغام استان‌های آگهی‌ها
    const behavior = analyzePageViews(pageViews, provinceCountFromAds);

    // ۹. امتیاز تعامل
    const interactionScore = calculateInteractionScore({
      viewedCount: uniqueViewedAdIds.length,
      favoritesCount: favorites.length,
      pageViewsCount: pageViews.length,
      user,
    });

    const scoreBreakdown = getScoreBreakdown(
      uniqueViewedAdIds.length,
      favorites.length,
      pageViews.length,
      user,
    );

    // ۱۰. دوره فعالیت
    const activityPeriod = {
      firstView: pageViews.length ? pageViews[pageViews.length - 1].createdAt : null,
      lastView: pageViews.length ? pageViews[0].createdAt : null,
      totalPageViews: pageViews.length,
    };

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone,
          email: user.email || "",
          avatar: user.avatar || "",
          nationalCode: user.nationalCode || "",
          province: user.province || behavior.mostFrequentProvince || "",
          city: user.city || behavior.mostFrequentCity || "",
          district: user.district || "",
          role: user.role || "user",
          phoneVerified: !!user.phoneVerified,
          nationalCodeVerified: !!user.nationalCodeVerified,
          isVerified: !!(user.phoneVerified && user.nationalCodeVerified),
          ip: userIP,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          totalViews: user.totalViews || pageViews.length,
          adsCount: user.adsCount || 0,
          favoritesCount: favorites.length,
          rating: user.rating || 0,
          sessionCount,
        },
        behavior,
        viewedAds,
        viewedAdsCount: uniqueViewedAdIds.length,
        favorites: favorites.map((f: any) => ({
          _id: f._id,
          ad: f.adId,
          createdAt: f.createdAt,
        })),
        favoritesCount: favorites.length,
        interactionScore,
        scoreBreakdown,
        activityPeriod,
      },
    });
  } catch (error) {
    console.error("❌ getUserDetailsForAudit error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت جزئیات کاربر" });
  }
};

// ═══════════════════════════════════════════════════════════
// Admin Verify User
// ═══════════════════════════════════════════════════════════
export const adminVerifyUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.userId);
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "شناسه کاربر نامعتبر است" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isVerified: true, phoneVerified: true, nationalCodeVerified: true } },
      { new: true, lean: true },
    ).select("isVerified phoneVerified nationalCodeVerified");

    if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد" });

    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "User",
      resourceId: userId,
      description: `تایید هویت کاربر ${userId}`,
      req,
    });

    res.json({
      success: true,
      message: "کاربر با موفقیت تایید هویت شد",
      data: {
        isVerified: user.isVerified,
        phoneVerified: user.phoneVerified,
        nationalCodeVerified: user.nationalCodeVerified,
      },
    });
  } catch (error) {
    console.error("❌ adminVerifyUser error:", error);
    res.status(500).json({ success: false, message: "خطا در تایید هویت کاربر" });
  }
};

// ═══════════════════════════════════════════════════════════
// توابع تحلیل رفتار
// ═══════════════════════════════════════════════════════════

function analyzePageViews(pageViews: any[], adProvinceCounts?: Record<string, number>): any {
  if (!pageViews || pageViews.length === 0) {
    return {
      likelyPropertyType: "نامشخص",
      mostFrequentCity: "نامشخص",
      mostFrequentProvince: "نامشخص",
      totalSearches: 0,
      searchCities: [],
      searchPropertyTypes: [],
      priceRange: "نامشخص",
      rentRange: "نامشخص",
      hasNegotiable: false,
      negotiableCount: 0,
      priceCategories: {
        under1M: 0,
        m1to5: 0,
        m5to20: 0,
        above20B: 0,
        negotiable: 0,
        rental: 0,
      },
      buyerProfile: "نامشخص",
      cityDistribution: [],
      provinceDistribution: [],
      dealTypeDistribution: [],
      propertyTypeDistribution: [],
      areaDistribution: [],
      districtDistribution: [],
    };
  }

  const cityCount: Record<string, number> = {};
  const provinceCount: Record<string, number> = {};
  const districtCountMap: Record<string, Record<string, number>> = {};
  const propertyTypeCount: Record<string, number> = {};
  const dealTypeCount: Record<string, number> = {};
  const areaRangeCount: Record<string, number> = {};
  const priceRangeCounts: Record<string, number> = {};
  const rentDepositCounts: Record<string, number> = {};
  const rentMonthlyCounts: Record<string, number> = {};
  const priceValues: number[] = [];
  const searchPaths: any[] = [];

  for (const pv of pageViews) {
    const path = pv.path || "";
    if (!path) continue;

    if (!path.includes("/search") && !path.includes("/ad/") && !path.includes("/ads/")) continue;

    searchPaths.push({ path, createdAt: pv.createdAt, referrer: pv.referrer, ip: pv.ip });

    const params = extractQueryParamsFromPath(path);

    // شهر و استان از پارامترهای URL
    const city = params.get("city") || params.get("citySlug");
    if (city) cityCount[city] = (cityCount[city] || 0) + 1;

    const province = params.get("province") || params.get("provinceSlug");
    if (province) provinceCount[province] = (provinceCount[province] || 0) + 1;

    const district = params.get("district") || params.get("neighborhood");
    if (district) {
      const cityKey = city || province || "نامشخص";
      if (!districtCountMap[cityKey]) districtCountMap[cityKey] = {};
      districtCountMap[cityKey][district] = (districtCountMap[cityKey][district] || 0) + 1;
    }

    // نوع ملک
    const propertyType = params.get("type") || params.get("propertyType");
    if (propertyType) propertyTypeCount[propertyType] = (propertyTypeCount[propertyType] || 0) + 1;

    // نوع معامله
    const dealType = params.get("dealType") || params.get("adType") || params.get("transactionType");
    if (dealType) dealTypeCount[dealType] = (dealTypeCount[dealType] || 0) + 1;

    // قیمت فروش
    const priceRangeParam = params.get("priceRange");
    if (priceRangeParam && priceRangeParam !== "none") {
      priceRangeCounts[priceRangeParam] = (priceRangeCounts[priceRangeParam] || 0) + 1;
    }

    // رهن و اجاره
    const rentDepositParam = params.get("rentDepositRange") || params.get("depositRange");
    if (rentDepositParam && rentDepositParam !== "none") {
      rentDepositCounts[rentDepositParam] = (rentDepositCounts[rentDepositParam] || 0) + 1;
    }

    const rentMonthlyParam = params.get("rentMonthlyRange") || params.get("monthlyRent");
    if (rentMonthlyParam && rentMonthlyParam !== "none") {
      rentMonthlyCounts[rentMonthlyParam] = (rentMonthlyCounts[rentMonthlyParam] || 0) + 1;
    }

    // متراژ
    const minArea = parseNumeric(params.get("minArea"));
    const maxArea = parseNumeric(params.get("maxArea"));
    if (minArea || maxArea) {
      const range = `${minArea || "نامحدود"} تا ${maxArea || "نامحدود"}`;
      areaRangeCount[range] = (areaRangeCount[range] || 0) + 1;
    }
  }

  // ─── توزیع شهرها ───
  const cityDistribution = Object.entries(cityCount)
    .map(([city, count]) => ({ city, count, percent: 0 }))
    .sort((a, b) => b.count - a.count);
  const totalCityViews = cityDistribution.reduce((sum, c) => sum + c.count, 0);
  cityDistribution.forEach((c) => (c.percent = totalCityViews ? Math.round((c.count / totalCityViews) * 100) : 0));

  // ─── توزیع استان‌ها: ترکیب URL و آگهی‌های بازدیدشده ───
  const combinedProvinceCounts: Record<string, number> = { ...provinceCount };
  if (adProvinceCounts) {
    for (const [prov, count] of Object.entries(adProvinceCounts)) {
      combinedProvinceCounts[prov] = (combinedProvinceCounts[prov] || 0) + count;
    }
  }
  const provinceDistribution = Object.entries(combinedProvinceCounts)
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count);
  const mostFrequentProvince = provinceDistribution[0]?.province || "نامشخص";

  // ─── توزیع مناطق ───
  const districtDistribution = Object.entries(districtCountMap)
    .map(([city, districts]) => ({
      city,
      districts: Object.entries(districts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => {
      const sumA = a.districts.reduce((s, d) => s + d.count, 0);
      const sumB = b.districts.reduce((s, d) => s + d.count, 0);
      return sumB - sumA;
    });

  // ─── نوع ملک ───
  const propertyTypeDistribution = Object.entries(propertyTypeCount)
    .map(([type, count]) => ({ type: PROPERTY_TYPE_MAP[type] || type, count }))
    .sort((a, b) => b.count - a.count);

  // ─── نوع معامله ───
  const dealTypeDistribution = Object.entries(dealTypeCount)
    .map(([type, count]) => ({ type: DEAL_TYPE_MAP[type] || type, count, percent: 0 }))
    .sort((a, b) => b.count - a.count);
  const totalDeals = dealTypeDistribution.reduce((sum, d) => sum + d.count, 0);
  dealTypeDistribution.forEach((d) => (d.percent = totalDeals ? Math.round((d.count / totalDeals) * 100) : 0));

  // ─── متراژ ───
  const areaDistribution = Object.entries(areaRangeCount)
    .map(([range, count]) => ({ range, count, percent: 0 }))
    .sort((a, b) => b.count - a.count);
  const totalArea = areaDistribution.reduce((sum, a) => sum + a.count, 0);
  areaDistribution.forEach((a) => (a.percent = totalArea ? Math.round((a.count / totalArea) * 100) : 0));

  // ─── محدوده قیمت فروش ───
  let priceRange = "نامشخص";
  if (Object.keys(priceRangeCounts).length > 0) {
    const mostFreqPrice = Object.entries(priceRangeCounts).sort((a, b) => b[1] - a[1])[0][0];
    priceRange = PRICE_RANGE_LABEL_MAP[mostFreqPrice] || mostFreqPrice;
  } else if (priceValues.length > 0) {
    const minP = Math.min(...priceValues);
    const maxP = Math.max(...priceValues);
    priceRange = `${formatPrice(minP)} - ${formatPrice(maxP)}`;
  }

  // ─── محدوده رهن/اجاره ───
  let rentRangeParts: string[] = [];
  if (Object.keys(rentDepositCounts).length > 0) {
    const mostFreqDeposit = Object.entries(rentDepositCounts).sort((a, b) => b[1] - a[1])[0][0];
    rentRangeParts.push(`ودیعه: ${RENT_DEPOSIT_LABEL_MAP[mostFreqDeposit] || mostFreqDeposit}`);
  }
  if (Object.keys(rentMonthlyCounts).length > 0) {
    const mostFreqMonthly = Object.entries(rentMonthlyCounts).sort((a, b) => b[1] - a[1])[0][0];
    rentRangeParts.push(`اجاره: ${RENT_MONTHLY_LABEL_MAP[mostFreqMonthly] || mostFreqMonthly}`);
  }
  const rentRange = rentRangeParts.length > 0 ? rentRangeParts.join("، ") : "نامشخص";

  // ─── دسته‌بندی قیمتی ───
  const priceCategories = {
    under1M: priceValues.filter((p) => p < 1_000_000_000).length,
    m1to5: priceValues.filter((p) => p >= 1_000_000_000 && p < 5_000_000_000).length,
    m5to20: priceValues.filter((p) => p >= 5_000_000_000 && p < 20_000_000_000).length,
    above20B: priceValues.filter((p) => p >= 20_000_000_000).length,
    negotiable: pageViews.filter((pv) => pv.path?.includes("price=0") || pv.path?.includes("price=توافقی")).length,
    rental: Object.keys(rentDepositCounts).length + Object.keys(rentMonthlyCounts).length,
  };

  return {
    likelyPropertyType: propertyTypeDistribution[0]?.type || "نامشخص",
    mostFrequentCity: cityDistribution[0]?.city || "نامشخص",
    mostFrequentProvince,
    totalSearches: searchPaths.length,
    searchCities: cityDistribution.slice(0, 10).map((c) => c.city),
    searchPropertyTypes: propertyTypeDistribution.slice(0, 10).map((t) => t.type),
    priceRange,
    rentRange,
    hasNegotiable: priceCategories.negotiable > 0,
    negotiableCount: priceCategories.negotiable,
    priceCategories,
    buyerProfile: getBuyerProfile(dealTypeDistribution, propertyTypeDistribution),
    cityDistribution: cityDistribution.slice(0, 10),
    provinceDistribution,
    dealTypeDistribution,
    propertyTypeDistribution,
    areaDistribution,
    districtDistribution: districtDistribution.slice(0, 5),
  };
}

function getBuyerProfile(dealTypes: any[], propertyTypes: any[]): string {
  const dominantDeal = dealTypes[0]?.type || "نامشخص";
  const dominantProp = propertyTypes[0]?.type || "نامشخص";
  return `${dominantDeal} ${dominantProp}`;
}

function calculateInteractionScore(data: {
  viewedCount: number;
  favoritesCount: number;
  pageViewsCount: number;
  user: any;
}): number {
  let score = 0;
  score += Math.min(data.viewedCount * 2, 30);
  score += Math.min(data.favoritesCount * 5, 25);
  score += Math.min(Math.floor(data.pageViewsCount / 5) * 2, 15);
  if (data.user.phoneVerified) score += 10;
  if (data.user.nationalCodeVerified) score += 5;
  if (data.user.firstName && data.user.lastName) score += 5;
  return Math.min(score, 100);
}

function getScoreBreakdown(
  viewedCount: number,
  favoritesCount: number,
  pageViewsCount: number,
  user: any,
) {
  return {
    viewsScore: Math.min(viewedCount * 2, 30),
    bookmarksScore: Math.min(favoritesCount * 5, 25),
    activityScore: Math.min(Math.floor(pageViewsCount / 5) * 2, 15),
    verificationScore: (user.phoneVerified ? 5 : 0) + (user.nationalCodeVerified ? 5 : 0),
    profileScore: user.firstName && user.lastName ? 5 : 0,
  };
}