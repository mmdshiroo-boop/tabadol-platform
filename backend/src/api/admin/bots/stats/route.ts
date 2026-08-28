/**
 * bot.controller.ts
 * کنترلر سیستم ربات‌ها — پردازش وب‌هوک، جستجو، مدیریت پنل ادمین
 * پلتفرم املاک ایرانی
 */

import { Request, Response, NextFunction } from "express";
import {
  BotSubscriber,
  BotConfig,
  BotPlatform,
  IBotSubscriber,
} from "../../../../models/bot.model";
import {
  botService,
  BotAdResult,
  BotButton,
  BotUserInfo,
} from "../../../../services/bot.service";

// ─── تایپ‌های کمکی ────────────────────────────────────────────────────────────

/** آپدیت استاندارد تلگرام */
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    data: string;
    message?: { chat: { id: number } };
  };
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  date: number;
}

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** آپدیت استاندارد بله (ساختار مشابه تلگرام با تفاوت‌های جزئی) */
interface BaleUpdate {
  update_id: number;
  message?: BaleMessage;
  callback_query?: {
    id: string;
    from: BaleUser;
    data: string;
    message?: { chat: { id: string } };
  };
}

interface BaleMessage {
  message_id: number;
  chat: { id: string; type: string };
  from?: BaleUser;
  text?: string;
  date: number;
}

interface BaleUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** آپدیت استاندارد آیتا */
interface AitaUpdate {
  update_id: number;
  message?: AitaMessage;
  callback_query?: {
    id: string;
    from: AitaUser;
    data: string;
  };
}

interface AitaMessage {
  message_id: number;
  chat: { id: string; type: string };
  from?: AitaUser;
  text?: string;
  date: number;
}

interface AitaUser {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** نتیجه جستجو صفحه‌بندی‌شده */
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── ثابت‌ها ──────────────────────────────────────────────────────────────────

/** تعداد نتایج جستجو در هر صفحه برای ربات */
const BOT_PAGE_SIZE = 10;

/** آدرس پایه سایت (قابل تنظیم) */
const BASE_SITE_URL = process.env.BASE_SITE_URL || "https://melk-site.com";

// ═══════════════════════════════════════════════════════════════════════════════
// کنترلرهای وب‌هوک — دریافت پیام از ربات‌ها
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * پردازش آپدیت ورودی از تلگرام
 * پیام متنی و callback_query پشتیبانی می‌شود
 */
export async function handleTelegramMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: TelegramUpdate = req.body;

    // تأیید دریافت سریع (تلگرام نیاز به پاسخ سریع دارد)
    res.status(200).json({ ok: true });

    // پردازش callback_query (کلیک روی دکمه‌های اینلاین)
    if (update.callback_query) {
      await handleCallbackQuery(
        update.callback_query.from.id.toString(),
        "telegram",
        update.callback_query.data,
        update.callback_query.message?.chat?.id?.toString(),
      );
      return;
    }

    // پردازش پیام متنی
    if (!update.message?.text) return;

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // استخراج اطلاعات کاربر
    const userInfo = extractTelegramUserInfo(message);

    // ثبت/به‌روزرسانی اشتراک
    await botService.registerSubscriber(chatId, "telegram", userInfo);

    // ثبت لاگ ورودی
    const command = extractCommand(text);
    await botService.logMessage(chatId, "telegram", text, "inbound", command);

    // پردازش دستور
    await processCommand(chatId, "telegram", text);
  } catch (error) {
    console.error("[BotController] خطا در پردازش پیام تلگرام:", error);
    // در صورت ارسال پاسخ قبلی، دوباره res.send نمی‌کنیم
    if (!res.headersSent) {
      res.status(500).json({ error: "خطای سرور" });
    }
  }
}

/**
 * پردازش آپدیت ورودی از بله
 * ساختار مشابه تلگرام با تفاوت نوع شناسه (string)
 */
export async function handleBaleMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: BaleUpdate = req.body;

    // تأیید دریافت
    res.status(200).json({ ok: true });

    // پردازش callback_query
    if (update.callback_query) {
      await handleCallbackQuery(
        update.callback_query.from.id,
        "bale",
        update.callback_query.data,
        update.callback_query.message?.chat?.id,
      );
      return;
    }

    if (!update.message?.text) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text.trim();

    const userInfo: BotUserInfo = {
      chatId,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name,
      username: message.from?.username,
    };

    await botService.registerSubscriber(chatId, "bale", userInfo);

    const command = extractCommand(text);
    await botService.logMessage(chatId, "bale", text, "inbound", command);

    await processCommand(chatId, "bale", text);
  } catch (error) {
    console.error("[BotController] خطا در پردازش پیام بله:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "خطای سرور" });
    }
  }
}

/**
 * پردازش آپدیت ورودی از آیتا
 * ساختار مشابه بله با تفاوت‌های API
 */
export async function handleAitaMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: AitaUpdate = req.body;

    // تأیید دریافت
    res.status(200).json({ ok: true });

    // پردازش callback_query
    if (update.callback_query) {
      await handleCallbackQuery(
        update.callback_query.from.id,
        "aita",
        update.callback_query.data,
      );
      return;
    }

    if (!update.message?.text) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text.trim();

    const userInfo: BotUserInfo = {
      chatId,
      firstName: message.from?.first_name,
      lastName: message.from?.last_name,
      username: message.from?.username,
    };

    await botService.registerSubscriber(chatId, "aita", userInfo);

    const command = extractCommand(text);
    await botService.logMessage(chatId, "aita", text, "inbound", command);

    await processCommand(chatId, "aita", text);
  } catch (error) {
    console.error("[BotController] خطا در پردازش پیام آیتا:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "خطای سرور" });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// کنترلرهای عمومی — جستجو و دسته‌بندی (API عمومی ربات)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * جستجوی آگهی‌ها با فیلترهای ساده‌شده برای ربات
 * پارامترها: q, city, adType, priceMin, priceMax, areaMin, areaMax, page, limit
 */
export async function searchAdsForBot(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      q,
      city,
      adType,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(
      50,
      Math.max(1, parseInt(limit as string, 10) || 10),
    );

    // ساخت فیلتر
    const filter: Record<string, any> = {};
    if (q) filter.$text = { $search: q as string };
    if (city) filter.city = new RegExp(city as string, "i");
    if (adType) filter.adType = adType;
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }
    if (areaMin || areaMax) {
      filter.area = {};
      if (areaMin) filter.area.$gte = Number(areaMin);
      if (areaMax) filter.area.$lte = Number(areaMax);
    }

    // شبیه‌سازی جستجو — در پروژه واقعی از مدل Ad استفاده شود
    // import { Ad } from './Ad.model';
    // const skip = (pageNum - 1) * limitNum;
    // const ads = await Ad.find(filter).skip(skip).limit(limitNum).lean();
    // const total = await Ad.countDocuments(filter);

    // --- نتایج نمونه (جایگزین با کوئری واقعی) ---
    const total = 0;
    const ads: BotAdResult[] = [];
    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      data: ads.map(formatAdForPublicApi),
      total,
      page: pageNum,
      totalPages,
    });
  } catch (error) {
    console.error("[BotController] خطا در جستجوی آگهی:", error);
    res.status(500).json({ error: "خطای سرور در جستجو" });
  }
}

/**
 * دریافت جزئیات یک آگهی
 */
export async function getAdForBot(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    // --- نتیجه نمونه (فعلاً null) ---
    const ad: BotAdResult | null = null;

    if (!ad) {
      res.status(404).json({ error: "آگهی مورد نظر یافت نشد" });
      return;
    }

    res.json(formatAdForPublicApi(ad));
  } catch (error) {
    console.error("[BotController] خطا در دریافت آگهی:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

/**
 * لیست دسته‌بندی‌های آگهی
 */
export async function getCategories(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const categories = [
      { key: "apartment", label: "آپارتمان", icon: "🏠" },
      { key: "villa", label: "ویلایی", icon: "🏡" },
      { key: "commercial", label: "تجاری و اداری", icon: "🏢" },
      { key: "warehouse", label: "انبار و کارگاه", icon: "🏭" },
      { key: "land", label: "زمین و کلنگی", icon: "🌾" },
      { key: "suite", label: "سوئیت و هتل آپارتمان", icon: "🏨" },
    ];

    res.json({ data: categories });
  } catch (error) {
    console.error("[BotController] خطا در دریافت دسته‌بندی‌ها:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// کنترلرهای مدیریت ادمین
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * تنظیم یا به‌روزرسانی تنظیمات ربات (توکن و وب‌هوک)
 */
export async function setBotConfig(req: Request, res: Response): Promise<void> {
  try {
    const { platform, botToken, webhookUrl, isActive } = req.body;

    // اعتبارسنجی پلتفرم
    const validPlatforms: BotPlatform[] = ["telegram", "bale", "aita"];
    if (!platform || !validPlatforms.includes(platform)) {
      res.status(400).json({
        error: "پلتفرم نامعتبر. مقادیر مجاز: telegram, bale, aita",
      });
      return;
    }

    if (
      !botToken ||
      typeof botToken !== "string" ||
      botToken.trim().length === 0
    ) {
      res.status(400).json({ error: "توکن ربات الزامی است" });
      return;
    }

    // ذخیره تنظیمات
    const config = await botService.upsertConfig(platform, {
      botToken: botToken.trim(),
      webhookUrl,
      isActive: isActive !== false, // پیش‌فرض فعال
    });

    // اگر وب‌هوک داده شده، آن را تنظیم کن
    let webhookSet = false;
    if (webhookUrl) {
      webhookSet = await botService.setWebhook(platform);
    }

    res.json({
      success: true,
      data: {
        platform: config.platform,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
        webhookSet,
      },
      message: webhookSet
        ? `تنظیمات ${platform} ذخیره و وب‌هوک با موفقیت تنظیم شد`
        : `تنظیمات ${platform} ذخیره شد`,
    });
  } catch (error) {
    console.error("[BotController] خطا در تنظیم ربات:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

/**
 * دریافت تنظیمات فعلی ربات‌ها
 */
export async function getBotConfig(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const configs = await BotConfig.find({}).select("-botToken").lean();

    res.json({
      data: configs.map((c) => ({
        platform: c.platform,
        webhookUrl: c.webhookUrl,
        isActive: c.isActive,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[BotController] خطا در دریافت تنظیمات:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

/**
 * آمار استفاده از ربات‌ها
 */
export async function getBotStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await botService.getStats();
    res.json({ data: stats });
  } catch (error) {
    console.error("[BotController] خطا در دریافت آمار:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

/**
 * ارسال پیام به تمام اشتراک‌دهندگان فعال (پخش)
 */
export async function broadcastMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { message, platform } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      res.status(400).json({ error: "متن پیام الزامی است" });
      return;
    }

    // دریافت اشتراک‌دهندگان فعال (فیلتر بر اساس پلتفرم اگر مشخص شده)
    const targetPlatform = platform as BotPlatform | undefined;
    const subscribers = await botService.getActiveSubscribers(targetPlatform);

    if (subscribers.length === 0) {
      res.json({
        success: true,
        message: "اشتراک‌دهنده فعالی یافت نشد",
        sentCount: 0,
        failedCount: 0,
      });
      return;
    }

    // ارسال پیام به هر اشتراک‌دهنده
    let sentCount = 0;
    let failedCount = 0;

    // ارسال موازی با محدودیت همزمانی
    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((sub) =>
          botService.sendMessage(sub.chatId, message.trim(), sub.platform),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `پیام برای ${sentCount} نفر ارسال شد`,
      sentCount,
      failedCount,
      totalSubscribers: subscribers.length,
    });
  } catch (error) {
    console.error("[BotController] خطا در پخش پیام:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

/**
 * لیست اشتراک‌دهندگان با صفحه‌بندی
 */
export async function getSubscribers(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { page = "1", limit = "20", platform, isActive = "true" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string, 10) || 20),
    );

    // ساخت فیلتر
    const filter: Record<string, any> = {};
    if (platform) filter.platform = platform;
    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    const skip = (pageNum - 1) * limitNum;
    const [subscribers, total] = await Promise.all([
      BotSubscriber.find(filter)
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BotSubscriber.countDocuments(filter),
    ]);

    res.json({
      data: subscribers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("[BotController] خطا در دریافت لیست اشتراک‌دهندگان:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// توابع داخلی — پردازش دستورات و قالب‌بندی
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * پردازش دستورات ورودی و ارسال پاسخ مناسب
 * دستورات: /start, /search, /ad, /categories, /help, /contact
 */
async function processCommand(
  chatId: string,
  platform: BotPlatform,
  text: string,
): Promise<void> {
  const lowerText = text.toLowerCase();
  const command = extractCommand(text);

  try {
    switch (command) {
      case "/start": {
        const welcomeText =
          "🏠 به ربات جستجوی املاک خوش آمدید!\n\n" +
          "با من می‌توانید آگهی‌های املاک را جستجو کنید.\n\n" +
          "📋 دستورات:\n" +
          "/search [کلمه] — جستجوی آگهی\n" +
          "/categories — مشاهده دسته‌بندی‌ها\n" +
          "/ad [شناسه] — جزئیات آگهی\n" +
          "/help — راهنما\n" +
          "/contact — ارتباط با ما";

        const buttons = formatWelcomeButtons(platform);
        await botService.sendMessage(chatId, welcomeText, platform, {
          buttons,
        });
        break;
      }

      case "/search": {
        // استخراج عبارت جستجو
        const query = text.replace(/^\/search\s*/i, "").trim();
        if (!query) {
          await botService.sendMessage(
            chatId,
            "🔍 لطفاً عبارت جستجو را وارد کنید.\nمثال: /search آپارتمان تهران",
            platform,
          );
          return;
        }
        await performSearch(chatId, platform, query, 1);
        break;
      }

      case "/ad": {
        // استخراج شناسه آگهی
        const adId = text.replace(/^\/ad\s*/i, "").trim();
        if (!adId) {
          await botService.sendMessage(
            chatId,
            "📋 لطفاً شناسه آگهی را وارد کنید.\nمثال: /ad 6507a1b2c3d4e5f6a7b8c9d0",
            platform,
          );
          return;
        }
        await showAdDetails(chatId, platform, adId);
        break;
      }

      case "/categories": {
        const categoriesText =
          "📂 دسته‌بندی آگهی‌ها:\n\n" +
          "🏠 آپارتمان\n" +
          "🏡 ویلایی\n" +
          "🏢 تجاری و اداری\n" +
          "🏭 انبار و کارگاه\n" +
          "🌾 زمین و کلنگی\n" +
          "🏨 سوئیت و هتل آپارتمان\n\n" +
          "برای جستجو از دستور زیر استفاده کنید:\n" +
          "/search [نوع] [شهر]";

        const buttons = formatCategoryButtons(platform);
        await botService.sendMessage(chatId, categoriesText, platform, {
          buttons,
        });
        break;
      }

      case "/help": {
        const helpText =
          "📖 راهنمای استفاده:\n\n" +
          "🔍 جستجو:\n" +
          "  /search آپارتمان تهران\n" +
          "  /search ویلایی شمال\n\n" +
          "📄 جزئیات آگهی:\n" +
          "  /ad [شناسه آگهی]\n\n" +
          "📂 دسته‌بندی‌ها:\n" +
          "  /categories\n\n" +
          "📞 ارتباط با ما:\n" +
          "  /contact";
        await botService.sendMessage(chatId, helpText, platform);
        break;
      }

      case "/contact": {
        const contactText =
          "📞 ارتباط با ما:\n\n" +
          "🌐 وب‌سایت: https://melk-site.com\n" +
          "📧 ایمیل: support@melk-site.com\n" +
          "📱 تلفن: ۰۲۱-۱۲۳۴۵۶۷۸";
        await botService.sendMessage(chatId, contactText, platform);
        break;
      }

      default: {
        // اگر پیام بدون دستور (/) بود، به‌عنوان جستجو تلقی کن
        if (!text.startsWith("/")) {
          await performSearch(chatId, platform, text, 1);
        } else {
          await botService.sendMessage(
            chatId,
            "❓ دستور شناخته نشد.\nبرای مشاهده راهنما: /help",
            platform,
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error(`[BotController] خطا در پردازش دستور "${command}":`, error);
    await botService
      .sendMessage(chatId, "⚠️ خطایی رخ داد. لطفاً دوباره تلاش کنید.", platform)
      .catch(() => {});
  }
}

/**
 * پردازش callback_query — کلیک روی دکمه‌های اینلاین
 */
async function handleCallbackQuery(
  userId: string,
  platform: BotPlatform,
  data: string,
  chatId?: string,
): Promise<void> {
  const targetChatId = chatId || userId;

  try {
    // تجزیه داده callback
    const parts = data.split(":");

    if (parts[0] === "search" && parts[1] !== "noop") {
      // صفحهبندی جستجو: search:query:page:2
      const query = parts[1];
      const page = parts[3] ? parseInt(parts[3], 10) : 1;
      await performSearch(targetChatId, platform, query, page);
      return;
    }

    if (parts[0] === "category") {
      // انتخاب دسته‌بندی: category:apartment
      const categoryKey = parts[1];
      const categoryLabels: Record<string, string> = {
        apartment: "آپارتمان",
        villa: "ویلایی",
        commercial: "تجاری و اداری",
        warehouse: "انبار و کارگاه",
        land: "زمین و کلنگی",
        suite: "سوئیت و هتل آپارتمان",
      };
      const label = categoryLabels[categoryKey] || categoryKey;
      await performSearch(targetChatId, platform, label, 1);
      return;
    }
  } catch (error) {
    console.error("[BotController] خطا در پردازش callback_query:", error);
  }
}

/**
 * جستجوی آگهی و ارسال نتایج به کاربر
 * حداکثر ۱۰ نتیجه در هر پیام
 */
async function performSearch(
  chatId: string,
  platform: BotPlatform,
  query: string,
  page: number,
): Promise<void> {
  try {
    // --- کوئری واقعی (جایگزین نمونه) ---
    // import { Ad } from './Ad.model';
    // const filter: Record<string, any> = { isActive: true };
    // filter.$text = { $search: query };
    // const total = await Ad.countDocuments(filter);
    // const ads = await Ad.find(filter)
    //   .skip((page - 1) * BOT_PAGE_SIZE)
    //   .limit(BOT_PAGE_SIZE)
    //   .lean();

    // --- نتایج نمونه ---
    const ads: BotAdResult[] = [];
    const total = 0;
    const totalPages = Math.max(1, Math.ceil(total / BOT_PAGE_SIZE));

    // ساخت پیام قالب‌بندی‌شده
    const formatted = botService.buildSearchResultsMessage(
      ads,
      query,
      page,
      totalPages,
    );

    // بسته به پلتفرم دکمه‌ها را تنظیم کن
    const platformButtons =
      platform === "telegram"
        ? formatted.buttons
        : formatQuickReplyButtons(platform, formatted.buttons);

    await botService.sendMessage(chatId, formatted.text, platform, {
      buttons: platformButtons,
    });
  } catch (error) {
    console.error("[BotController] خطا در جستجو:", error);
    await botService
      .sendMessage(chatId, "⚠️ خطا در جستجو. لطفاً دوباره تلاش کنید.", platform)
      .catch(() => {});
  }
}

/**
 * نمایش جزئیات یک آگهی
 */
async function showAdDetails(
  chatId: string,
  platform: BotPlatform,
  adId: string,
): Promise<void> {
  try {
    // --- کوئری واقعی ---
    // import { Ad } from './Ad.model';
    // const ad = await Ad.findById(adId).lean();
    // if (!ad) { ... }

    // --- نتیجه نمونه ---
    const ad: BotAdResult | null = null;

    if (!ad) {
      await botService.sendMessage(
        chatId,
        "❌ آگهی مورد نظر یافت نشد.",
        platform,
      );
      return;
    }

    // ارسال کارت آگهی (عکس + متن + دکمه)
    await botService.sendAdCard(chatId, ad, platform);
  } catch (error) {
    console.error("[BotController] خطا در نمایش آگهی:", error);
    await botService
      .sendMessage(chatId, "⚠️ خطا در دریافت اطلاعات آگهی.", platform)
      .catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// توابع کمکی قالب‌بندی
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * استخراج نام دستور از متن پیام
 * مثال: "/search آپارتمان" → "/search"
 */
function extractCommand(text: string): string {
  const match = text.match(/^(\/\w+)/);
  return match ? match[1].toLowerCase() : "";
}

/**
 * استخراج اطلاعات کاربر از پیام تلگرام
 */
function extractTelegramUserInfo(message: TelegramMessage): BotUserInfo {
  return {
    chatId: message.chat.id.toString(),
    firstName: message.from?.first_name,
    lastName: message.from?.last_name,
    username: message.from?.username,
  };
}

/**
 * قالب‌بندی آگهی برای نمایش در API عمومی ربات
 */
function formatAdForPublicApi(ad: BotAdResult) {
  return {
    _id: ad._id,
    title: ad.title,
    price: ad.price,
    city: ad.city,
    district: ad.district,
    area: ad.area,
    rooms: ad.rooms,
    url: ad.url,
    thumbnail: ad.thumbnail,
  };
}

/**
 * ساخت دکمه‌های خوش‌آمدگویی بر اساس پلتفرم
 */
function formatWelcomeButtons(
  platform: BotPlatform,
): BotButton[][] | undefined {
  if (platform === "telegram") {
    // تلگرام: اینلاین کیبورد
    return [
      [
        { text: "🔍 جستجوی آگهی", callback_data: "search:noop" },
        { text: "📂 دسته‌بندی‌ها", callback_data: "categories:noop" },
      ],
      [
        { text: "📖 راهنما", callback_data: "help:noop" },
        { text: "📞 ارتباط با ما", callback_data: "contact:noop" },
      ],
    ];
  }

  // بله و آیتا: دکمه‌های سریع
  return undefined; // دکمه‌های سریع در قالب reply_markup ارسال می‌شوند
}

/**
 * ساخت دکمه‌های دسته‌بندی
 */
function formatCategoryButtons(
  platform: BotPlatform,
): BotButton[][] | undefined {
  if (platform !== "telegram") return undefined;

  return [
    [
      { text: "🏠 آپارتمان", callback_data: "category:apartment" },
      { text: "🏡 ویلایی", callback_data: "category:villa" },
    ],
    [
      { text: "🏢 تجاری", callback_data: "category:commercial" },
      { text: "🏭 انبار", callback_data: "category:warehouse" },
    ],
    [
      { text: "🌾 زمین", callback_data: "category:land" },
      { text: "🏨 سوئیت", callback_data: "category:suite" },
    ],
  ];
}

/**
 * تبدیل دکمه‌های اینلاین به دکمه‌های سریع برای بله و آیتا
 * بله و آیتا از quick_reply پشتیبانی می‌کنند
 */
function formatQuickReplyButtons(
  platform: BotPlatform,
  inlineButtons?: BotButton[][],
): BotButton[][] | undefined {
  if (platform === "telegram" || !inlineButtons) return inlineButtons;

  // برای بله و آیتا، فقط متن دکمه‌ها را نگه دار
  // بدون callback_data و url
  return inlineButtons.map((row) =>
    row.map((btn) => ({
      text: btn.text,
      // callback_data و url برای دکمه‌های سریع حذف می‌شوند
    })),
  );
}

/**
 * فرمت آگهی برای پلتفرم‌های مختلف
 * این تابع به کنترلر اجازه می‌دهد آگهی را بر اساس پلتفرم متفاوت قالب‌بندی کند
 */
export function formatAdForBot(
  ad: BotAdResult,
  platform: BotPlatform,
): { text: string; buttons?: BotButton[][] } {
  const message = botService.buildAdMessage(ad);

  switch (platform) {
    case "telegram":
      // تلگرام: با اینلاین کیبورد
      return {
        text: message.text,
        buttons: message.buttons,
      };

    case "bale":
      // بله: با دکمه‌های سریع
      return {
        text: message.text,
        buttons: message.buttons
          ? formatQuickReplyButtons("bale", message.buttons)
          : undefined,
      };

    case "aita":
      // آیتا: با دکمه‌های سریع
      return {
        text: message.text,
        buttons: message.buttons
          ? formatQuickReplyButtons("aita", message.buttons)
          : undefined,
      };

    default:
      return { text: message.text };
  }
}

/**
 * ارسال پیام به یک کاربر خاص
 * از خارج کنترلر قابل فراخوانی است
 */
export async function sendToUser(
  userId: string,
  platform: BotPlatform,
  message: string,
): Promise<boolean> {
  return await botService.sendMessage(userId, message, platform);
}

/**
 * پخش پیام به تمام اشتراک‌دهندگان
 */
export async function broadcastMessageToAll(
  message: string,
  platform?: BotPlatform,
): Promise<{ sentCount: number; failedCount: number }> {
  const subscribers = await botService.getActiveSubscribers(platform);
  let sentCount = 0;
  let failedCount = 0;

  for (const sub of subscribers) {
    const success = await botService.sendMessage(
      sub.chatId,
      message,
      sub.platform,
    );
    if (success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}
