import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.middleware";
import {
  getAllClubs,
  getSystemStats,
  getClubDetails,
  getClubMembers,
  getClubCampaigns,
  getClubActivities,
} from "../controllers/adminAgentClub.controller";

const router = Router();

router.use(protect);
router.use(adminOnly);

router.get("/", getAllClubs);
router.get("/stats", getSystemStats);
router.get("/:id", getClubDetails);
router.get("/:id/members", getClubMembers);
router.get("/:id/campaigns", getClubCampaigns);
router.get("/:id/activities", getClubActivities);

export default router;