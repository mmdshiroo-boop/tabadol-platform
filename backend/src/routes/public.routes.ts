import { Router } from "express";
import { ApiKeyService } from "../services/apiKey.service";
import { createConsultingRequest } from "../controllers/consulting.controller";
import {
  getLocationFromIP,
  reverseGeocodeNominatim,
} from "../controllers/location.controller";
import { Settings } from "../models/Settings.model";
import { MarketPlan } from "../models/MarketPlan.model";
import { Ad } from "../models";

const router = Router();

// تست سلامت کلید
router.get("/test-api-key", async (req, res) => {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) return res.status(401).json({ error: "کلید API ارسال نشده" });

  const validation = await ApiKeyService.validateApiKey(apiKey);
  if (!validation.valid)
    return res.status(403).json({ error: validation.error });

  res.json({
    success: true,
    message: "کلید معتبر است",
    keyInfo: validation.key,
  });
});

// 🆕 دریافت آگهی‌ها با API Key (بدون JWT)
router.get("/ads", async (req, res) => {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) return res.status(401).json({ error: "کلید API ارسال نشده" });

  const validation = await ApiKeyService.validateApiKey(apiKey);
  if (!validation.valid)
    return res.status(403).json({ error: validation.error });

  // خواندن پارامترهای اختیاری
  const limit = Math.min(Number(req.query.limit) || 10, 100); // حداکثر ۱۰۰
  const skip = Number(req.query.skip) || 0;

  const ads = await Ad.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title price createdAt")
    .lean();

  res.json({
    success: true,
    count: ads.length,
    data: ads,
  });
});
router.get("/market/plans", async (req, res) => {
  try {
    const plans = await MarketPlan.find({ isActive: true })
      .sort({ price: 1 })
      .lean();
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت پلن‌ها" });
  }
});
router.get("/settings", async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "خطا در دریافت تنظیمات" });
  }
});
router.get("/api/public/location/from-ip", getLocationFromIP);
router.post("/consulting", createConsultingRequest);
router.get("/location/reverse-geocode", reverseGeocodeNominatim);
export default router;
