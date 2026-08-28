import { Router } from "express";
import { protect, optionalAuth } from "../middleware/auth.middleware";
import {
  followUser,
  unfollowUser,
  getFollowCounts,
  getFollowers,
  getFollowing,
} from "../controllers/follow.controller";

const router = Router();

router.get("/counts/:id", optionalAuth, getFollowCounts);
router.get("/followers/:id", optionalAuth, getFollowers);
router.get("/following/:id", optionalAuth, getFollowing);
router.post("/:id", protect, followUser);
router.delete("/:id", protect, unfollowUser);

export default router;