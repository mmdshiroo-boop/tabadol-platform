import { Reward } from "../models/Reward.model";
import { Redemption } from "../models/Redemption.model";
import { User } from "../models/User.model";
import { grantPoints } from "./loyalty.service";

export async function getAvailableRewards(userId: string) {
  const rewards = await Reward.find({ isActive: true, stock: { $gt: 0 } }).lean();
  const user = await User.findById(userId).select("loyaltyPoints").lean();
  return { rewards, userPoints: user?.loyaltyPoints || 0 };
}

export async function redeemReward(userId: string, rewardId: string) {
  const reward = await Reward.findById(rewardId);
  if (!reward || !reward.isActive || reward.stock <= 0) {
    throw new Error("جایزه در دسترس نیست");
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("کاربر یافت نشد");

  if (user.loyaltyPoints < reward.pointsCost) {
    throw new Error("امتیاز کافی نیست");
  }

  // کسر امتیاز
  await grantPoints(userId, -reward.pointsCost, "reward_redemption", `دریافت جایزه: ${reward.title}`);

  // کاهش موجودی
  reward.stock -= 1;
  await reward.save();

  // ثبت درخواست
  const redemption = await Redemption.create({
    user: userId,
    reward: reward._id,
    pointsSpent: reward.pointsCost,
  });

  return redemption;
}