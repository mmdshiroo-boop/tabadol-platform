"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  User,
  Mail,
  Save,
  Loader2,
  Camera,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle,
  Phone,
  Hash,
  type LucideIcon,
  Globe,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import apiClient from "@/services/api/client";
import {
  IranLocationSelector,
  SelectedLocation,
} from "@/components/ui/IranLocationSelector";
import {
  getById,
  findProvinceByName,
  findCountyByName,
  getDistricts,
  normalizeName,
  loadDivisions,
} from "@/lib/iranDivisions";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { FollowListModal } from "@/components/follow/FollowListModal";

// ==================== کانفیگ نقش‌ها ====================

interface RoleConfig {
  pageTitle: string;
  pageSubtitle: string;
  pageIcon: LucideIcon;
  roleLabel: string;
  showAgencyField: boolean;
  agencyFieldLabel?: string;
  showNationalCodeField: boolean;
  extraFields?: ExtraFieldConfig[];
  securityCards?: SecurityCardConfig[];
  themeColor?: string;
}

export interface ExtraFieldConfig {
  key: string;
  label: string;
  icon?: LucideIcon;
  placeholder?: string;
  type?: "text" | "email" | "number" | "tel";
  dir?: "rtl" | "ltr";
  disabled?: boolean;
  disabledMessage?: string;
}

export interface SecurityCardConfig {
  label: string;
  value: string;
  valueColor?: string;
  icon?: LucideIcon;
}

export const ROLE_CONFIGS: Record<string, RoleConfig> = {
  user: {
    pageTitle: "پروفایل کاربری",
    pageSubtitle: "مدیریت اطلاعات شخصی و امنیت حساب",
    pageIcon: User,
    roleLabel: "کاربر عادی",
    showAgencyField: false,
    showNationalCodeField: true,
    themeColor:
      "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20",
  },
  vip: {
    pageTitle: "پروفایل VIP",
    pageSubtitle: "مدیریت اطلاعات حساب و خدمات ویژه شما",
    pageIcon: User,
    roleLabel: "کاربر ویژه (VIP)",
    showAgencyField: false,
    showNationalCodeField: true,
    themeColor:
      "from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/20 text-amber-600",
    securityCards: [
      { label: "سطح اشتراک", value: "VIP", valueColor: "text-amber-600" },
    ],
  },
  agent: {
    pageTitle: "پروفایل آژانس",
    pageSubtitle: "مدیریت اطلاعات تجاری و امنیت حساب",
    pageIcon: Building2,
    roleLabel: "آژانس املاک",
    showAgencyField: true,
    agencyFieldLabel: "نام آژانس املاک",
    showNationalCodeField: false,
    themeColor:
      "from-primary/15 via-primary/5 to-transparent border-primary/20",
    securityCards: [
      { label: "نقش کاربری", value: "آژانس املاک", valueColor: "text-primary" },
    ],
  },
  expert: {
    pageTitle: "پروفایل کارشناس",
    pageSubtitle: "مدیریت اطلاعات تخصصی و حساب",
    pageIcon: ShieldCheck,
    roleLabel: "کارشناس",
    showAgencyField: true,
    agencyFieldLabel: "نام دفتر / شرکت",
    showNationalCodeField: true,
    themeColor:
      "from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20",
  },
  developer: {
    pageTitle: "پروفایل توسعه‌دهنده",
    pageSubtitle: "مدیریت حساب، پروژه‌ها و دسترسی‌های API",
    pageIcon: Globe,
    roleLabel: "توسعه‌دهنده",
    showAgencyField: true,
    agencyFieldLabel: "نام استودیو / شرکت",
    showNationalCodeField: true,
    themeColor:
      "from-violet-500/15 via-violet-500/5 to-transparent border-violet-500/20",
    extraFields: [
      {
        key: "website",
        label: "وب‌سایت / پورتفولیو",
        icon: Globe,
        placeholder: "https://example.com",
        type: "text",
        dir: "ltr",
      },
      {
        key: "specialty",
        label: "تخصص فنی",
        placeholder: "مثلاً: Full-Stack, Backend",
      },
    ],
    securityCards: [
      {
        label: "نقش کاربری",
        value: "توسعه‌دهنده",
        valueColor: "text-violet-600",
      },
      { label: "دسترسی API", value: "فعال", valueColor: "text-emerald-600" },
    ],
  },
  admin: {
    pageTitle: "پروفایل مدیر سیستم",
    pageSubtitle: "مدیریت حساب اصلی و تنظیمات پلتفرم",
    pageIcon: ShieldCheck,
    roleLabel: "مدیر سیستم",
    showAgencyField: false,
    showNationalCodeField: true,
    themeColor:
      "from-red-500/10 via-red-500/5 to-transparent border-red-500/20",
    securityCards: [
      { label: "نقش کاربری", value: "مدیر سیستم", valueColor: "text-red-600" },
      {
        label: "سطح دسترسی",
        value: "مدیریت کامل",
        valueColor: "text-amber-600",
      },
    ],
  },
  super_admin: {
    pageTitle: "پروفایل سوپر مدیر",
    pageSubtitle: "بالاترین سطح دسترسی و امنیت سیستم",
    pageIcon: AlertTriangle,
    roleLabel: "سوپر مدیر",
    showAgencyField: false,
    showNationalCodeField: true,
    themeColor:
      "from-rose-600/15 via-rose-500/5 to-transparent border-rose-500/30",
    extraFields: [
      {
        key: "website",
        label: "وب‌سایت شخصی",
        icon: Globe,
        placeholder: "https://example.com",
        type: "text",
        dir: "ltr",
      },
    ],
    securityCards: [
      { label: "نقش کاربری", value: "سوپر مدیر", valueColor: "text-rose-600" },
      {
        label: "سطح دسترسی",
        value: "دسترسی نامحدود",
        valueColor: "text-rose-600",
      },
    ],
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface ProfilePageProps {
  role?: string;
  config?: Partial<RoleConfig>;
}

export default function ProfilePage({
  role: propRole,
  config,
}: ProfilePageProps) {
  const { user, refreshUser } = useAuth();

  const resolvedRole = propRole || user?.role || "user";
  const roleConfig: RoleConfig = {
    ...(ROLE_CONFIGS[resolvedRole] || ROLE_CONFIGS["user"]),
    ...config,
  };

  const PageIcon = roleConfig.pageIcon;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // فرم
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  // موقعیت مکانی جدید
  const [location, setLocation] = useState<SelectedLocation>({});

  // فالو
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [followModal, setFollowModal] = useState<{ open: boolean; type: "followers" | "following" }>({
    open: false,
    type: "followers",
  });

  // رمز عبور
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // مودال‌ها
  const [successModal, setSuccessModal] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
  let isMounted = true;

  async function init() {
    // ابتدا تقسیمات کشوری را بارگذاری کن
    await loadDivisions();

    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setAgencyName(user.agencyName || "");
      setNationalCode(user.nationalCode || "");
      setProvince(user.province || "");
      setCity(user.city || "");
      setDistrict(user.district || "");

      const foundProvince = user.province
        ? findProvinceByName(user.province)
        : undefined;
      const foundCounty =
        user.city && foundProvince
          ? findCountyByName(foundProvince.Id, user.city)
          : undefined;
      const foundDistrict =
        user.district && foundCounty
          ? getDistricts(foundCounty.Id).find(
(d) => normalizeName(d.Name) === normalizeName((user.district || "")),
            )
          : undefined;

      setLocation({
        provinceId: foundProvince?.Id,
        countyId: foundCounty?.Id,
        districtId: foundDistrict?.Id,
      });

      if (roleConfig.extraFields) {
        const values: Record<string, string> = {};
        roleConfig.extraFields.forEach((f) => {
          values[f.key] = (user as any)[f.key] || "";
        });
        setExtraValues(values);
      }
      setLoading(false);
    }
  }

  init();
  return () => { isMounted = false; };
}, [user]);
  // دریافت آمار فالو
  useEffect(() => {
    if (!user?._id) return;
    const fetchFollowCounts = async () => {
      try {
        const res = await apiClient.get(`/follow/counts/${user._id}`);
        setFollowCounts(res.data.data);
      } catch (error) {
        console.error("Error fetching follow counts:", error);
      }
    };
    fetchFollowCounts();
  }, [user?._id]);

  const handleUploadAvatar = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("لطفاً فقط فایل تصویر انتخاب کنید");
    if (file.size > 2 * 1024 * 1024)
      return toast.error("حجم تصویر باید کمتر از ۲ مگابایت باشد");

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const response = await apiClient.post("/users/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setAvatarKey(Date.now());
        await refreshUser();
        setSuccessModal({
          open: true,
          title: "آپلود موفق",
          message: "تصویر پروفایل شما با موفقیت به‌روزرسانی شد.",
        });
      } else {
        toast.error(response.data.message || "خطا در آپلود تصویر");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "خطا در برقراری ارتباط با سرور",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setDeleteConfirmOpen(false);
    setUploading(true);
    try {
      await apiClient.delete("/users/avatar");
      setAvatarKey(Date.now());
      await refreshUser();
      setSuccessModal({
        open: true,
        title: "حذف موفق",
        message: "تصویر پروفایل شما با موفقیت حذف شد.",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در حذف تصویر");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const payload: any = {
        firstName,
        lastName,
        email,
        province,
        city,
        district,
      };
      if (agencyName) payload.agencyName = agencyName;
      if (nationalCode) payload.nationalCode = nationalCode;
      if (roleConfig.extraFields) {
        roleConfig.extraFields.forEach((f) => {
          if (extraValues[f.key]) payload[f.key] = extraValues[f.key];
        });
      }
      await apiClient.put("/users/profile", payload);
      await refreshUser();
      toast.success("اطلاعات پروفایل شما با موفقیت ذخیره شد.");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "خطا در به‌روزرسانی اطلاعات",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      toast.error("لطفاً رمز عبور فعلی و جدید (حداقل ۶ کاراکتر) را وارد کنید");
      return;
    }
    setChangingPassword(true);
    try {
      await apiClient.put("/users/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordSection(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در تغییر رمز عبور");
    } finally {
      setChangingPassword(false);
    }
  };

  const getAvatarUrl = () => {
    if (!user?.avatar) return "";
    if (user.avatar.startsWith("http")) return user.avatar;
    return `${API_BASE.replace("/api", "")}${user.avatar}?t=${avatarKey}`;
  };

  const avatarSrc = user?.avatar ? getAvatarUrl() : "/images/user.webp";

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 p-4 md:p-6" dir="rtl">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <Skeleton className="lg:col-span-4 h-[500px] rounded-2xl" />
          <Skeleton className="lg:col-span-8 h-[600px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 sm:p-6 lg:p-8"
      dir="rtl"
    >
      {/* هدر صفحه */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-sm backdrop-blur-md bg-card/80 transition-colors",
          roleConfig.themeColor ||
            "from-primary/10 via-primary/5 to-transparent border-primary/10",
        )}
      >
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-background/50 rounded-2xl ring-1 ring-border/50 shadow-sm backdrop-blur-sm">
              <PageIcon className="w-8 h-8 text-foreground/80" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {roleConfig.pageTitle}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {roleConfig.pageSubtitle}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-4 py-1.5 text-sm font-medium rounded-full shadow-sm bg-background/50 backdrop-blur-sm gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {roleConfig.roleLabel}
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* سایدبار سمت چپ: آواتار */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <Card className="overflow-hidden border border-border/50 shadow-lg rounded-3xl bg-card/50 backdrop-blur-xl">
            <div className="relative h-32 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
            <div className="px-6 pb-6 pt-0 flex flex-col items-center text-center -mt-16">
              <div className="relative group rounded-full p-1 bg-background shadow-xl mb-5">
                <Avatar className="w-32 h-32 rounded-full border-4 border-background object-cover">
                  <AvatarImage
                    key={avatarKey}
                    src={avatarSrc || "/images/user.webp"}
                    alt="تصویر کاربر"
                    className="object-cover"
                  />
                  <AvatarFallback />
                </Avatar>

                <div className="absolute inset-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-medium transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    تغییر
                  </button>
                  {user?.avatar && (
                    <button
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full text-xs font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleUploadAvatar(e.target.files[0])
                  }
                />
              </div>

              {/* نمایش تیک آبی */}
              <div className="flex items-center gap-2 justify-center">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {firstName || lastName
                    ? `${firstName} ${lastName}`
                    : "کاربر مهمان"}
                </h2>
{(user as any)?.isVerified && <VerifiedBadge size="lg" />}              </div>

              {/* فالوور / دنبال‌شونده */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setFollowModal({ open: true, type: "followers" })}
                  className="hover:bg-muted/40 rounded-xl px-3 py-1.5 transition-colors"
                >
                  <span className="font-bold">{followCounts.followers}</span>{" "}
                  <span className="text-muted-foreground text-sm">فالوور</span>
                </button>
                <div className="w-px h-5 bg-border" />
                <button
                  onClick={() => setFollowModal({ open: true, type: "following" })}
                  className="hover:bg-muted/40 rounded-xl px-3 py-1.5 transition-colors"
                >
                  <span className="font-bold">{followCounts.following}</span>{" "}
                  <span className="text-muted-foreground text-sm">دنبال‌شونده</span>
                </button>
              </div>

              {roleConfig.showAgencyField && agencyName && (
                <div className="flex items-center gap-1.5 text-primary font-medium mt-2 bg-primary/10 px-3 py-1 rounded-full text-sm">
                  <Building2 className="w-4 h-4" />
                  {agencyName}
                </div>
              )}
            </div>

            <CardContent className="p-0">
              <div className="divide-y divide-border/50 border-t border-border/50">
                <div className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">موبایل</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground dir-ltr">
                    {user?.phone || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">ایمیل</span>
                  </div>
                  <span
                    className="text-sm font-semibold text-foreground truncate max-w-[150px]"
                    title={email}
                  >
                    {email || "—"}
                  </span>
                </div>
                {roleConfig.showNationalCodeField && nationalCode && (
                  <div className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Hash className="w-4 h-4" />
                      <span className="text-sm">کد ملی</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {nationalCode}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ستون اصلی راست: فرم ویرایش اطلاعات */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* کارت ۱: اطلاعات شخصی و موقعیت مکانی */}
          <Card className="relative z-20 border border-border/50 shadow-lg rounded-3xl bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-5 pt-6 px-6 sm:px-8">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                ویرایش پروفایل
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-8">
              {/* مشخصات فردی */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground border-b border-border/50 pb-2">
                  مشخصات فردی
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      نام
                    </Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      نام خانوادگی
                    </Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      ایمیل
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm"
                      dir="ltr"
                    />
                  </div>
                  {roleConfig.showAgencyField && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">
                        {roleConfig.agencyFieldLabel || "نام شرکت/آژانس"}
                      </Label>
                      <Input
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm"
                      />
                    </div>
                  )}
                  {roleConfig.showNationalCodeField && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground/80">
                        کد ملی
                      </Label>
                      <Input
                        value={nationalCode}
                        onChange={(e) => setNationalCode(e.target.value)}
                        className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm font-mono"
                        placeholder="۱۰ رقم"
                        dir="ltr"
                        maxLength={10}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* موقعیت مکانی */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-muted-foreground border-b border-border/50 pb-2">
                  موقعیت مکانی
                </h3>
                <IranLocationSelector
                  value={location}
                  onChange={(loc) => {
                    setLocation(loc);
                    setProvince(loc.provinceId ? getById(loc.provinceId)?.Name || "" : "");
                    setCity(loc.countyId ? getById(loc.countyId)?.Name || "" : "");
                    setDistrict(loc.districtId ? getById(loc.districtId)?.Name || "" : "");
                  }}
                  showOptionalDistrict={true}
                />
              </div>

              {/* فیلدهای تکمیلی */}
              {roleConfig.extraFields && roleConfig.extraFields.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-muted-foreground border-b border-border/50 pb-2">
                    اطلاعات تکمیلی ({roleConfig.roleLabel})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {roleConfig.extraFields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                          {field.icon && (
                            <field.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          {field.label}
                        </Label>
                        <Input
                          type={field.type || "text"}
                          value={extraValues[field.key] || ""}
                          onChange={(e) =>
                            setExtraValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          dir={field.dir || "rtl"}
                          placeholder={field.placeholder}
                          disabled={field.disabled}
                          className="h-12 rounded-xl bg-background/50 border-border/50 focus-visible:ring-primary shadow-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-border/50 flex justify-end">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold text-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-2" />
                  )}
                  ذخیره اطلاعات
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* کارت ۲: امنیت و رمز عبور */}
          <Card className="relative z-10 border border-border/50 shadow-lg rounded-3xl bg-card/50 backdrop-blur-xl">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-5 pt-6 px-6 sm:px-8">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                امنیت و کلمه‌عبور
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {roleConfig.securityCards &&
                roleConfig.securityCards.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {roleConfig.securityCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-background/50 border border-border/50 text-center flex flex-col justify-center gap-1 shadow-sm"
                      >
                        <span className="text-xs text-muted-foreground font-medium">
                          {card.label}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            card.valueColor || "text-foreground",
                          )}
                        >
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              <AnimatePresence mode="wait">
                {!showPasswordSection ? (
                  <motion.div
                    key="btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordSection(true)}
                      className="w-full sm:w-auto h-12 rounded-xl border-border hover:bg-muted/50 font-semibold"
                    >
                      <KeyRound className="w-4 h-4 ml-2" />
                      تغییر رمز عبور
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">
                          رمز عبور فعلی
                        </Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-12 rounded-xl bg-background/50"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">
                          رمز عبور جدید
                        </Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-12 rounded-xl bg-background/50"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                        className="w-full sm:w-auto px-8 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
                      >
                        {changingPassword ? (
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 ml-2" />
                        )}
                        ثبت رمز جدید
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowPasswordSection(false)}
                        className="w-full sm:w-auto h-12 rounded-xl hover:bg-muted font-medium"
                      >
                        انصراف
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* دیالوگ‌ها */}
      <Dialog
        open={successModal.open}
        onOpenChange={(open) => setSuccessModal((p) => ({ ...p, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir="rtl">
          <DialogHeader className="text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {successModal.title}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {successModal.message}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => setSuccessModal({ ...successModal, open: false })}
              className="w-full h-12 rounded-xl text-base font-bold bg-emerald-500 hover:bg-emerald-600"
            >
              متوجه شدم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-3xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              حذف تصویر پروفایل
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              آیا از حذف تصویر پروفایل خود اطمینان دارید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start gap-3 mt-4">
            <AlertDialogAction
              onClick={handleDeleteAvatar}
              className="bg-rose-500 hover:bg-rose-600 h-11 rounded-xl px-6"
            >
              بله، حذف کن
            </AlertDialogAction>
            <AlertDialogCancel className="h-11 rounded-xl px-6 border-2 mt-0">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* مودال لیست فالوور/دنبال‌شونده */}
      {user && (
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