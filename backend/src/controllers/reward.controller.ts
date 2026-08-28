import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getAvailableRewards, redeemReward } from "../services/reward.service";
import { sendNotificationToUser } from "../services/notification.service";

export const getRewards = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getAvailableRewards(req.user._id.toString());
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get rewards error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت جوایز" });
  }
};

export const redeem = async (req: AuthRequest, res: Response) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({ success: false, message: "شناسه جایزه الزامی است" });
    }

    const result = await redeemReward(req.user._id.toString(), rewardId);

    // ارسال اعلان به کاربر
    try {
      await sendNotificationToUser(
        req.user._id.toString(),
        "🎉 جایزه دریافت شد",
        `جایزه "${(result.reward as any)?.title || "مورد نظر"}" با موفقیت دریافت شد.`,
        "success",
        "/panel/user/rewards",
        { rewardId }
      );
    } catch (notifError) {
      console.error("Error sending reward notification:", notifError);
    }

    res.json({
      success: true,
      data: result,
      message: "جایزه با موفقیت دریافت شد",
    });
  } catch (error: any) {
    console.error("Redeem reward error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "خطا در دریافت جایزه",
    });
  }
};