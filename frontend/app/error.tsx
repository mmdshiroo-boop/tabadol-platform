"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyDigest = async () => {
    if (error.digest) {
      try {
        await navigator.clipboard.writeText(error.digest);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-orange-50 via-background to-background dark:from-orange-950/30 dark:via-background dark:to-background"
    >
      <div className="w-full max-w-md text-center space-y-6">
        {/* لوگوی برند */}
        <div className="flex justify-center">
          <img
            src="/images/tabadol-logo-light.PNG"
            alt="تبادل"
            className="h-16 sm:h-20 w-auto object-contain dark:hidden"
          />
          <img
            src="/images/tabadol-logo-dark.PNG"
            alt="تبادل"
            className="h-16 sm:h-20 w-auto object-contain hidden dark:block"
          />
        </div>

        {/* آیکون خطا */}
        <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shadow-lg shadow-orange-200/50 dark:shadow-orange-900/20">
          <AlertTriangle className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 dark:text-orange-400" strokeWidth={1.5} />
        </div>

        {/* عنوان و توضیحات */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            خطایی رخ داد
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            متأسفانه در پردازش درخواست شما مشکلی پیش آمده است. این مشکل موقتی
            است و تیم فنی در حال بررسی آن می‌باشد. لطفاً دوباره تلاش کنید.
          </p>
        </div>

        {/* نمایش جزئیات خطا در محیط توسعه */}
        {error.message && process.env.NODE_ENV === "development" && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-right">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all leading-6">
              {error.message}
            </p>
          </div>
        )}

        {/* شناسه خطا و کپی */}
        {error.digest && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>شناسه خطا: </span>
            <code className="font-mono bg-muted/50 px-2 py-0.5 rounded-md">
              {error.digest}
            </code>
            <button
              onClick={handleCopyDigest}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="کپی شناسه خطا"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* دکمه‌های عملیاتی */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            تلاش مجدد
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 font-bold px-6 py-2.5 rounded-xl transition-all hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            بازگشت به صفحه اصلی
          </Link>
        </div>

        {/* راهنمای کوتاه */}
        <div className="bg-muted/50 dark:bg-muted/20 border border-border/50 rounded-xl p-4 text-right">
          <p className="text-sm font-bold text-foreground mb-2">
            چکار می‌توانم بکنم؟
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground list-disc list-inside">
            <li>صفحه را رفرش کنید و دوباره تلاش نمایید</li>
            <li>اگر از لینک خارجی استفاده کرده‌اید، آدرس را بررسی کنید</li>
            <li>بعد از چند دقیقه دوباره مراجعه کنید</li>
            <li>در صورت تداوم مشکل با پشتیبانی تماس بگیرید</li>
          </ul>
        </div>
      </div>
    </div>
  );
}