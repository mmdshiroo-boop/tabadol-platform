// index.ts
import express from "express";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import swaggerUi from "swagger-ui-express";
import { getPublicProfile } from "./controllers/user.controller";
import { connectDB } from "./config/db";
import { specs } from "./config/swagger";
import { initSocket } from "./socket";
import { startBulkWorker } from "./controllers/bulkAd.controller";

// میدل‌ورها
import { apiLogger } from "./middleware/apiLogger.middleware";
import { errorHandler } from "./middleware/errorHandler";
import { protect, adminOnly } from "./middleware/auth.middleware";
import { cookieAuditMiddleware } from "./middleware/cookieAudit.middleware";

// روت‌ها
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import superAdminRoutes from "./routes/super-admin.routes";
import publicRoutes from "./routes/public.routes";
import propertyRoutes from "./routes/property.routes";
import adRoutes from "./routes/ad.routes";
import categoryRoutes from "./routes/category.routes";
import locationRoutes from "./routes/location.routes";
import locationMapRoutes from "./routes/locationMap.routes";
import financialRoutes from "./routes/financial.routes";
import agentRoutes from "./routes/agent.routes";
import marketRoutes from "./routes/market.routes";
import conversationRoutes from "./routes/conversation.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import graphRoutes from "./routes/graph.routes";
import favoriteRoutes from "./routes/favorite.routes";
import notificationRoutes from "./routes/notification.routes";
import consultingRoutes from "./routes/consulting.routes";
import reportRoutes from "./routes/report.routes";
import botRoutes from "./routes/bot.routes";
import pageViewRoutes from "./routes/pageView.routes";
import expertRoutes from "./routes/expert.routes";
import developerRoutes from "./routes/developer.routes";
import vipRoutes from "./routes/vip.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import adBannerRoutes from "./routes/adBanner.routes";
import analyticsRoutes from "./routes/analytics.routes";
import sessionRoutes from "./routes/session.routes";
import ticketRoutes from "./routes/ticket.routes";
import commentRoutes from "./routes/comment.routes";
import reactionRoutes from "./routes/reaction.routes";
import roleRoutes from "./routes/role.routes";
import chatRouter from "./routes/chat.routes";
import messageRouter from "./routes/message.routes";
import watermarkRoutes from "./routes/watermark.routes";
import loyaltyRoutes from "./routes/loyalty.routes";
import adminLoyaltyRoutes from "./routes/adminLoyalty.routes";
import verificationRoutes from "./routes/verification.routes";
import rewardRoutes from "./routes/reward.routes";
import followRoutes from "./routes/follow.routes";
import adminRewardRoutes from "./routes/adminReward.routes";
import agentClubRoutes from "./routes/agentClub.routes";
import adminAgentClubRoutes from "./routes/adminAgentClub.routes";
import superAdminAgentClubRoutes from "./routes/superAdminAgentClub.routes";
dotenv.config();

const app = express();

// ============================================================
// میدل‌ورهای عمومی (Global Middlewares)
// ============================================================
app.use(
  cors({
    origin: [
      "https://tabadol-platform.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // ۵۰ مگابایت
    useTempFiles: false,
    abortOnLimit: true,
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(apiLogger); // لاگ کلی همه درخواست‌ها

// ============================================================
// مسیرهای کاملاً عمومی (بدون نیاز به احراز هویت)
// ============================================================
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/locations", locationRoutes); // شامل استان‌ها، شهرها، IP و Reverse Geocode
app.use("/api/categories", categoryRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/page-view", pageViewRoutes);
app.use("/api/bot", botRoutes);
app.use("/api", chatRouter);
app.use("/api", messageRouter);

// ایجاد درخواست مشاوره (عمومی یا نیمه‌خصوصی)
app.post("/api/consulting", consultingRoutes);

// ============================================================
// مسیرهای محافظت‌شده (نیاز به لاگین و احراز هویت - Protect)
// ============================================================
app.use("/api", protect);
app.use(cookieAuditMiddleware);

app.use("/api/users", userRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/ad-banners", adBannerRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users/sessions", sessionRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api", reactionRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/consulting", consultingRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/watermark", watermarkRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/admin/loyalty", adminLoyaltyRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/admin/rewards", adminRewardRoutes);
app.get("/api/users/public/:id", getPublicProfile);
app.use("/api/agent/club", agentClubRoutes); 
app.use("/api/admin/agent-clubs", adminAgentClubRoutes);
app.use("/api/super-admin/agent-clubs", superAdminAgentClubRoutes);
// ============================================================
// مسیرهای پنل ادمین و نقشه (همگام‌سازی شده با پیشوند /api/locations)
// ============================================================
// این بخش مشکل خطای 404 نقشه را به طور کامل برطرف می‌کند
app.use("/api/locations", locationMapRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/super-admin/financial", financialRoutes);
app.use("/api/super-admin", superAdminRoutes);

// ============================================================
// Swagger و Health Check
// ============================================================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, {}));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ============================================================
// مدیریت خطای 404 و Error Handler مرکزی
// ============================================================
app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  }),
);

const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(errorHandler);

// ============================================================
// راه‌اندازی سرور و اتصال به دیتابیس
// ============================================================
const PORT = parseInt(process.env.PORT || "5001", 10);

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected successfully.");

    // 🟢 راه‌اندازی Worker پردازش فله‌ای (بعد از دیتابیس، قبل از سرور)
    startBulkWorker();
    console.log("🔄 Bulk worker started in background.");

    const server = http.createServer(app);
    initSocket(server);
    server.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`),
    );
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();