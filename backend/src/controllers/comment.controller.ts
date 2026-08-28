// backend/src/controllers/comment.controller.ts
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Comment } from "../models/Comment.model";
import { Ad } from "../models/Ad.model";
import { User } from "../models/User.model";
import { sendNotificationToUser } from "../services/notification.service";
import { createAuditLog } from "../services/auditLog.service";
import { AuditAction } from "../models/AuditLog.model";
import { grantPointsIfNotGranted } from "../services/loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { adId, content, parentId } = req.body;
    const userId = req.user._id;

    const commentData: any = { ad: adId, user: userId, content };
    if (parentId) commentData.parent = parentId;

    const comment = await Comment.create(commentData);
    // 🆕 اعطای امتیاز ثبت نظر (فقط یک بار برای هر آگهی)
    try {
    await grantPointsIfNotGranted(
  userId.toString(),
  LOYALTY_RULES.COMMENT,
  `comment_${adId}`,
  "ثبت نظر",
  { adId }
);
  
} catch (pointError) {
  console.error("Error granting points for comment:", pointError);
}
    // اعلان به صاحب آگهی
    const ad = await Ad.findById(adId).lean();
    if (ad && ad.userId && ad.userId.toString() !== userId.toString()) {
      const owner = await User.findById(ad.userId).lean();
      if (owner) {
        await sendNotificationToUser(
          owner._id.toString(),
          "💬 نظر جدید برای آگهی شما",
          `${req.user.firstName || "کاربر"} نظری برای آگهی «${ad.title}» ثبت کرد: "${content.substring(0, 50)}..."`,
          "new_comment",
          `/ad/${adId}`,
          { adId, commentId: comment._id },
        );
      }
    }

    // اعلان به نویسندهٔ کامنت اصلی در صورت پاسخ
    if (parentId) {
      const parentComment = await Comment.findById(parentId).lean();
      if (
        parentComment &&
        parentComment.user.toString() !== userId.toString()
      ) {
        await sendNotificationToUser(
          parentComment.user.toString(),
          "💬 پاسخ به نظر شما",
          `${req.user.firstName || "کاربر"} به نظر شما پاسخ داد: "${content.substring(0, 50)}..."`,
          "new_comment_reply",
          `/ad/${adId}`,
          { adId, commentId: comment._id, parentCommentId: parentId },
        );
      }
    }

    // Audit log
    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.SYSTEM,
      resource: "Comment",
      resourceId: comment._id.toString(),
      description: `کاربر ${req.user?.firstName || req.user?.phone} روی آگهی "${ad?.title || adId}" کامنت جدیدی ثبت کرد.`,
      metadata: { adId, parentId },
      req,
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error: any) {
    console.error("Error adding comment:", error);
    res.status(500).json({ success: false, message: "خطا در ثبت نظر" });
  }
};

export const getAdComments = async (req: AuthRequest, res: Response) => {
  try {
    const { adId } = req.params;
    const comments = await Comment.find({ ad: adId, isApproved: true })
      .populate("user", "firstName lastName avatar")
      .sort({ createdAt: 1 });
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت نظرات" });
  }
};

export const getMyAdsComments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const ads = await Ad.find({ userId: userId }).select("_id");
    const adIds = ads.map((a) => a._id);

    if (adIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const comments = await Comment.find({
      ad: { $in: adIds },
    })
      .populate("user", "firstName lastName avatar")
      .populate("ad", "title _id")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error("❌ getMyAdsComments error:", error);
    res.status(500).json({ success: false, message: "خطا در دریافت نظرات" });
  }
};

export const getAllComments = async (req: AuthRequest, res: Response) => {
  try {
    const comments = await Comment.find()
      .populate("user", "firstName lastName phone")
      .populate("ad", "title")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت کامنت‌ها" });
  }
};

export const approveComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "کامنت یافت نشد" });
    comment.isApproved = true;
    await comment.save();

    // ✅ Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "Comment",
      resourceId: String(req.params.id),
      description: `ادمین ${req.user?.firstName || req.user?.phone} کامنت "${comment.content?.substring(0, 30)}..." را تأیید کرد.`,
      req,
    });

    res.json({ success: true, message: "کامنت تأیید شد", data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در تأیید کامنت" });
  }
};

export const rejectComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "کامنت یافت نشد" });
    comment.isApproved = false;
    await comment.save();

    // ✅ Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.SYSTEM,
      resource: "Comment",
      resourceId: String(req.params.id), 
      description: `ادمین ${req.user?.firstName || req.user?.phone} کامنت "${comment.content?.substring(0, 30)}..." را رد کرد.`,
      req,
    });

    res.json({ success: true, message: "کامنت رد شد", data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در رد کامنت" });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, message: "کامنت یافت نشد" });

    // ✅ Audit log
    await createAuditLog({
      userId: req.user?._id?.toString(),
      action: AuditAction.AD_DELETED,
      resource: "Comment",
      resourceId: String(req.params.id), 
      description: `ادمین ${req.user?.firstName || req.user?.phone} کامنت "${comment.content?.substring(0, 30)}..." را حذف کرد.`,
      req,
    });

    res.json({ success: true, message: "کامنت حذف شد" });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در حذف کامنت" });
  }
};
