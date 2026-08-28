"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import {
  Send,
  ArrowRight,
  User,
  Paperclip,
  Check,
  X,
  Trash2,
  FileImage,
  FileText,
  Music,
  Video,
  Loader2,
  CheckCheck,
  Copy,
  Edit3,
  MoreHorizontal,
  Ban,
  Share2,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { messageApi } from "@/services/api/message.api";
import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";
import VerifiedBadge from "@/components/common/VerifiedBadge";

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

const getFileTypeFromUrl = (url?: string): string => {
  if (!url) return "file";
  const ext = url.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
      return "image";
    case "mp4":
    case "webm":
    case "ogg":
    case "mov":
      return "video";
    case "mp3":
    case "wav":
    case "aac":
    case "flac":
      return "audio";
    default:
      return "file";
  }
};

interface ChatWindowProps {
  conversationId: string | null;
  conversations: any[];
  currentMessages: any[];
  messagesLoading: boolean;
  toggleReaction?: (messageId: string, emoji: string) => Promise<void>;
  onSendMessage: (conversationId: string, content: string) => Promise<any>;
  onUploadFile?: (
    conversationId: string,
    file: File,
    text?: string,
    onProgress?: (percent: number) => void,
  ) => Promise<any>;
  onDeleteConversation?: (deletedId: string) => void;
  onBack?: () => void;
  reactions?: Record<string, any[]>;
  socket: any;
  typingUsers: Record<string, string>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

export function ChatWindow({
  conversationId,
  conversations,
  currentMessages,
  messagesLoading,
  onSendMessage,
  onUploadFile,
  onDeleteConversation,
  onBack,
  socket,
  typingUsers,
  editMessage,
  deleteMessage,
}: ChatWindowProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
    messageContent: string;
    isMine: boolean;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null,
  );
  const [uploadFileData, setUploadFileData] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;
    try {
      await onSendMessage(conversationId, newMessage.trim());
      setNewMessage("");
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      editingMessageId ? handleSaveEdit(editingMessageId) : handleSend();
    }
  };

  const handleTyping = () => {
    if (socket && conversationId) {
      socket.emit("typing", conversationId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", conversationId);
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;
    setUploadFileData(file);
    setUploadCaption("");
    setUploadProgress(0);
    setUploadStatus("idle");
    setShowUploadModal(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!uploadFileData || !conversationId || !onUploadFile) return;
    setUploadStatus("uploading");
    try {
      await onUploadFile(
        conversationId,
        uploadFileData,
        uploadCaption,
        (percent) => {
          setUploadProgress(percent);
        },
      );
      setShowUploadModal(false);
      setUploadFileData(null);
    } catch {
      setUploadStatus("error");
      toast.error("خطا در ارسال فایل");
    }
  };

  const openContextMenu = (
    e: React.MouseEvent | React.TouchEvent,
    msg: any,
  ) => {
    e.preventDefault();
    const currentUserId = user?._id || user?.id;
    const senderId =
      msg.sender?._id ||
      msg.sender?.id ||
      (typeof msg.sender === "string" ? msg.sender : null);
    const isMine =
      !!currentUserId &&
      !!senderId &&
      String(currentUserId) === String(senderId);

    setContextMenu({
      x: ("touches" in e ? e.touches[0].clientX : e.clientX) || 0,
      y: ("touches" in e ? e.touches[0].clientY : e.clientY) || 0,
      messageId: msg._id,
      messageContent: msg.content,
      isMine,
    });
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("متن کپی شد");
    setContextMenu(null);
  };

  const handleEditFromMenu = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
    setContextMenu(null);
  };

  const handleDeleteRequest = (messageId: string) => {
    setDeletingMessageId(messageId);
    setShowDeleteConfirm(true);
    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!deletingMessageId) return;
    try {
      await deleteMessage(deletingMessageId);
      toast.success("پیام برای هر دو طرف حذف شد");
    } catch {
      toast.error("خطا در حذف پیام");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingMessageId(null);
    }
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim()) return;
    try {
      await editMessage(messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent("");
    } catch {}
  };

  const getFileTypeIcon = (fileUrl?: string) => {
    const type = getFileTypeFromUrl(fileUrl);
    if (type === "image")
      return <FileImage className="w-8 h-8 text-blue-500" />;
    if (type === "video") return <Video className="w-8 h-8 text-purple-500" />;
    if (type === "audio") return <Music className="w-8 h-8 text-emerald-500" />;
    return <FileText className="w-8 h-8 text-amber-500" />;
  };

  const renderReadStatus = (msg: any) => {
    if (!msg.readBy || msg.readBy.length < 2) {
      return <Check className="w-3.5 h-3.5 text-primary-foreground/70" />;
    }
    return <CheckCheck className="w-3.5 h-3.5 text-primary-foreground" />;
  };

  const conversation = conversations.find((c: any) => c._id === conversationId);
  const otherParticipant = conversation?.participants?.find(
    (p: any) => (p as any)._id !== user?._id,
  );

  useEffect(() => {
    if (otherParticipant?._id) {
      messageApi
        .isUserBlocked(otherParticipant._id)
        .then(setIsBlocked)
        .catch(() => {});
    }
  }, [otherParticipant?._id]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background w-full h-full p-4">
        <div className="text-center text-muted-foreground bg-background p-6 md:p-8 rounded-3xl shadow-sm border border-border/40 max-w-sm w-full">
          <MessageCircle className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 text-primary/30" />
          <h2 className="font-extrabold text-base md:text-lg text-foreground mb-1">
            پیام‌های شما
          </h2>
          <p className="text-xs md:text-sm">
            برای شروع، یک گفتگو را انتخاب کنید
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-background w-full overflow-hidden"
      dir="rtl"
    >
      {/* header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 border-b border-border/50 bg-background/80 backdrop-blur-md z-10 shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-xl shrink-0 md:hidden hover:bg-muted h-9 w-9"
          >
            <ArrowRight className="w-5 h-5 text-foreground" />
          </Button>
        )}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-right"
        >
          <Avatar className="h-9 w-9 md:h-10 md:w-10 ring-2 ring-primary/10 shadow-sm">
            <AvatarImage
              src={
                otherParticipant?.avatar
                  ? getImageUrl(otherParticipant.avatar)
                  : "/images/user.webp"
              }
              alt={otherParticipant?.firstName || "مخاطب"}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs md:text-sm" />
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${otherParticipant?._id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-extrabold text-xs md:text-sm truncate text-foreground hover:underline underline-offset-4"
              >
                {otherParticipant
                  ? `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`
                  : "کاربر"}
              </Link>
              {otherParticipant?.isVerified && <VerifiedBadge size="sm" />}
            </div>
            {typingUsers[conversationId!] ? (
              <p className="text-[11px] md:text-xs text-primary font-medium animate-pulse">
                در حال تایپ...
              </p>
            ) : conversation?.ad ? (
              <p className="text-[11px] md:text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
                درباره: {conversation.ad.title}
              </p>
            ) : null}
          </div>
        </button>
      </div>

      {/* ad banner */}
      {conversation?.ad && (
        <div className="border-b border-border/40 bg-muted/30 px-3 py-2 md:px-4 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 max-w-full">
            {conversation.ad.images?.[0] && (
              <img
                src={getImageUrl(conversation.ad.images[0])}
                alt={conversation.ad.title}
                className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-cover shadow-sm shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 text-right">
              <p className="font-bold text-[11px] md:text-xs truncate text-foreground">
                {conversation.ad.title}
              </p>
              {conversation.ad.price > 0 && (
                <p className="text-[10px] md:text-[11px] text-primary font-bold mt-0.5">
                  {conversation.ad.price.toLocaleString("fa-IR")} تومان
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] md:text-[11px] text-primary bg-primary/10 hover:bg-primary/20 rounded-md"
                onClick={() =>
                  window.open(`/ad/${conversation.ad._id}`, "_blank")
                }
              >
                آگهی
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-muted/80"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-right">
                  {isBlocked ? (
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!otherParticipant?._id) return;
                        try {
                          await messageApi.unblockUser(otherParticipant._id);
                          setIsBlocked(false);
                          toast.success("کاربر از بلاک خارج شد");
                        } catch (err: any) {
                          toast.error(err.response?.data?.message || "خطا");
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 ml-2" /> رفع بلاک
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={async () => {
                        if (!otherParticipant?._id) return;
                        try {
                          await messageApi.blockUser(otherParticipant._id);
                          setIsBlocked(true);
                          toast.success("کاربر بلاک شد");
                        } catch (err: any) {
                          toast.error(err.response?.data?.message || "خطا");
                        }
                      }}
                    >
                      <Ban className="w-4 h-4 ml-2" /> بلاک کاربر
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      if (!conversationId) return;
                      try {
                        await messageApi.deleteConversation(conversationId);
                        toast.success("گفتگو با موفقیت حذف شد");
                        onDeleteConversation?.(conversationId);
                        onBack?.();
                      } catch {
                        toast.error("خطا در حذف گفتگو");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 ml-2" /> حذف گفتگو
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6 space-y-3.5 bg-background scrollbar-thin"
        onClick={() => setContextMenu(null)}
      >
        <AnimatePresence initial={false}>
          {messagesLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex w-full ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <Skeleton className="h-11 w-[65%] md:w-[40%] rounded-2xl" />
                </div>
              ))
            : currentMessages
                .filter((msg: any) => !msg.deletedAt)
                .map((msg: any) => {
                  const currentUserId = user?._id || user?.id;
                  const senderId =
                    msg.sender?._id ||
                    msg.sender?.id ||
                    (typeof msg.sender === "string" ? msg.sender : null);
                  const isMine =
                    !!currentUserId &&
                    !!senderId &&
                    String(currentUserId) === String(senderId);

                  const avatarSrc = isMine
                    ? getImageUrl(user?.avatar)
                    : getImageUrl(
                        msg.sender?.avatar || otherParticipant?.avatar,
                      );

                  return (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex w-full ${isMine ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`flex items-end gap-1.5 max-w-[88%] md:max-w-[75%] ${isMine ? "flex-row" : "flex-row-reverse"}`}
                        onContextMenu={(e) => openContextMenu(e, msg)}
                        onTouchStart={(e) => {
                          const timer = setTimeout(
                            () => openContextMenu(e, msg),
                            600,
                          );
                          e.currentTarget.addEventListener(
                            "touchend",
                            () => clearTimeout(timer),
                            { once: true },
                          );
                          e.currentTarget.addEventListener(
                            "touchmove",
                            () => clearTimeout(timer),
                            { once: true },
                          );
                        }}
                      >
                        <Avatar className="h-7 w-7 shrink-0 mb-0.5 border border-border/40 shadow-sm">
                          <AvatarImage
                            src={avatarSrc}
                            alt={msg.sender?.firstName || "کاربر"}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[9px] bg-card font-bold" />
                        </Avatar>
                        <div className="flex flex-col">
                          <div
                            className={`relative px-3 py-2 md:px-4 md:py-2.5 rounded-2xl shadow-sm flex flex-col ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/40 rounded-bl-sm text-foreground"}`}
                          >
                            {msg.fileUrl && (
                              <div className="mb-2 max-w-full overflow-hidden rounded-xl">
                                {getFileTypeFromUrl(msg.fileUrl) === "image" ? (
                                  <img
                                    src={getImageUrl(msg.fileUrl)}
                                    alt="تصویر ارسالی"
                                    className="max-h-60 w-full object-cover cursor-pointer rounded-lg hover:opacity-95 transition-opacity"
                                    onClick={() => {
                                      if (
                                        typeof setPreviewImage === "function"
                                      ) {
                                        setPreviewImage(
                                          getImageUrl(msg.fileUrl),
                                        );
                                      }
                                    }}
                                  />
                                ) : getFileTypeFromUrl(msg.fileUrl) ===
                                  "video" ? (
                                  <video
                                    src={getImageUrl(msg.fileUrl)}
                                    controls
                                    className="max-h-60 w-full rounded-lg bg-black"
                                  />
                                ) : (
                                  <a
                                    href={getImageUrl(msg.fileUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                                      isMine
                                        ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground"
                                        : "bg-muted/50 border-border hover:bg-muted text-foreground"
                                    }`}
                                  >
                                    {typeof getFileTypeIcon === "function" &&
                                      getFileTypeIcon(msg.fileUrl)}

                                    <div className="flex-1 min-w-0 text-right">
                                      <p className="text-xs font-bold truncate">
                                        {msg.fileName ||
                                          msg.fileUrl.split("/").pop()}
                                      </p>
                                      {msg.fileSize && (
                                        <p
                                          className="text-[10px] opacity-70 mt-0.5"
                                          dir="ltr"
                                        >
                                          {typeof formatFileSize === "function"
                                            ? formatFileSize(msg.fileSize)
                                            : msg.fileSize}
                                        </p>
                                      )}
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.content && (
                              <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words text-right">
                                {msg.content}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-1 mt-1 self-end">
                              <span
                                className={`text-[8px] md:text-[9px] ltr ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  "fa-IR",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                              {isMine && renderReadStatus(msg)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-card border border-border/40 rounded-xl shadow-lg py-1.5 text-xs md:text-sm min-w-[140px] overflow-hidden"
            style={{
              left: Math.min(
                contextMenu.x,
                typeof window !== "undefined"
                  ? window.innerWidth - 150
                  : contextMenu.x,
              ),
              top: Math.min(
                contextMenu.y,
                typeof window !== "undefined"
                  ? window.innerHeight - 150
                  : contextMenu.y,
              ),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-right px-4 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
              onClick={() => handleCopy(contextMenu.messageContent)}
            >
              <Copy className="w-4 h-4 text-muted-foreground" /> کپی متن
            </button>
            {contextMenu.isMine && (
              <>
                <button
                  className="w-full text-right px-4 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
                  onClick={() =>
                    handleEditFromMenu(
                      contextMenu.messageId,
                      contextMenu.messageContent,
                    )
                  }
                >
                  <Edit3 className="w-4 h-4 text-muted-foreground" /> ویرایش
                </button>
                <button
                  className="w-full text-right px-4 py-2 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                  onClick={() => handleDeleteRequest(contextMenu.messageId)}
                >
                  <Trash2 className="w-4 h-4" /> حذف پیام
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl p-5" dir="rtl">
          <VisuallyHidden>
            <DialogTitle>تأیید حذف پیام</DialogTitle>
          </VisuallyHidden>
          <div className="text-center space-y-4 pt-2">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-bold text-base md:text-lg">حذف پیام</p>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              آیا مطمئن هستید؟ این پیام برای هر دو طرف پاک خواهد شد و قابل
              بازگشت نیست.
            </p>
            <div className="flex gap-3 justify-center w-full pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs md:text-sm h-10"
                onClick={() => setShowDeleteConfirm(false)}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl text-xs md:text-sm h-10"
                onClick={confirmDelete}
              >
                حذف برای همه
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="w-[90vw] max-w-sm rounded-3xl p-5" dir="rtl">
          <DialogTitle className="text-center font-extrabold pb-2 border-b border-border/40 text-sm md:text-base">
            پروفایل کاربر
          </DialogTitle>
          <div className="flex flex-col items-center space-y-4 pt-3">
            <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-primary/10 shadow-lg">
              <AvatarImage
                src={
                  otherParticipant?.avatar
                    ? getImageUrl(otherParticipant.avatar)
                    : "/images/user.webp"
                }
                alt={otherParticipant?.firstName || "مخاطب"}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl md:text-3xl bg-primary/10 text-primary font-black" />
            </Avatar>
            <div className="text-center space-y-1">
              <div className="flex items-center gap-1.5 justify-center">
                <h3 className="font-extrabold text-base md:text-xl">
                  {otherParticipant?.firstName} {otherParticipant?.lastName}
                </h3>
                {otherParticipant?.isVerified && (
                  <VerifiedBadge size="md" />
                )}
              </div>
              {otherParticipant?.phone && (
                <p
                  className="text-xs text-muted-foreground font-mono bg-muted/50 py-0.5 px-2.5 rounded-full inline-block"
                  dir="ltr"
                >
                  {otherParticipant.phone}
                </p>
              )}
            </div>
            <div className="flex gap-2.5 w-full pt-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 rounded-xl text-xs h-10 md:h-11"
                onClick={() => {
                  const url = `${window.location.origin}/profile/${otherParticipant?._id}`;
                  if (navigator.share) {
                    navigator.share({
                      title: `پروفایل ${otherParticipant?.firstName}`,
                      url,
                    });
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success("لینک پروفایل کپی شد");
                  }
                  setShowProfileModal(false);
                }}
              >
                <Share2 className="w-3.5 h-3.5" /> اشتراک‌گذاری
              </Button>
              <Button
                className="flex-1 gap-1.5 rounded-xl text-xs h-10 md:h-11"
                onClick={() => {
                  window.open(`/profile/${otherParticipant?._id}`, "_blank");
                  setShowProfileModal(false);
                }}
              >
                <User className="w-3.5 h-3.5" /> مشاهده پروفایل
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Preview Dialog */}
      <Dialog
        open={!!previewImage || !!previewVideo}
        onOpenChange={() => {
          setPreviewImage(null);
          setPreviewVideo(null);
        }}
      >
        <DialogContent
          className="max-w-[95vw] max-h-[90vh] max-sm:max-w-full max-sm:max-h-full max-sm:w-screen max-sm:h-screen w-auto h-auto p-0 bg-black/90 backdrop-blur-xl border-none rounded-none sm:rounded-2xl overflow-hidden flex items-center justify-center"
          dir="rtl"
        >
          <VisuallyHidden>
            <DialogTitle>پیش‌نمایش رسانه</DialogTitle>
          </VisuallyHidden>
          {previewImage && (
            <img
              src={previewImage}
              alt="پیش‌نمایش تصویر"
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-lg"
            />
          )}
          {previewVideo && (
            <video
              src={previewVideo}
              controls
              autoPlay
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* File Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl p-5" dir="rtl">
          <VisuallyHidden>
            <DialogTitle>ارسال فایل</DialogTitle>
          </VisuallyHidden>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-sm md:text-base">ارسال فایل</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowUploadModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {uploadFileData && (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                {getFileTypeIcon(uploadFileData.name)}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-bold truncate">
                    {uploadFileData.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">
                    {formatFileSize(uploadFileData.size)}
                  </p>
                </div>
              </div>
            )}

            <Textarea
              placeholder="توضیحات یا کپشن (اختیاری)..."
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              className="resize-none text-xs md:text-sm min-h-[80px] rounded-xl text-right"
            />

            {uploadStatus === "uploading" && (
              <div className="space-y-1.5">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-[11px] text-muted-foreground text-center">
                  در حال آپلود... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                className="rounded-xl text-xs h-9"
                onClick={() => setShowUploadModal(false)}
                disabled={uploadStatus === "uploading"}
              >
                انصراف
              </Button>
              <Button
                className="rounded-xl text-xs h-9 gap-1.5"
                onClick={handleConfirmUpload}
                disabled={uploadStatus === "uploading"}
              >
                {uploadStatus === "uploading" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                ارسال
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* message input area */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-md p-2.5 md:p-3 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {editingMessageId && (
          <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 rounded-xl mb-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Edit3 className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">ویرایش پیام:</span>
              <span className="text-muted-foreground truncate max-w-[200px]">
                {editingContent}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => {
                setEditingMessageId(null);
                setEditingContent("");
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {isBlocked ? (
          <div className="text-center py-2 px-4 bg-muted/40 rounded-2xl text-xs md:text-sm text-muted-foreground">
            امکان ارسال پیام وجود ندارد (کاربر مسدود شده است)
          </div>
        ) : (
          <div className="flex items-end gap-2 max-w-full">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0 hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <Textarea
                placeholder={
                  editingMessageId
                    ? "ویرایش متن پیام..."
                    : "پیام خود را بنویسید..."
                }
                value={editingMessageId ? editingContent : newMessage}
                onChange={(e) => {
                  if (editingMessageId) {
                    setEditingContent(e.target.value);
                  } else {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                className="min-h-[40px] max-h-[120px] py-2.5 px-3.5 rounded-2xl text-xs md:text-sm resize-none bg-muted/40 border-border/50 focus-visible:ring-primary text-right"
              />
            </div>

            {editingMessageId ? (
              <Button
                size="icon"
                onClick={() => handleSaveEdit(editingMessageId)}
                disabled={!editingContent.trim()}
                className="h-10 w-10 rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="h-10 w-10 rounded-xl shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}