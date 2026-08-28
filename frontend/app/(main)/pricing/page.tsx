// pricing/page.tsx
"use client";

import { useEffect, useState } from "react";
import apiClient from "@/services/api/client"; // ← ایمپورت پیش‌فرض
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionPlan {
  _id: string;
  title: string;
  slug: string;
  price: number;
  durationDays: number;
  features: string[];
  targetRole: string;
}

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null); // کدام پلن در حال خرید است

  useEffect(() => {
    apiClient
      .get("/subscriptions/plans")
      .then((res) => {
        if (res.data.success) setPlans(res.data.data);
        else setError("خطا در دریافت لیست پلن‌ها");
      })
      .catch((err) => {
        console.error(
          "❌ Plans Fetch Error:",
          err.response?.status,
          err.message,
        );
        setError(err.response?.data?.message || "ارتباط با سرور ناموفق بود");
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (slug: string) => {
    if (!user) {
      router.push("/auth/login?redirect=/pricing");
      return;
    }

    setPurchasing(slug);
    try {
      const { data } = await apiClient.post("/subscriptions/purchase", {
        planSlug: slug,
      });

      const paymentUrl = data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert(
          "لینک پرداخت از سرور دریافت نشد.\n\nپاسخ سرور:\n" +
            JSON.stringify(data, null, 2),
        );
      }
    } catch (err: any) {
      console.error("❌ Purchase Error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "ارتباط با سرور ناموفق بود");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">اشتراک ویژه</h1>
        <p className="text-muted-foreground text-lg">
          با ارتقای حساب کاربری، آگهی‌های خود را متمایز کنید.
        </p>
      </div>

      {error ? (
        <div className="text-center text-destructive p-8 border rounded-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            if (!plan.slug || !plan.title) return null;
            return (
              <Card
                key={plan._id}
                className="flex flex-col relative overflow-hidden hover:shadow-lg transition-shadow"
              >
                {plan.slug?.includes("gold") && (
                  <Badge className="absolute top-4 left-4 bg-primary">
                    پیشنهاد ویژه
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.title}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {(plan.price ?? 0).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground mr-1">تومان</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    اعتبار {plan.durationDays ?? 0} روزه
                  </p>
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  <ul className="space-y-3">
                    {(plan.features ?? []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button
                    className="w-full text-lg py-6"
                    onClick={() => handlePurchase(plan.slug)}
                    disabled={purchasing === plan.slug}
                  >
                    {purchasing === plan.slug ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "خرید اشتراک"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
