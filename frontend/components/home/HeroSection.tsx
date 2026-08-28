"use client";

import { useRef, Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import {
  Search,
  PlusCircle,
  MapPin,
  Building2,
  ShieldCheck,
  Headset,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { adsApi } from "@/services/api/ads.api";

/* ═══════════════════════════════════════════
   Three.js: ذرات و اشکال شناور
   ═══════════════════════════════════════════ */

function FloatingParticles({
  count = 30,
  mousePosition,
}: {
  count?: number;
  mousePosition: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        basePosition: [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 3,
        ] as [number, number, number],
        speed: 0.1 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.03,
        currentPos: new THREE.Vector3(),
      });
    }
    return temp;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const mx = mousePosition.current.x;
    const my = mousePosition.current.y;

    particles.forEach((p, i) => {
      const bx = p.basePosition[0] + Math.sin(t * p.speed + p.offset) * 0.3;
      const by = p.basePosition[1] + Math.cos(t * p.speed * 0.8 + p.offset) * 0.25;
      const bz = p.basePosition[2] + Math.sin(t * p.speed * 0.6 + p.offset) * 0.15;

      const dx = mx * 3 - bx;
      const dy = -my * 2 - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.max(0, 1 - dist / 4) * 0.8;

      p.currentPos.lerp(
        new THREE.Vector3(bx + dx * force * 0.1, by + dy * force * 0.1, bz),
        0.04
      );

      dummy.position.copy(p.currentPos);
      dummy.scale.setScalar(p.scale * (1 + force * 0.5));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
    </instancedMesh>
  );
}

function FloatingShapes() {
  return (
    <>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}>
        <mesh position={[-2.5, 1.2, -1]} scale={0.18}>
          <boxGeometry args={[1, 0.8, 0.8]} />
          <meshStandardMaterial color="#f97316" transparent opacity={0.4} roughness={0.4} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.8}>
        <mesh position={[2.8, -1.5, -1.5]} scale={0.15}>
          <coneGeometry args={[0.6, 0.8, 4]} />
          <meshStandardMaterial color="#fb923c" transparent opacity={0.3} roughness={0.5} />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh position={[1.5, 1.8, -2]} scale={0.1}>
          <torusGeometry args={[0.8, 0.15, 8, 24]} />
          <meshStandardMaterial color="#fbbf24" transparent opacity={0.25} roughness={0.3} />
        </mesh>
      </Float>
    </>
  );
}

function Scene({
  mousePosition,
  isMobile,
}: {
  mousePosition: React.MutableRefObject<{ x: number; y: number }>;
  isMobile: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <FloatingShapes />
      <FloatingParticles count={isMobile ? 15 : 30} mousePosition={mousePosition} />
    </>
  );
}

/* ═══════════════════════════════════════════
   کامپوننت اصلی HeroSection
   ═══════════════════════════════════════════ */

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // ─── آمار زنده ───
  const [activeAds, setActiveAds] = useState<number | null>(null);
  const [provincesCount, setProvincesCount] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number>(98); // درصد رضایت

  // تابع دریافت تعداد استان‌ها از فایل محلی iran.json
  const getProvincesCountFromFile = async (): Promise<number> => {
    try {
      const response = await fetch("/data/iran.json");
      if (!response.ok) throw new Error("خطا در بارگذاری فایل ایران");
      const data = await response.json();
      if (Array.isArray(data)) {
        // سعی می‌کنیم نام استان را از فیلدهای ممکن بگیریم
        const provinces = new Set(
          data
            .map((item: any) => item.province || item.province_name || item.state || item.name)
            .filter(Boolean)
        );
        return provinces.size || 31; // اگر صفر بود، پیش‌فرض ۳۱
      }
      return 31;
    } catch (error) {
      console.warn("خطا در خواندن فایل ایران:", error);
      return 31;
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // ۱. تعداد آگهی‌های فعال از API
        const adsResponse = await adsApi.getAll({ status: "active", limit: 1 });
        const totalAds = adsResponse?.pagination?.total || (adsResponse as any)?.total || 0;
        setActiveAds(totalAds);

        // ۲. تعداد استان‌ها از فایل محلی
        const provincesCountFromFile = await getProvincesCountFromFile();
        setProvincesCount(provincesCountFromFile);
      } catch (error) {
        console.error("Error fetching hero stats:", error);
        // در صورت خطا مقادیر پیش‌فرض می‌مانند
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current || prefersReducedMotion || isMobile) return;
    const rect = sectionRef.current.getBoundingClientRect();
    mousePosition.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  };

  // ساخت آرایه آمار با مقادیر واقعی
  const statsData = [
    {
      value: activeAds !== null ? activeAds.toLocaleString("fa-IR") : "---",
      label: "آگهی فعال",
      icon: Building2,
    },
    {
      value: provincesCount !== null ? `${provincesCount.toLocaleString("fa-IR")} استان` : "---",
      label: "پوشش سراسری",
      icon: MapPin,
    },
    {
      value: "۲۴/۷",
      label: "پشتیبانی",
      icon: Headset,
    },
    {
      value: `${satisfaction}٪`,
      label: "رضایت کاربران",
      icon: TrendingUp,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 110, damping: 14 },
    },
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onTouchMove={(e) => {
        if (!sectionRef.current || prefersReducedMotion || !e.touches[0]) return;
        const rect = sectionRef.current.getBoundingClientRect();
        mousePosition.current = {
          x: ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1,
          y: ((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1,
        };
      }}
      onMouseLeave={() => { mousePosition.current = { x: 0, y: 0 }; }}
      className="relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl min-h-[480px] md:min-h-[560px] lg:min-h-[640px] flex items-center justify-center"
      dir="rtl"
    >
      {/* پس‌زمینه تصویری نسخه روشن */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:opacity-0 transition-opacity duration-500"
        style={{ backgroundImage: "url('/images/banner-hero.PNG')" }}
      />
      {/* پس‌زمینه تصویری نسخه تاریک */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-0 dark:opacity-100 transition-opacity duration-500"
        style={{ backgroundImage: "url('/images/banner-hero-dark.PNG')" }}
      />

      {/* لایه‌های گرادیانی */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30 dark:from-black/85 dark:via-black/55 dark:to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-l from-orange-500/25 to-transparent dark:from-orange-700/20" />

      {/* افکت Three.js */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <Suspense fallback={null}>
            <Canvas
              camera={{ position: [0, 0, 5], fov: 45 }}
              dpr={isMobile ? [1, 1] : [1, 1.5]}
              gl={{ antialias: !isMobile, alpha: true }}
              style={{ background: "transparent" }}
            >
              <Scene mousePosition={mousePosition} isMobile={isMobile} />
            </Canvas>
          </Suspense>
        </div>
      )}

      {/* محتوا */}
      <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto text-center text-white"
        >
          {/* نشان کوچک */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold mb-6"
          >
            <ShieldCheck className="w-4 h-4" />
            امنیت در معامله، آرامش در خرید
          </motion.div>

          {/* عنوان اصلی */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.4] sm:leading-[1.3] drop-shadow-lg"
          >
            <span className="block">تبادل؛</span>
            <span className="block text-orange-200 mt-2">
              جایی که هر معامله‌ای مطمئن انجام می‌شود
            </span>
          </motion.h1>

          {/* توضیح کوتاه */}
          <motion.p
            variants={itemVariants}
            className="mt-5 text-sm sm:text-base max-w-2xl mx-auto leading-[1.9] text-gray-100/90"
          >
            خرید، فروش، رهن و اجاره ملک، خودرو، کالای دیجیتال و هزاران مورد دیگر؛
            همه در یک پلتفرم امن با آگهی‌های تأییدشده توسط کارشناسان. همین حالا
            شروع کنید.
          </motion.p>

          {/* دکمه‌های اصلی */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-row flex-wrap gap-3 sm:gap-4 justify-center"
          >
            <Link href="/search" className="flex-1 sm:flex-none sm:w-auto min-w-[140px]">
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Button
                  size="lg"
                  className="w-full rounded-xl sm:rounded-2xl px-4 sm:px-12 py-3 sm:py-5 h-12 sm:h-14 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all font-extrabold gap-2 text-sm sm:text-base"
                >
                  <Search className="w-5 h-5" />
                  جستجو در آگهی‌ها
                </Button>
              </motion.div>
            </Link>

            <Link href="/create-ad" className="flex-1 sm:flex-none sm:w-auto min-w-[140px]">
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-xl sm:rounded-2xl px-4 sm:px-12 py-3 sm:py-5 h-12 sm:h-14 bg-white/10 backdrop-blur-sm hover:bg-white/80 border-2 border-white/40 text-white font-extrabold gap-2 text-sm sm:text-base group transition-all"
                >
                  <PlusCircle className="w-5 h-5 text-orange-200 group-hover:text-white transition-colors" />
                  ثبت آگهی رایگان
                  <ArrowLeft className="w-4 h-4 mr-0.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* آمار اعتماد */}
          <motion.div
            variants={itemVariants}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {statsData.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-orange-500/20 hover:border-orange-300/40 group"
                >
                  <Icon className="w-6 h-6 text-orange-300 group-hover:text-orange-200 transition-colors" />
                  <span className="text-xl font-black text-white">
                    {stat.value}
                  </span>
                  <span className="text-xs text-gray-200">{stat.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}