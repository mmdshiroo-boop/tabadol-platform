// about/page.tsx
"use client";

import { useEffect } from "react";
import { Shield, Users, Target, Zap } from "lucide-react";
import { useSettings } from "@/app/context/SettingsContext";

export default function AboutPage() {
  const { settings } = useSettings();

  useEffect(() => {
    document.title = `درباره ما | ${settings.siteName}`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        settings.pages?.aboutUs?.substring(0, 160) || "درباره ما",
      );
    }
  }, [settings]);

  const items = [
    { icon: Target, title: "مأموریت ما", desc: settings.pages?.aboutMission },
    { icon: Users, title: "تیم ما", desc: settings.pages?.aboutTeam },
    { icon: Shield, title: "امنیت", desc: settings.pages?.aboutSecurity },
    { icon: Zap, title: "سرعت", desc: settings.pages?.aboutSpeed },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">درباره ما</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {settings.pages?.aboutUs}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-card border border-border/40 space-y-3"
          >
            <div className="p-2 bg-primary/10 rounded-xl w-fit">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
