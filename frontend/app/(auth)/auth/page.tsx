//app/(auth)/auth/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useRegistrationGate } from "@/hooks/useRegistrationGate";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

type AuthMode = "login" | "register" | "forgot";

type IndicatorState = {
  x: number;
  width: number;
  ready: boolean;
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const { startWindow, isExpired, message } = useRegistrationGate();

  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const loginTabRef = useRef<HTMLButtonElement | null>(null);
  const registerTabRef = useRef<HTMLButtonElement | null>(null);

  const [indicator, setIndicator] = useState<IndicatorState>({
    x: 0,
    width: 0,
    ready: false,
  });

  // ✅ اصلاح: بعد از لاگین/ثبت‌نام، router.replace + refresh
  const handleSuccess = () => {
    router.replace("/");
    router.refresh();
  };

  const handleLoginClick = () => {
    setMode("login");
  };

  const handleRegisterClick = () => {
    setMode("register");
    startWindow();
  };

  const updateIndicator = () => {
    if (mode === "forgot") return;
    if (!tabsContainerRef.current) return;

    const activeTab =
      mode === "login" ? loginTabRef.current : registerTabRef.current;

    if (!activeTab) return;

    const containerRect = tabsContainerRef.current.getBoundingClientRect();
    const activeRect = activeTab.getBoundingClientRect();

    const nextX = activeRect.left - containerRect.left;
    const nextWidth = activeRect.width;

    setIndicator((prev) => {
      if (prev.ready && prev.x === nextX && prev.width === nextWidth) {
        return prev;
      }
      return { x: nextX, width: nextWidth, ready: true };
    });
  };

  useLayoutEffect(() => {
    if (mode === "forgot") return;
    const raf = requestAnimationFrame(updateIndicator);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  useEffect(() => {
    if (mode === "forgot") return;
    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && tabsContainerRef.current) {
      observer = new ResizeObserver(updateIndicator);
      observer.observe(tabsContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [mode]);

  const showRegisterTimer = mode === "register" && !isExpired && !!message;
  const showRegisterExpired = mode === "register" && isExpired;

  const baseTabClass =
    "relative z-10 flex-1 h-11 rounded-xl px-4 text-sm sm:text-[15px] font-black tracking-tight transition-colors duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

  return (
    <div className="w-full max-w-[440px] my-auto mx-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.32, ease: "easeOut" }}
        className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl shadow-black/[0.06] dark:shadow-black/[0.15]"
      >
        {/* Tabs */}
        <AnimatePresence initial={false} mode="wait">
          {mode !== "forgot" && (
            <motion.div
              key="auth-tabs"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-b border-border/30 bg-muted/20"
            >
              <div className="p-2 sm:p-2.5">
                <div
                  ref={tabsContainerRef}
                  className="relative flex rounded-2xl bg-muted/60 p-1 dark:bg-muted/40"
                >
                  {indicator.ready && (
                    <motion.div
                      aria-hidden="true"
                      initial={false}
                      animate={{
                        x: indicator.x,
                        width: indicator.width,
                        opacity: 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.9,
                      }}
                      className="absolute inset-y-1 right-auto left-0 rounded-xl bg-primary shadow-[0_8px_24px_rgba(249,115,22,0.28)]"
                    />
                  )}

                  <button
                    ref={loginTabRef}
                    type="button"
                    onClick={handleLoginClick}
                    aria-pressed={mode === "login"}
                    className={cn(
                      baseTabClass,
                      mode === "login"
                        ? "text-white"
                        : "text-muted-foreground hover:text-foreground active:scale-[0.985]"
                    )}
                  >
                    <span className="relative z-10">ورود</span>
                  </button>

                  <button
                    ref={registerTabRef}
                    type="button"
                    onClick={handleRegisterClick}
                    aria-pressed={mode === "register"}
                    className={cn(
                      baseTabClass,
                      mode === "register"
                        ? "text-white"
                        : "text-muted-foreground hover:text-foreground active:scale-[0.985]"
                    )}
                  >
                    <span className="relative z-10">ثبت‌نام</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        <div className="p-5 sm:p-6">
          <AnimatePresence initial={false}>
            {showRegisterTimer && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2.5 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-primary">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <span className="text-xs">⏱</span>
                  </div>
                  <span className="leading-relaxed">{message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showRegisterExpired ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col items-center justify-center gap-4 py-10 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80">
                <span className="text-3xl">⏰</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-foreground">
                  زمان ثبت‌نام به پایان رسید
                </p>
                <p className="max-w-[240px] text-xs text-muted-foreground">
                  برای تلاش مجدد، صفحه را رفرش کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline underline-offset-4"
              >
                رفرش صفحه
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {mode === "login" && (
                  <LoginForm
                    onSuccess={handleSuccess}
                    onRegisterClick={handleRegisterClick}
                    onForgotClick={() => setMode("forgot")}
                  />
                )}
                {mode === "register" && (
                  <RegisterForm
                    onSuccess={handleSuccess}
                    onLoginClick={handleLoginClick}
                  />
                )}
                {mode === "forgot" && (
                  <ForgotPasswordForm
                    onSuccess={() => setMode("login")}
                    onLoginClick={handleLoginClick}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="mt-5 px-4 text-center text-[11px] leading-relaxed text-muted-foreground/60"
      >
        ورود و ثبت‌نام در هویج به منزله پذیرش{" "}
        <Link
          href="/rules"
          className="font-medium text-primary/80 transition-colors hover:text-primary"
        >
          قوانین
        </Link>{" "}
        و{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary/80 transition-colors hover:text-primary"
        >
          حریم خصوصی
        </Link>{" "}
        است.
      </motion.p>
    </div>
  );
}