"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import {
  Crown,
  ChevronLeft,
  Sparkles as SparklesIcon,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  Eye,
  Headset,
  BadgeCheck,
  Rocket,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";

interface VipPromoCardProps {
  href?: string;
  source?: string;
  compact?: boolean;
  className?: string;
  title?: string;
  description?: string;
  ctaText?: string;
}

const FEATURES_FULL = [
  { icon: Eye, title: "نمایش ویژه آگهی", description: "آگهی‌هات در صدر نتایج قرار می‌گیرن" },
  { icon: BarChart3, title: "تحلیل بازار مسکن", description: "قیمت‌های روز و روند بازار" },
  { icon: Zap, title: "ثبت آگهی فوری", description: "آگهی فوری با اولویت بالاتر" },
  { icon: TrendingUp, title: "آمار بازدید", description: "ببین چند نفر آگهی‌هات رو دیدن" },
  { icon: Headset, title: "پشتیبانی اختصاصی", description: "تیکت‌هات زودتر بررسی می‌شن" },
  { icon: ShieldCheck, title: "نشان تأیید VIP", description: "پروفایلت با نشان ویژه متمایز می‌شه" },
];

const FEATURES_COMPACT = [
  { icon: Eye, title: "نمایش ویژه" },
  { icon: BarChart3, title: "تحلیل بازار" },
  { icon: ShieldCheck, title: "پشتیبانی VIP" },
];

const STATS = [
  { value: "۳x", label: "بازدید بیشتر" },
  { value: "۲x", label: "فروش سریع‌تر" },
  { value: "24/7", label: "پشتیبانی" },
];

/* ─── صحنه‌ی سه‌بعدی مدرن (فقط ذرات درخشان) ─── */
function VipScene({
  mousePosition,
}: {
  mousePosition: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const mx = mousePosition.current.x;
    const my = mousePosition.current.y;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      mx * 0.2,
      0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -my * 0.15,
      0.05
    );
  });

  return (
    <>
      {/* نورپردازی گرم و لطیف */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} color="#ffedd5" />
      <pointLight position={[-2, -1, -2]} intensity={0.8} color="#f97316" />
      <pointLight position={[1, 2, -1]} intensity={0.6} color="#fbbf24" />

      <group ref={groupRef}>
        {/* ذرات درخشان */}
        <Sparkles
          count={50}
          scale={[6, 4, 2]}
          size={4}
          speed={0.4}
          color="#fbbf24"
          opacity={0.8}
        />
        <Sparkles
          count={25}
          scale={[5, 3, 2]}
          size={2}
          speed={0.6}
          color="#f97316"
          opacity={0.6}
        />
      </group>
    </>
  );
}

export function VipPromoCard({
  href = "/pricing",
  source = "vip-promo",
  compact = false,
  className,
  title,
  description,
  ctaText,
}: VipPromoCardProps) {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const mousePosition = useRef({ x: 0, y: 0 });

  if (
    user &&
    ["vip", "agent", "expert", "admin", "super_admin"].includes(user.role)
  ) {
    return null;
  }

  const finalHref = `${href}${href.includes("?") ? "&" : "?"}source=${encodeURIComponent(source)}`;
  const defaultTitle = compact ? "ارتقا به VIP" : "بیشتر دیده شو، سریع‌تر بفروش";
  const defaultDescription = compact
    ? "دسترسی به امکانات ویژه و بازدید بیشتر"
    : "با اشتراک VIP تبادل، آگهی‌هات در صدر نتایج قرار می‌گیرن و به ابزارهای حرفه‌ای دسترسی پیدا می‌کنی.";

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosition.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      <Link
        href={finalHref}
        className="block group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          mousePosition.current = { x: 0, y: 0 };
        }}
      >
        <motion.div
          onMouseMove={handleMouseMove}
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "relative overflow-hidden rounded-3xl border",
            "border-orange-300/40 dark:border-white/10",
            // حالت روشن: سفید به نارنجی ملایم
            "bg-gradient-to-br from-white via-orange-50 to-orange-100",
            // حالت تاریک: شیشه‌ای مشکی
            "dark:bg-black/50 dark:backdrop-blur-xl",
            "dark:bg-gradient-to-br dark:from-black/60 dark:via-orange-950/30 dark:to-black/60",
            "shadow-[0_16px_60px_-15px_rgba(249,115,22,0.25)]",
            "dark:shadow-[0_16px_60px_-15px_rgba(0,0,0,0.6)]",
            compact ? "p-4" : "p-5 md:p-6 lg:p-7",
          )}
        >
          {/* صحنه‌ی سه‌بعدی (ذرات) */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Suspense fallback={null}>
                <Canvas
                  camera={{ position: [0, 0, 4], fov: 45 }}
                  dpr={[1, 1.5]}
                  gl={{ alpha: true, antialias: true }}
                  style={{ background: "transparent" }}
                >
                  <VipScene mousePosition={mousePosition} />
                </Canvas>
              </Suspense>
            </div>
          )}

          {/* هاله‌های نورانی */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[180px] bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none z-0" />
          <div className="absolute -bottom-24 -right-12 w-[220px] h-[220px] bg-amber-300/20 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0" />

          {/* خط بالای کارت */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent z-0" />

          {/* محتوای اصلی */}
          <div className="relative z-10">
            {/* بالا */}
            <div className="flex items-start justify-between gap-4 lg:gap-8">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[10px] font-extrabold shadow-sm">
                  <SparklesIcon className="w-3 h-3" />
                  محبوب‌ترین پلن کاربران
                </div>
                <h3 className={cn("mt-2.5 font-black text-foreground leading-snug", compact ? "text-sm" : "text-base md:text-lg lg:text-xl")}>
                  {title || defaultTitle}
                </h3>
                <p className={cn("mt-1.5 text-muted-foreground leading-relaxed", compact ? "text-[11px]" : "text-xs md:text-[13px] lg:text-sm max-w-[500px]")}>
                  {description || defaultDescription}
                </p>

                {!compact && (
                  <div className="hidden sm:flex items-center gap-2.5 mt-5">
                    {STATS.map((stat, i) => (
                      <div key={i} className="flex-1 sm:flex-none sm:min-w-[110px] lg:min-w-[130px] text-center py-2.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-orange-200/50 dark:border-white/10">
                        <p className="text-base lg:text-lg font-black text-orange-600 dark:text-orange-400 leading-none">{stat.value}</p>
                        <p className="text-[10px] lg:text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 relative">
                <div className={cn("relative rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-xl shadow-orange-500/30 flex items-center justify-center", compact ? "w-11 h-11" : "w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16")}>
                  <Crown className={compact ? "w-5 h-5" : "w-6 h-6 lg:w-7 lg:h-7"} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* ویژگی‌ها */}
            <div className={cn("mt-5", compact ? "" : "lg:mt-6")}>
              {!compact && (
                <div className="flex items-center gap-2 mb-3">
                  <BadgeCheck className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span className="text-xs lg:text-sm font-extrabold text-foreground/80">امکانات اشتراک VIP</span>
                </div>
              )}

              {compact ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {FEATURES_COMPACT.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-orange-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5">
                        <Icon className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                        <span className="text-[10px] font-bold text-foreground/85">{f.title}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-3">
                  {FEATURES_FULL.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div key={i} className="rounded-2xl border border-orange-200/40 dark:border-white/10 bg-white/50 dark:bg-white/5 p-3 md:p-3.5 backdrop-blur-sm">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/30 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 md:w-4.5 md:h-4.5 text-orange-500 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] md:text-xs font-extrabold text-foreground/90 leading-snug">{f.title}</p>
                            <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 leading-snug">{f.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* فوتر CTA */}
            <div className="flex items-center justify-between gap-3 mt-5 lg:mt-6">
              <div className="flex items-center gap-2">
                {!compact && (
                  <div className="hidden sm:flex -space-x-1">
                    {[0, 1, 2].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                )}
                <p className="text-[10px] md:text-[11px] text-muted-foreground/60">
                  {compact ? "برای کاربران فعال" : "مورد اعتماد کاربران حرفه‌ای تبادل"}
                </p>
              </div>
              <div className={cn("inline-flex items-center gap-1.5 shrink-0 rounded-full bg-gradient-to-l from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30", compact ? "px-3.5 py-2 text-[11px]" : "px-5 py-2.5 md:px-6 md:py-3 text-xs md:text-sm")}>
                <Rocket className="w-4 h-4" />
                <span>{ctaText || (compact ? "ارتقا" : "مشاهده پلن‌های VIP")}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}