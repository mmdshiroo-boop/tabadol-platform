// backend/src/api/admin/blacklist/check/route.ts
import { Request, Response, NextFunction } from "express";
import { BlacklistCategory, BlacklistSeverity, SEVERITY_WEIGHTS } from "../../../../models/blacklist.model";
import { BlacklistKeyword } from "../../../../models/BlacklistKeyword.model";
import { Ad } from "../../../../models";

// ──────────────────────────────────────────────────────────────────────────
// 🇮🇷 کنترلر لیست سیاه کلمات کلیدی — سیستم نظارت بر آگهی‌های املاک
// ──────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────
// بخش ۱: لیست سیاه پیش‌فرض
// کلمات و عبارات پرکاربرد فارسی که در آگهی‌های املاک مشکلاتی ایجاد می‌کنند
// ──────────────────────────────────────────────

interface DefaultBlacklistItem {
  word: string;
  category: BlacklistCategory;
  severity: BlacklistSeverity;
  note: string;
}

/** لیست پیش‌فرض کلمات سیاه — هنگام اولین اجرا وارد دیتابیس می‌شوند */
const DEFAULT_BLACKLIST: DefaultBlacklistItem[] = [
  // ── عبارات کلاهبرداری ──
  {
    word: "فوری",
    category: "scam",
    severity: "medium",
    note: "ایجاد فشار احساسی برای تصمیم سریع",
  },
  {
    word: "فقط امروز",
    category: "scam",
    severity: "high",
    note: "تاکتیک فشار زمانی برای کلاهبرداری",
  },
  {
    word: "تخفیف ویژه",
    category: "scam",
    severity: "medium",
    note: "عبارت تبلیغاتی فریبنده",
  },
  {
    word: "فرصت استثنایی",
    category: "scam",
    severity: "high",
    note: "جلب توجه با ایجاد حس فوریت کاذب",
  },
  {
    word: "فرصت طلایی",
    category: "scam",
    severity: "medium",
    note: "عبارت تبلیغاتی اغراق‌آمیز",
  },
  {
    word: "قیمت رویایی",
    category: "scam",
    severity: "medium",
    note: "قیمت غیرمنطقی و فریبنده",
  },
  {
    word: "بدون پیش‌پرداخت",
    category: "scam",
    severity: "high",
    note: "شاید کلاهبرداری باشد",
  },
  {
    word: "گارانتی بازگشت وجه",
    category: "scam",
    severity: "medium",
    note: "ادعای بدون پشتوانه قانونی",
  },
  {
    word: "سود تضمینی",
    category: "scam",
    severity: "high",
    note: "وعده سود غیرمنطقی",
  },
  {
    word: "صد در صد تضمینی",
    category: "scam",
    severity: "high",
    note: "ادعای قطعی مشکوک",
  },
  {
    word: "خرید بی‌واسطه",
    category: "scam",
    severity: "low",
    note: "شاید معتبر باشد ولی نیاز به بررسی",
  },
  {
    word: "مستقیم از مالک",
    category: "scam",
    severity: "low",
    note: "نیاز به احراز هویت مالک",
  },
  {
    word: "آخرین فرصت",
    category: "scam",
    severity: "medium",
    note: "ایجاد فشار زمانی",
  },
  {
    word: "قیمت شکسته",
    category: "scam",
    severity: "medium",
    note: "عبارت اغراق‌آمیز",
  },

  // ── الگوهای هرزنامه ──
  {
    word: "تماس بگیرید",
    category: "spam",
    severity: "low",
    note: "درخواست تماس بدون اطلاعات کافی",
  },
  {
    word: "واتساپ",
    category: "spam",
    severity: "low",
    note: "انتقال کاربر به پیام‌رسان خارجی",
  },
  {
    word: "تلگرام من",
    category: "spam",
    severity: "medium",
    note: "هدایت به کانال تلگرام",
  },
  {
    word: "عضویت در کانال",
    category: "spam",
    severity: "medium",
    note: "تبلیغ کانال",
  },
  {
    word: "ایمیل ما",
    category: "spam",
    severity: "low",
    note: "هدایت به ایمیل",
  },
  {
    word: "اینستاگرام ما",
    category: "spam",
    severity: "low",
    note: "تبلیغ پیج",
  },
  {
    word: "لینک مستقیم",
    category: "spam",
    severity: "medium",
    note: "لینک خارجی مشکوک",
  },
  {
    word: "روی لینک کلیک کنید",
    category: "spam",
    severity: "medium",
    note: "فیشینگ احتمالی",
  },
  {
    word: "برای اطلاعات بیشتر تماس بگیر",
    category: "spam",
    severity: "low",
    note: "عدم ارائه اطلاعات کافی در آگهی",
  },
  {
    word: "http",
    category: "spam",
    severity: "medium",
    note: "لینک خارجی در متن آگهی",
  },
  {
    word: "https",
    category: "spam",
    severity: "medium",
    note: "لینک خارجی در متن آگهی",
  },
  { word: ".ir", category: "spam", severity: "low", note: "دامنه وب‌سایت" },
  { word: ".com", category: "spam", severity: "low", note: "دامنه وب‌سایت" },

  // ── کلمات اخلاقی/سیاسی پایه ──
  {
    word: "رشوه",
    category: "ethical",
    severity: "critical",
    note: "اشاره به فساد مالی",
  },
  {
    word: "زورگیری",
    category: "ethical",
    severity: "critical",
    note: "تهدید و ارعاب",
  },
  {
    word: "تقلب",
    category: "ethical",
    severity: "high",
    note: "اشاره به تقلب",
  },
  {
    word: "کلاهبرداری",
    category: "ethical",
    severity: "high",
    note: "اشاره مستقیم به کلاهبرداری",
  },

  // ── کلمات سیاسی ──
  {
    word: "تحریم",
    category: "political",
    severity: "high",
    note: "موضوع حساس سیاسی",
  },
  {
    word: "اعتراض",
    category: "political",
    severity: "high",
    note: "موضوع حساس سیاسی",
  },
  {
    word: "تظاهرات",
    category: "political",
    severity: "high",
    note: "موضوع حساس سیاسی",
  },
  {
    word: "سازمان مخفی",
    category: "political",
    severity: "critical",
    note: "محتوای مشکوک",
  },
];

// ──────────────────────────────────────────────
// بخش ۲: توابع کمکی (Helper Functions)
// ──────────────────────────────────────────────

export interface KeywordMatch {
  word: string;
  category: BlacklistCategory;
  severity: BlacklistSeverity;
  matchedText: string;
  position: number;
}

export interface TextCheckResult {
  flagged: boolean;
  matches: KeywordMatch[];
  score: number;
}

// تایپ محلی برای ساختار مورد نیاز کلمات سیاه
export interface BlacklistKeywordLike {
  word: string;
  isActive: boolean;
  category: BlacklistCategory;
  severity: BlacklistSeverity;
}

export function normalizePersianText(text: string): string {
  if (!text) return "";

  return (
    text
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/\u0651/g, "")
      .replace(/\u0652/g, "")
      .replace(/ك/g, "ک")
      .replace(/ي/g, "ی")
      .replace(/ة/g, "ه")
      .replace(/[٠-٩]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d, 16) - 0x0660] || d)
      .replace(/\s+/g, " ")
      .replace(/\u200C{2,}/g, "\u200C")
      .trim()
      .replace(/[-–—]{2,}/g, " - ")
      .replace(/[،؛؟]/g, " ")
  );
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j],
            dp[i][j - 1],
            dp[i - 1][j - 1],
          );
      }
    }
  }

  return dp[m][n];
}

function fuzzyMatch(
  source: string,
  target: string,
  threshold: number = 0.8,
): boolean {
  if (source.includes(target)) return true;

  if (target.length < 3) return false;

  const distance = levenshteinDistance(source, target);
  const maxLen = Math.max(source.length, target.length);
  const similarity = 1 - distance / maxLen;

  return similarity >= threshold;
}

function findAllOccurrences(text: string, substring: string): number[] {
  const positions: number[] = [];
  let pos = text.indexOf(substring);

  while (pos !== -1) {
    positions.push(pos);
    pos = text.indexOf(substring, pos + 1);
  }

  return positions;
}

export function checkTextAgainstBlacklist(
  text: string,
  keywords: BlacklistKeywordLike[],
): TextCheckResult {
  if (!text || !keywords || keywords.length === 0) {
    return { flagged: false, matches: [], score: 0 };
  }

  const normalizedText = normalizePersianText(text);
  const normalizedTextLower = normalizedText.toLowerCase();
  const matches: KeywordMatch[] = [];
  const seenKeywords = new Set<string>();

  for (const kw of keywords) {
    if (!kw.isActive) continue;

    const normalizedKeyword = normalizePersianText(kw.word);
    const normalizedKeywordLower = normalizedKeyword.toLowerCase();

    if (seenKeywords.has(normalizedKeywordLower)) continue;

    const exactPositions = findAllOccurrences(
      normalizedTextLower,
      normalizedKeywordLower,
    );

    if (exactPositions.length > 0) {
      seenKeywords.add(normalizedKeywordLower);
      const pos = exactPositions[0];
      const contextStart = Math.max(0, pos - 10);
      const contextEnd = Math.min(
        normalizedText.length,
        pos + normalizedKeyword.length + 40,
      );
      const matchedText = normalizedText.slice(contextStart, contextEnd);

      matches.push({
        word: kw.word,
        category: kw.category,
        severity: kw.severity,
        matchedText,
        position: pos,
      });

      continue;
    }

    if (normalizedKeyword.length >= 3) {
      const words = normalizedTextLower.split(/\s+/);

      for (let i = 0; i < words.length; i++) {
        if (fuzzyMatch(words[i], normalizedKeywordLower, 0.85)) {
          if (seenKeywords.has(normalizedKeywordLower)) break;
          seenKeywords.add(normalizedKeywordLower);

          const pos = normalizedTextLower.indexOf(words[i]);
          const contextStart = Math.max(0, pos - 10);
          const contextEnd = Math.min(
            normalizedText.length,
            pos + words[i].length + 40,
          );
          const matchedText = normalizedText.slice(contextStart, contextEnd);

          matches.push({
            word: kw.word,
            category: kw.category,
            severity: kw.severity,
            matchedText,
            position: pos,
          });
          break;
        }

        if (i < words.length - 1) {
          const twoWords = `${words[i]} ${words[i + 1]}`;
          if (fuzzyMatch(twoWords, normalizedKeywordLower, 0.8)) {
            if (seenKeywords.has(normalizedKeywordLower)) break;
            seenKeywords.add(normalizedKeywordLower);

            const pos = normalizedTextLower.indexOf(words[i]);
            const contextStart = Math.max(0, pos - 10);
            const contextEnd = Math.min(
              normalizedText.length,
              pos + twoWords.length + 40,
            );
            const matchedText = normalizedText.slice(contextStart, contextEnd);

            matches.push({
              word: kw.word,
              category: kw.category,
              severity: kw.severity,
              matchedText,
              position: pos,
            });
            break;
          }
        }

        if (i < words.length - 2 && normalizedKeyword.includes(" ")) {
          const threeWords = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (fuzzyMatch(threeWords, normalizedKeywordLower, 0.75)) {
            if (seenKeywords.has(normalizedKeywordLower)) break;
            seenKeywords.add(normalizedKeywordLower);

            const pos = normalizedTextLower.indexOf(words[i]);
            const contextStart = Math.max(0, pos - 10);
            const contextEnd = Math.min(
              normalizedText.length,
              pos + threeWords.length + 40,
            );
            const matchedText = normalizedText.slice(contextStart, contextEnd);

            matches.push({
              word: kw.word,
              category: kw.category,
              severity: kw.severity,
              matchedText,
              position: pos,
            });
            break;
          }
        }
      }
    }
  }

  const severityOrder: Record<BlacklistSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  matches.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    flagged: matches.length > 0,
    matches,
    score: calculateFlagScore(matches),
  };
}

export function calculateFlagScore(matches: KeywordMatch[]): number {
  if (!matches || matches.length === 0) return 0;

  let totalScore = 0;
  let hasCritical = false;

  for (const match of matches) {
    const weight = SEVERITY_WEIGHTS[match.severity];
    totalScore += weight;
    if (match.severity === "critical") hasCritical = true;
  }

  if (hasCritical && totalScore < 80) totalScore = 80;

  const multiplier = 1 + (matches.length - 1) * 0.1;
  totalScore = totalScore * multiplier;

  return Math.min(Math.round(totalScore), 100);
}

export async function seedDefaultBlacklist(adminUserId: string): Promise<void> {
  const count = await BlacklistKeyword.countDocuments();

  if (count === 0) {
    console.log("📂 در حال بارگذاری لیست سیاه پیش‌فرض...");

    const docs = DEFAULT_BLACKLIST.map((item) => ({
      word: item.word,
      category: item.category,
      severity: item.severity,
      note: item.note,
      addedBy: adminUserId,
      isActive: true,
      matchCount: 0,
    }));

    await BlacklistKeyword.insertMany(docs);
    console.log(`✅ ${docs.length} کلمه سیاه پیش‌فرض اضافه شد`);
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "احراز هویت نشده‌اید",
    });
    return;
  }

  if (!["admin", "super_admin"].includes(user.role)) {
    res.status(403).json({
      success: false,
      message: "فقط ادمین‌ها دسترسی دارند",
    });
    return;
  }

  next();
}

export async function addKeyword(req: Request, res: Response): Promise<void> {
  try {
    const { word, category, severity, note } = req.body;
    const userId = (req as any).user?._id;

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      res.status(400).json({ success: false, message: "کلمه کلیدی الزامی است" });
      return;
    }

    if (!["ethical", "political", "scam", "spam", "custom"].includes(category)) {
      res.status(400).json({ success: false, message: "دسته‌بندی نامعتبر است" });
      return;
    }

    if (!["low", "medium", "high", "critical"].includes(severity)) {
      res.status(400).json({ success: false, message: "سطح شدت نامعتبر است" });
      return;
    }

    const normalizedKeyword = normalizePersianText(word.trim());
    const existing = await BlacklistKeyword.findOne({
      word: normalizedKeyword,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: "این کلمه قبلاً در لیست سیاه وجود دارد",
        data: { existingId: existing._id },
      });
      return;
    }

    // اصلاح: استفاده از any برای سازگاری با Mongoose
    const newKeyword = await BlacklistKeyword.create({
      word: normalizedKeyword,
      category,
      severity,
      note: note?.trim() || "",
      addedBy: userId,
    } as any);

    res.status(201).json({
      success: true,
      message: "کلمه سیاه با موفقیت اضافه شد",
      data: newKeyword,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "این کلمه قبلاً در لیست سیاه وجود دارد",
      });
      return;
    }
    console.error("خطا در افزودن کلمه سیاه:", error);
    res.status(500).json({ success: false, message: "خطای سرور در افزودن کلمه سیاه" });
  }
}

export async function listKeywords(req: Request, res: Response): Promise<void> {
  try {
    const category = String(req.query.category || "");
    const severity = String(req.query.severity || "");
    const search = String(req.query.search || "");
    const active = req.query.active;
    const page = String(req.query.page || "1");
    const limit = String(req.query.limit || "20");

    const filter: Record<string, any> = {};

    if (
      category &&
      ["ethical", "political", "scam", "spam", "custom"].includes(category)
    ) {
      filter.category = category;
    }
    if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
      filter.severity = severity;
    }
    if (active !== undefined) {
      filter.isActive = active === "true";
    }
    if (search) {
      filter.word = { $regex: normalizePersianText(search), $options: "i" };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [keywords, total] = await Promise.all([
      BlacklistKeyword.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("addedBy", "name email")
        .lean(),
      BlacklistKeyword.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: keywords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("خطا در دریافت لیست سیاه:", error);
    res.status(500).json({ success: false, message: "خطای سرور در دریافت لیست سیاه" });
  }
}

export async function deleteKeyword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id.length !== 24) {
      res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
      return;
    }

    const deleted = await BlacklistKeyword.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "کلمه سیاه یافت نشد" });
      return;
    }

    res.json({
      success: true,
      message: "کلمه سیاه با موفقیت حذف شد",
      data: { deletedId: id, word: deleted.word },
    });
  } catch (error) {
    console.error("خطا در حذف کلمه سیاه:", error);
    res.status(500).json({ success: false, message: "خطای سرور در حذف کلمه سیاه" });
  }
}

export async function updateKeyword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const id = String(req.params.id);

    if (!id || id.length !== 24) {
      res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
      return;
    }

    const { word, category, severity, note, isActive } = req.body;
    const updateData: Record<string, any> = {};

    if (word !== undefined) {
      updateData.word = normalizePersianText(word.trim());
    }
    if (
      category &&
      ["ethical", "political", "scam", "spam", "custom"].includes(category)
    ) {
      updateData.category = category;
    }
    if (severity && ["low", "medium", "high", "critical"].includes(severity)) {
      updateData.severity = severity;
    }
    if (note !== undefined) {
      updateData.note = typeof note === "string" ? note.trim() : "";
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "هیچ فیلدی برای بروزرسانی ارسال نشده",
      });
      return;
    }

    if (updateData.word) {
      const existing = await BlacklistKeyword.findOne({
        word: updateData.word,
        _id: { $ne: id },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          message: "این کلمه قبلاً در لیست سیاه وجود دارد",
        });
        return;
      }
    }

    const updated = await BlacklistKeyword.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: "کلمه سیاه یافت نشد" });
      return;
    }

    res.json({
      success: true,
      message: "کلمه سیاه با موفقیت بروزرسانی شد",
      data: updated,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: "این کلمه قبلاً در لیست سیاه وجود دارد",
      });
      return;
    }
    console.error("خطا در بروزرسانی کلمه سیاه:", error);
    res.status(500).json({ success: false, message: "خطای سرور در بروزرسانی کلمه سیاه" });
  }
}

export async function checkText(req: Request, res: Response): Promise<void> {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ success: false, message: "متن الزامی است" });
      return;
    }

    const keywords = await BlacklistKeyword.find({ isActive: true }).lean();
    // اصلاح: تبدیل نوع برای سازگاری با تابع
    const result = checkTextAgainstBlacklist(text, keywords as any);

    if (result.flagged && result.matches.length > 0) {
      const matchedWords = result.matches.map((m) => m.word);
      BlacklistKeyword.updateMany(
        { word: { $in: matchedWords }, isActive: true },
        { $inc: { matchCount: 1 } },
      ).catch(() => {});
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("خطا در بررسی متن:", error);
    res.status(500).json({ success: false, message: "خطای سرور در بررسی متن" });
  }
}

export async function getFlaggedAdsReport(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const category = String(req.query.category || "");
    const severity = String(req.query.severity || "");
    const startDate = String(req.query.startDate || "");
    const endDate = String(req.query.endDate || "");
    const page = String(req.query.page || "1");
    const limit = String(req.query.limit || "20");

    const filter: Record<string, any> = { moderationStatus: "flagged" };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [ads, total] = await Promise.all([
      Ad.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name phone")
        .lean(),
      Ad.countDocuments(filter),
    ]);

    const keywords = await BlacklistKeyword.find({ isActive: true }).lean();

    const flaggedAds = ads.map((ad: any) => {
      const fullText = `${ad.title || ""} ${ad.description || ""}`;

      let filteredKeywords = keywords;
      if (category)
        filteredKeywords = filteredKeywords.filter(
          (k) => k.category === category,
        );
      if (severity)
        filteredKeywords = filteredKeywords.filter(
          (k) => k.severity === severity,
        );

      // اصلاح: حذف کست غیرضروری
         const checkResult = checkTextAgainstBlacklist(
        fullText,
        filteredKeywords as any, // یا: as unknown as BlacklistKeywordLike[]
      );


      return {
        _id: ad._id,
        title: ad.title,
        description: ad.description,
        userId: ad.userId,
        createdAt: ad.createdAt,
        matches: checkResult.matches,
        score: checkResult.score,
        flagged: checkResult.flagged,
      };
    });

    const filteredAds = flaggedAds.filter((ad) => ad.flagged);
    filteredAds.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: filteredAds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredAds.length,
        totalPages: Math.ceil(filteredAds.length / limitNum),
      },
      summary: {
        total: filteredAds.length,
        criticalCount: filteredAds.filter((a) =>
          a.matches.some((m: any) => m.severity === "critical"),
        ).length,
        highCount: filteredAds.filter((a) =>
          a.matches.some((m: any) => m.severity === "high"),
        ).length,
        pendingReview: filteredAds.filter(
          (a) => (a as any).moderationStatus === "flagged",
        ).length,
      },
    });
  } catch (error) {
    console.error("خطا در دریافت گزارش آگهی‌ها:", error);
    res.status(500).json({ success: false, message: "خطای سرور در دریافت گزارش" });
  }
}

export async function bulkApproveLowSeverity(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await Ad.updateMany(
      {
        moderationStatus: "flagged",
        $and: [
          { "flaggedKeywords.severity": { $in: ["low"] } },
          {
            "flaggedKeywords.severity": {
              $nin: ["medium", "high", "critical"],
            },
          },
        ],
      },
      { $set: { moderationStatus: "approved" } },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} آگهی کم‌شدت تایید شد`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error("خطا در تایید دسته‌ای:", error);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
}

export async function bulkRejectCritical(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await Ad.updateMany(
      { moderationStatus: "flagged", "flaggedKeywords.severity": "critical" },
      { $set: { moderationStatus: "rejected" } },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} آگهی بحرانی رد شد`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error("خطا در رد دسته‌ای:", error);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
}

export function setupBlacklistRoutes(router: import("express").Router): void {
  router.use("/api/admin/blacklist", requireAdmin);

  router.post("/api/admin/blacklist", addKeyword);
  router.get("/api/admin/blacklist", listKeywords);
  router.put("/api/admin/blacklist/:id", updateKeyword);
  router.delete("/api/admin/blacklist/:id", deleteKeyword);

  router.post("/api/admin/blacklist/check", checkText);
  router.get("/api/admin/blacklist/reports", getFlaggedAdsReport);

  router.post("/api/admin/blacklist/bulk-approve-low", bulkApproveLowSeverity);
  router.post("/api/admin/blacklist/bulk-reject-critical", bulkRejectCritical);
}