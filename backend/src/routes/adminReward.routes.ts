import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.middleware";
import {
  adminGetRewards,
  adminCreateReward,
  adminUpdateReward,
  adminDeleteReward,
} from "../controllers/adminReward.controller";

const router = Router();

router.use(protect);
router.use(requireRole("admin", "super_admin"));

router.get("/", adminGetRewards);
router.post("/", adminCreateReward);
router.put("/:id", adminUpdateReward);
router.delete("/:id", adminDeleteReward);

export default router;