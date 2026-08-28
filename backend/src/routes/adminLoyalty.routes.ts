import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.middleware";
import {
  getTiers,
  createTier,
  updateTier,
  deleteTier,
  adjustUserPoints,
} from "../controllers/adminLoyalty.controller";

const router = Router();

router.use(protect);
router.use(requireRole("admin", "super_admin"));

router.get("/tiers", getTiers);
router.post("/tiers", createTier);
router.put("/tiers/:id", updateTier);
router.delete("/tiers/:id", deleteTier);
router.post("/adjust-points", adjustUserPoints);
export default router;