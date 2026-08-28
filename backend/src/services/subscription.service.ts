import { Types } from "mongoose";
import { PaymentGatewayService } from "./paymentGateway.service";
import { sendNotificationToUser } from "./notification.service";
import { AppError } from "../utils/AppError";
import { SubscriptionPlan } from "../models/SubscriptionPlan.model";
import { UserSubscription } from "../models/UserSubscription.model";
import { User } from "../models";
import { VipSubscription } from "../models/VipSubscription.model";
import { createAuditLog } from "./auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { Request } from "express";
import { grantPoints } from "./loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";

export class SubscriptionService {
  static async getActivePlans(role?: string) {
    const filter: any = { isActive: true };
    if (role) filter.targetRole = role;
    return SubscriptionPlan.find(filter).sort({ price: 1 }).lean();
  }

  static async initiatePurchase(
    userId: string,
    planSlug: string,
    req?: Request,
  ) {
    const plan = await SubscriptionPlan.findOne({
      slug: planSlug,
      isActive: true,
    });
    if (!plan) throw new AppError("پلن مورد نظر یافت نشد یا غیرفعال است", 404);

    const hasActive = await this.hasActiveSubscription(userId);
    if (hasActive) throw new AppError("شما در حال حاضر اشتراک فعال دارید", 409);

    const paymentResult = await PaymentGatewayService.requestPayment({
      amount: plan.price,
      callbackUrl: `${process.env.FRONTEND_URL}/pricing/verify`,
      description: `خرید اشتراک ${plan.title}`,
    });

    const subscription = await UserSubscription.create({
      user: new Types.ObjectId(userId),
      plan: plan._id,
      endDate: new Date(),
      status: "pending",
      paymentRefId: paymentResult.authority,
    });

    await createAuditLog({
      userId,
      action: AuditAction.SYSTEM,
      resource: "Subscription",
      resourceId: subscription._id.toString(),
      description: `کاربر درخواست خرید اشتراک «${plan.title}» را ثبت کرد.`,
      req,
    });
    return {
      paymentUrl: paymentResult.url,
      authority: paymentResult.authority,
      subscriptionId: subscription._id,
    };
  }

  static async verifyAndActivate(authority: string, req?: Request) {
    const sub = await UserSubscription.findOne({
      paymentRefId: authority,
    }).populate("plan");
    if (!sub) throw new AppError("اشتراک یافت نشد", 404);

    if (sub.status === "active") {
      return {
        success: true,
        endDate: sub.endDate,
        alreadyActivated: true,
        userId: sub.user.toString(),
        amount: (sub.plan as any)?.price || 0,
        planName: (sub.plan as any)?.title || "",
        planId: (sub.plan as any)?._id?.toString() || "",
      };
    }
    if (sub.status !== "pending")
      throw new AppError("این تراکنش قابل تایید نیست", 400);

    const plan = sub.plan as any;
    const verify = await PaymentGatewayService.verifyPayment(
      authority,
      plan.price,
    );
    if (!verify.success) {
      sub.status = "cancelled";
      await sub.save();
      await createAuditLog({
        userId: sub.user.toString(),
        action: AuditAction.PAYMENT_FAILED,
        resource: "Subscription",
        resourceId: sub._id.toString(),
        description: `پرداخت اشتراک «${plan.title}» ناموفق بود.`,
        req,
      });
      throw new AppError("پرداخت توسط بانک تایید نشد", 400);
    }

    const now = new Date();
    sub.status = "active";
    sub.startDate = now;
    sub.endDate = new Date(now.getTime() + plan.durationDays * 86400000);
    sub.paymentRefId = verify.refId;
    await sub.save();
    await User.findByIdAndUpdate(sub.user, {
      role: plan.targetRole || "vip",
      isVip: true,
    });

    // 🆕 اعطای امتیاز خرید اشتراک VIP
    await grantPoints(
      sub.user.toString(),
      LOYALTY_RULES.VIP_PURCHASE,
      "vip_purchase",
      "پاداش خرید اشتراک ویژه",
      { planSlug: plan.slug, amount: plan.price }
    );

    await createAuditLog({
      userId: sub.user.toString(),
      action: AuditAction.SUBSCRIPTION_PURCHASED,
      resource: "Subscription",
      resourceId: sub._id.toString(),
      description: `کاربر اشتراک «${plan.title}» را با موفقیت خرید و فعال کرد.`,
      metadata: { amount: plan.price, endDate: sub.endDate },
      req,
    });
    sendNotificationToUser(
      sub.user.toString(),
      "🎉 اشتراک فعال شد",
      `تا ${sub.endDate.toLocaleDateString("fa-IR")}`,
      "success",
    ).catch(() => {});

    return {
      success: true,
      endDate: sub.endDate,
      userId: sub.user.toString(),
      amount: plan.price,
      planName: plan.title,
      planId: plan._id.toString(),
    };
  }

  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await UserSubscription.findOne({
      user: new Types.ObjectId(userId),
      status: "active",
      endDate: { $gt: new Date() },
    });
    return !!sub;
  }

  static async getActiveSubscription(userId: string) {
    const subscription = await VipSubscription.findOne({
      userId,
      status: "active",
      endDate: { $gt: new Date() },
    })
      .sort({ endDate: -1 })
      .populate("planId", "name")
      .lean();
    if (!subscription) return null;
    return {
      planTitle: (subscription.planId as any)?.name || "اشتراک ویژه",
      endDate: subscription.endDate,
    };
  }
}