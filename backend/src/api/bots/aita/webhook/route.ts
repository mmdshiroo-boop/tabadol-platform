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

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── ثابت‌ها ──────────────────────────────────────────────────────────────────

const BOT_PAGE_SIZE = 10;
const BASE_SITE_URL = process.env.BASE_SITE_URL || "https://melk-site.com";

// ═══════════════════════════════════════════════════════════════════════════════
// کنترلرهای وب‌هوک
// ═══════════════════════════════════════════════════════════════════════════════

export async function handleTelegramMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: TelegramUpdate = req.body;
    res.status(200).json({ ok: true });

    if (update.callback_query) {
      await handleCallbackQuery(
        update.callback_query.from.id.toString(),
        "telegram",
        update.callback_query.data,
        update.callback_query.message?.chat?.id?.toString(),
      );
      return;
    }

    if (!update.message?.text) return;

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    const userInfo = extractTelegramUserInfo(message);
    await botService.registerSubscriber(chatId, "telegram", userInfo);

    const command = extractCommand(text);
    await botService.logMessage(chatId, "telegram", text, "inbound", command);

    await processCommand(chatId, "telegram", text);
  } catch (error) {
    console.error("[BotController] خطا در پردازش پیام تلگرام:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "خطای سرور" });
    }
  }
}

export async function handleBaleMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: BaleUpdate = req.body;
    res.status(200).json({ ok: true });

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

export async function handleAitaMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const update: AitaUpdate = req.body;
    res.status(200).json({ ok: true });

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
// کنترلرهای عمومی
// ═══════════════════════════════════════════════════════════════════════════════

export async function searchAdsForBot(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const q = String(req.query.q || "");
    const city = String(req.query.city || "");
    const adType = String(req.query.adType || "");
    const priceMin = Number(req.query.priceMin) || 0;
    const priceMax = Number(req.query.priceMax) || 0;
    const areaMin = Number(req.query.areaMin) || 0;
    const areaMax = Number(req.query.areaMax) || 0;
    const pageNum = Math.max(
      1,
      parseInt(String(req.query.page || "1"), 10) || 1,
    );
    const limitNum = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10),
    );

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

export async function getAdForBot(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

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

export async function setBotConfig(req: Request, res: Response): Promise<void> {
  try {
    const { platform, botToken, webhookUrl, isActive } = req.body;

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

    const config = await botService.upsertConfig(platform, {
      botToken: botToken.trim(),
      webhookUrl,
      isActive: isActive !== false,
    });

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

export async function getBotStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await botService.getStats();
    res.json({ data: stats });
  } catch (error) {
    console.error("[BotController] خطا در دریافت آمار:", error);
    res.status(500).json({ error: "خطای سرور" });
  }
}

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

    let sentCount = 0;
    let failedCount = 0;

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

export async function getSubscribers(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const pageStr = String(req.query.page || "1");
    const limitStr = String(req.query.limit || "20");
    const platform = String(req.query.platform || "");
    const isActiveStr = String(req.query.isActive || "true");

    const pageNum = Math.max(1, parseInt(pageStr, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));

    const filter: Record<string, any> = {};
    if (platform) filter.platform = platform;
    if (isActiveStr === "true" || isActiveStr === "false") {
      filter.isActive = isActiveStr === "true";
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
// توابع داخلی
// ═══════════════════════════════════════════════════════════════════════════════

async function processCommand(
  chatId: string,
  platform: BotPlatform,
  text: string,
): Promise<void> {
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
          "🏠 آپارتمان\n🏡 ویلایی\n🏢 تجاری و اداری\n🏭 انبار و کارگاه\n🌾 زمین و کلنگی\n🏨 سوئیت و هتل آپارتمان\n\n" +
          "برای جستجو از دستور زیر استفاده کنید:\n/search [نوع] [شهر]";

        const buttons = formatCategoryButtons(platform);
        await botService.sendMessage(chatId, categoriesText, platform, {
          buttons,
        });
        break;
      }

      case "/help": {
        const helpText =
          "📖 راهنمای استفاده:\n\n" +
          "🔍 جستجو:\n  /search آپارتمان تهران\n  /search ویلایی شمال\n\n" +
          "📄 جزئیات آگهی:\n  /ad [شناسه آگهی]\n\n" +
          "📂 دسته‌بندی‌ها:\n  /categories\n\n" +
          "📞 ارتباط با ما:\n  /contact";
        await botService.sendMessage(chatId, helpText, platform);
        break;
      }

      case "/contact": {
        const contactText =
          "📞 ارتباط با ما:\n\n" +
          "🌐 وب‌سایت: https://melk-site.com\n📧 ایمیل: support@melk-site.com\n📱 تلفن: ۰۲۱-۱۲۳۴۵۶۷۸";
        await botService.sendMessage(chatId, contactText, platform);
        break;
      }

      default: {
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

async function handleCallbackQuery(
  userId: string,
  platform: BotPlatform,
  data: string,
  chatId?: string,
): Promise<void> {
  const targetChatId = chatId || userId;

  try {
    const parts = data.split(":");

    if (parts[0] === "search" && parts[1] !== "noop") {
      const query = parts[1];
      const page = parts[3] ? parseInt(parts[3], 10) : 1;
      await performSearch(targetChatId, platform, query, page);
      return;
    }

    if (parts[0] === "category") {
      const categoryLabels: Record<string, string> = {
        apartment: "آپارتمان",
        villa: "ویلایی",
        commercial: "تجاری و اداری",
        warehouse: "انبار و کارگاه",
        land: "زمین و کلنگی",
        suite: "سوئیت و هتل آپارتمان",
      };
      const label = categoryLabels[parts[1]] || parts[1];
      await performSearch(targetChatId, platform, label, 1);
      return;
    }
  } catch (error) {
    console.error("[BotController] خطا در پردازش callback_query:", error);
  }
}

async function performSearch(
  chatId: string,
  platform: BotPlatform,
  query: string,
  page: number,
): Promise<void> {
  try {
    const ads: BotAdResult[] = [];
    const total = 0;
    const totalPages = Math.max(1, Math.ceil(total / BOT_PAGE_SIZE));

    const formatted = botService.buildSearchResultsMessage(
      ads,
      query,
      page,
      totalPages,
    );

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

async function showAdDetails(
  chatId: string,
  platform: BotPlatform,
  adId: string,
): Promise<void> {
  try {
    const ad: BotAdResult | null = null;

    if (!ad) {
      await botService.sendMessage(
        chatId,
        "❌ آگهی مورد نظر یافت نشد.",
        platform,
      );
      return;
    }

    await botService.sendAdCard(chatId, ad, platform);
  } catch (error) {
    console.error("[BotController] خطا در نمایش آگهی:", error);
    await botService
      .sendMessage(chatId, "⚠️ خطا در دریافت اطلاعات آگهی.", platform)
      .catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// توابع کمکی
// ═══════════════════════════════════════════════════════════════════════════════

function extractCommand(text: string): string {
  const match = text.match(/^(\/\w+)/);
  return match ? match[1].toLowerCase() : "";
}

function extractTelegramUserInfo(message: TelegramMessage): BotUserInfo {
  return {
    chatId: message.chat.id.toString(),
    firstName: message.from?.first_name,
    lastName: message.from?.last_name,
    username: message.from?.username,
  };
}

function formatAdForPublicApi(ad: BotAdResult | null) {
  if (!ad) return null;
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

function formatWelcomeButtons(
  platform: BotPlatform,
): BotButton[][] | undefined {
  if (platform === "telegram") {
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
  return undefined;
}

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

function formatQuickReplyButtons(
  platform: BotPlatform,
  inlineButtons?: BotButton[][],
): BotButton[][] | undefined {
  if (platform === "telegram" || !inlineButtons) return inlineButtons;
  return inlineButtons.map((row) => row.map((btn) => ({ text: btn.text })));
}

export function formatAdForBot(
  ad: BotAdResult,
  platform: BotPlatform,
): { text: string; buttons?: BotButton[][] } {
  const message = botService.buildAdMessage(ad);

  switch (platform) {
    case "telegram":
      return { text: message.text, buttons: message.buttons };
    case "bale":
      return {
        text: message.text,
        buttons: message.buttons
          ? formatQuickReplyButtons("bale", message.buttons)
          : undefined,
      };
    case "aita":
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

export async function sendToUser(
  userId: string,
  platform: BotPlatform,
  message: string,
): Promise<boolean> {
  return await botService.sendMessage(userId, message, platform);
}

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
    if (success) sentCount++;
    else failedCount++;
  }

  return { sentCount, failedCount };
}
