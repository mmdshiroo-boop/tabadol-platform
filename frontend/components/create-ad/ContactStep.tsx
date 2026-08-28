"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CreateAdData } from "@/services/api/ads.api";
import {
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Phone,
  User,
  Zap,
  CreditCard,
  ExternalLink,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface ContactStepProps {
  data: Partial<CreateAdData>;
  updateData: (data: Partial<CreateAdData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export function ContactStep({
  data,
  updateData,
  onSubmit,
  onBack,
  loading,
}: ContactStepProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [urgentPaymentLoading, setUrgentPaymentLoading] = useState(false);
  const [urgentPaid, setUrgentPaid] = useState(false);

  // ── پر کردن خودکار از اطلاعات کاربر ──
  useEffect(() => {
    if (!user) return;
    const updates: Partial<CreateAdData> = {};

    if (!data.contactPhone && user.phone) {
      updates.contactPhone = user.phone;
    }
    if (!data.contactName) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      if (fullName) updates.contactName = fullName;
    }

    if (Object.keys(updates).length > 0) {
      updateData(updates);
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!data.contactPhone) {
      newErrors.contactPhone = "وارد کردن شماره تماس الزامی است";
    } else if (!/^09[0-9]{9}$/.test(data.contactPhone)) {
      newErrors.contactPhone = "فرمت شماره موبایل معتبر نیست (مثال: 09123456789)";
    }
    if (!acceptTerms) {
      newErrors.acceptTerms = "قبول قوانین و مقررات الزامی است";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit();
  };

  // ── پرداخت آگهی فوری ──
  const handleUrgentPayment = async () => {
    setUrgentPaymentLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("لطفاً ابتدا وارد شوید");
        return;
      }

      // ارسال درخواست به درگاه پرداخت
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/payments/urgent-ad`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            callbackUrl: `${window.location.origin}/create-ad?urgent_paid=1`,
            description: "ارتقا به آگهی فوری",
            amount: 50000, // مبلغ به ریال — از settings دریافت می‌شود
          }),
        },
      );

      const paymentData = await res.json();

      if (paymentData.success && paymentData.data?.url) {
        // ذخیره formData در sessionStorage برای بازگشت بعد از پرداخت
        sessionStorage.setItem(
          "pending_ad_data",
          JSON.stringify({ ...data, isUrgent: true }),
        );
        // هدایت به درگاه
        window.location.href = paymentData.data.url;
      } else {
        toast.error(paymentData.message || "خطا در اتصال به درگاه پرداخت");
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setUrgentPaymentLoading(false);
    }
  };

  // ── بررسی بازگشت از پرداخت ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("urgent_paid") === "1") {
      setUrgentPaid(true);
      updateData({ isUrgent: true });
      toast.success("پرداخت با موفقیت انجام شد. آگهی شما فوری خواهد بود!");

      // بازیابی اطلاعات ذخیره‌شده
      const savedData = sessionStorage.getItem("pending_ad_data");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          updateData(parsed);
        } catch {}
        sessionStorage.removeItem("pending_ad_data");
      }

      // پاک کردن query param
      const url = new URL(window.location.href);
      url.searchParams.delete("urgent_paid");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // وضعیت آگهی فوری
  const isUrgentActive = data.isUrgent || urgentPaid;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── اطلاعات تماس ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="phone"
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            شماره تماس <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="09123456789"
            value={data.contactPhone || ""}
            onChange={(e) => updateData({ contactPhone: e.target.value })}
            className="h-11 rounded-xl text-left font-mono tracking-wider pl-4"
            dir="ltr"
            disabled={loading}
          />
          {errors.contactPhone && (
            <p className="text-xs font-bold text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.contactPhone}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            این شماره در صفحه آگهی نمایش داده می‌شود.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="contactName"
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            نام تماس‌گیرنده
          </Label>
          <Input
            id="contactName"
            placeholder="مثال: رضا کریمی"
            value={data.contactName || ""}
            onChange={(e) => updateData({ contactName: e.target.value })}
            className="h-11 rounded-xl text-sm"
            disabled={loading}
          />
          <p className="text-[10px] text-muted-foreground">
            در صورت خالی بودن، اطلاعات حساب شما استفاده می‌شود.
          </p>
        </div>
      </div>

      {/* ── آگهی فوری ── */}
      <div className={cn(
        "rounded-2xl border-2 p-4 transition-all duration-300",
        isUrgentActive
          ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
          : "border-border/60 bg-muted/10",
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 items-start flex-1 min-w-0">
            <div className={cn(
              "p-2.5 rounded-xl border shrink-0 transition-colors",
              isUrgentActive
                ? "bg-amber-500 text-white border-amber-600"
                : "bg-background text-muted-foreground border-border",
            )}>
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm font-black text-foreground">
                  آگهی فوری
                </Label>
                {isUrgentActive && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1">
                    <CheckCircle className="w-3 h-3" />
                    فعال شده
                  </Badge>
                )}
                {!isUrgentActive && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    <CreditCard className="w-3 h-3 ml-1" />
                    نیاز به پرداخت
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                آگهی شما با برچسب فوری در صدر نتایج نمایش داده می‌شود و شانس فروش سریع‌تر دارد.
              </p>

              {!isUrgentActive && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    هزینه: ۵۰،۰۰۰ تومان
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUrgentPayment}
                    disabled={urgentPaymentLoading || loading}
                    className="h-8 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 rounded-xl"
                  >
                    {urgentPaymentLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )}
                    {urgentPaymentLoading ? "در حال اتصال..." : "پرداخت و فعال‌سازی"}
                  </Button>
                </div>
              )}

              {isUrgentActive && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  آگهی شما پس از ثبت، به صورت فوری نمایش داده می‌شود
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── قوانین ── */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div
          className={cn(
            "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors select-none",
            acceptTerms ? "bg-muted/20 border-border" : "bg-background border-border/40",
          )}
          onClick={() => setAcceptTerms(!acceptTerms)}
        >
          <input
            type="checkbox"
            id="terms"
            className="w-4 h-4 accent-primary rounded mt-0.5 cursor-pointer"
            checked={acceptTerms}
            readOnly
            disabled={loading}
          />
          <label
            htmlFor="terms"
            className="text-xs font-medium text-foreground/90 cursor-pointer leading-relaxed"
          >
            شرایط و قوانین انتشار آگهی و حریم خصوصی پلتفرم تبادل را مطالعه کرده
            و تمام مفاد آن را می‌پذیرم.
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.acceptTerms}
          </p>
        )}
      </div>

      {/* ── دکمه‌های ناوبری ── */}
      <div className="flex justify-between items-center pt-6 border-t border-border/40">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="gap-2 rounded-xl h-10 px-6 text-sm font-bold"
        >
          <ChevronRight className="w-4 h-4" />
          مرحله قبل
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={cn(
            "gap-2 rounded-xl h-10 px-8 text-sm font-bold shadow-md min-w-[140px]",
            loading
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال ثبت...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              تأیید و ثبت نهایی
            </>
          )}
        </Button>
      </div>
    </div>
  );
}