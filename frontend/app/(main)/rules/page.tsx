// rules/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "قوانین و مقررات | پلتفرم جامع آگهی",
  description: "قوانین استفاده از پلتفرم.",
};

const sections = [
  {
    title: "ثبت آگهی",
    items: [
      "درج اطلاعات صحیح و دقیق الزامی است.",
      "آگهی‌های تکراری یا مشابه حذف خواهند شد.",
      "درج هرگونه محتوای خلاف قوانین جمهوری اسلامی ایران ممنوع است.",
    ],
  },
  {
    title: "استفاده از پلتفرم",
    items: [
      "حفظ حریم خصوصی سایر کاربران الزامی است.",
      "هرگونه سوءاستفاده از اطلاعات تماس دیگران پیگرد قانونی دارد.",
      "کاربران موظف به رعایت اخلاق حرفه‌ای در ارتباط با یکدیگر هستند.",
    ],
  },
  {
    title: "پرداخت و اشتراک",
    items: [
      "مبالغ پرداختی بابت اشتراک‌های VIP قابل بازگشت نیستند.",
      "مسئولیت هرگونه تراکنش مالی بین خریدار و فروشنده بر عهده طرفین است.",
    ],
  },
];

export default function RulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold">قوانین و مقررات</h1>
        <p className="text-muted-foreground">
          با ثبت‌نام و استفاده از پلتفرم، قوانین زیر را پذیرفته‌اید.
        </p>
      </div>
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-card border border-border/40"
          >
            <h2 className="font-extrabold text-lg mb-3">{section.title}</h2>
            <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground leading-relaxed">
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}