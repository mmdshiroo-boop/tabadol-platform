import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { getRewards, redeem } from "../controllers/reward.controller";

const router = Router();
router.use(protect);
router.get("/", getRewards);
router.post("/redeem", redeem);

export default router;