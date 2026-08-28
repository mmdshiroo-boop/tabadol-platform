// footer.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FiShield,
  FiPhone,
  FiArrowUpLeft,
  FiSend,
  FiFlag,
} from "react-icons/fi";
import { FaTelegramPlane, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { toast } from "sonner";
import { useSettings } from "@/app/context/SettingsContext";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { settings } = useSettings();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("لطفاً ایمیل خود را وارد کنید");
      return;
    }
    toast.success("عضویت شما در خبرنامه با موفقیت ثبت شد");
    setEmail("");
  };

  // شبکه‌های اجتماعی با لینک‌های واقعی
  const socialItems = [
    {
      icon: <FaTelegramPlane className="w-4 h-4" />,
      url: settings.socialLinks?.telegram || "",
      label: "تلگرام",
    },
    {
      icon: <FaInstagram className="w-4 h-4" />,
      url: settings.socialLinks?.instagram || "",
      label: "اینستاگرام",
    },
    {
      icon: <FaXTwitter className="w-4 h-4" />,
      url: settings.socialLinks?.twitter || "",
      label: "توییتر",
    },
    {
      icon: <FaLinkedinIn className="w-4 h-4" />,
      url: settings.socialLinks?.linkedin || "",
      label: "لینکدین",
    },
  ].filter((item) => item.url);

  return (
    <footer
      className="relative border-t mt-auto overflow-hidden bg-background text-foreground"
      dir="rtl"
    >
      {/* تزئینات پس‌زمینه بدون افکت شیشه‌ای */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 max-w-[1200px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 pb-8 border-b border-border/60">
          {/* ستون ۱: لوگو و توضیحات */}
          <div className="md:col-span-4 space-y-4 text-right">
            <div className="flex items-center gap-3">
              {/* لوگوی جدید با دو نسخه روشن/تاریک */}
              <img
                src="/images/tabadol-logo-light.PNG"
                alt="پلتفرم آگهی تبادل"
                className="h-12 sm:h-14 w-auto object-contain dark:hidden drop-shadow-md"
              />
              <img
                src="/images/tabadol-logo-dark.PNG"
                alt="پلتفرم آگهی تبادل"
                className="h-12 sm:h-14 w-auto object-contain hidden dark:block drop-shadow-md"
              />
              <div className="flex flex-col space-y-0.5">
                <span className="text-lg font-black text-foreground tracking-tight">
                  {settings.siteName || "پلتفرم آگهی تبادل"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {settings.siteDescription || "خرید و فروش بی‌واسطه و امن"}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm font-medium">
              {settings.siteDescription ||
                "بزرگترین و امن‌ترین پلتفرم آگهی‌های خرید و فروش در ایران. ما بستری هوشمند و سریع برای ارتباط مستقیم خریداران و فروشندگان فراهم کرده‌ایم."}
            </p>

            {/* دکمه‌های عملیاتی */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/support">
                <Button
                  variant="outline"
                  className="gap-2 text-xs font-bold rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all h-10 px-4"
                >
                  <FiShield className="w-4 h-4 text-primary" />
                  <span>مرکز پشتیبانی</span>
                </Button>
              </Link>
              <Link href="/report">
                <Button
                  variant="outline"
                  className="gap-2 text-xs font-bold rounded-xl border-border hover:border-destructive/50 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all h-10 px-4"
                >
                  <FiFlag className="w-4 h-4" />
                  <span>گزارش تخلف</span>
                </Button>
              </Link>
              <Link href="/consulting">
                <Button
                  variant="outline"
                  className="gap-2 text-xs font-bold rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-foreground transition-all h-10 px-4"
                >
                  <span>مشاوره رایگان</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* ستون ۲: لینک‌های سریع */}
          <div className="md:col-span-2 md:mr-4">
            <h3 className="font-black text-xs text-foreground mb-4 border-r-2 border-primary pr-2">
              لینک‌های سریع
            </h3>
            <ul className="space-y-3 text-xs">
              {[
                { label: "درباره ما", href: "/about" },
                { label: "تماس با ما", href: "/contact" },
                { label: "قوانین و مقررات", href: "/rules" },
                { label: "حریم خصوصی", href: "/privacy" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-1 text-muted-foreground hover:text-primary font-medium transition-all duration-200"
                  >
                    <FiArrowUpLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ستون ۳: دسترسی سریع */}
          <div className="md:col-span-2">
            <h3 className="font-black text-xs text-foreground mb-4 border-r-2 border-primary pr-2">
              دسترسی سریع
            </h3>
            <ul className="space-y-3 text-xs">
              {[
                { label: "جستجوی پیشرفته", href: "/search" },
                { label: "دسته‌بندی‌ها", href: "/category" },
                { label: "ثبت آگهی جدید", href: "/create-ad" },
                { label: "مرکز راهنما", href: "/help" },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-1 text-muted-foreground hover:text-primary font-medium transition-all duration-200"
                  >
                    <FiArrowUpLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ستون ۴: خبرنامه و شبکه‌های اجتماعی */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="font-black text-xs text-foreground mb-2 border-r-2 border-primary pr-2">
              عضویت در خبرنامه
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              از جدیدترین آگهی‌ها، تخفیف‌ها و امکانات پلتفرم قبل از همه باخبر
              شوید.
            </p>
            <form
              onSubmit={handleSubscribe}
              className="flex gap-2 w-full relative"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="نشانی ایمیل شما..."
                className="w-full bg-background border border-border rounded-xl px-3 pl-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary text-foreground h-10 placeholder:text-muted-foreground/60"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute left-1 top-1 rounded-lg h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
              >
                <FiSend className="w-3.5 h-3.5 rotate-180" />
              </Button>
            </form>

            {/* شماره تماس پویا */}
            {settings.contactPhone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold pt-2">
                <FiPhone className="w-4 h-4 text-primary shrink-0" />
                <span>پشتیبانی تلفنی:</span>
                <span className="font-sans text-foreground tabular-nums tracking-tight">
                  {settings.contactPhone}
                </span>
              </div>
            )}

            {/* شبکه‌های اجتماعی پویا */}
            {socialItems.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] text-muted-foreground font-bold block">
                  ما را در شبکه‌های اجتماعی دنبال کنید:
                </span>
                <div className="flex gap-2">
                  {socialItems.map((social, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 rounded-xl border-border bg-background hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200"
                      asChild
                    >
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={social.label}
                      >
                        {social.icon}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* تصاویر پایین (نماد اعتماد) */}
          <div className="flex gap-2 order-2 sm:order-1">
            <div className="w-12 h-12 bg-background border border-border/60 rounded-xl flex items-center justify-center shadow-xs cursor-pointer hover:border-border transition-colors">
              <div className="w-7 h-7 bg-muted/40 rounded-md" />
            </div>
            <div className="w-12 h-12 bg-background border border-border/60 rounded-xl flex items-center justify-center shadow-xs cursor-pointer hover:border-border transition-colors">
              <div className="w-7 h-7 bg-muted/40 rounded-md" />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/80 font-semibold order-1 sm:order-2 text-center sm:text-left">
            © {new Date().getFullYear()}{" "}
            {settings.siteName || "پلتفرم آگهی تبادل"}. تمامی حقوق مادی و معنوی
            این وب‌سایت محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}