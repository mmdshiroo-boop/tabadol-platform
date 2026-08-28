
import { Router } from "express";
import { protect, hasPermission } from "../middleware/auth.middleware";
import {
  getAgentStats,
  getAgencyAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgentStatus,
  getAgentReports,
  agentAdvancedSearch,
  generateDailyReport,
} from "../controllers/agent.controller";
import {
  downloadExcelReport,
  downloadPdfReport,
} from "../controllers/agentReport.controller";

const router = Router();

router.use(protect);

// ─── آمار و گزارشات ───
router.get("/stats", getAgentStats);
router.get("/reports/list", getAgentReports);
router.get("/report/excel", downloadExcelReport);  // ← مسیر درست
router.get("/report/pdf", downloadPdfReport);      // ← مسیر درست
router.get("/advanced-search", agentAdvancedSearch);

// ─── مشاوران ───
router.get("/agency", getAgencyAgents);
router.post("/", hasPermission("users:write"), createAgent);
router.put("/:id", hasPermission("users:write"), updateAgent);
router.delete("/:id", hasPermission("users:delete"), deleteAgent);
router.patch("/:id/toggle-status", hasPermission("users:ban"), toggleAgentStatus);
router.post("/reports/daily", generateDailyReport);

export default router;