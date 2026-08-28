"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calculator,
  Ruler,
  DollarSign,
  ArrowLeftRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdCalculatorProps {
  price?: number;
  area?: number;
  title?: string;
}

const toFa = (n: number) => n.toLocaleString("fa-IR");

const moneyShort = (n: number) => {
  if (!n) return "۰";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + " میلیارد";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + " میلیون";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " هزار";
  return toFa(n);
};

const moneyFull = (n: number) => {
  if (!n) return "";
  return toFa(n) + " تومان";
};

export function AdCalculator({ price, area, title }: AdCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [userPrice, setUserPrice] = useState(price || 0);
  const [userArea, setUserArea] = useState(area || 0);
  const [pricePerMeter, setPricePerMeter] = useState(0);
  const [isDark, setIsDark] = useState(false);

  // تشخیص تم
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // محاسبات
  const calcPricePerMeter =
    userArea > 0 && userPrice > 0 ? Math.floor(userPrice / userArea) : 0;

  // همگام‌سازی
  const onPrice = useCallback(
    (v: number) => {
      setUserPrice(v);
      if (v > 0 && userArea > 0) setPricePerMeter(Math.floor(v / userArea));
      else if (v === 0) setPricePerMeter(0);
    },
    [userArea]
  );

  const onArea = useCallback(
    (v: number) => {
      setUserArea(v);
      if (v > 0 && userPrice > 0) setPricePerMeter(Math.floor(userPrice / v));
      else if (v === 0) setPricePerMeter(0);
    },
    [userPrice]
  );

  const onPricePerMeter = useCallback(
    (v: number) => {
      setPricePerMeter(v);
      if (v > 0 && userArea > 0) setUserPrice(v * userArea);
      else if (v === 0) setUserPrice(0);
    },
    [userArea]
  );

  const resetAll = () => {
    setUserPrice(0);
    setUserArea(0);
    setPricePerMeter(0);
  };

  const inputClass = cn(
    "w-full h-11 rounded-xl border bg-background px-4 text-sm text-right font-medium",
    "placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30",
    "transition-all duration-200",
    isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-white/80"
  );

  const labelClass =
    "text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 rounded-2xl w-full h-11 text-sm font-bold transition-all",
            "border-orange-200/60 hover:border-orange-400 hover:bg-orange-50/50",
            "dark:border-white/10 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/5"
          )}
        >
          <Calculator className="w-4 h-4 text-primary" />
          ماشین حساب ملک
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-3xl overflow-hidden border shadow-2xl bg-card dark:bg-card">
        {/* ─── هدر اصلاح‌شده بدون دکمه‌ی X سفارشی ─── */}
        <div className="relative bg-gradient-to-l from-orange-600 to-orange-500 px-6 pt-5 pb-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Calculator className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-black leading-tight text-white">
                ماشین حساب ملک
              </DialogTitle>
              {title && (
                <p className="text-[10px] text-white/80 mt-0.5 truncate max-w-[280px]">
                  {title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── محتوا ─── */}
        <div className="px-5 py-5 space-y-5">
          {/* متراژ */}
          <div>
            <label className={labelClass}>
              <Ruler className="w-3.5 h-3.5 text-primary" />
              متراژ (متر مربع)
            </label>
            <input
              type="number"
              value={userArea || ""}
              onChange={(e) => onArea(+e.target.value)}
              placeholder="مثلاً ۸۰"
              className={inputClass}
            />
          </div>

          {/* قیمت کل */}
          <div>
            <label className={labelClass}>
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              قیمت کل (تومان)
            </label>
            <input
              type="number"
              value={userPrice || ""}
              onChange={(e) => onPrice(+e.target.value)}
              placeholder="مثلاً ۵,۰۰۰,۰۰۰,۰۰۰"
              className={inputClass}
            />
          </div>

          {/* قیمت هر متر (محاسبه خودکار / دستی) */}
          <div>
            <label className={labelClass}>
              <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
              قیمت هر متر مربع (تومان)
            </label>
            <input
              type="number"
              value={pricePerMeter || ""}
              onChange={(e) => onPricePerMeter(+e.target.value)}
              placeholder="با تغییر این مقدار، قیمت کل محاسبه می‌شود"
              className={inputClass}
            />
            {userArea > 0 && (
              <p className="text-[10px] text-muted-foreground/70 mt-1.5 pr-1">
                ⚡ اگر {toFa(userArea)} متر مربع باشد، قیمت کل{" "}
                {toFa(userPrice)} تومان خواهد بود.
              </p>
            )}
          </div>

          {/* ─── نتایج ─── */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <ResultBox
              title="قیمت هر متر"
              value={
                calcPricePerMeter > 0
                  ? moneyShort(calcPricePerMeter) + " ت"
                  : "---"
              }
              sub={calcPricePerMeter > 0 ? moneyFull(calcPricePerMeter) : ""}
              icon={Ruler}
            />
            <ResultBox
              title="قیمت کل"
              value={userPrice > 0 ? moneyShort(userPrice) + " ت" : "---"}
              sub={userPrice > 0 ? moneyFull(userPrice) : ""}
              icon={DollarSign}
            />
          </div>

          {/* خلاصه هوشمند */}
          {(userPrice > 0 || userArea > 0) && (
            <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-3.5 border border-primary/20 flex items-start gap-3">
              <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="text-muted-foreground">
                  {userPrice > 0 && userArea > 0 ? (
                    <>
                      <strong className="text-foreground">
                        {toFa(userPrice)}
                      </strong>{" "}
                      تومان برای{" "}
                      <strong className="text-foreground">
                        {toFa(userArea)}
                      </strong>{" "}
                      متر مربع
                      {" → "}
                      <strong className="text-primary">
                        {toFa(calcPricePerMeter)}
                      </strong>{" "}
                      تومان هر متر
                    </>
                  ) : userPrice > 0 ? (
                    <>
                      قیمت کل{" "}
                      <strong className="text-foreground">
                        {toFa(userPrice)}
                      </strong>{" "}
                      تومان
                    </>
                  ) : userArea > 0 ? (
                    <>
                      متراژ{" "}
                      <strong className="text-foreground">
                        {toFa(userArea)}
                      </strong>{" "}
                      متر مربع
                    </>
                  ) : (
                    <>مقادیر را وارد کنید</>
                  )}
                </p>
                {userPrice > 0 && userArea > 0 && (
                  <p className="text-[10px] text-muted-foreground/70">
                    قیمت هر متر:{" "}
                    <span className="font-bold text-foreground">
                      {toFa(calcPricePerMeter)}
                    </span>{" "}
                    تومان
                  </p>
                )}
              </div>
            </div>
          )}

          {/* دکمه ریست */}
          {(userPrice > 0 || userArea > 0 || pricePerMeter > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl h-8"
            >
              پاک کردن همه
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── کارت نتیجه ─── */
function ResultBox({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-3.5 transition-all hover:border-primary/30 hover:shadow-sm">
      <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-muted-foreground/60" />}
        {title}
      </p>
      <div className="text-[15px] font-black text-foreground leading-tight">
        {value}
      </div>
      {sub && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}