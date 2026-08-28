"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { useRouter } from "next/navigation";

export default function AdminLoyaltyAdjustPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!userId || points === 0 || points === undefined) {
      toast.error("شناسه کاربر و مقدار امتیاز الزامی است");
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post("/admin/loyalty/adjust-points", {
        userId,
        points: Number(points),
        reason,
        description,
      });
      toast.success(res.data.message || "امتیاز کاربر بروزرسانی شد");
      // پاکسازی فرم
      setUserId("");
      setPoints(0);
      setReason("");
      setDescription("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در بروزرسانی امتیاز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>تنظیم دستی امتیاز کاربر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>شناسه کاربر</Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ObjectId کاربر"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>مقدار امتیاز (مثبت برای افزایش، منفی برای کاهش)</Label>
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>دلیل (اختیاری)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً جبران خطا"
            />
          </div>
          <div className="space-y-2">
            <Label>توضیحات (اختیاری)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیح بیشتر"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? "در حال ثبت..." : "ثبت تغییر امتیاز"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}