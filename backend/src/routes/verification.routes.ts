import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.middleware";
import {
  requestVerification,
  getMyVerificationStatus,
  getAllVerificationRequests,
  reviewVerification,
} from "../controllers/verification.controller";

const router = Router();

// مسیرهای مشاور (نیاز به ورود)
router.use(protect);

router.post("/request", requestVerification);
router.get("/my-status", getMyVerificationStatus);

// مسیرهای ادمین
router.use(requireRole("admin", "super_admin"));
router.get("/", getAllVerificationRequests);
router.put("/:id/review", reviewVerification);

export default router;