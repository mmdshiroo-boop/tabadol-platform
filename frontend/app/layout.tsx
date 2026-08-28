// layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "./context/SettingsContext";
import PageViewLogger from "@/components/ui/PageViewLogger";
import { Toaster } from "sonner";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "پلتفرم آگهی تبادل",
  description: "بزرگ‌ترین پلتفرم آگهی املاک و مستغلات تبادل",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
          rel="stylesheet"
        />
      </head>
      <body className="font-vazirmatn antialiased min-h-screen bg-background text-foreground overflow-x-hidden">
        <AppProviders>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SettingsProvider>
              <Suspense fallback={null}>
                <PageViewLogger />
              </Suspense>
              {children}
              <Toaster
                position="top-center"
                richColors={false}
                closeButton
                gap={8}
                style={{ zIndex: 99999 }}  
                toastOptions={{
                  style: {
                    direction: "rtl",
                    fontFamily: "Vazirmatn, system-ui, sans-serif",
                  },
                }}
              />
            </SettingsProvider>
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}