"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, BellDot, CheckCheck, Trash2, Zap } from "lucide-react";
import { Notification } from "@/types";
import { useState, useEffect } from "react";
import {
  getUserRoleFromStorage,
  getNotificationRolePath,
  normalizeNotificationLink,
} from "@/lib/notification-utils";
import { useSocketNotifications } from "@/hooks/useSocketNotifications";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  ad_submitted: { icon: "📋", color: "text-blue-500" },
  ad_approved: { icon: "✅", color: "text-green-500" },
  ad_rejected: { icon: "❌", color: "text-red-500" },
  ad_expired: { icon: "⏰", color: "text-orange-500" },
  new_message: { icon: "💬", color: "text-purple-500" },
  loyalty_points_earned: { icon: "🎁", color: "text-purple-500" },
  tier_upgrade: { icon: "🏆", color: "text-yellow-500" },
  vip_upgrade: { icon: "✨", color: "text-yellow-500" },
  property_submitted: { icon: "🏠", color: "text-blue-500" },
  property_approved: { icon: "✅", color: "text-green-500" },
  property_rejected: { icon: "❌", color: "text-red-500" },
  property_updated: { icon: "✏️", color: "text-blue-500" },
  property_sold: { icon: "💰", color: "text-green-500" },
  new_lead: { icon: "🎯", color: "text-green-500" },
  listing_inquiry: { icon: "🏠", color: "text-blue-500" },
  new_ad_pending: { icon: "📢", color: "text-blue-500" },
  new_user_registered: { icon: "👤", color: "text-teal-500" },
  new_user: { icon: "👤", color: "text-teal-500" },
  ad_reported: { icon: "🚨", color: "text-red-500" },
  user_reported: { icon: "🚨", color: "text-red-500" },
  report_created: { icon: "🚨", color: "text-red-500" },
  user_banned: { icon: "🔨", color: "text-red-500" },
  user_unbanned: { icon: "✅", color: "text-green-500" },
  new_property_pending: { icon: "🏠", color: "text-orange-500" },
  new_agent: { icon: "👥", color: "text-cyan-500" },
  ticket_created: { icon: "🎫", color: "text-blue-500" },
  ticket_reply: { icon: "📩", color: "text-indigo-500" },
  ticket_closed: { icon: "🔒", color: "text-gray-500" },
  admin_action: { icon: "👁️", color: "text-gray-500" },
  revenue_milestone: { icon: "💰", color: "text-green-500" },
  backup_created: { icon: "💾", color: "text-green-500" },
  system_alert: { icon: "⚠️", color: "text-orange-500" },
  ad_assigned: { icon: "📋", color: "text-indigo-500" },
  verification_request: { icon: "🔍", color: "text-indigo-500" },
  property_assigned: { icon: "📋", color: "text-indigo-500" },
  server_error: { icon: "🔴", color: "text-red-500" },
  api_limit: { icon: "📊", color: "text-orange-500" },
  deploy_success: { icon: "🚀", color: "text-green-500" },
  info: { icon: "ℹ️", color: "text-blue-500" },
  success: { icon: "✅", color: "text-green-500" },
  warning: { icon: "⚠️", color: "text-orange-500" },
  error: { icon: "❌", color: "text-red-500" },
  default: { icon: "🔔", color: "text-primary" },
};

const formatRelativeTime = (date: Date): string => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "لحظاتی پیش";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
};

const getPriorityLevel = (priority?: string): number => {
  switch (priority) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const { newNotification, clearNewNotification } = useSocketNotifications();

  useEffect(() => {
    if (newNotification) {
      refresh();
      clearNewNotification();
    }
  }, [newNotification, refresh, clearNewNotification]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    if (token) {
      setUserRole(getUserRoleFromStorage());
    }
  }, []);

  if (isLoggedIn === null || !isLoggedIn) return null;

  const handleClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif._id);
    if (notif.link) {
      const correctedLink = normalizeNotificationLink(notif.link, userRole);
      router.push(correctedLink);
      setOpen(false);
    }
  };

  const getConfig = (type: string) => TYPE_CONFIG[type] ?? TYPE_CONFIG.default;

  const sortedNotifications = [...notifications].sort(
    (a, b) => getPriorityLevel(b.priority) - getPriorityLevel(a.priority),
  );

  const hasHighPriority = sortedNotifications.some(
    (n) => n.priority === "critical" || n.priority === "high",
  );

  const navigateToAll = () => {
    const targetPath = getNotificationRolePath(userRole);
    router.push(targetPath);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-black shadow-sm">
                {unreadCount > 9 ? "۹+" : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasHighPriority && (
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 bg-amber-500 rounded-full animate-pulse border border-background" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 rounded-2xl shadow-xl border border-border"
        align="end"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/30 rounded-t-2xl">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-foreground">اعلان‌ها</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                {unreadCount} جدید
              </span>
            )}
            {hasHighPriority && (
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 rounded-lg font-bold hover:text-primary hover:bg-primary/5"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                خواندم همه
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg font-bold"
              onClick={navigateToAll}
            >
              مدیریت همه
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-xs font-semibold">
              در حال دریافت آخرین اعلان‌ها...
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground/80 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              صندوق اعلان‌های شما خالی است
            </div>
          ) : (
            sortedNotifications.slice(0, 8).map((notif) => {
              const { icon, color } = getConfig(notif.type);
              const isHighPriority =
                notif.priority === "critical" || notif.priority === "high";
              return (
                <div
                  key={notif._id}
                  className={`p-3.5 cursor-pointer transition-all hover:bg-muted/40 group relative ${
                    !notif.read ? "bg-primary/5" : ""
                  } ${isHighPriority && !notif.read ? "bg-amber-500/[0.03]" : ""}`}
                  onClick={() => handleClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl select-none pt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs font-bold truncate ${color}`}>
                          {notif.message}
                        </p>
                        {notif.priority === "critical" && (
                          <span className="text-[9px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-md font-black">
                            حیاتی
                          </span>
                        )}
                        {notif.priority === "high" && (
                          <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md font-black">
                            مهم
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-medium">
                        {formatRelativeTime(new Date(notif.createdAt))}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-between self-stretch">
                      {!notif.read ? (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notif._id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/60 p-2 bg-muted/10 rounded-b-2xl">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold rounded-xl"
            onClick={navigateToAll}
          >
            مشاهده تمام تاریخچه اعلان‌ها
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}