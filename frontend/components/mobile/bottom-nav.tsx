"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Plus, MessageCircleMore, Bookmark } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const roleConfigs: Record<string, { accent: string; text: string }> = {
  vip: {
    accent: "bg-primary hover:bg-primary",
    text: "text-amber-600 dark:text-amber-400",
  },
  agent: {
    accent: "bg-primary hover:bg-primary",
    text: "text-blue-600 dark:text-blue-400",
  },
  developer: {
    accent: "bg-primary hover:bg-primary",
    text: "text-purple-600 dark:text-purple-400",
  },
  expert: {
    accent: "bg-primary hover:bg-primary",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  admin: {
    accent: "bg-primary hover:bg-primary",
    text: "text-red-600 dark:text-red-400",
  },
  super_admin: {
    accent: "bg-primary hover:bg-primary",
    text: "text-amber-600 dark:text-amber-400",
  },
  user: {
    accent: "bg-primary hover:bg-primary",
    text: "text-primary",
  },
};

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  isCenter?: boolean;
  isAvatar?: boolean;
};

export function BottomNav() {
  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const { unreadCount } = useNotifications();
  const [avatarKey, setAvatarKey] = useState(Date.now());

  const isInsideActiveChat =
    pathname.startsWith("/chat/") && pathname.split("/").length > 2;

  useEffect(() => {
    const handleAvatarUpdate = () => setAvatarKey(Date.now());
    window.addEventListener("avatar-updated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
  }, []);

  useEffect(() => {
    setAvatarKey(Date.now());
  }, [authUser?.avatar, authUser?.firstName, authUser?.lastName, authUser?.phone]);

  if (isInsideActiveChat) return null;

  const userRole = authUser?.role || "user";
  const activeRoleConfig = roleConfigs[userRole] || roleConfigs.user;
  const isInPanel = pathname.startsWith("/panel");

  // ★ منبع تصویر — اگر عکس نداشت، تصویر پیش‌فرض
  const avatarSrc = useMemo(() => {
    if (!authUser?.avatar) return "/images/user.webp";

    if (authUser.avatar.startsWith("http")) {
      return `${authUser.avatar}${authUser.avatar.includes("?") ? "&" : "?"}t=${avatarKey}`;
    }

    return `${API_BASE.replace("/api", "")}${authUser.avatar}?t=${avatarKey}`;
  }, [authUser?.avatar, avatarKey]);

  const getNavItems = (): NavItem[] => [
    {
      key: "home",
      label: "آگهی‌ها",
      href: "/",
      icon: Home,
    },
    {
      key: "bookmarks",
      label: "ذخیره‌ها",
      href: authUser ? "/bookmarks" : "/auth",
      icon: Bookmark,
    },
    {
      key: "create-ad",
      label: "ثبت آگهی",
      href: authUser ? "/create-ad" : "/auth",
      icon: Plus,
      isCenter: true,
    },
    {
      key: "chat",
      label: "پیام‌ها",
      href: authUser ? "/chat" : "/auth",
      icon: MessageCircleMore,
      badge: authUser ? unreadCount : 0,
    },
    {
      key: "account",
      label: "حساب من",
      href: authUser ? "/profile-menu" : "/auth",
      isAvatar: true,
    },
  ];

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-t border-border/60 px-1 pb-safe pt-2 md:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.04)] select-none">
      <div className="flex items-center justify-between h-16 max-w-lg mx-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive = (() => {
            if (!authUser) {
              if (pathname === "/auth") return item.key === "account";
              return pathname === item.href;
            }

            if (item.href === "/") return pathname === "/";

            if (item.key === "account") {
              return (
                pathname.startsWith("/profile-menu") ||
                pathname.startsWith("/panel/user") ||
                pathname.startsWith("/panel/vip") ||
                pathname.startsWith("/panel/agent") ||
                pathname.startsWith("/panel/expert") ||
                pathname.startsWith("/panel/developer") ||
                pathname.startsWith("/panel/admin") ||
                pathname.startsWith("/panel/super-admin")
              );
            }

            return pathname.startsWith(item.href);
          })();

          // دکمه مرکزی ثبت آگهی
          if (item.isCenter && Icon) {
            return (
              <Link
                key={item.key}
                href={item.href}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 group outline-none"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center gap-1 w-full relative"
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center rounded-full w-10 h-10 text-white transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
                      activeRoleConfig.accent,
                    )}
                  >
                    <Icon className="w-6 h-6 stroke-[3]" />
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-bold transition-all duration-200 tracking-tight text-center truncate max-w-full",
                      isActive
                        ? cn("font-black", isInPanel ? activeRoleConfig.text : "text-primary")
                        : "text-muted-foreground/90 group-hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          }

          // آیتم‌های عادی
          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 group outline-none min-w-0"
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-1 w-full py-1 relative rounded-xl transition-colors duration-200"
              >
                <div className="relative">
                  {item.isAvatar ? (
                    // ★ آواتار — همیشه تصویر، هیچوقت حرف
                    <Avatar className="w-[24px] h-[24px] rounded-full transition-all duration-200">
                      <AvatarImage
                        key={avatarKey}
                        src={avatarSrc}
                        className="object-cover"
                      />
                      {/* Fallback — تصویر پیش‌فرض (از avatar.tsx می‌آد، حروف نیست) */}
                      <AvatarFallback />
                    </Avatar>
                  ) : Icon ? (
                    <Icon
                      className={cn(
                        "w-[21px] h-[21px] transition-all duration-200",
                        isActive
                          ? cn(
                              "stroke-[2.5]",
                              isInPanel ? activeRoleConfig.text : "text-primary",
                            )
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                  ) : null}

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in shadow-sm leading-none">
                      {item.badge > 99 ? "+99" : item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[9.5px] font-bold transition-all duration-200 tracking-tight text-center truncate w-full px-0.5",
                    isActive
                      ? cn(
                          "font-black",
                          isInPanel ? activeRoleConfig.text : "text-primary",
                        )
                      : "text-muted-foreground/90",
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}