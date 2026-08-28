// backend/src/routes/user.routes.ts
import { Router, Response } from "express";
import {
  AuthRequest,
  protect,
  hasPermission,
} from "../middleware/auth.middleware";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  getVipStats,
  getVipAnalytics,
  upgradeToVipAd,
  verifyIdentity,
  getMyAds,
  unblockUser,
  blockUser,
  checkBlockStatus,
  changePassword,
} from "../controllers/user.controller";
import path from "path";
import fs from "fs";
import { FileArray } from "express-fileupload";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notificationSetting.controller";
import { User } from "../models";
const router = Router();

router.post(
  "/upload-avatar",
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as FileArray; // 👈 تایپ‌گذاری صحیح

      if (!files || !files.avatar) {
        return res.status(400).json({
          success: false,
          message: "فایلی ارسال نشده است",
        });
      }

      const file = files.avatar as any; // حالا avatar در دسترس است
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.name).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (!mimetype || !extname) {
        return res.status(400).json({
          success: false,
          message: "فقط تصاویر مجاز هستند (jpeg, jpg, png, gif, webp)",
        });
      }

      if (file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "حجم تصویر باید کمتر از ۲ مگابایت باشد",
        });
      }

      const uploadDir = path.join(__dirname, "../../uploads/avatars");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = `avatar-${uniqueSuffix}${path.extname(file.name)}`;
      const filePath = path.join(uploadDir, filename);

      await file.mv(filePath);

      const avatarPath = `/uploads/avatars/${filename}`;
      await User.findByIdAndUpdate(req.user?._id, { avatar: avatarPath });

      res.json({
        success: true,
        data: { avatar: avatarPath },
        message: "عکس با موفقیت آپلود شد",
      });
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      res
        .status(500)
        .json({ success: false, message: "خطا در ذخیره‌سازی عکس" });
    }
  },
);

// ─── حذف آواتار ───
router.delete("/avatar", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }
    if (user.avatar) {
      const filePath = path.join(__dirname, "../../..", user.avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    user.avatar = undefined;
    await user.save();
    res.json({ success: true, message: "عکس پروفایل با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete avatar error:", error);
    res.status(500).json({ success: false, message: "خطا در حذف عکس" });
  }
});

// ─── مسیرهای شخصی کاربر ───
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/profile/change-password", protect, changePassword);
router.put("/change-password", protect, changePassword);
router.get("/my-ads", protect, getMyAds);
router.post("/block", protect, blockUser);
router.post("/unblock", protect, unblockUser);
router.get("/is-blocked/:userId", protect, checkBlockStatus);
router.post("/verify-identity", protect, verifyIdentity);
router.get("/notification-settings", protect, getNotificationSettings);
router.put("/notification-settings", protect, updateNotificationSettings);
// ─── مسیرهای VIP ───
router.get("/vip/stats", protect, hasPermission("vip:read"), getVipStats);
router.get(
  "/vip/analytics",
  protect,
  hasPermission("vip:read"),
  getVipAnalytics,
);
router.post(
  "/ads/vip/upgrade",
  protect,
  hasPermission("vip:read"),
  upgradeToVipAd,
);

// ─── مسیرهای مدیریت کاربران (ادمین / سوپرادمین) ───
router.get("/admin/all", protect, hasPermission("users:read"), getAllUsers);
router.get("/admin/:id", protect, hasPermission("users:read"), getUserById);
router.put(
  "/admin/:id/role",
  protect,
  hasPermission("users:write"),
  updateUserRole,
);
router.put("/admin/:id/ban", protect, hasPermission("users:ban"), banUser);
router.put("/admin/:id/unban", protect, hasPermission("users:ban"), unbanUser);
router.delete("/admin/:id", protect, hasPermission("users:delete"), deleteUser);
export default router;
