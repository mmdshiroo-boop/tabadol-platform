// components/cookie-ui/CookieAuditDetailModal.tsx
"use client";

import { CookieAuditLog } from "@/types";
import {
  Copy,
  X,
  ShieldAlert,
  Fingerprint,
  Globe,
  Monitor,
  Cookie,
  Clock,
  User,
  Smartphone,
  MapPin,
  Terminal,
  ChevronDown,
  Ban,
  LogIn,
  LogOut,
  RefreshCw,
  ScanSearch,
  CheckCircle2,
  XCircle,
  Timer,
  Laptop,
  HelpCircle,
} from "lucide-react";
import { useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api/client";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/getImageUrl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ─── فرمت تاریخ و زمان شمسی ───
function formatPersianDateTime(dateInput?: string | Date): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

// ─── پیکربندی وضعیت و نوع رویداد ───
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  success: {
    label: "موفق",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/40",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "ناموفق",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/40",
    dot: "bg-red-500",
  },
  expired: {
    label: "منقضی",
    icon: Timer,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40",
    dot: "bg-amber-500",
  },
  revoked: {
    label: "باطل‌شده",
    icon: Ban,
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  suspicious: {
    label: "مشکوک",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/40",
    dot: "bg-red-500 animate-pulse",
  },
};

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
  }
> = {
  login: {
    label: "ورود",
    icon: LogIn,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  logout: {
    label: "خروج",
    icon: LogOut,
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-500/10",
  },
  token_refresh: {
    label: "تازه‌سازی توکن",
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  session_check: {
    label: "بررسی نشست",
    icon: ScanSearch,
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
  suspicious: {
    label: "مشکوک",
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
};

// ─── ابزار شناسایی دستگاه ───
function getDeviceIcon(ua?: string): React.ComponentType<{ className?: string }> {
  if (!ua) return HelpCircle;
  if (/iPhone|iPad|iPod/.test(ua)) return Smartphone;
  if (/Android/.test(ua)) return Smartphone;
  if (/Windows|Mac|Linux/.test(ua) && !/Mobi|Android/.test(ua)) return Laptop;
  return Monitor;
}

function parseOS(ua?: string): string {
  if (!ua) return "نامشخص";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "سایر";
}

function parseBrowser(ua?: string): string {
  if (!ua) return "نامشخص";
  if (/Edg/.test(ua)) return "Edge";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  return "مرورگر دیگر";
}

// ─── InfoRow بهبودیافته ───
function InfoRow({
  icon: Icon,
  label,
  value,
  valueNode,
  mono = false,
  copyable = false,
  copiedField,
  onCopy,
  iconColor = "text-orange-500",
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  valueNode?: ReactNode;
  mono?: boolean;
  copyable?: boolean;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  iconColor?: string;
  badge?: ReactNode;
}) {
  if (!value && !valueNode && !copyable) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-start gap-4 p-4 rounded-2xl transition-all duration-300",
        "bg-white/70 dark:bg-card/50 backdrop-blur-sm border border-border/30",
        "hover:bg-white dark:hover:bg-card/80 hover:shadow-lg hover:border-orange-200/60 dark:hover:border-orange-800/30",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all",
          "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10",
          "group-hover:scale-105 group-hover:shadow-md",
        )}
      >
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
          {label}
          {badge && badge}
        </p>
        {valueNode ? (
          <div className="text-sm">{valueNode}</div>
        ) : (
          <p
            className={cn(
              "text-sm leading-relaxed",
              mono
                ? "font-mono text-xs tracking-wide text-foreground/90"
                : "font-semibold text-foreground",
            )}
            dir={mono ? "ltr" : "rtl"}
          >
            {value || "—"}
          </p>
        )}
      </div>
      {copyable && value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(value, label)}
          className={cn(
            "h-8 px-2.5 shrink-0 gap-1.5 rounded-xl transition-all",
            copiedField === label
              ? "text-emerald-600 bg-emerald-50"
              : "text-muted-foreground hover:text-orange-600 hover:bg-orange-50",
          )}
        >
          {copiedField === label ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">کپی شد!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">کپی</span>
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}

// ─── CollapsibleSection پیشرفته ───
function CollapsibleSection({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
  badge,
  badgeColor = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-white/50 dark:bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-muted/20 transition-colors"
      >
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-orange-500" />
        </div>
        <span className="text-sm font-bold flex-1">{title}</span>
        {badge && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2 py-0.5", badgeColor)}
          >
            {badge}
          </Badge>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ════════════════ Main Component ════════════════
export default function CookieAuditDetailModal({
  log,
  open,
  onClose,
}: {
  log?: CookieAuditLog | null;
  open: boolean;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  if (!log) return null;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRevokeSession = async () => {
    if (!log.sessionId) return;
    if (
      !confirm(
        "آیا از باطل‌کردن این نشست اطمینان دارید؟ کاربر مجبور به ورود مجدد خواهد شد."
      )
    )
      return;
    setRevoking(true);
    try {
      await apiClient.post("/super-admin/cookie-audits/revoke-session", {
        sessionId: log.sessionId,
      });
      toast.success("نشست با موفقیت باطل شد");
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        (err as any)?.response?.data?.message || "خطا در باطل‌سازی نشست";
      toast.error(errorMessage);
    } finally {
      setRevoking(false);
    }
  };

  const statusKey = log.status || "success";
  const typeKey = log.type || "login";
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.success;
  const typeCfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.login;
  const StatusIcon = statusCfg.icon;
  const TypeIcon = typeCfg.icon;
  const isSuspicious = statusKey === "suspicious" || typeKey === "suspicious";

  const formattedDate = formatPersianDateTime(log.createdAt);

  const isUserObject = log.userId && typeof log.userId === "object";
  const user = isUserObject ? (log.userId as any) : null;
  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "بدون نام"
    : "مهمان / ناشناس";

  const avatarSrc = user?.avatar
    ? getImageUrl(user.avatar)
    : "/images/user.webp";

  const deviceIcon = getDeviceIcon(log.userAgent);
  const os = parseOS(log.userAgent);
  const browser = parseBrowser(log.userAgent);

  const userInfoNode = isUserObject ? (
    <div className="flex items-center gap-4">
      <Avatar className="h-14 w-14">
        <AvatarImage
          src={avatarSrc}
          alt={fullName}
          className="object-cover"
        />
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col">
        <span className="text-base font-extrabold leading-tight">
          {fullName}
        </span>
        {user.phone && (
          <span className="text-xs font-mono text-muted-foreground mt-1" dir="ltr">
            {user.phone}
          </span>
        )}
        {user.email && (
          <span className="text-xs text-muted-foreground mt-0.5" dir="ltr">
            {user.email}
          </span>
        )}
        {user.role && (
          <Badge variant="secondary" className="mt-1 text-[10px] w-fit">
            {user.role === "user" ? "کاربر" : user.role}
          </Badge>
        )}
      </div>
    </div>
  ) : (
    <span className="text-base font-bold">{fullName}</span>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 flex flex-col rounded-3xl overflow-hidden bg-card text-card-foreground border-border/50 shadow-2xl max-h-[92vh] [&>button]:hidden"
        dir="rtl"
      >
        {/* هدر شیشه‌ای */}
        <div className="relative p-5 md:p-6 bg-gradient-to-l from-orange-500/20 via-orange-400/10 to-transparent backdrop-blur-xl border-b border-orange-200/30 dark:border-orange-900/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="relative flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className={cn(
                  "p-2.5 md:p-3 rounded-2xl border-2 shadow-sm",
                  statusCfg.bg,
                  statusCfg.border,
                )}
              >
                <StatusIcon className={cn("w-5 h-5 md:w-6 md:h-6", statusCfg.color)} />
              </div>
              <div>
                <DialogTitle className="text-lg md:text-xl font-black text-foreground tracking-tight">
                  جزئیات رویداد امنیتی
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">
                    {log._id?.slice(-8) || "—"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] gap-1 px-2 py-0.5",
                      statusCfg.bg,
                      statusCfg.color,
                      statusCfg.border,
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-all shrink-0"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>

        {/* بدنه با اسکرول */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5 custom-scrollbar">
          {isSuspicious && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 shadow-sm"
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="text-xs leading-relaxed">
                <p className="font-black mb-1">هشدار امنیت نشست</p>
                <p className="opacity-90">
                  این فعالیت به‌عنوان رفتار مشکوک یا غیرمجاز پرچم‌گذاری شده است.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow
              icon={TypeIcon}
              label="نوع رویداد"
              value={typeCfg.label}
              iconColor={typeCfg.color}
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
            <InfoRow
              icon={Clock}
              label="زمان ثبت"
              value={formattedDate}
              copiedField={copiedField}
              onCopy={copyToClipboard}
            />
          </div>

          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-white/80 to-white/50 dark:from-card/60 dark:to-card/40 border border-border/30 backdrop-blur-sm shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              اطلاعات کاربر
            </p>
            {userInfoNode}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow
              icon={Globe}
              label="آدرس IP"
              value={log.ip || "—"}
              mono
              copyable
              copiedField={copiedField}
              onCopy={copyToClipboard}
              badge={
                log.ip && (
                  <Badge variant="outline" className="text-[9px] px-1.5 bg-blue-50 border-blue-200 text-blue-700">
                    {os}
                  </Badge>
                )
              }
            />
            <InfoRow
              icon={deviceIcon}
              label="دستگاه و مرورگر"
              value={`${browser} / ${os}`}
              copiedField={copiedField}
              onCopy={copyToClipboard}
              badge={
                <Badge variant="outline" className="text-[9px] px-1.5 bg-purple-50 border-purple-200 text-purple-700">
                  {browser}
                </Badge>
              }
            />
          </div>

          <CollapsibleSection
            icon={Fingerprint}
            title="نشست و کوکی‌ها"
            defaultOpen
            badge={log.sessionId ? "فعال" : "بدون نشست"}
            badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {log.sessionId && (
                <InfoRow
                  icon={Cookie}
                  label="شناسه نشست"
                  value={log.sessionId}
                  mono
                  copyable
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
              {log.tokenId && (
                <InfoRow
                  icon={Terminal}
                  label="توکن / کلید"
                  value={log.tokenId}
                  mono
                  copyable
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
              {log.location && (
                <InfoRow
                  icon={MapPin}
                  label="موقعیت جغرافیایی"
                  value={
                    typeof log.location === "string"
                      ? log.location
                      : `${(log.location as any).city || ""} ${(log.location as any).country || ""}`.trim()
                  }
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            icon={Monitor}
            title="جزئیات فنی"
            defaultOpen={false}
            badge="User-Agent"
            badgeColor="text-slate-600 bg-slate-100"
          >
            <div className="space-y-3">
              {log.userAgent && (
                <InfoRow
                  icon={Smartphone}
                  label="User-Agent کامل"
                  value={log.userAgent}
                  mono
                  copyable
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
              {log.device && (
                <InfoRow
                  icon={Laptop}
                  label="دستگاه شناسایی‌شده"
                  value={log.device}
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />
              )}
            </div>
          </CollapsibleSection>

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <CollapsibleSection
              icon={Terminal}
              title="متادیتا و داده‌های اضافی"
              defaultOpen={false}
              badge={`${Object.keys(log.metadata).length} کلید`}
              badgeColor="text-orange-700 bg-orange-50"
            >
              <div className="p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto text-left dir-ltr max-h-48">
                {JSON.stringify(log.metadata, null, 2)}
              </div>
            </CollapsibleSection>
          )}
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 backdrop-blur-sm">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevokeSession}
            disabled={revoking || log.status === "revoked"}
            className="gap-2 rounded-xl text-xs font-semibold h-11 w-full sm:w-auto transition-all"
          >
            {revoking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Ban className="w-4 h-4" />
            )}
            {log.status === "revoked" ? "نشست باطل شده" : "باطل‌سازی این نشست"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold h-11 w-full sm:w-auto"
          >
            بستن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}