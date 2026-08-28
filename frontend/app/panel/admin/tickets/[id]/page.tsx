"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ticketApi, Ticket } from "@/services/api/ticket.api";
import {
  ArrowRight, Send, Loader2, AlertCircle, Clock,
  CheckCircle, Paperclip, Download, ShieldAlert,
  Lock, MessageSquare, User, Calendar, Phone,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/lib/getImageUrl";
import { cn } from "@/lib/utils";

/* ─── ثابت‌ها ─── */
const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  bgClassName: string;
}> = {
  open: {
    label: "باز",
    icon: AlertCircle,
    className: "text-amber-600 border-amber-500/30 dark:text-amber-400",
    bgClassName: "bg-amber-500/10",
  },
  in_progress: {
    label: "در حال بررسی",
    icon: Clock,
    className: "text-blue-600 border-blue-500/30 dark:text-blue-400",
    bgClassName: "bg-blue-500/10",
  },
  closed: {
    label: "بسته شده",
    icon: CheckCircle,
    className: "text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    bgClassName: "bg-emerald-500/10",
  },
};

const PRIORITY_MAP: Record<string, string> = {
  urgent: "فوری",
  high: "بالا",
  medium: "متوسط",
  low: "کم",
};

/* ─── کامپوننت پیام ─── */
function MessageBubble({
  msg,
  isAdmin,
  userName,
}: {
  msg: any;
  isAdmin: boolean;
  userName: string;
}) {
  const timeStr = new Date(msg.timestamp).toLocaleString("fa-IR", {
    hour: "2-digit", minute: "2-digit",
    day: "numeric", month: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-2.5", isAdmin ? "justify-end" : "justify-start")}
    >
      {/* آواتار کاربر — سمت چپ */}
      {!isAdmin && (
        <Avatar className="w-8 h-8 border border-border/60 shrink-0 mt-1">
          <AvatarImage
            src="/images/user.webp"
            alt={userName}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold" />
        </Avatar>
      )}

      <div className={cn("max-w-[80%] sm:max-w-[72%]")}>
        {/* نام و زمان */}
        <div className={cn("flex items-center gap-2 mb-1.5 text-[11px] text-muted-foreground", isAdmin && "justify-end")}>
          <span className="font-bold">{isAdmin ? "پشتیبانی تبادل" : userName}</span>
          <span>{timeStr}</span>
        </div>

        {/* حباب پیام */}
        <div className={cn(
          "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
          isAdmin
            ? "bg-primary text-primary-foreground rounded-tl-none"
            : "bg-card border border-border/60 text-foreground rounded-tr-none",
        )}>
          <p className="whitespace-pre-wrap">{msg.message}</p>

          {/* پیوست */}
          {msg.attachment && (
            <a
              href={msg.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
                isAdmin
                  ? "bg-white/15 hover:bg-white/25 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
            >
              <Paperclip className="w-3.5 h-3.5" />
              دانلود پیوست
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* آواتار ادمین — سمت راست */}
      {isAdmin && (
        <Avatar className="w-8 h-8 border border-primary/30 shrink-0 mt-1">
          <AvatarImage
            src="/images/user.webp"
            alt="پشتیبانی"
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold" />
        </Avatar>
      )}
    </motion.div>
  );
}

/* ─── کامپوننت اصلی ─── */
export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTicket = async () => {
    try {
      const data = await ticketApi.getAdminTicket(id);
      setTicket(data);
    } catch {
      toast.error("خطا در دریافت تیکت");
      router.push("/panel/admin/tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [id]);
  useEffect(() => { if (ticket) scrollToBottom(); }, [ticket?.messages?.length]);

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(newStatus);
    try {
      await ticketApi.updateTicketStatus(id, newStatus);
      toast.success(`وضعیت تیکت به «${STATUS_CONFIG[newStatus]?.label}» تغییر کرد`);
      await fetchTicket();
      setShowCloseConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در تغییر وضعیت");
    } finally {
      setChangingStatus(null);
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await ticketApi.adminReply(id, reply);
      toast.success("پاسخ ارسال شد");
      setReply("");
      await fetchTicket();
      textareaRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در ارسال پاسخ");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5" dir="rtl">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!ticket) return null;

  const currentStatus = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = currentStatus.icon;
  const userName = `${(ticket as any).user?.firstName || ""} ${(ticket as any).user?.lastName || ""}`.trim() || "کاربر سیستم";
  const userPhone = (ticket as any).user?.phone;
  const userAvatar = (ticket as any).user?.avatar;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5" dir="rtl">
      {/* هدر */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/60 shadow-sm rounded-2xl p-5"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* اطلاعات تیکت */}
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost" size="icon"
              onClick={() => router.push("/panel/admin/tickets")}
              className="rounded-xl h-10 w-10 hover:bg-muted shrink-0"
            >
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-foreground truncate">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn("gap-1.5 border text-xs font-medium", currentStatus.bgClassName, currentStatus.className)}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {currentStatus.label}
                </Badge>
                {ticket.priority && (
                  <Badge variant="secondary" className="text-[10px]">
                    اولویت: {PRIORITY_MAP[ticket.priority] || ticket.priority}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(ticket.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
            </div>
          </div>

          {/* دکمه‌های وضعیت */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
            {ticket.status !== "open" && (
              <Button size="sm" variant="outline"
                onClick={() => handleStatusChange("open")}
                disabled={!!changingStatus}
                className="rounded-xl gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 text-xs h-9">
                {changingStatus === "open" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                باز کردن
              </Button>
            )}
            {ticket.status !== "in_progress" && (
              <Button size="sm" variant="outline"
                onClick={() => handleStatusChange("in_progress")}
                disabled={!!changingStatus}
                className="rounded-xl gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 text-xs h-9">
                {changingStatus === "in_progress" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                در بررسی
              </Button>
            )}
            {ticket.status !== "closed" && (
              <Button size="sm" variant="destructive"
                onClick={() => setShowCloseConfirm(true)}
                disabled={!!changingStatus}
                className="rounded-xl gap-1.5 text-xs h-9">
                <CheckCircle className="w-3.5 h-3.5" />
                بستن تیکت
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* اطلاعات کاربر */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              اطلاعات کاربر
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* آواتار */}
              <Avatar className="w-12 h-12 border border-border/60 shrink-0">
                <AvatarImage
                  src={userAvatar ? getImageUrl(userAvatar) : "/images/user.webp"}
                  alt={userName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold" />
              </Avatar>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">نام کاربر</p>
                  <p className="text-sm font-bold">{userName}</p>
                </div>
                {userPhone && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">شماره تماس</p>
                    <p className="text-sm font-mono" dir="ltr">{userPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">تعداد پیام‌ها</p>
                  <p className="text-sm font-bold">{((ticket as any).messages?.length || 0).toLocaleString("fa-IR")} پیام</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* پیام‌ها */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              گفتگوی تیکت
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* ناحیه پیام‌ها */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[520px] min-h-[300px] overflow-y-auto bg-muted/10 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
              <AnimatePresence initial={false}>
                {(ticket as any).messages?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="w-10 h-10 opacity-20 mb-3" />
                    <p className="text-sm">هنوز پیامی ارسال نشده</p>
                  </div>
                ) : (
                  (ticket as any).messages?.map((msg: any, index: number) => (
                    <MessageBubble
                      key={index}
                      msg={msg}
                      isAdmin={msg.sender === "admin" || msg.sender === "support"}
                      userName={userName}
                    />
                  ))
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            {/* فرم ارسال پاسخ */}
            {ticket.status === "closed" ? (
              <div className="p-4 bg-muted/40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>این تیکت بسته شده است. برای ارسال پاسخ، ابتدا وضعیت را تغییر دهید.</span>
              </div>
            ) : (
              <div className="p-4 bg-card">
                <div className="flex items-end gap-3">
                  <Textarea
                    ref={textareaRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="پاسخ خود را بنویسید... (Shift+Enter برای خط جدید)"
                    rows={3}
                    className="flex-1 resize-none rounded-xl border-border/60 bg-background focus:bg-card text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <Button
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                    size="icon"
                    className="shrink-0 rounded-xl h-12 w-12 shadow-sm"
                  >
                    {sending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 pr-1">
                  Enter برای ارسال، Shift+Enter برای خط جدید
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* مودال بستن تیکت */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              تأیید بستن تیکت
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              آیا از بستن تیکت «<strong>{ticket.subject}</strong>» اطمینان دارید؟
              کاربر دیگر نمی‌تواند پاسخ جدید ارسال کند.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>می‌توانید بعداً تیکت را دوباره باز کنید.</span>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirm(false)}
              disabled={!!changingStatus}
              className="rounded-xl text-xs flex-1"
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusChange("closed")}
              disabled={!!changingStatus}
              className="rounded-xl text-xs flex-1 gap-1.5"
            >
              {changingStatus === "closed"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />
              }
              بله، بسته شود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}