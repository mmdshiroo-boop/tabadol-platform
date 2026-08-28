"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import apiClient from "@/services/api/client";

const SESSION_ID_KEY = "visitor_session_id";
const LAST_PATH_KEY = "last_visited_path";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId =
      crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export default function PageViewLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastLogged = useRef<string>("");

  useEffect(() => {
    const currentPath =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    if (currentPath === lastLogged.current) return;
    lastLogged.current = currentPath;

    const timer = setTimeout(async () => {
      try {
        const sessionId = getSessionId();
        const externalReferrer = document.referrer || "";
        const lastPath = localStorage.getItem(LAST_PATH_KEY) || "";
        const referrer = externalReferrer || lastPath;

        // ارسال با apiClient تا توکن و کوکی‌ها به‌صورت خودکار ضمیمه شوند
        await apiClient.post("/page-view", {
          path: currentPath,
          referrer,
          sessionId,
        });

        // ذخیره مسیر فعلی برای مراجعه بعدی
        localStorage.setItem(LAST_PATH_KEY, currentPath);
      } catch (error) {
        // ثبت بازدید نباید کاربر را اذیت کند
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}