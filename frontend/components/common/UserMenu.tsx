// usermenu.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { getImageUrl } from "@/lib/getImageUrl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import apiClient from "@/services/api/client";
import { FollowListModal } from "../follow/FollowListModal";
import {
  User,
  LogOut,
  Heart,
  FileText,
  Settings,
  LayoutDashboard,
  MessageCircle,
  HelpCircle,
  Shield,
  ChevronLeft,
  Crown,
  Building,
  Code2,
  Star,
  Clock,
  Flag,
  Users,
  Database,
  BarChart3,
  Key,
  Webhook,
  BookOpen,
  Bell,
  ScrollText,
  Activity,
  Moon,
  Sun,
  Gift,
  BadgeCheck,
  Coins,
} from "lucide-react";

// ─── منوها ───
const defaultMenuItems = [
  { icon: User, label: "پروفایل کاربری", href: "/panel/user/profile" },
  { icon: FileText, label: "آگهی‌های من", href: "/panel/user/my-ads" },
  { icon: Heart, label: "نشان شده‌ها", href: "/panel/user/favorites" },
  { icon: MessageCircle, label: "صندوق پیام‌ها", href: "/chats" },
  { icon: Flag, label: "گزارشات تخلف من", href: "/panel/user/reports-my" },
  { icon: Gift, label: "باشگاه مشتریان", href: "/panel/user/loyalty" },
  { icon: Gift, label: "جوایز باشگاه", href: "/panel/user/rewards" },
  { icon: LayoutDashboard, label: "داشبورد حساب", href: "/panel/user", divider: true },
  { icon: Settings, label: "تنظیمات حساب", href: "/panel/user/settings" },
  { icon: HelpCircle, label: "راهنما و پشتیبانی", href: "/help" },
];

const vipMenuItems = [
  { icon: User, label: "پروفایل ویژه", href: "/panel/vip/profile" },
  { icon: Crown, label: "باشگاه مشتریان", href: "/panel/vip/loyalty" },
  { icon: Gift, label: "جوایز باشگاه", href: "/panel/vip/rewards" },
  { icon: BarChart3, label: "آنالیز پیشرفته آگهی‌ها", href: "/panel/vip/stats" },
  { icon: FileText, label: "آگهی‌های من", href: "/panel/vip/my-ads" },
  { icon: Flag, label: "گزارشات تخلف من", href: "/panel/vip/reports-my" },
  { icon: LayoutDashboard, label: "داشبورد اختصاصی", href: "/panel/vip", divider: true },
  { icon: Settings, label: "تنظیمات پیشرفته", href: "/panel/vip/settings" },
  { icon: HelpCircle, label: "پشتیبانی اختصاصی", href: "/help" },
];

const agentMenuItems = [
  { icon: User, label: "پروفایل تجاری", href: "/panel/agent/profile" },
  { icon: Building, label: "مدیریت املاک و مستغلات", href: "/panel/agent/properties" },
  { icon: Users, label: "مدیریت مشاوران آژانس", href: "/panel/agent/agents" },
  { icon: BarChart3, label: "گزارشات و آمار فروش", href: "/panel/agent/reports" },
  { icon: Flag, label: "گزارشات تخلف من", href: "/panel/agent/reports-my" },
  { icon: Gift, label: "باشگاه مشتریان", href: "/panel/agent/loyalty" },
  { icon: Gift, label: "جوایز باشگاه", href: "/panel/agent/rewards" },
  { icon: BadgeCheck, label: "درخواست تیک آبی", href: "/panel/agent/verification" },
  { icon: LayoutDashboard, label: "پنل مدیریت آژانس", href: "/panel/agent", divider: true },
  { icon: Settings, label: "تنظیمات پنل", href: "/panel/agent/settings" },
  { icon: HelpCircle, label: "راهنما", href: "/help" },
];

const expertMenuItems = [
  { icon: User, label: "پروفایل کارشناسی", href: "/panel/expert/profile" },
  { icon: Clock, label: "آگهی‌های در انتظار بررسی", href: "/panel/expert/pending" },
  { icon: Flag, label: "گزارشات تخلف کاربران", href: "/panel/expert/reports" },
  { icon: Flag, label: "گزارشات تخلف من", href: "/panel/expert/reports-my" },
  { icon: MessageCircle, label: "مشاوره‌های فعال", href: "/panel/expert/consulting" },
  { icon: LayoutDashboard, label: "میز کار کارشناس", href: "/panel/expert", divider: true },
  { icon: Settings, label: "تنظیمات سیستم", href: "/panel/expert/settings" },
  { icon: HelpCircle, label: "راهنما", href: "/help" },
];

const developerMenuItems = [
  { icon: User, label: "پروفایل", href: "/panel/developer/profile" },
  { icon: Key, label: "API Keys", href: "/panel/developer/api-key" },
  { icon: Webhook, label: "Webhooks", href: "/panel/developer/webhooks" },
  { icon: BookOpen, label: "مستندات", href: "/panel/developer/docs" },
  { icon: Bell, label: "اعلان‌ها", href: "/panel/developer/notifications" },
  { icon: LayoutDashboard, label: "داشبورد برنامه‌نویس", href: "/panel/developer/dashboard", divider: true },
  { icon: Settings, label: "تنظیمات حریم خصوصی", href: "/panel/developer/settings" },
  { icon: HelpCircle, label: "مرکز راهنما", href: "/help" },
];

const adminMenuItems = [
  { icon: User, label: "پروفایل ادمین", href: "/panel/admin/profile" },
  { icon: Users, label: "مدیریت کاربری", href: "/panel/admin/users" },
  { icon: FileText, label: "نظارت بر آگهی‌ها", href: "/panel/admin/ads" },
  { icon: Flag, label: "گزارشات و شکایات", href: "/panel/admin/reports" },
  { icon: Gift, label: "سطوح باشگاه مشتریان", href: "/panel/admin/loyalty-tiers" },
  { icon: Gift, label: "مدیریت جوایز", href: "/panel/admin/rewards" },
  { icon: BadgeCheck, label: "درخواست‌های تیک آبی", href: "/panel/admin/verifications" },
  { icon: Coins, label: "تنظیم امتیاز کاربران", href: "/panel/admin/loyalty-adjust" },
  { icon: LayoutDashboard, label: "کنسول مدیریت", href: "/panel/admin", divider: true },
  { icon: Settings, label: "تنظیمات کلی پلتفرم", href: "/panel/admin/settings" },
  { icon: HelpCircle, label: "مستندات ادمین", href: "/help" },
];

const superAdminMenuItems = [
  { icon: User, label: "پروفایل مدیر ارشد", href: "/panel/super-admin/profile" },
  { icon: Shield, label: "سطوح دسترسی و ادمین‌ها", href: "/panel/super-admin/admins" },
  { icon: Users, label: "نظارت کل کاربران", href: "/panel/super-admin/users" },
  { icon: FileText, label: "مدیریت کل آگهی‌ها", href: "/panel/super-admin/ads" },
  { icon: Database, label: "پشتیبان‌گیری هسته", href: "/panel/super-admin/backup" },
  { icon: ScrollText, label: "لاگ رویدادها", href: "/panel/super-admin/audit-logs" },
  { icon: Activity, label: "ترافیک سایت", href: "/panel/super-admin/traffic" },
  { icon: Gift, label: "سطوح باشگاه مشتریان", href: "/panel/super-admin/loyalty-tiers" },
  { icon: Gift, label: "جوایز باشگاه", href: "/panel/super-admin/rewards" },
  { icon: BadgeCheck, label: "درخواست‌های تیک آبی", href: "/panel/super-admin/verifications" },
  { icon: LayoutDashboard, label: "کنسول روت سیستم", href: "/panel/super-admin", divider: true },
  { icon: Settings, label: "پیکربندی سرور", href: "/panel/super-admin/settings" },
];

interface UserMenuProps {
  onLogout?: () => void;
  customMenuItems?: Array<{ icon: any; label: string; href: string; divider?: boolean }>;
}

export function UserMenu({ onLogout, customMenuItems }: UserMenuProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followModal, setFollowModal] = useState<{ open: boolean; type: "followers" | "following" }>({ open: false, type: "followers" });

  const shouldShowFollowStats = ["user", "vip", "agent"].includes(user?.role || "");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    if (!user?._id || !shouldShowFollowStats) return;
    const fetchFollowCounts = async () => {
      try {
        const res = await apiClient.get(`/follow/counts/${user._id}`);
        setFollowCounts(res.data.data);
      } catch (error) {
        console.error("Error fetching follow counts:", error);
      }
    };
    fetchFollowCounts();
  }, [user?._id, shouldShowFollowStats]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      toast.success("با موفقیت خارج شدید");
      onLogout?.();
      router.push("/");
    } catch {
      toast.error("خطا در خروج");
    } finally {
      setLogoutLoading(false);
    }
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    return user?.phone || "کاربر مهمان";
  };

  const role = user?.role || "user";
  const roleForUrl = role.replace(/_/g, "-");

  const roleBadge = () => {
    switch (role) {
      case "vip":
        return <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> VIP</span>;
      case "agent":
        return <span className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full"><Building className="w-3 h-3" /> مشاور</span>;
      case "developer":
        return <span className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full"><Code2 className="w-3 h-3" /> توسعه‌دهنده</span>;
      case "expert":
        return <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" /> کارشناس</span>;
      case "admin":
        return <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" /> ادمین</span>;
      case "super_admin":
        return <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" /> مدیر ارشد</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full"><User className="w-3 h-3" /> کاربر</span>;
    }
  };

  const menuItems =
    customMenuItems ||
    (() => {
      switch (role) {
        case "vip": return vipMenuItems;
        case "agent": return agentMenuItems;
        case "developer": return developerMenuItems;
        case "expert": return expertMenuItems;
        case "admin": return adminMenuItems;
        case "super_admin": return superAdminMenuItems;
        default: return defaultMenuItems;
      }
    })();

  const avatarSrc = user?.avatar ? getImageUrl(user.avatar) : "/images/user.webp";

  if (!user) {
    return (
      <Button onClick={() => router.push("/auth")} className="gap-2 rounded-xl px-5 h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all">
        <User className="w-4 h-4" />
        ورود / عضویت
      </Button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <Button variant="ghost" size="icon" className="rounded-full p-0 h-9 w-9 md:h-10 md:w-10 ring-2 ring-transparent hover:ring-primary/30 transition-all" onClick={() => setOpen(!open)} aria-label="منوی کاربری">
        <Avatar className="h-full w-full">
          <AvatarImage src={avatarSrc || "/images/user.webp"} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm md:text-base" />
        </Avatar>
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 w-72 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5 dark:shadow-white/5 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={avatarSrc || "/images/user.webp"} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-black" />
                </Avatar>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold truncate">{getDisplayName()}</p>
{(user as any)?.isVerified && <VerifiedBadge size="sm" />}                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                {roleBadge()}
                <Link href={`/panel/${roleForUrl}/profile`} onClick={() => setOpen(false)} className="text-xs font-medium text-primary hover:underline">
                  ویرایش پروفایل
                </Link>
              </div>

              {shouldShowFollowStats && (
                <div className="mt-3 flex items-center gap-3 text-sm border-t border-border/40 pt-3">
                  <button onClick={() => setFollowModal({ open: true, type: "followers" })} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <span className="font-bold">{followCounts.followers}</span>
                    <span>فالوور</span>
                  </button>
                  <span className="text-muted-foreground/30">|</span>
                  <button onClick={() => setFollowModal({ open: true, type: "following" })} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <span className="font-bold">{followCounts.following}</span>
                    <span>دنبال‌شونده</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const href = item.href.replace(/\/panel\/super_admin/, "/panel/super-admin");
                return (
                  <div key={item.label}>
                    {item.divider && index !== 0 && <div className="my-1 border-t border-border/30" />}
                    <Link href={href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground/50" />
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-border/40 bg-muted/20">
              <button onClick={toggleTheme} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                  <span>حالت شب</span>
                </div>
              </button>
              <button onClick={handleLogout} disabled={logoutLoading} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4" />
                  <span>{logoutLoading ? "در حال خروج..." : "خروج"}</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && shouldShowFollowStats && (
        <FollowListModal
          open={followModal.open}
          onClose={() => setFollowModal({ ...followModal, open: false })}
          userId={user._id}
          type={followModal.type}
        />
      )}
    </div>
  );
}