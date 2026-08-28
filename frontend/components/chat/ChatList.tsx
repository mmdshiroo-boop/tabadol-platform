"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Conversation } from "@/services/api/message.api";
import { useAuth } from "@/app/context/AuthContext";
import { MessageCircle, Bell, ChevronLeft } from "lucide-react";
import { getNotificationRolePath } from "@/lib/notification-utils";
import { getImageUrl } from "@/lib/getImageUrl";
import VerifiedBadge from "@/components/common/VerifiedBadge";

interface ChatListProps {
  conversations: Conversation[];
  loading: boolean;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ChatList({
  conversations,
  loading,
  activeConversationId,
  onSelectConversation,
}: ChatListProps) {
  const { user } = useAuth();
  const notificationPath = getNotificationRolePath(user?.role);

  const getOtherUser = (conv: Conversation) => {
    if (!user) return null;
    return conv.participants?.find((p) => p._id !== user._id) || null;
  };

  const getInitials = (otherUser: any) => {
    if (!otherUser) return "?";
    return otherUser.firstName?.[0] || otherUser.phone?.[0] || "?";
  };

  if (loading) {
    return (
      <div className="space-y-3 p-3" dir="rtl">
        <Skeleton className="h-14 w-full rounded-2xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 p-3" dir="rtl">
      {/* کارت لینک بهینه‌شده جهت انتقال کاربر به پنل اعلانات مربوط به نقش خودش */}
      <Link
        href={notificationPath}
        className="flex items-center justify-between p-3 mb-2 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 border border-primary/20 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative p-2.5 rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
              رفت به بخش اعلانات
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-medium truncate">
              مشاهده اطلاعیه‌ها و پیام‌های سیستم
            </span>
          </div>
        </div>
        <div className="flex items-center text-xs font-bold text-primary gap-0.5 shrink-0 mr-1">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </div>
      </Link>

      {conversations.length === 0 ? (
        <div className="text-center flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="bg-muted/50 p-4 rounded-full mb-3">
            <MessageCircle className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">هنوز گفتگویی ندارید</p>
          <p className="text-xs opacity-70 mt-1">
            اولین پیام خود را ارسال کنید
          </p>
        </div>
      ) : (
        conversations.map((conv) => {
          const otherUser = getOtherUser(conv);
          const hasUnread = (conv as any).unreadCount > 0;
          return (
            <button
              key={conv._id}
              onClick={() => onSelectConversation(conv._id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-right group",
                activeConversationId === conv._id
                  ? "bg-primary/10 border-primary/20 shadow-sm"
                  : "bg-transparent hover:bg-muted/60 border-transparent",
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12 shrink-0 border border-border/50 shadow-sm">
                  <AvatarImage
                    src={getImageUrl(otherUser?.avatar) || "/images/user.webp"}
                    alt={otherUser?.firstName || "کاربر"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold" />
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      href={`/profile/${otherUser?._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "text-sm truncate transition-colors hover:underline underline-offset-4",
                        hasUnread
                          ? "font-extrabold text-foreground"
                          : "font-semibold text-foreground/90",
                        activeConversationId === conv._id && "text-primary",
                      )}
                    >
                      {otherUser
                        ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`
                        : "کاربر"}
                    </Link>
{(otherUser as any)?.isVerified && <VerifiedBadge size="sm" />}                  </div>
                  <span
                    className={cn(
                      "text-[10px] shrink-0",
                      hasUnread
                        ? "text-primary font-bold"
                        : "text-muted-foreground",
                    )}
                  >
                    {conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleTimeString(
                          "fa-IR",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-xs truncate flex-1",
                      hasUnread
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {conv.lastMessage || "شروع گفتگو..."}
                  </p>
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-primary rounded-full shadow-sm">
                      {(conv as any).unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}