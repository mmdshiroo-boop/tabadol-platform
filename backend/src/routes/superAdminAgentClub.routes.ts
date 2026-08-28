import { Router } from "express";
import { protect, superAdminOnly } from "../middleware/auth.middleware";
import {
  deleteClub,
  deleteMember,
  updateMember,
  updateClubSettings,
} from "../controllers/superAdminAgentClub.controller";
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
router.use(superAdminOnly);

router.get("/", getAllClubs);
router.get("/stats", getSystemStats);
router.get("/:id", getClubDetails);
router.get("/:id/members", getClubMembers);
router.get("/:id/campaigns", getClubCampaigns);
router.get("/:id/activities", getClubActivities);

router.delete("/:id", deleteClub);
router.delete("/:id/members/:memberId", deleteMember);
router.put("/:id/members/:memberId", updateMember);
router.put("/:id/settings", updateClubSettings);

export default router;