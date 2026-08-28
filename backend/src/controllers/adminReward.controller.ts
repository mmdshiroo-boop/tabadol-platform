import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Reward } from "../models/Reward.model";

export const adminGetRewards = async (req: AuthRequest, res: Response) => {
  try {
    const rewards = await Reward.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error("Admin get rewards error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت جوایز" });
  }
};

export const adminCreateReward = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, pointsCost, stock, type, discountPercent, discountAmount } = req.body;
    const reward = await Reward.create({ title, description, pointsCost, stock, type, discountPercent, discountAmount });
    res.status(201).json({ success: true, data: reward });
  } catch (error) {
    console.error("Admin create reward error:", error);
    res.status(500).json({ success: false, message: "خطا در ایجاد جایزه" });
  }
};

export const adminUpdateReward = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reward = await Reward.findByIdAndUpdate(id, req.body, { new: true });
    if (!reward) return res.status(404).json({ success: false, message: "جایزه یافت نشد" });
    res.json({ success: true, data: reward });
  } catch (error) {
    console.error("Admin update reward error:", error);
    res.status(500).json({ success: false, message: "خطا در ویرایش جایزه" });
  }
};

export const adminDeleteReward = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await Reward.findByIdAndDelete(id);
    res.json({ success: true, message: "جایزه حذف شد" });
  } catch (error) {
    console.error("Admin delete reward error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف جایزه" });
  }
};