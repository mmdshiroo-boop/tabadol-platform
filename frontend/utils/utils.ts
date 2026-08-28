/* ============================================================
 * ابزارهای مدیریت خطا - تبادل
 * شامل: کلاس‌های خطا، توابع هندلر، پیام‌های فارسی و لاگ‌گیری
 * ============================================================ */

import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ShieldX,
  ShieldAlert,
  Ban,
  ServerCrash,
  WifiOff,
  Hammer,
  type LucideIcon,
} from "lucide-react";

/* ----------------------------------------------------------
 * تایپ‌ها و اینترفیس‌ها
 * ---------------------------------------------------------- */

export type SupportedErrorCode = 401 | 403 | 404 | 405 | 500 | 502 | 503;

export interface ErrorPageInfo {
  title: string;
  description: string;
  icon: LucideIcon;
  action: string;
  actionHref: string;
}

export interface AdCheckResult {
  exists: boolean;
  redirectPath: string;
}

export interface ErrorLogPayload {
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/* ----------------------------------------------------------
 * کلاس اختصاصی خطای برنامه‌نویسی (AppError)
 * ---------------------------------------------------------- */

export class AppError extends Error {
  public readonly statusCode: SupportedErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: SupportedErrorCode = 500,
    isOperational = true,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/* ----------------------------------------------------------
 * پیام‌های خطای فارسی
 * ---------------------------------------------------------- */

export const ERROR_MESSAGES: Record<SupportedErrorCode, string> = {
  401: "نشست کاری شما معتبر نیست یا منقضی شده است. لطفاً مجدداً وارد حساب خود شوید.",
  403: "شما دسترسی لازم برای مشاهده این صفحه را ندارید.",
  404: "صفحه یا منبع درخواستی یافت نشد. ممکن است حذف شده یا آدرس آن تغییر کرده باشد.",
  405: "متد درخواستی مجاز نیست. لطفاً نوع درخواست خود را بررسی کنید.",
  500: "خطای داخلی سرور رخ داده است. تیم فنی در حال بررسی مشکل می‌باشد.",
  502: "سرور در حال حاضر پاسخگو نیست. لطفاً چند لحظه دیگر تلاش کنید.",
  503: "سرویس موقتاً در دسترس نیست. در حال انجام عملیات نگهداری هستیم.",
};

export const PLATFORM_ERROR_MESSAGES = {
  DELETED_AD: "این آگهی توسط کاربر حذف شده است.",
  EXPIRED_AD: "مهلت نمایش این آگهی به پایان رسیده است.",
  INACTIVE_AD: "این آگهی هنوز تأیید نشده یا غیرفعال شده است.",
  EXPIRED_SESSION:
    "نشست شما منقضی شده است. لطفاً دوباره وارد حساب کاربری خود شوید.",
  UNAUTHORIZED_ACCESS:
    "دسترسی غیرمجاز. برای انجام این عملیات نیاز به احراز هویت دارید.",
  RATE_LIMIT_EXCEEDED:
    "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.",
  INVALID_INPUT: "اطلاعات واردشده نامعتبر است. لطفاً فرم را با دقت پر کنید.",
} as const;

/* ----------------------------------------------------------
 * توابع مدیریت آگهی و نشست کاربر
 * ---------------------------------------------------------- */

export async function handleDeletedAd(slug: string): Promise<AdCheckResult> {
  try {
    const adExists = false; // شبیه‌سازی برای الگو

    if (!adExists) {
      return {
        exists: false,
        redirectPath: `/ad-not-found?slug=${encodeURIComponent(slug)}`,
      };
    }

    return {
      exists: true,
      redirectPath: `/ads/${encodeURIComponent(slug)}`,
    };
  } catch (error) {
    return {
      exists: false,
      redirectPath: "/search",
    };
  }
}

export function handleExpiredSession(returnUrl?: string): never {
  const redirectUrl = returnUrl
    ? `/auth/login?redirect=${encodeURIComponent(returnUrl)}`
    : "/auth/login";

  redirect(redirectUrl);
}

/* ----------------------------------------------------------
 * توابع ساخت داده‌های صفحات خطا
 * ---------------------------------------------------------- */

const ERROR_ICONS: Record<SupportedErrorCode, LucideIcon> = {
  401: ShieldAlert,
  403: ShieldX,
  404: AlertTriangle,
  405: Ban,
  500: ServerCrash,
  502: WifiOff,
  503: Hammer,
};

const ERROR_ACTIONS: Record<
  SupportedErrorCode,
  { label: string; href: string }
> = {
  401: { label: "ورود به حساب کاربری", href: "/auth/login" },
  403: { label: "بازگشت به صفحه اصلی", href: "/" },
  404: { label: "جستجوی آگهی‌ها", href: "/search" },
  405: { label: "بازگشت به صفحه اصلی", href: "/" },
  500: { label: "تلاش مجدد", href: "/" },
  502: { label: "تلاش مجدد", href: "/" },
  503: { label: "بازگشت بعداً", href: "/" },
};

const ERROR_TITLES: Record<SupportedErrorCode, string> = {
  401: "نیاز به احراز هویت",
  403: "دسترسی محدود است",
  404: "صفحه‌ای که دنبالش بودید پیدا نشد",
  405: "متد درخواست نامعتبر",
  500: "خطای داخلی سرور",
  502: "خطای ارتباط با سرور",
  503: "سرویس موقتاً در دسترس نیست",
};

export function getErrorPageInfo(statusCode: number): ErrorPageInfo {
  const code = statusCode as SupportedErrorCode;

  if (!(code in ERROR_MESSAGES)) {
    return {
      title: "خطایی پیش‌بینی‌نشده رخ داد",
      description: ERROR_MESSAGES[500],
      icon: ServerCrash,
      action: "بازگشت به صفحه اصلی",
      actionHref: "/",
    };
  }

  const action = ERROR_ACTIONS[code];

  return {
    title: ERROR_TITLES[code],
    description: ERROR_MESSAGES[code],
    icon: ERROR_ICONS[code],
    action: action.label,
    actionHref: action.href,
  };
}

/* ----------------------------------------------------------
 * تابع کمکی لاگ‌گیری ساختاریافته (Logging)
 * ---------------------------------------------------------- */

export function formatErrorLog(
  error: unknown,
  context?: Record<string, unknown>,
): string {
  const timestamp = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
  });

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown Error";
  const stack = error instanceof Error ? error.stack : undefined;

  const logPayload: ErrorLogPayload = {
    timestamp,
    level: "ERROR",
    message,
    stack,
    context: context ?? {},
  };

  const seen = new WeakSet();
  return JSON.stringify(
    logPayload,
    (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    },
    2,
  );
}