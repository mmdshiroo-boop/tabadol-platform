// backend/src/routes/agentClub.routes.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { protect, requireRole } from "../middleware/auth.middleware";
import {
  getClubOverview,
  getMembers,
  addMember,
  removeMember,
  updateMember,
  bulkRemoveMembers,
  exportMembers,
  importMembers,
  sendSms,
  getSmsCampaigns,
  getAnalytics,
  getClubReport,
  getRanking,
  getGraph,
  getMemberDetail,
  getActivities,
} from "../controllers/agentClub.controller";

const router = Router();

// محدودیت ارسال پیامک: ۵ درخواست در هر ۱۰ دقیقه
const smsRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: "تعداد درخواست‌های ارسال پیامک بیش از حد مجاز است" },
});

router.use(protect);
router.use(requireRole("agent", "admin", "super_admin"));

// ─── اعضا ───
router.get("/members", getMembers);
router.post("/members", addMember);
router.delete("/members/:id", removeMember);
router.put("/members/:id", updateMember);
router.post("/members/bulk-delete", bulkRemoveMembers);
router.get("/members/export", exportMembers);
router.post("/members/import", importMembers);
router.get("/members/:id/detail", getMemberDetail); // باید بعد از مسیرهای ثابت باشد تا تداخل نکند

// ─── پیامک ───
router.post("/sms/send", smsRateLimit, sendSms);
router.get("/sms/campaigns", getSmsCampaigns);

// ─── آنالیتیکس و گزارش ───
router.get("/analytics", getAnalytics);
router.get("/report/:period", getClubReport);

// ─── رتبه‌بندی و گراف ───
router.get("/ranking", getRanking);
router.get("/graph", getGraph);

// ─── داشبورد ───
router.get("/overview", getClubOverview);

router.get("/activities", getActivities);

export default router;