import mongoose from "mongoose";
import { VipPlan } from "../models/VipPlan.model";
import { VipSubscription } from "../models/VipSubscription.model";
import { User } from "../models/User.model";
import { createAuditLog } from "./auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { Request } from "express";
import { UserSubscription } from "../models/UserSubscription.model";
import { Favorite } from "../models";
import { grantPoints } from "./loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";

export class VipService {
  static async getActivePlans(): Promise<any[]> {
    const plans = await VipPlan.find({ isActive: true }).sort({ price: 1 });
    return plans.map((p) => ({
      id: p._id,
      name: p.name,
      nameEn: p.nameEn,
      description: p.description,
      price: p.price,
      duration: p.duration,
      features: p.features,
      discount: p.discount,
      isPopular: p.priority === 1,
    }));
  }

  // جایگزین تابع getCurrentSubscription با این نسخه
  static async getCurrentSubscription(userId: string): Promise<any | null> {
    const subscription = await UserSubscription.findOne({
      user: new mongoose.Types.ObjectId(userId), // ✅ user
      status: "active",
      endDate: { $gt: new Date() },
    }).populate("plan"); // ✅ plan نه planId

    if (!subscription) return null;

    const plan = subscription.plan as any;

    return {
      name: plan?.name || "اشتراک ویژه",
      startDate: subscription.startDate, // ✅ اضافه شد
      endDate: subscription.endDate, // ✅ جایگزین expiresAt
      isActive: true,
    };
  }

  static async getVipStats(userId: string): Promise<any> {
    const subscription = await this.getCurrentSubscription(userId);
    const isVip = !!subscription;

    const adsCount = await mongoose
      .model("Ad")
      .countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
    const vipAdsCount = await mongoose.model("Ad").countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isVip: true,
    });

    const totalViews = await mongoose
      .model("Ad")
      .aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]);
    const vipAdViews = await mongoose.model("Ad").aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId), isVip: true },
      },
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);

    // مقدار واقعی ذخیره‌شده‌ها از مدل Favorite
    const savedAdsCount = await Favorite.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });

    return {
      isVip,
      totalAds: adsCount,
      vipAdsCount,
      totalViews: totalViews[0]?.total || 0,
      vipAdViews: vipAdViews[0]?.total || 0,
      savedAds: savedAdsCount,
      rank: 42,
      weeklyGrowth: 15,
      savedIncrease: 3,
      subscriptionEndDate: subscription?.endDate || null, // ✅ همین یک خط
    };
  }

  static async createUpgradeRequest(
    userId: string,
    planId: string,
    req?: Request,
  ): Promise<{ paymentUrl: string }> {
    const plan = await VipPlan.findById(planId);
    if (!plan) throw new Error("پلن یافت نشد");

    await createAuditLog({
      userId,
      action: AuditAction.SYSTEM,
      resource: "VipPlan",
      resourceId: planId,
      description: `کاربر درخواست ارتقا به پلن «${plan.name}» را ثبت کرد.`,
      req,
    });

    return {
      paymentUrl: `/panel/vip/upgrade/verify?planId=${planId}&amount=${plan.price}`,
    };
  }

  static async verifyPayment(
    userId: string,
    planId: string,
    paymentId: string,
    req?: Request,
  ): Promise<boolean> {
    const plan = await VipPlan.findById(planId);
    if (!plan) throw new Error("پلن یافت نشد");

    await VipSubscription.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), status: "active" },
      { status: "expired" },
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const subscription = await VipSubscription.create({
      userId: new mongoose.Types.ObjectId(userId),
      planId: plan._id,
      status: "active",
      startDate,
      endDate,
      amount: plan.price,
      paymentId,
    });

    await User.findByIdAndUpdate(userId, { role: "vip" });

    // 🆕 اعطای امتیاز خرید VIP
    await grantPoints(
      userId,
      LOYALTY_RULES.VIP_PURCHASE,
      "vip_purchase",
      "پاداش خرید اشتراک ویژه",
      { planId: plan._id.toString(), amount: plan.price }
    );

    await createAuditLog({
      userId,
      action: AuditAction.SUBSCRIPTION_PURCHASED,
      resource: "VipPlan",
      resourceId: plan._id.toString(),
      description: `کاربر پلن VIP «${plan.name}» را با موفقیت خرید و فعال کرد.`,
      metadata: { amount: plan.price, endDate },
      req,
    });

    return true;
  }
}