// help/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/app/context/SettingsContext";
import { Container } from "@/components/layout/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  HelpCircle,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Send,
  Headphones,
  Globe,
} from "lucide-react";

import { FaInstagram, FaFacebook, FaLinkedin } from "react-icons/fa";
import { MdOutlineContactSupport } from "react-icons/md";

interface FaqItem {
  question: string;
  answer: string;
  category: "general" | "ads" | "payment" | "account";
}

const categoryIcons = {
  general: <HelpCircle className="w-4 h-4" />,
  ads: <FileText className="w-4 h-4" />,
  payment: <DollarSign className="w-4 h-4" />,
  account: <Users className="w-4 h-4" />,
};

const categoryLabels = {
  general: "عمومی",
  ads: "آگهی‌ها",
  payment: "پرداخت",
  account: "حساب کاربری",
};

export default function HelpPage() {
  const { settings } = useSettings();

  const faqs: FaqItem[] = (() => {
    try {
      const parsed = JSON.parse(settings.pages?.helpFaqs || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const contactInfo = {
    phone: settings.contactPhone || "021-12345678",
    email: settings.contactEmail || "info@example.com",
    address: settings.contactAddress || "تهران، خیابان ولیعصر",
  };

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [ticketData, setTicketData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = `راهنما | ${settings.siteName || "پلتفرم آگهی تبادل"}`;
  }, [settings.siteName]);

  const filteredFaqs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((faq) => faq.category === activeCategory);

  const handleSubmitTicket = async () => {
    if (!ticketData.name || !ticketData.subject || !ticketData.message) {
      toast.error("لطفاً نام، موضوع و پیام را وارد کنید");
      return;
    }

    setSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("تیکت شما با موفقیت ثبت شد");
      setTicketData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast.error("خطا در ثبت تیکت");
    } finally {
      setSending(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const categories = [
    "all",
    ...new Set(faqs.map((f) => f.category).filter(Boolean)),
  ];

  return (
    <Container className="py-6 md:py-10">
      {/* هیرو */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/10 dark:border-orange-500/5 p-6 md:p-12 text-center mb-8 md:mb-12"
      >
        <div className="absolute top-0 right-0 w-32 h-32 md:w-40 md:h-40 bg-orange-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 md:w-40 md:h-40 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex p-2.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl mb-3 md:mb-4">
            <MdOutlineContactSupport className="w-6 h-6 md:w-8 md:h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black mb-2 md:mb-3 text-foreground tracking-tight">
            چطور می‌توانیم کمک کنیم؟
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl mx-auto font-medium leading-relaxed">
            پاسخ سوالات خود را پیدا کنید یا با تیم پشتیبانی ما در ارتباط باشید
          </p>
        </div>
      </motion.div>

      {/* فیلتر دسته‌بندی‌ها */}
      <div className="flex items-center lg:justify-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-5 h-9 shrink-0 transition-all font-bold text-xs ${
            activeCategory === "all"
              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20"
              : "hover:border-orange-500/50 hover:text-orange-600 dark:hover:text-orange-400"
          }`}
        >
          همه
        </Button>
        {categories
          .filter((cat) => cat !== "all")
          .map((cat) => {
            const isActive = activeCategory === cat;
            const Icon = categoryIcons[cat as keyof typeof categoryIcons];
            const label =
              categoryLabels[cat as keyof typeof categoryLabels] || cat;
            return (
              <Button
                key={cat}
                variant={isActive ? "default" : "outline"}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full gap-2 px-4 h-9 shrink-0 transition-all font-bold text-xs ${
                  isActive
                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20"
                    : "hover:border-orange-500/50 hover:text-orange-600 dark:hover:text-orange-400"
                }`}
              >
                <span
                  className={
                    isActive
                      ? "text-white"
                      : "text-orange-500 dark:text-orange-400"
                  }
                >
                  {Icon}
                </span>
                {label}
              </Button>
            );
          })}
      </div>

      {/* لیست FAQ */}
      <div className="max-w-3xl mx-auto mb-12 md:mb-16">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-black mb-1 tracking-tight">
            سوالات متداول
          </h2>
          <p className="text-muted-foreground text-[11px] md:text-xs font-medium">
            پاسخ سوالات رایج کاربران
          </p>
        </div>

        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={`${faq.question}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`rounded-xl border transition-all duration-200 ${
                    isOpen
                      ? "border-orange-200 dark:border-orange-950 bg-orange-50/10 dark:bg-zinc-900/40 shadow-sm"
                      : "border-border/60 bg-card hover:border-orange-200 dark:hover:border-orange-950"
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-4 text-right gap-4"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border-orange-100 dark:border-orange-950 shrink-0 transition-colors ${
                          isOpen
                            ? "bg-orange-500 text-white border-transparent"
                            : "bg-orange-50/50 dark:bg-zinc-900 text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {categoryLabels[faq.category] || faq.category}
                      </Badge>
                      <span
                        className={`font-bold text-xs md:text-sm truncate transition-colors ${
                          isOpen
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-foreground"
                        }`}
                      >
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-orange-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 border-t border-orange-100/50 dark:border-orange-950/50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium pt-3">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              در حال حاضر سوال متداولی ثبت نشده است.
            </p>
          )}
        </div>
      </div>

      {/* بخش تماس و تیکت */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* اطلاعات تماس */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full"
        >
          <Card className="border border-border/50 shadow-sm h-full rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Headphones className="w-4 h-4 md:w-5 h-5 text-orange-500" />
                </div>
                <CardTitle className="text-sm md:text-base font-black">
                  ارتباط با ما
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-4 md:p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                  ما همیشه اینجا هستیم تا به شما کمک کنیم.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-muted/20 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-950 transition-all">
                    <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        شماره تماس
                      </p>
                      <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 dir-ltr text-right mt-0.5">
                        {contactInfo.phone}
                      </p>
                      <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">
                        شنبه تا پنجشنبه ۹ صبح تا ۵ عصر
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 p-3 rounded-xl bg-muted/20 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 border border-transparent hover:border-orange-100 dark:hover:border-orange-950 transition-all">
                    <div className="p-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-xs font-bold text-foreground">ایمیل</p>
                      <p className="text-xs md:text-sm font-semibold text-foreground/80 mt-0.5 break-all">
                        {contactInfo.email}
                      </p>
                      <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">
                        پاسخگویی در کمتر از ۲۴ ساعت
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-border/40 mt-6">
                <p className="text-xs font-bold mb-3 text-muted-foreground">
                  ما را دنبال کنید
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: <FaInstagram className="w-4 h-4" />, href: "#" },
                    { icon: <FaFacebook className="w-4 h-4" />, href: "#" },
                    { icon: <FaLinkedin className="w-4 h-4" />, href: "#" },
                    { icon: <Globe className="w-4 h-4" />, href: "#" },
                  ].map((item, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="icon"
                      className="rounded-xl w-9 h-9 border-border/60 hover:border-orange-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                    >
                      {item.icon}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* فرم تیکت */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-full"
        >
          <Card className="border border-border/50 shadow-sm h-full rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-muted/10 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Send className="w-4 h-4 md:w-5 h-5 text-orange-500" />
                </div>
                <CardTitle className="text-sm md:text-base font-black">
                  ارسال تیکت پشتیبانی
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground/80">
                    نام و نام خانوادگی{" "}
                    <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    value={ticketData.name}
                    onChange={(e) =>
                      setTicketData({ ...ticketData, name: e.target.value })
                    }
                    placeholder="نام خود را وارد کنید"
                    className="mt-1.5 h-10 rounded-xl focus-visible:ring-orange-500/30 focus-visible:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground/80">
                    ایمیل (اختیاری)
                  </label>
                  <Input
                    type="email"
                    value={ticketData.email}
                    onChange={(e) =>
                      setTicketData({ ...ticketData, email: e.target.value })
                    }
                    placeholder="example@domain.com"
                    className="mt-1.5 h-10 rounded-xl focus-visible:ring-orange-500/30 focus-visible:border-orange-500 text-left dir-ltr"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground/80">
                    موضوع <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    value={ticketData.subject}
                    onChange={(e) =>
                      setTicketData({
                        ...ticketData,
                        subject: e.target.value,
                      })
                    }
                    placeholder="موضوع پیام"
                    className="mt-1.5 h-10 rounded-xl focus-visible:ring-orange-500/30 focus-visible:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground/80">
                    پیام <span className="text-orange-500">*</span>
                  </label>
                  <Textarea
                    value={ticketData.message}
                    onChange={(e) =>
                      setTicketData({
                        ...ticketData,
                        message: e.target.value,
                      })
                    }
                    placeholder="متن پیام خود را وارد کنید..."
                    rows={4}
                    className="mt-1.5 rounded-xl resize-none focus-visible:ring-orange-500/30 focus-visible:border-orange-500"
                  />
                </div>
                <Button
                  onClick={handleSubmitTicket}
                  disabled={sending}
                  className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 rounded-xl shadow-md shadow-orange-500/10 transition-all mt-2"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  ارسال پیام
                </Button>
                <p className="text-[10px] md:text-[11px] text-muted-foreground text-center font-medium leading-normal">
                  پس از ثبت تیکت، کارشناسان ما در اسرع وقت با شما تماس می‌گیرند
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Container>
  );
}