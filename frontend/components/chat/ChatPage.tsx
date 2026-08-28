"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { useMessages } from "@/hooks/useMessages";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatApi } from "@/services/api/chat.api"; // ✅ ایمپورت برای ساخت گفتگو

export function ChatPage() {
  const {
    conversations,
    currentMessages,
    messagesLoading,
    loading,
    fetchMessages,
    reactions,
    sendMessage,
    socket,
    toggleReaction,
    typingUsers,
    editMessage,
    deleteMessage,
    uploadFile,
  } = useMessages();

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isClient, setIsClient] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const prevConversationRef = useRef<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ─── تشخیص ورود اولیه بر اساس پارامترهای URL ───
  useEffect(() => {
    setIsClient(true);

    // ۱. دریافت conversationId از URL
    const conversationIdParam = searchParams.get("conversationId");
    // ۲. دریافت userId از URL (برای ساخت گفتگوی جدید)
    const userIdParam = searchParams.get("userId");

    if (conversationIdParam) {
      // اگر conversationId موجود بود، آن را فعال کن
      setActiveConversationId(conversationIdParam);
    } else if (userIdParam) {
      // اگر فقط userId داشتیم، یک گفتگو بساز
      const startChatWithUser = async () => {
        setCreatingConversation(true);
        try {
          const conversation = await chatApi.createConversation(userIdParam);
          if (conversation?._id) {
            setActiveConversationId(conversation._id);
            // URL را به conversationId تغییر می‌دهیم تا رفرش مشکلی ایجاد نکند
            router.replace(`/chat?conversationId=${conversation._id}`);
          } else {
            console.error("گفتگو ساخته نشد");
          }
        } catch (error: any) {
          console.error("Error creating conversation:", error);
          // در صورت خطا، کاربر را به حالت بدون گفتگو برمی‌گردانیم
          setActiveConversationId(null);
        } finally {
          setCreatingConversation(false);
        }
      };
      startChatWithUser();
    } else {
      // هیچ پارامتری نداریم
      setActiveConversationId(null);
    }
  }, [searchParams, router]);

  // ─── بارگذاری پیام‌های گفتگوی فعال ───
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // ─── مدیریت join/leave در Socket ───
  useEffect(() => {
    if (!socket || !isClient) return;
    if (prevConversationRef.current) {
      socket.emit("leave-conversation", prevConversationRef.current);
    }
    if (activeConversationId) {
      socket.emit("join-conversation", activeConversationId);
    }
    prevConversationRef.current = activeConversationId;
    return () => {
      if (prevConversationRef.current) {
        socket.emit("leave-conversation", prevConversationRef.current);
      }
    };
  }, [activeConversationId, socket, isClient]);

  // ─── مدیریت نمایش bottom-nav در موبایل ───
  useEffect(() => {
    const bottomNav = document.getElementById("mobile-bottom-nav");
    if (bottomNav) {
      if (activeConversationId && window.innerWidth <= 768) {
        bottomNav.style.setProperty("display", "none", "important");
      } else {
        bottomNav.style.removeProperty("display");
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.removeProperty("display");
      }
    };
  }, [activeConversationId]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleUploadFile = useCallback(
    async (
      conversationId: string,
      file: File,
      text?: string,
      onProgress?: (p: number) => void,
    ) => {
      return uploadFile(conversationId, file, text, onProgress);
    },
    [uploadFile],
  );

  const handleDeleteConversation = (deletedId: string) => {
    if (activeConversationId === deletedId) {
      setActiveConversationId(null);
    }
  };

  if (creatingConversation) {
    return (
      <div className="flex items-center justify-center h-[70vh] w-full" dir="rtl">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-primary border-primary/20 mx-auto mb-4" />
          <p className="text-sm font-bold">در حال ایجاد گفتگو...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full border-t border-b border-border/60 overflow-hidden bg-background md:rounded-2xl shadow-sm transition-all duration-200",
        activeConversationId
          ? "h-[100dvh] md:h-[calc(100vh-80px)]"
          : "h-[calc(100dvh-70px)] md:h-[calc(100vh-80px)]",
      )}
    >
      {/* بخش لیست گفتگوها */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-[380px] border-l border-border/60 flex-col h-full bg-card shrink-0",
          activeConversationId ? "hidden md:flex" : "flex",
        )}
      >
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-background/50 backdrop-blur-md shrink-0"
          dir="rtl"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="rounded-xl hover:bg-muted shrink-0 h-9 w-9"
          >
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="font-extrabold text-base text-foreground tracking-tight">
            گفتگوهای من
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ChatList
            conversations={conversations}
            loading={loading}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>
      </div>

      {/* بخش پنجره اصلی چت */}
      <div
        className={cn(
          "flex-1 flex-col min-w-0 bg-background relative h-full overflow-hidden",
          !activeConversationId ? "hidden md:flex" : "flex",
        )}
      >
        <ChatWindow
          conversationId={activeConversationId}
          conversations={conversations}
          currentMessages={currentMessages}
          messagesLoading={messagesLoading}
          onSendMessage={sendMessage}
          onUploadFile={handleUploadFile}
          onBack={() => setActiveConversationId(null)}
          onDeleteConversation={handleDeleteConversation}
          reactions={reactions}
          socket={socket}
          typingUsers={typingUsers}
          editMessage={editMessage}
          toggleReaction={toggleReaction}
          deleteMessage={deleteMessage}
        />
      </div>
    </div>
  );
}