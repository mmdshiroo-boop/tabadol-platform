// privacy/page.tsx
"use client";

import { useSettings } from "@/app/context/SettingsContext";

export default function PrivacyPage() {
  const { settings } = useSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" dir="rtl">
      <h1 className="text-4xl font-extrabold text-center mb-8">حریم خصوصی</h1>
      <div className="prose dark:prose-invert max-w-none p-6 rounded-2xl bg-card border">
        {settings.pages?.privacyText ? (
          <div
            dangerouslySetInnerHTML={{ __html: settings.pages.privacyText }}
          />
        ) : (
          <p className="text-muted-foreground">
            محتوای حریم خصوصی توسط مدیریت سایت تنظیم می‌شود.
          </p>
        )}
      </div>
    </div>
  );
}
