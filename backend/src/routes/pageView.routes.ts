import { Router, Response } from "express";
import { optionalAuth, AuthRequest } from "../middleware/auth.middleware";
import { PageView } from "../models/PageView.model";

const router = Router();

router.post("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { path, referrer, sessionId } = req.body;

    if (!path) {
      return res
        .status(400)
        .json({ success: false, message: "مسیر الزامی است" });
    }

    // اگر کاربر لاگین باشد، userId از req.user گرفته می‌شود
    const userId = req.user?._id || null;

    // اگر sessionId از body نیامده باشد، از کوکی visitor_session استفاده می‌کنیم
    let finalSessionId = sessionId || req.cookies?.visitor_session || "";
    if (!finalSessionId) {
      // ساخت کوکی برای مهمان
      const crypto = await import("crypto");
      finalSessionId = crypto.randomUUID();
      res.cookie("visitor_session", finalSessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      });
    }

    await PageView.create({
      ip: req.ip || req.socket.remoteAddress || "unknown",
      path,
      referrer: referrer || "",
      sessionId: finalSessionId,
      userId: userId,
      userAgent: req.headers["user-agent"] || "",
      createdAt: new Date(),
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("❌ PageView log error:", error);
    res.status(500).json({ success: false, message: "خطا در ثبت بازدید" });
  }
});

export default router;