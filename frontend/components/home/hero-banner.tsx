"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroBanner() {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 md:mt-8">
      <Link
        href="/search"
        className="block group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 shadow-lg hover:shadow-2xl transition-shadow duration-300"
        aria-label="مشاهده آگهی‌ها"
      >
        {/* نسخه روشن */}
        <img
          src="/images/tabadol-banner.PNG"
          alt="مشاهده آگهی‌ها"
          className="w-full h-auto object-cover dark:hidden transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {/* نسخه تاریک */}
        <img
          src="/images/tabadol-banner-dark.PNG"
          alt="مشاهده آگهی‌ها"
          className="w-full h-auto object-cover hidden dark:block transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* لایه هاور اختیاری */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Link>
    </section>
  );
}