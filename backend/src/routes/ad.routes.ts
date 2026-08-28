// backend/src/routes/ad.routes.ts
import { Router } from "express";
import { protect, hasPermission } from "../middleware/auth.middleware";
import {
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  getUserAds,
  uploadImage,
  deleteImage,
  getSpecialAds,
  updateAdStatus,
  filterAds,
  getPopularCategories,
  getPriceRangeByCategory,
  getPendingAds,
  getAllAdsForAdmin,
  approveAd,
  rejectAd,
  upgradeToVipAd,
  getRejectedAds,
  getApprovedAds,
  getExpertPendingAds,
  getExpertApprovedAds,
  getExpertRejectedAds,
  advancedSearch,
  getSearchFilters,
  getCategoryNames,
  getMyAds,
  activateVip,
  deactivateVip,
  extendVip,
  activateUrgent,
  deactivateUrgent,
  extendUrgent,
  getSpecialAdsForAdmin,
  shareAd,
} from "../controllers/ad.controller";
import { requireRole } from "../middleware/role.middleware";
import { blacklistCheckMiddleware } from "../middleware/blacklistCheck.middleware";
import { optionalAuth } from "../middleware/auth.middleware";

// مسیر دریافت تک آگهی – احراز هویت اختیاری
const router = Router();

// ==================== مسیرهای عمومی ====================
router.get("/", getAds);
router.get("/special", getSpecialAds);
router.get("/filter", filterAds);
router.get("/popular-categories", getPopularCategories);
router.get("/category-names", getCategoryNames);

// مسیر جستجوی عمومی (همان advancedSearch) – برای فرانت‌اند
router.get("/search", advancedSearch);
router.get("/search/advanced", advancedSearch); // حفظ مسیر قبلی
router.get("/search/filters", getSearchFilters);

router.get("/price-range/:categoryId", getPriceRangeByCategory);

// ==================== مسیرهای نیازمند احراز هویت ====================
router.get("/my", protect, requireRole("agent"), getMyAds);
router.get("/user/me", protect, getUserAds);
router.post(
  "/",
  protect,
  hasPermission("ads:write"),
  blacklistCheckMiddleware,
  createAd,
);
router.post("/upload-image", protect, hasPermission("ads:write"), uploadImage);
router.delete(
  "/image/:filename",
  protect,
  hasPermission("ads:write"),
  deleteImage,
);
router.post(
  "/vip/upgrade",
  protect,
  hasPermission("ads:write"),
  upgradeToVipAd,
);

// ==================== مسیرهای مدیریتی ====================
router.get("/admin/pending", protect, hasPermission("ads:read"), getPendingAds);
router.get("/admin/all", protect, hasPermission("ads:read"), getAllAdsForAdmin);
router.get(
  "/admin/approved",
  protect,
  hasPermission("ads:read"),
  getApprovedAds,
);
router.get(
  "/admin/rejected",
  protect,
  hasPermission("ads:read"),
  getRejectedAds,
);
router.post(
  "/admin/:id/approve",
  protect,
  hasPermission("ads:approve"),
  approveAd,
);
router.post(
  "/admin/:id/reject",
  protect,
  hasPermission("ads:approve"),
  rejectAd,
);

// ==================== مسیرهای کارشناس ====================
router.get(
  "/expert/pending",
  protect,
  hasPermission("ads:read"),
  getExpertPendingAds,
);
router.get(
  "/expert/approved",
  protect,
  hasPermission("ads:read"),
  getExpertApprovedAds,
);
router.get(
  "/expert/rejected",
  protect,
  hasPermission("ads:read"),
  getExpertRejectedAds,
);

// ==================== مسیرهای مدیریت ویژه (VIP و فوری) ====================
router.get(
  "/admin/special",
  protect,
  hasPermission("ads:read"),
  getSpecialAdsForAdmin,
);

router.post(
  "/admin/:id/vip/activate",
  protect,
  hasPermission("ads:write"),
  activateVip,
);

router.post(
  "/admin/:id/vip/deactivate",
  protect,
  hasPermission("ads:write"),
  deactivateVip,
);

router.post(
  "/admin/:id/vip/extend",
  protect,
  hasPermission("ads:write"),
  extendVip,
);

router.post(
  "/admin/:id/urgent/activate",
  protect,
  hasPermission("ads:write"),
  activateUrgent,
);

router.post(
  "/admin/:id/urgent/deactivate",
  protect,
  hasPermission("ads:write"),
  deactivateUrgent,
);

router.post(
  "/admin/:id/urgent/extend",
  protect,
  hasPermission("ads:write"),
  extendUrgent,
);

// ==================== مسیرهای دارای پارامتر :id ====================
router.get("/:id", optionalAuth, getAdById);
router.put(
  "/:id",
  protect,
  hasPermission("ads:write"),
  blacklistCheckMiddleware,
  updateAd,
);
// ✅ اصلاح‌شده: protect اضافه شد — مالکیت در کنترلر بررسی می‌شود
router.delete("/:id", protect, deleteAd);
router.patch(
  "/:id/status",
  protect,
  hasPermission("ads:write"),
  updateAdStatus,
);
router.post("/:id/share", protect, shareAd);
export default router;