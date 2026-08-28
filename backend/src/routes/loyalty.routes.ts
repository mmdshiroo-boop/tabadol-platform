import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import {
  getMyLoyalty,
  getMyPointsHistory,
  applyReferral,
  getPublicTiers,
} from "../controllers/loyalty.controller";

const router = Router();

router.use(protect); // همه مسیرها نیاز به ورود دارند

router.get("/me", getMyLoyalty);
router.get("/history", getMyPointsHistory);
router.post("/referral/apply", applyReferral);
router.get("/tiers", getPublicTiers);
export default router;