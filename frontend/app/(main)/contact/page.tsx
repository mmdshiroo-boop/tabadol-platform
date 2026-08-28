// contact/page.tsx
"use client";

import { useSettings } from "@/app/context/SettingsContext";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  const { settings } = useSettings();

  const contacts = [
    {
      icon: Phone,
      title: "تلفن",
      value: settings.contactPhone || "۰۲۱-۱۲۳۴۵۶۷۸",
      sub: "شنبه تا چهارشنبه ۹ صبح تا ۱۸",
    },
    {
      icon: Mail,
      title: "ایمیل",
      value: settings.contactEmail || "info@yourplatform.ir",
      sub: "پاسخگویی ۲۴ ساعته",
    },
    {
      icon: MapPin,
      title: "آدرس",
      value: settings.contactAddress || "تهران، خیابان ولیعصر",
      sub: "مراجعه حضوری با هماهنگی قبلی",
    },
    {
      icon: Clock,
      title: "ساعات کاری",
      value: "۹ صبح تا ۱۸",
      sub: "روزهای شنبه تا چهارشنبه",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold">تماس با ما</h1>
        <p className="text-muted-foreground">
          ما همواره آماده شنیدن نظرات، پیشنهادات و انتقادات شما هستیم.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {contacts.map((item, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-card border border-border/40 space-y-2">
            <div className="p-2 bg-primary/10 rounded-xl w-fit">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{item.title}</h3>
            <p className="text-base font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}