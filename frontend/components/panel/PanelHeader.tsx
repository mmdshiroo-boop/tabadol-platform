"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Home,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  User,
  Settings,
  Crown,
  Building,
  Shield,
  Code2,
  Users,
  Clock,
  MessageSquare,
  Gift,
  TrendingUp,
  Key,
  BookOpen,
  CheckCircle,
  XCircle,
  BarChart3,
  Bookmark,
  Bell,
  Star,
  ChevronLeft,
  Ticket,
  Flag,
  Search,
  Webhook,
  ShieldCheck,
  Download,
  MapPin,
  Sparkles,
  ScrollText,
  Database,
  Globe,
  CreditCard,
  SlidersHorizontal,
  MessageCircle,
  Cookie,
  ShieldAlert,
  HomeIcon,
  BadgeCheck,
  Coins,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { NotificationBell } from "../notifcation/NotificationBell";
import { UserMenu } from "../common/UserMenu";
import { useState } from "react";

// ─── منوها بر اساس نقش کاربر (برای منوی موبایل) ───
const menuConfigs: Record<
  string,
  Array<{ href: string; label: string; icon: any }>
> = {
  user: [
    { href: "/panel/user/dashboard", label: "داشبورد عملکرد", icon: LayoutDashboard },
    { href: "/panel/user/consulting", label: "درخواست مشاوره", icon: MessageSquare },
    { href: "/panel/user/my-consulting", label: "مشاوره‌های من", icon: MessageSquare },
    { href: "/panel/user/my-ads", label: "آگهی‌های من", icon: FileText },
    { href: "/panel/user/bookmarks", label: "ذخیره‌شده‌ها", icon: Bookmark },
    { href: "/panel/user/loyalty", label: "باشگاه مشتریان", icon: Gift },
    { href: "/panel/user/rewards", label: "جوایز باشگاه", icon: Gift },
    { href: "/panel/user/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/panel/user/tickets", label: "تیکت‌های من", icon: Ticket },
    { href: "/panel/user/comments", label: "نظرات آگهی‌های من", icon: MessageSquare },
    { href: "/panel/user/reports-my", label: "گزارشات تخلف من", icon: Flag },
    { href: "/panel/user/profile", label: "پروفایل کاربری", icon: User },
    { href: "/panel/user/settings", label: "تنظیمات پنل", icon: Settings },
  ],
  vip: [
    { href: "/panel/vip/dashboard", label: "داشبورد ویژه", icon: LayoutDashboard },
    { href: "/panel/vip/consulting", label: "درخواست مشاوره", icon: MessageSquare },
    { href: "/panel/vip/my-consulting", label: "مشاوره‌های من", icon: MessageSquare },
    { href: "/panel/vip/my-ads", label: "آگهی‌های من", icon: Crown },
    { href: "/panel/vip/advanced-search", label: "جستجوی پیشرفته", icon: Search },
    { href: "/panel/vip/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/panel/vip/analytics", label: "آمار و تحلیل", icon: TrendingUp },
    { href: "/panel/vip/agents", label: "مدیریت کارشناسان آژانس", icon: HomeIcon },
    { href: "/panel/vip/market-analysis", label: "تحلیل صنف و بازار", icon: BarChart3 },
    { href: "/panel/vip/loyalty", label: "باشگاه مشتریان", icon: Gift },
    { href: "/panel/vip/rewards", label: "جوایز باشگاه", icon: Gift },
    { href: "/panel/vip/bookmarks", label: "ذخیره‌شده‌ها", icon: Bookmark },
    { href: "/panel/vip/comments", label: "نظرات آگهی‌های من", icon: MessageSquare },
    { href: "/panel/vip/reports-my", label: "گزارشات", icon: FileText },
    { href: "/panel/vip/support", label: "تیکت پشتیبانی", icon: MessageSquare },
    { href: "/panel/vip/profile", label: "پروفایل", icon: User },
    { href: "/panel/vip/settings", label: "تنظیمات", icon: Settings },
  ],
  agent: [
    { href: "/panel/agent/dashboard", label: "داشبورد آژانس", icon: LayoutDashboard },
    { href: "/panel/agent/loyalty", label: "باشگاه مشتریان", icon: Gift },
    { href: "/panel/agent/rewards", label: "جوایز باشگاه", icon: Gift },
    { href: "/panel/agent/club", label: "باشگاه اختصاصی", icon: Users },
    { href: "/panel/agent/club/reports", label: "گزارش‌های باشگاه", icon: BarChart3 },
    { href: "/panel/agent/consulting", label: "درخواست مشاوره", icon: MessageSquare },
    { href: "/panel/agent/my-consulting", label: "مشاوره‌های من", icon: MessageSquare },
    { href: "/panel/agent/consulting/manage", label: "مدیریت درخواست‌ها", icon: Users },
    { href: "/panel/agent/my-ads", label: "فهرست املاک و آگهی‌های من", icon: FileText },
    { href: "/panel/agent/advanced-search", label: "جستجوی پیشرفته", icon: Search },
    { href: "/panel/agent/bookmarks", label: "ذخیره‌شده‌ها", icon: Bookmark },
    { href: "/panel/agent/comments", label: "نظرات آگهی‌های من", icon: MessageSquare },
    { href: "/panel/agent/tickets", label: "تیکت‌های پشتیبانی", icon: Ticket },
    { href: "/panel/agent/reports", label: "گزارشات آژانس", icon: FileText },
    { href: "/panel/agent/market-analysis", label: "تحلیل بازار", icon: TrendingUp },
    { href: "/panel/agent/chat", label: "گفتگوی داخلی", icon: MessageSquare },
    { href: "/panel/agent/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/panel/agent/reports-my", label: "گزارشات تخلف من", icon: Flag },
    { href: "/panel/agent/verification", label: "درخواست تیک آبی", icon: BadgeCheck },
    { href: "/panel/agent/settings", label: "تنظیمات", icon: Settings },
    { href: "/panel/agent/profile", label: "پروفایل مدیریتی", icon: User },
  ],
  developer: [
    { href: "/panel/developer/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { href: "/panel/developer/api-key", label: "API Keys", icon: Key },
    { href: "/panel/developer/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/panel/developer/logs", label: "لاگ‌ها و آنالیتیکس", icon: BarChart3 },
    { href: "/panel/developer/docs", label: "مستندات", icon: BookOpen },
    { href: "/panel/developer/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/panel/developer/settings", label: "تنظیمات", icon: Settings },
    { href: "/panel/developer/profile", label: "پروفایل", icon: User },
  ],
  expert: [
    { href: "/panel/expert/dashboard", label: "داشبورد کارشناسی", icon: LayoutDashboard },
    { href: "/panel/expert/consulting", label: "درخواست مشاوره", icon: MessageSquare },
    { href: "/panel/expert/my-consulting", label: "مشاوره‌های من", icon: MessageSquare },
    { href: "/panel/expert/consulting/manage", label: "مدیریت درخواست‌ها", icon: Users },
    { href: "/panel/expert/bulk-upload", label: "بارگذاری آگهی", icon: Download },
    { href: "/panel/expert/pending", label: "در انتظار بررسی", icon: Clock },
    { href: "/panel/expert/approved", label: "تایید شده‌ها", icon: CheckCircle },
    { href: "/panel/expert/rejected", label: "رد شده‌ها", icon: XCircle },
    { href: "/panel/expert/verify-ads", label: "تأیید آگهی", icon: ShieldCheck },
    { href: "/panel/expert/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/panel/expert/chat", label: "اتاق گفتگو", icon: MessageSquare },
    { href: "/panel/expert/tickets", label: "تیکت‌ها و پشتیبانی", icon: Ticket },
    { href: "/panel/expert/reports", label: "گزارشات", icon: BarChart3 },
    { href: "/panel/expert/bookmarks", label: "نشان‌ها", icon: Bookmark },
    { href: "/panel/expert/profile", label: "پروفایل کارشناس", icon: User },
    { href: "/panel/expert/settings", label: "تنظیمات", icon: Settings },
  ],
  admin: [
    { href: "/panel/admin/dashboard", label: "داشبورد مدیریت", icon: LayoutDashboard },
    { href: "/panel/admin/users", label: "مدیریت کاربران", icon: Users },
    { href: "/panel/admin/loyalty-adjust", label: "تنظیم امتیاز کاربران", icon: Coins },
    { href: "/panel/admin/ads", label: "مدیریت آگهی‌ها", icon: FileText },
    { href: "/panel/admin/tickets", label: "مدیریت تیکت‌ها", icon: Ticket },
    { href: "/panel/admin/reports", label: "گزارشات", icon: Flag },
    { href: "/panel/admin/special-ads", label: "مدیریت آگهی‌های فوری و ویژه", icon: Sparkles },
    { href: "/panel/admin/location-map", label: "نقشه کاربران آنلاین", icon: MapPin },
    { href: "/panel/admin/loyalty-tiers", label: "سطوح باشگاه مشتریان", icon: Gift },
    { href: "/panel/admin/rewards", label: "مدیریت جوایز", icon: Gift },
    { href: "/panel/admin/verifications", label: "درخواست‌های تیک آبی", icon: BadgeCheck },
    { href: "/panel/admin/analytics", label: "گزارشات پیشرفته", icon: Flag },
    { href: "/panel/admin/comments", label: "مدیریت نظرات", icon: MessageSquare },
    { href: "/panel/admin/profile", label: "پروفایل ادمین", icon: User },
    { href: "/panel/admin/settings", label: "تنظیمات سیستم", icon: Settings },
  ],
  super_admin: [
    { href: "/panel/super-admin/dashboard", label: "داشبورد مدیر ارشد", icon: LayoutDashboard },
    { href: "/panel/super-admin/loyalty-tiers", label: "سطوح باشگاه مشتریان", icon: Gift },
    { href: "/panel/super-admin/rewards", label: "جوایز باشگاه", icon: Gift },
    { href: "/panel/super-admin/verifications", label: "درخواست‌های تیک آبی", icon: BadgeCheck },
    { href: "/panel/super-admin/special-ads", label: "مدیریت آگهی‌های فوری و ویژه", icon: Sparkles },
    { href: "/panel/super-admin/location-map", label: "نقشه کاربران آنلاین", icon: MapPin },
    { href: "/panel/super-admin/graph", label: "تحلیل شبکه و مدیریت گراف", icon: LayoutDashboard },
    { href: "/panel/super-admin/blacklist-keywords", label: "کلمات سیاه‌لیست", icon: ShieldAlert },
    { href: "/panel/super-admin/cookie-audits", label: "رصد کوکی و نشست‌های کاربران", icon: Cookie },
    { href: "/panel/super-admin/ads", label: "مدیریت کل آگهی‌ها", icon: FileText },
    { href: "/panel/super-admin/users", label: "مدیریت کاربران", icon: Users },
    { href: "/panel/super-admin/admins", label: "مدیریت ادمین‌ها", icon: Shield },
    { href: "/panel/super-admin/chat-monitor", label: "رصد چت و پیام‌ها", icon: MessageCircle },
    { href: "/panel/super-admin/roles", label: "نقش‌ها و مجوزها", icon: SlidersHorizontal },
    { href: "/panel/super-admin/tickets", label: "مدیریت تیکت‌ها", icon: Ticket },
    { href: "/panel/super-admin/comments", label: "مدیریت کامنت‌ها", icon: MessageSquare },
    { href: "/panel/super-admin/financial", label: "گزارش‌های مالی", icon: CreditCard },
    { href: "/panel/super-admin/subscriptions", label: "پلن‌های اشتراک و VIP", icon: Gift },
    { href: "/panel/super-admin/banners", label: "مدیریت بنرها", icon: Globe },
    { href: "/panel/super-admin/market-analysis", label: "تحلیل بازار", icon: TrendingUp },
    { href: "/panel/super-admin/api-keys", label: "کلیدهای API", icon: Key },
    { href: "/panel/super-admin/webhooks", label: "وب‌هوک‌ها", icon: Webhook },
    { href: "/panel/super-admin/settings", label: "تنظیمات سایت", icon: Settings },
    { href: "/panel/super-admin/backup", label: "پشتیبان‌گیری", icon: Database },
    { href: "/panel/super-admin/audit-logs", label: "لاگ رویدادها", icon: ScrollText },
    { href: "/panel/super-admin/traffic", label: "ترافیک سایت", icon: Activity },
    { href: "/panel/super-admin/notifications", label: "اعلان‌های سیستمی", icon: Bell },
    { href: "/panel/super-admin/profile", label: "پروفایل مدیر ارشد", icon: User },
  ],
};

export function PanelHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const role = user?.role || "user";
  const menuItems = menuConfigs[role] || menuConfigs.user;

  const getRoleInfo = (userRole?: string) => {
    switch (userRole) {
      case "vip":
        return {
          title: "پنل ویژه VIP",
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
          icon: Crown,
        };
      case "agent":
        return {
          title: "مدیریت آژانس",
          badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
          gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
          icon: Building,
        };
      case "developer":
        return {
          title: "پنل توسعه‌دهندگان",
          badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          gradient: "from-blue-500/15 via-blue-500/5 to-transparent",
          icon: Code2,
        };
      case "expert":
        return {
          title: "ارزیابی کارشناس",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
          icon: Shield,
        };
      case "admin":
      case "super_admin":
        return {
          title: userRole === "super_admin" ? "کنسول مدیر ارشد" : "کنسول مدیریت",
          badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
          icon: Shield,
        };
      default:
        return {
          title: "میز کاربری",
          badgeClass: "bg-primary/10 text-primary border-primary/20",
          gradient: "from-primary/15 via-primary/5 to-transparent",
          icon: LayoutDashboard,
        };
    }
  };

  const roleInfo = getRoleInfo(role);
  const RoleIcon = roleInfo.icon;

  const getDashboardLink = () => {
    const rolePath = role.replace(/_/g, "-");
    if (["admin", "super-admin"].includes(rolePath)) {
      return `/panel/${rolePath}`;
    }
    return `/panel/${rolePath}/dashboard`;
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300"
      dir="rtl"
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6 max-w-[1500px] mx-auto">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl h-10 w-10 text-foreground hover:bg-muted/70 active:scale-95 transition-all"
                aria-label="باز کردن منو"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[290px] sm:w-[320px] p-0 flex flex-col h-full border-l border-border/50 bg-background/95 backdrop-blur-2xl text-right [&>button]:hidden"
              dir="rtl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>منوی ناوبری پنل</SheetTitle>
              </SheetHeader>

              <div
                className={cn(
                  "p-4 border-b border-border/40 bg-gradient-to-l flex items-center justify-between",
                  roleInfo.gradient,
                )}
              >
                <div className="flex items-center gap-3">
                  <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                    {/* لوگوی روشن */}
                    <img
                      src="/images/tabadol-logo-light.PNG"
                      alt="تبادل"
                      className="h-11 sm:h-12 w-auto object-contain dark:hidden"
                    />
                    {/* لوگوی تاریک */}
                    <img
                      src="/images/tabadol-logo-dark.PNG"
                      alt="تبادل"
                      className="h-11 sm:h-12 w-auto object-contain hidden dark:block"
                    />
                  </Link>
                  <div className="flex flex-col">
                    <span className="font-black text-sm text-foreground tracking-tight">پلتفرم آگهی تبادل</span>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 w-fit", roleInfo.badgeClass)}>
                      <RoleIcon className="w-3 h-3" />
                      <span>{roleInfo.title}</span>
                    </span>
                  </div>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <p className="text-[10px] font-black text-muted-foreground/60 px-3 py-1.5 uppercase tracking-wider">دسترسی‌های سریع</p>
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ItemIcon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:text-foreground")} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronLeft className={cn("w-3.5 h-3.5 transition-all opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5", isActive ? "opacity-100 text-primary-foreground" : "text-muted-foreground/50")} />
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="p-3 border-t border-border/40 bg-muted/20">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40 transition-all active:scale-[0.98]">
                  <Home className="w-4 h-4" />
                  <span>بازگشت به سایت اصلی</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href={getDashboardLink()} className="flex items-center gap-3 transition-transform hover:opacity-95 active:scale-95">
            {/* لوگوی روشن */}
            <img
              src="/images/tabadol-logo-light.PNG"
              alt="تبادل"
              className="h-11 sm:h-12 w-auto object-contain shrink-0 py-0.5 dark:hidden"
            />
            {/* لوگوی تاریک */}
            <img
              src="/images/tabadol-logo-dark.PNG"
              alt="تبادل"
              className="h-11 sm:h-12 w-auto object-contain shrink-0 py-0.5 hidden dark:block"
            />
            <div className={cn("hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border backdrop-blur-md shadow-xs transition-all", roleInfo.badgeClass)}>
              <RoleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{roleInfo.title}</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all text-xs font-bold h-9 hidden md:flex" onClick={() => router.push("/")}>
            <Home className="w-3.5 h-3.5" />
            <span>صفحه اصلی</span>
            <ArrowLeft className="w-3.5 h-3.5 opacity-60" />
          </Button>
          <div className="w-[1px] h-4 bg-border/60 hidden md:block" />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}