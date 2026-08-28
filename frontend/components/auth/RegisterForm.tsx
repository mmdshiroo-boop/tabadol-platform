"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { authApi } from "@/services/api/auth.api";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import {
  Smartphone,
  KeyRound,
  ArrowRight,
  Send,
  User,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Gift,
} from "lucide-react";
import {
  AuthField,
  AuthError,
  AuthButton,
  OtpCountdown,
  AuthDivider,
  StepIndicator,
  PasswordStrength,
  authInputClass,
} from "./AuthShared";
import { cn } from "@/lib/utils";

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.match(/^09[0-9]{9}$/)) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.sendCode(phone);
      setStep("code");
      setCountdown(120);
      toast.success("کد تایید ارسال شد");
    } catch (err: any) {
      const msg = err.response?.data?.message || "خطا در ارسال کد";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("کد ۶ رقمی را کامل وارد کنید");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("نام و نام خانوادگی الزامی است");
      return;
    }
    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد");
      return;
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await authApi.verifyCode({
        phone,
        code,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        referralCode: referralCode.trim() || undefined, // ✅ ارسال کد معرف
      });
      if (response.success) {
        login(response.token, response.data);

        toast.success("ثبت‌نام موفق", {
          description: `${firstName} ${lastName} خوش آمدید!`,
        });

        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace("/");
            router.refresh();
          }
        }, 300);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "اطلاعات نامعتبر است";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await authApi.resendCode(phone);
      setCountdown(120);
      toast.success("کد مجدداً ارسال شد");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "خطا در ارسال مجدد");
    } finally {
      setLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <div className="space-y-5" dir="rtl">
        <StepIndicator currentStep={0} totalSteps={2} />

        <div className="space-y-1.5">
          <h2 className="text-[17px] font-black text-foreground">
            ایجاد حساب جدید
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            شماره موبایل خود را وارد کنید تا کد تایید ارسال شود.
          </p>
        </div>

        <form onSubmit={sendCode} className="space-y-4">
          <AuthField
            id="reg-phone"
            label="شماره موبایل"
            icon={<Smartphone className="w-4 h-4" />}
          >
            <Input
              id="reg-phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              dir="ltr"
              className={cn(authInputClass, "pr-11")}
              autoFocus
            />
          </AuthField>

          {/* ✅ فیلد کد معرف */}
          <AuthField
            id="reg-referral"
            label="کد معرف (اختیاری)"
            icon={<Gift className="w-4 h-4" />}
          >
            <Input
              id="reg-referral"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="مثلاً A1B2C3D4"
              dir="ltr"
              className={cn(authInputClass, "pr-11")}
            />
          </AuthField>

          <AnimatePresence>
            {error && <AuthError message={error} />}
          </AnimatePresence>

          <AuthButton
            loading={loading}
            disabled={phone.length < 11}
            label="ارسال کد تایید"
            icon={<Send className="w-4 h-4" />}
          />
        </form>

        <AuthDivider />

        <p className="text-center text-[13px] text-muted-foreground">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-primary font-bold hover:underline underline-offset-4 transition-colors"
          >
            وارد شوید
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <StepIndicator currentStep={1} totalSteps={2} />

      <button
        type="button"
        onClick={() => {
          setStep("phone");
          setError("");
        }}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        <span>تغییر شماره</span>
        <span className="text-foreground/50 font-medium" dir="ltr">
          ({phone})
        </span>
      </button>

      <div className="space-y-1.5">
        <h2 className="text-[17px] font-black text-foreground">
          تکمیل اطلاعات
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          کد تایید و مشخصات خود را وارد کنید.
        </p>
      </div>

      <form onSubmit={verifyCode} className="space-y-3.5">
        <AuthField
          id="reg-code"
          label="کد تایید ۶ رقمی"
          icon={<KeyRound className="w-4 h-4" />}
        >
          <Input
            id="reg-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="• • • • • •"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            dir="ltr"
            className={cn(
              authInputClass,
              "pr-11 text-center tracking-[0.5em] font-black font-mono text-base"
            )}
            autoFocus
          />
        </AuthField>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
          <AuthField
            id="reg-fn"
            label="نام"
            icon={<User className="w-4 h-4" />}
          >
            <Input
              id="reg-fn"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="علی"
              className={cn(authInputClass, "pr-11")}
            />
          </AuthField>

          <AuthField
            id="reg-ln"
            label="نام خانوادگی"
            icon={<User className="w-4 h-4" />}
          >
            <Input
              id="reg-ln"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="محمدی"
              className={cn(authInputClass, "pr-11")}
            />
          </AuthField>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
          <div>
            <AuthField
              id="reg-pass"
              label="رمز عبور"
              icon={<Lock className="w-4 h-4" />}
            >
              <div className="relative">
                <Input
                  id="reg-pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  dir="ltr"
                  className={cn(authInputClass, "pr-11 pl-11")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </AuthField>
            <PasswordStrength password={password} />
          </div>

          <AuthField
            id="reg-confirm"
            label="تکرار رمز"
            icon={<Lock className="w-4 h-4" />}
          >
            <Input
              id="reg-confirm"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تکرار رمز عبور"
              dir="ltr"
              className={cn(authInputClass, "pr-11")}
            />
          </AuthField>
        </div>

        <AnimatePresence>
          {error && <AuthError message={error} />}
        </AnimatePresence>

        <AuthButton
          loading={loading}
          disabled={
            code.length < 6 ||
            !firstName.trim() ||
            !lastName.trim() ||
            password.length < 6 ||
            password !== confirmPassword
          }
          label="تکمیل ثبت‌نام"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />

        <OtpCountdown countdown={countdown} onResend={resendCode} />
      </form>
    </div>
  );
}