"use client";

import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden" dir="rtl">
      {/* تصویر پس‌زمینه تمام‌صفحه */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/banner-notfound.PNG')" }}
      />

      {/* لایه تیره برای خوانایی */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/70" />

      {/* محتوای اصلی — وسط عمودی، چپ در دسکتاپ، وسط در موبایل */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 sm:justify-end sm:px-12">
        <div className="w-full max-w-sm text-right">
          {/* عنوان و متن */}
          <div className="text-white mb-6">
            <h1 className="text-4xl sm:text-5xl font-black mb-2">۴۰۴</h1>
            <p className="text-base sm:text-lg font-medium text-white/90">
              صفحه‌ای که دنبال آن بودید پیدا نشد
            </p>
          </div>

          {/* دکمه‌ها — اندازه کوچک‌تر */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Home className="w-4 h-4" />
              بازگشت به صفحه اصلی
            </Link>

            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-md border border-white/40 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-md hover:bg-white/30 transition-all hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Search className="w-4 h-4" />
              جستجوی آگهی‌ها
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}