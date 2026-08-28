import { Request, Response, NextFunction } from "express";
import {
  getLoyaltyStatus,
  getPointsHistory,
  applyReferralCode,
} from "../services/loyalty.service";
import { LoyaltyTier } from "../models/LoyaltyTier";
import { AuthRequest } from "../middleware/auth.middleware";
import { User } from "../models/User.model";
import { Agent } from "../models/Agent.model";
import { addMemberByUserId } from "../services/agentClub.service";
// دریافت وضعیت باشگاه کاربر (امتیاز، سطح، کد معرف)
export const getMyLoyalty = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user._id;
    const status = await getLoyaltyStatus(userId);
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

// دریافت تاریخچه امتیازات کاربر
export const getMyPointsHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user._id;
    const history = await getPointsHistory(userId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// ثبت کد معرف توسط کاربر (در صورتی که قبلاً ثبت نکرده)
export const applyReferral = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user._id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "کد معرف الزامی است" });
    }
    await applyReferralCode(userId, code);
    res.status(200).json({ success: true, message: "کد معرف با موفقیت ثبت شد" });
    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
if (referrer && referrer.role === "agent") {
  const agent = await Agent.findOne({ userId: referrer._id });
  if (agent) {
    await addMemberByUserId(agent._id.toString(), userId);
  }
}
  } catch (error) {
    next(error);
  }
};



export const getPublicTiers = async (req: AuthRequest, res: Response) => {
  try {
    const tiers = await LoyaltyTier.find({ isActive: true })
      .sort({ minPoints: 1 })
      .lean();
    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error("Get public tiers error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت سطوح" });
  }
};