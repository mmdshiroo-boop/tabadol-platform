"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  PenTool,
  MessageCircle,
  Headset,
  PhoneCall,
  HelpCircle,
  CreditCard,
  Shield,
  AlertTriangle,
  BookOpen,
  Info,
} from "lucide-react";

const mainLinks = [
  { href: "/category", label: "دسته‌بندی‌ها", icon: LayoutGrid },
  { href: "/create-ad", label: "ثبت آگهی", icon: PenTool },
  { href: "/consulting", label: "مشاوره", icon: Headset },
  { href: "/chat", label: "گفتگو", icon: MessageCircle },
  { href: "/help", label: "راهنما", icon: HelpCircle },
  { href: "/about", label: "درباره ما", icon: Info },
  { href: "/contact", label: "تماس با ما", icon: PhoneCall },
  { href: "/pricing", label: "تعرفه‌ها", icon: CreditCard },
  { href: "/rules", label: "قوانین", icon: BookOpen },
  { href: "/privacy", label: "حریم خصوصی", icon: Shield },
  { href: "/support", label: "پشتیبانی", icon: Headset },
  { href: "/report", label: "گزارش تخلف", icon: AlertTriangle },
];

export function MainNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
      {mainLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap",
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}