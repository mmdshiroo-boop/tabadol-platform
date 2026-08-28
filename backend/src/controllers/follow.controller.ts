import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Follow } from "../models/Follow.model";
import { User } from "../models/User.model";
import { sendNotificationToUser } from "../services/notification.service";

// فالو کردن کاربر
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user._id;
    const followingId = String(req.params.id);

    if (followerId.toString() === followingId) {
      return res.status(400).json({ success: false, message: "نمی‌توانید خودتان را فالو کنید" });
    }

    const existing = await Follow.findOne({ follower: followerId, following: followingId });
    if (existing) {
      return res.status(400).json({ success: false, message: "قبلاً فالو شده است" });
    }

    await Follow.create({ follower: followerId, following: followingId });

    // 🆕 ارسال اعلان به کاربر هدف
    const follower = await User.findById(followerId).select("firstName lastName").lean();
    const followerName = follower ? `${follower.firstName || ""} ${follower.lastName || ""}`.trim() : "کاربر";
    try {
      await sendNotificationToUser(
        followingId,
        "👋 فالوور جدید",
        `${followerName} شما را دنبال کرد.`,
        "info",
        `/profile/${followerId}`,
        { followerId: followerId.toString() }
      );
    } catch (notifError) {
      console.error("Error sending follow notification:", notifError);
    }

    res.json({ success: true, message: "فالو شد" });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ success: false, message: "خطا در فالو" });
  }
};

// آنفالو کردن کاربر
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user._id;
    const followingId = String(req.params.id);

    await Follow.findOneAndDelete({ follower: followerId, following: followingId });

    res.json({ success: true, message: "آنفالو شد" });
  } catch (error) {
    console.error("Unfollow error:", error);
    res.status(500).json({ success: false, message: "خطا در آنفالو" });
  }
};

// دریافت تعداد فالوور/فالوینگ و وضعیت فالو کاربر لاگین‌شده
export const getFollowCounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const [followers, following] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);

    let isFollowing = false;
    if (req.user) {
      isFollowing = !!(await Follow.exists({ follower: req.user._id, following: userId }));
    }

    res.json({ success: true, data: { followers, following, isFollowing } });
  } catch (error) {
    console.error("Get follow counts error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت آمار فالو" });
  }
};

// 🆕 دریافت لیست فالوورهای یک کاربر
export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const followers = await Follow.find({ following: userId })
      .populate("follower", "firstName lastName avatar isVerified role")
      .lean();

    res.json({
      success: true,
      data: followers.map((f: any) => f.follower),
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت فالوورها" });
  }
};

// 🆕 دریافت لیست دنبال‌شونده‌های یک کاربر
export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const following = await Follow.find({ follower: userId })
      .populate("following", "firstName lastName avatar isVerified role")
      .lean();

    res.json({
      success: true,
      data: following.map((f: any) => f.following),
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت دنبال‌شونده‌ها" });
  }
};