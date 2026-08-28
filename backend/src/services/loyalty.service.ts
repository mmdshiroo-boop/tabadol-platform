import crypto from "crypto";
import { User } from "../models/User.model";
import { PointsTransaction } from "../models/PointsTransaction";
import { LoyaltyTier } from "../models/LoyaltyTier";
import { LOYALTY_RULES } from "../config/loyalty";
import { sendNotificationToUser } from "./notification.service";
import { getIO } from "../socket";

// تولید کد معرف یکتا برای کاربر جدید
export async function generateReferralCode(): Promise<string> {
  let code = "";
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(4).toString("hex").toUpperCase();
    exists = !!(await User.findOne({ referralCode: code }));
  }
  return code;
}

// اعطای امتیاز به کاربر و ثبت تراکنش
export async function grantPoints(
  userId: string,
  points: number,
  reason: string,
  description?: string,
  metadata?: Record<string, any>
) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: points } },
    { new: true }
  );

  if (!user) throw new Error("کاربر پیدا نشد");

  // اصلاح: cast userId به any برای جلوگیری از خطای Mongoose
  await PointsTransaction.create({
    user: userId as any,
    points,
    reason,
    description,
    metadata,
  } as any);

  // به‌روزرسانی سطح کاربر
  await updateTier(user);

  // 🆕 ارسال اعلان کسب امتیاز
  const message = description || `شما ${points} امتیاز دریافت کردید.`;
  try {
    await sendNotificationToUser(
      userId,
      "🎁 امتیاز جدید",
      message,
      "loyalty_points_earned",
      "/panel/user/loyalty",
      { points, reason, ...(metadata || {}) }
    );

    // 🆕 ارسال رویداد بلادرنگ برای به‌روزرسانی زنگوله
    const io = getIO();
    if (io) {
      io.to(`user_${userId}`).emit("new-notification", {
        type: "loyalty_points_earned",
        points,
        reason,
      });
    }
  } catch (notifError) {
    console.error("Error sending loyalty notification:", notifError);
  }

  return user;
}

// اعطای امتیاز فقط یک بار برای هر دلیل
export async function grantPointsIfNotGranted(
  userId: string,
  points: number,
  reason: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  // اصلاح: cast userId به any
  const existing = await PointsTransaction.findOne({ user: userId as any, reason });
  if (existing) return false;
  await grantPoints(userId, points, reason, description, metadata);
  return true;
}

// محاسبه و به‌روزرسانی سطح کاربر بر اساس امتیاز فعلی
async function updateTier(user: any) {
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

  if (!newTier && tiers.length > 0) {
    newTier = tiers[tiers.length - 1];
  }

  const currentTierId = user.loyaltyTier?.toString();
  const newTierId = newTier?._id.toString();

  if (currentTierId !== newTierId) {
    user.loyaltyTier = newTier?._id;
    await user.save();

    // 🆕 ارسال اعلان ارتقای سطح
    if (newTier) {
      try {
        await sendNotificationToUser(
          user._id.toString(),
          "🎉 ارتقای سطح",
          `تبریک! شما به سطح ${newTier.name} ارتقا یافتید.`,
          "tier_upgrade",
          "/panel/user/loyalty",
          { tierName: newTier.name }
        );

        const io = getIO();
        if (io) {
          io.to(`user_${user._id}`).emit("new-notification", {
            type: "tier_upgrade",
            tierName: newTier.name,
          });
        }
      } catch (notifError) {
        console.error("Error sending tier upgrade notification:", notifError);
      }
    }
  }
}

// بقیه توابع بدون تغییر...
export async function getPointsHistory(userId: string) {
  // اصلاح: cast userId به any
  return PointsTransaction.find({ user: userId as any })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
}

export async function getLoyaltyStatus(userId: string) {
  const user = await User.findById(userId)
    .select("loyaltyPoints loyaltyTier referralCode referredBy")
    .populate("loyaltyTier", "name minPoints maxPoints benefits icon color")
    .lean();

  if (!user) throw new Error("کاربر پیدا نشد");

  const tiers = await LoyaltyTier.find({ isActive: true }).sort({ minPoints: 1 }).lean();
  let nextTier = null;
  for (const tier of tiers) {
    if (user.loyaltyPoints < tier.minPoints) {
      nextTier = tier;
      break;
    }
  }

  return {
    points: user.loyaltyPoints,
    tier: user.loyaltyTier,
    nextTier,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
  };
}

export async function applyReferralCode(userId: string, code: string) {
  const referrer = await User.findOne({ referralCode: code.toUpperCase() });
  if (!referrer) {
    throw new Error("کد معرف نامعتبر است");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("کاربر پیدا نشد");
  if (user.referredBy) {
    throw new Error("شما قبلاً از کد معرف استفاده کرده‌اید");
  }

  // اصلاح: cast referrer._id به any
  user.referredBy = referrer._id as any;
  await user.save();

  await grantPoints(referrer._id.toString(), LOYALTY_RULES.REFERRAL_BONUS, "referral", "پاداش معرفی کاربر جدید", { referredUserId: user._id });
  await grantPoints(user._id.toString(), LOYALTY_RULES.REFERRAL_BONUS, "referral", "پاداش استفاده از کد معرف");

  return true;
}