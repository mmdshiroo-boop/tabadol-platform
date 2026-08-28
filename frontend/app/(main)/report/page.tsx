// report/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";

const REPORT_TYPES: Record<string, string> = {
  spam: "هرزنامه / اسپم",
  fraud: "کلاهبرداری",
  fake: "آگهی جعلی",
  offensive: "محتوای نامناسب",
  illegal: "محتوای غیرقانونی",
  duplicate: "آگهی تکراری",
  wrong_category: "دسته‌بندی اشتباه",
  other: "سایر",
};

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // اگر از صفحه آگهی با query پارامتر اومده باشه، اینجا می‌تونیم پیش‌فرض بذاریم
  const [targetType, setTargetType] = useState<"ad" | "property" | "user">(
    (searchParams.get("targetType") as any) || "ad",
  );
  const [targetId, setTargetId] = useState(searchParams.get("targetId") || "");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      toast.error("شناسه آگهی/کاربر الزامی است");
      return;
    }
    if (!type) {
      toast.error("لطفاً نوع تخلف را انتخاب کنید");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/reports", {
        targetType,
        targetId: targetId.trim(),
        type,
        description: description.trim() || undefined,
      });
      setSuccess(true);
      toast.success("گزارش شما با موفقیت ثبت شد. متشکریم.");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "خطا در ثبت گزارش. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh] px-4"
        dir="rtl"
      >
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardHeader>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <CardTitle className="text-xl font-bold mt-4">
              گزارش شما ثبت شد
            </CardTitle>
            <CardDescription>
              از شما بابت ارسال گزارش متشکریم. تیم ما در اسرع وقت به آن رسیدگی
              خواهد کرد.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full rounded-xl"
            >
              بازگشت به صفحه اصلی
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4" dir="rtl">
      <Card className="shadow-lg border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-6 h-6" />
            گزارش تخلف
          </CardTitle>
          <CardDescription>
            لطفاً اطلاعات زیر را به دقت تکمیل کنید. گزارش شما به صورت محرمانه
            بررسی خواهد شد.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* نوع هدف */}
            <div className="space-y-1.5">
              <Label>نوع گزارش</Label>
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad">آگهی</SelectItem>
                  <SelectItem value="property">ملک</SelectItem>
                  <SelectItem value="user">کاربر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* شناسه */}
            <div className="space-y-1.5">
              <Label htmlFor="targetId">
                شناسه{" "}
                {targetType === "ad"
                  ? "آگهی"
                  : targetType === "property"
                    ? "ملک"
                    : "کاربر"}
              </Label>
              <Input
                id="targetId"
                placeholder="شناسه ۲۴ رقمی را وارد کنید"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                dir="ltr"
                className="text-left"
                required
              />
              <p className="text-xs text-muted-foreground">
                می‌توانید این شناسه را از انتهای آدرس آگهی (URL) پیدا کنید.
              </p>
            </div>

            {/* نوع تخلف */}
            <div className="space-y-1.5">
              <Label>نوع تخلف</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع تخلف" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* توضیحات */}
            <div className="space-y-1.5">
              <Label htmlFor="desc">توضیحات (اختیاری)</Label>
              <Textarea
                id="desc"
                placeholder="در صورت نیاز توضیحات بیشتری بنویسید..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-left">
                {description.length}/1000
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="rounded-xl"
              >
                بازگشت
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "ارسال گزارش"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
