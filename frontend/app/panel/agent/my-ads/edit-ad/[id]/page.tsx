// app/panel/agent/my-ads/edit/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import apiClient from "@/services/api/client";
import { categoryApi, Category } from "@/services/api/category.api";
import { adsApi, CreateAdData } from "@/services/api/ads.api";
import { BasicInfoStep } from "@/components/create-ad/BasicInfoStep";
import { CategoryFieldsStep } from "@/components/create-ad/CategoryFieldsStep";
import { ImagesLocationStep } from "@/components/create-ad/ImagesLocationStep";
import { ContactStep } from "@/components/create-ad/ContactStep";

// ─── Helpers ──────────────────────────────────────────
const mapAdToFormData = (ad: any): Partial<CreateAdData> => {
  return {
    title: ad.title || "",
    description: ad.description || "",
    price: ad.price || 0,
    priceType: ad.priceType || "fixed",
    adType: ad.adType || "sale",
    categoryId: ad.categoryId || ad.category?._id || "",
    city: ad.city || "",
    district: ad.district || "",
    address: ad.address || "",
    province: ad.province || "",
    latitude: ad.latitude,
    longitude: ad.longitude,
    images: ad.images || [],
    contactPhone: ad.contactPhone || "",
    contactName: ad.contactName || "",
    isUrgent: ad.isUrgent || false,
    area: ad.area,
    rooms: ad.rooms,
    buildingAge: ad.buildingAge,
    yearBuilt: ad.yearBuilt,
    parkingCount: ad.parkingCount,
    amenities: ad.amenities || {},
    additionalProperties: ad.additionalProperties || [],
    // category-specific fields
    brand: ad.brand,
    color: ad.color,
    usageKilometers: ad.usageKilometers,
    bodyStatus: ad.bodyStatus,
    fuelType: ad.fuelType,
    gearbox: ad.gearbox,
    jobTitle: ad.jobTitle,
    cooperationType: ad.cooperationType,
    minExperience: ad.minExperience,
    hasInsurance: ad.hasInsurance,
    genderRequirement: ad.genderRequirement,
    baseSalary: ad.baseSalary,
    itemCondition: ad.itemCondition,
    hasWarranty: ad.hasWarranty,
    documentType: ad.documentType,
    usage: ad.usage,
  }as Partial<CreateAdData>
};

// ─── Main Component ──────────────────────────────────
export default function AgentEditAdPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateAdData>>({
    priceType: "fixed",
    adType: "sale",
    images: [],
    isUrgent: false,
    amenities: {},
    additionalProperties: [],
  });
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("");

  // ─── Fetch ad and categories ──────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adRes, categoriesRes] = await Promise.all([
          apiClient.get(`/ads/${params.id}`),
          categoryApi.getAll(),
        ]);

        const ad = adRes.data.data || adRes.data || {};
        const categoriesData = Array.isArray(categoriesRes) ? categoriesRes : [];

        setCategories(categoriesData);
        setFormData(mapAdToFormData(ad));

        // set slug for category fields step
        if (ad.categoryId || ad.category?._id) {
          const catId = ad.categoryId || ad.category?._id;
          const found = categoriesData.find((c) => c._id === catId);
          if (found) setSelectedCategorySlug(found.slug || "");
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("خطا در دریافت اطلاعات آگهی");
        router.push("/panel/agent/my-ads");
      }
    };
    fetchData();
  }, [params.id, router]);

  // ─── Update category slug when categoryId changes ──
  useEffect(() => {
    if (formData.categoryId && categories.length > 0) {
      const found = categories.find((c) => c._id === formData.categoryId);
      if (found) setSelectedCategorySlug(found.slug || "");
    }
  }, [formData.categoryId, categories]);

  const updateFormData = (data: Partial<CreateAdData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  // ─── Steps definition ─────────────────────────────
  const getStepTwoTitle = () => {
    const slug = selectedCategorySlug;
    if (["cars", "sedan", "motorcycle"].some((s) => slug.includes(s))) {
      return "مشخصات وسیله نقلیه";
    }
    if (["jobs", "programming", "marketing"].some((s) => slug.includes(s))) {
      return "شرایط شغلی";
    }
    if (
      ["electronics", "mobile-phones", "laptops", "home-appliances"].some((s) =>
        slug.includes(s)
      )
    ) {
      return "مشخصات کالا";
    }
    return "جزئیات تکمیلی";
  };

  const steps = [
    { id: 1, title: "اطلاعات پایه", description: "عنوان، دسته‌بندی و قیمت" },
    {
      id: 2,
      title: getStepTwoTitle(),
      description: "مشخصات اختصاصی این دسته",
    },
    {
      id: 3,
      title: "تصاویر و موقعیت",
      description: "آپلود تصاویر و انتخاب مکان",
    },
    { id: 4, title: "اطلاعات تماس", description: "شماره تماس و تأیید نهایی" },
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ─── Submit update ────────────────────────────────
  const handleSubmit = async () => {
    // Basic validation (same as create)
    if (!formData.title?.trim()) {
      toast.error("عنوان آگهی الزامی است");
      return;
    }
    if (!formData.categoryId) {
      toast.error("دسته‌بندی الزامی است");
      return;
    }
    if (
      formData.priceType !== "negotiable" &&
      (!formData.price || formData.price <= 0)
    ) {
      toast.error("قیمت معتبر نیست");
      return;
    }
    if (!formData.city) {
      toast.error("شهر الزامی است");
      return;
    }
    if (!formData.contactPhone) {
      toast.error("شماره تماس الزامی است");
      return;
    }
    if (!formData.description?.trim()) {
      toast.error("توضیحات الزامی است");
      return;
    }
    if (!formData.images || formData.images.length === 0) {
      toast.error("حداقل یک تصویر الزامی است");
      return;
    }

    setSaving(true);
    try {
      await adsApi.update(params.id as string, formData);
      toast.success("آگهی با موفقیت ویرایش شد");
      router.push("/panel/agent/my-ads");
    } catch (error: any) {
      toast.error(error.message || "خطا در ویرایش آگهی");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-8 px-3 sm:px-6" dir="rtl">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl"
      dir="rtl"
    >
      {/* ─── Header with Back button ─── */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/panel/agent/my-ads">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">ویرایش آگهی</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            اطلاعات آگهی خود را به‌روز کنید
          </p>
        </div>
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="mb-6 sm:mb-10 bg-muted/30 p-3 sm:p-4 rounded-2xl border border-border/40 select-none">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center min-w-[50px] sm:min-w-[70px]">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border text-xs sm:text-sm font-black transition-all duration-300 shadow-xs",
                      isCompleted &&
                        "bg-primary border-primary text-primary-foreground",
                      isActive &&
                        "border-primary text-primary ring-4 ring-primary/10 scale-105 bg-background",
                      !isCompleted &&
                        !isActive &&
                        "border-border text-muted-foreground/60 bg-background"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <span className="font-mono">{step.id}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] mt-2 hidden sm:block font-bold text-center",
                      isActive
                        ? "text-foreground font-black"
                        : "text-muted-foreground/70"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 sm:mx-4 h-[2px] rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full bg-primary transition-all duration-500 w-0",
                        isCompleted && "w-full"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Form Card ─── */}
      <Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden min-h-[420px]">
        <CardHeader className="border-b border-border/40 bg-muted/10 px-4 sm:px-6 py-4">
          <div className="space-y-1">
            <CardTitle className="text-lg sm:text-xl font-black text-foreground">
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {steps[currentStep - 1].description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-8">
          <div className="animate-in fade-in duration-300">
            {currentStep === 1 && (
              <BasicInfoStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <CategoryFieldsStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
                categorySlug={selectedCategorySlug}
              />
            )}
            {currentStep === 3 && (
              <ImagesLocationStep
                data={formData}
                updateData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 4 && (
              <ContactStep
                data={formData}
                updateData={updateFormData}
                onSubmit={handleSubmit}
                onBack={prevStep}
                loading={saving}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}