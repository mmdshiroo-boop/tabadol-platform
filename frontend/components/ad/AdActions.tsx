"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  MessageCircle,
  Star,
  Copy,
  Check,
  ShieldAlert,
  Flag,
  ExternalLink,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { AdCalculator } from "./AdCalculator";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { chatApi } from "@/services/api/chat.api";
import { ReportModal } from "@/components/report/ReportModal";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { AdPrintContent } from "./AdPrintContent";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface AdActionsProps {
  sellerName: string;
  sellerPhone: string;
  sellerRating?: number;
  sellerReviewCount?: number;
  isVerified?: boolean;
  adPrice?: number;
  adArea?: number;
  adTitle?: string;
  sellerAvatar?: string;
  adId?: string;
  sellerUserId?: string;
  sourceUrl?: string;
  adData?: any;
}

export function AdActions({
  sellerName,
  sellerPhone,
  sellerRating = 0,
  sellerReviewCount = 0,
  isVerified = false,
  adPrice,
  adArea,
  adTitle,
  sellerAvatar,
  adId,
  sellerUserId,
  sourceUrl,
  adData,
}: AdActionsProps) {
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: adTitle || "آگهی",
  });

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d)]);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(sellerPhone);
    setCopied(true);
    toast.success("شماره تلفن کپی شد");
    setTimeout(() => setCopied(false), 2500);
  };

  const getAvatarUrl = () => {
    if (!sellerAvatar) return "";
    if (sellerAvatar.startsWith("http")) return sellerAvatar;
    return `${API_BASE.replace("/api", "")}${
      sellerAvatar.startsWith("/") ? "" : "/"
    }${sellerAvatar}`;
  };

  const handleStartChat = async () => {
    if (!user) {
      router.push(
        `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (!sellerUserId) {
      toast.error("امکان شروع گفتگو وجود ندارد");
      return;
    }
    if (user._id === sellerUserId) {
      toast.info("این آگهی متعلق به شماست");
      return;
    }

    setStartingChat(true);
    try {
      const conversation = await chatApi.createConversation(sellerUserId, adId);
      router.push(`/chat?conversationId=${conversation._id}`);
    } catch (err: any) {
      console.error("Start chat error:", err);
      toast.error(err.response?.data?.message || "خطا در شروع گفتگو");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <>
      <div
        className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5 space-y-4 text-right w-full min-w-0"
        dir="rtl"
      >
        {/* پروفایل فروشنده */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-12 h-12 border-2 border-primary/20 rounded-full shrink-0">
            <AvatarImage
              src={sellerAvatar ? getAvatarUrl() : "/images/user.webp"}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-black text-sm rounded-full">
              {sellerName?.slice(0, 2) || "ک"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {sellerUserId ? (
                <Link
                  href={`/profile/${sellerUserId}`}
                  className="hover:underline underline-offset-4 truncate block"
                >
                  <h3 className="font-black text-sm md:text-base text-card-foreground truncate">
                    {sellerName}
                  </h3>
                </Link>
              ) : (
                <h3 className="font-black text-sm md:text-base text-card-foreground truncate">
                  {sellerName}
                </h3>
              )}
              {isVerified && <VerifiedBadge size="sm" />}
            </div>

            {sellerRating > 0 && (
              <div
                className="flex items-center gap-1 text-amber-500 text-xs font-bold"
                dir="ltr"
              >
                <span className="text-muted-foreground text-[10px] font-normal">
                  ({sellerReviewCount} نظر)
                </span>
                <span className="text-card-foreground font-mono text-[11px]">
                  {sellerRating.toFixed(1)}
                </span>
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              </div>
            )}
          </div>
        </div>

        <Separator className="hidden md:block" />

        {/* دکمه‌های تماس دسکتاپ */}
        <div className="hidden md:flex flex-col space-y-2.5">
          {!showFullPhone ? (
            <Button
              className="w-full h-11 rounded-xl text-xs font-black gap-2 shadow-md shadow-primary/20"
              onClick={() => setShowFullPhone(true)}
            >
              <Phone className="w-4 h-4" />
              اطلاعات تماس با فروشنده
            </Button>
          ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
                onClick={handleCopyPhone}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                className="flex-1 gap-2 rounded-xl h-11 font-black font-mono text-sm tracking-widest bg-foreground text-background hover:bg-foreground/90"
                asChild
              >
                <a href={`tel:${sellerPhone}`}>
                  <Phone className="w-4 h-4" />
                  {formatPhoneNumber(sellerPhone)}
                </a>
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl h-11 text-xs font-bold"
            onClick={handleStartChat}
            disabled={startingChat}
          >
            {startingChat ? (
              <>در حال اتصال...</>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 text-primary" />
                شروع چت و گفتگو با فروشنده
              </>
            )}
          </Button>
        </div>

        <Separator />

        {sourceUrl && (
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl h-11 text-xs font-bold"
            asChild
          >
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 text-primary" />
              ارجاع به لینک اصلی
            </a>
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full gap-2 rounded-xl h-11 text-xs font-bold"
          onClick={() => handlePrint()}
        >
          <Printer className="w-4 h-4" />
          پرینت آگهی (PDF)
        </Button>

        <Button
          variant="outline"
          className="w-full gap-2 rounded-xl h-11 text-xs font-bold text-muted-foreground border-destructive/20 hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all"
          onClick={() => setReportOpen(true)}
        >
          <Flag className="w-4 h-4" />
          گزارش تخلف این آگهی
        </Button>

        <AdCalculator price={adPrice} area={adArea} title={adTitle} />

        <div className="bg-amber-500/10 border border-dashed border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5 select-none">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-600/90 leading-5 text-justify">
            پیش از انجام هرگونه معامله، پرداخت بیعانه یا ارسال کالا، حتماً از
            اصالت کالا و هویت طرف مقابل اطمینان حاصل کنید. پلتفرم مسئولیتی در
            قبال تبادلات مالی ندارد.
          </p>
        </div>
      </div>

      {/*
        ✅ بخش چاپ — بدون left:-9999px
        این روش محتوا را برای react-to-print نگه می‌دارد
        ولی هیچ اسکرول افقی در موبایل/تبلت ایجاد نمی‌کند
      */}
      <div
        aria-hidden="true"
        className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
        style={{
          clip: "rect(0, 0, 0, 0)",
          clipPath: "inset(50%)",
        }}
      >
        <div ref={printRef}>
          <AdPrintContent
            adData={adData}
            sellerName={sellerName}
            sellerPhone={sellerPhone}
          />
        </div>
      </div>

      {/* نوار پایین موبایل */}
      <div
        className="fixed bottom-0 inset-x-0 z-[100] flex md:hidden items-center gap-2 bg-background/95 backdrop-blur-xl border-t border-border p-2.5 px-3 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] w-full max-w-full box-border"
        style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
        dir="rtl"
      >
        {!showFullPhone ? (
          <Button
            className="flex-1 min-w-0 h-11 rounded-xl bg-orange-500 text-white font-black text-xs hover:bg-orange-600 shadow-md truncate"
            onClick={() => setShowFullPhone(true)}
          >
            اطلاعات تماس
          </Button>
        ) : (
          <div className="flex-1 min-w-0 flex gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-10 rounded-xl border-orange-500 text-orange-500 bg-white shrink-0"
              onClick={handleCopyPhone}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <Button
              className="flex-1 min-w-0 h-11 rounded-xl bg-orange-500 text-white font-black text-xs shadow-md truncate"
              asChild
            >
              <a href={`tel:${sellerPhone}`} className="truncate">
                {formatPhoneNumber(sellerPhone)}
              </a>
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          className="flex-1 min-w-0 h-11 rounded-xl border-2 border-orange-500 text-orange-500 bg-white font-black text-xs hover:bg-orange-50 truncate"
          onClick={handleStartChat}
          disabled={startingChat}
        >
          {startingChat ? "اتصال..." : "چت"}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-orange-500 text-orange-500 bg-white shrink-0"
          onClick={() => handlePrint()}
          title="پرینت"
        >
          <Printer className="w-4 h-4" />
        </Button>
      </div>

      {adId && (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="ad"
          targetId={adId}
          targetTitle={adTitle || sellerName}
        />
      )}
    </>
  );
}