"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  Phone,
  Tag,
  FileText,
  DollarSign,
  Home,
  Info,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { adsApi, Ad } from "@/services/api/ads.api";
import { categoryApi, Category } from "@/services/api/category.api";
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5001";

const getImageUrl = (img: string): string => {
  if (!img) return "/placeholder.jpg";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads")) return `${API_BASE}${img}`;
  return `${API_BASE}/uploads/${img}`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function EditAdPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<Ad>>({
    title: "",
    description: "",
    price: 0,
    priceType: "negotiable",
    categoryId: "",
    city: "",
    district: "",
    address: "",
    contactPhone: "",
    contactName: "",
    isUrgent: false,
    adType: "sale",
    images: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adData, categoriesData] = await Promise.all([
          adsApi.getById(params.id as string),
          categoryApi.getAll(),
        ]);
        const ad = adData.data || adData;
        setFormData({
          title: ad.title || "",
          description: ad.description || "",
          price: ad.price || 0,
          priceType: ad.priceType || "negotiable",
          categoryId: ad.categoryId || ad.category?._id || "",
          city: ad.city || "",
          district: ad.district || "",
          address: ad.address || "",
          contactPhone: ad.contactPhone || "",
          contactName: ad.contactName || "",
          isUrgent: ad.isUrgent || false,
          adType: ad.adType || "sale",
          images: ad.images || [],
        });
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("خطا در دریافت اطلاعات آگهی");
        router.push("/panel/user/my-ads");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // اعتبارسنجی ساده
    if (!formData.title?.trim()) {
      toast.error("عنوان آگهی الزامی است");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error("لطفاً قیمت معتبر وارد کنید");
      return;
    }
    if (!formData.city?.trim()) {
      toast.error("شهر الزامی است");
      return;
    }
    if (!formData.images || formData.images.length === 0) {
      toast.error("حداقل یک تصویر برای آگهی الزامی است");
      return;
    }

    setSaving(true);
    try {
      await adsApi.update(params.id as string, formData);
      toast.success("آگهی با موفقیت ویرایش شد");
      router.push("/panel/user/my-ads");
    } catch (error: any) {
      console.error("Error updating ad:", error);
      toast.error(error.response?.data?.message || "خطا در ویرایش آگهی");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Ad, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setUploading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("لطفاً ابتدا وارد حساب کاربری خود شوید");
      setUploading(false);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`فایل ${file.name} بزرگتر از ۵ مگابایت است`);
        continue;
      }

      const formDataFile = new FormData();
      formDataFile.append("image", file);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/ads/upload-image`,
          formDataFile,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.data.success) {
          const imageUrl = response.data.data.url;
          const newImages = [...(formData.images || []), imageUrl];
          handleChange("images", newImages);
          toast.success(`تصویر ${file.name} با موفقیت آپلود شد`);
        } else {
          toast.error(response.data.message || "خطا در آپلود تصویر");
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        const errorMessage =
          error.response?.data?.message || "خطا در ارتباط با سرور آپلود";
        toast.error(errorMessage);
      }
    }

    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    handleChange("images", newImages);
  };

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl mx-auto pb-8"
      dir="rtl"
    >
      {/* هدر */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link href="/panel/user/my-ads">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-border/60 hover:bg-primary/5 hover:border-primary/30 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            ویرایش آگهی
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            اطلاعات آگهی خود را به‌روزرسانی کنید
          </p>
        </div>
        {formData.status && (
          <Badge
            className={`mr-auto ${
              formData.status === "active"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : formData.status === "pending"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {formData.status === "active"
              ? "فعال"
              : formData.status === "pending"
                ? "در انتظار تأیید"
                : formData.status}
          </Badge>
        )}
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* اطلاعات پایه */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/20 bg-muted/10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                اطلاعات پایه
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* عنوان */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">
                  عنوان آگهی <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="مثال: آپارتمان ۱۲۰ متری در تهران"
                  className="h-10 rounded-xl focus-visible:ring-primary"
                  required
                />
              </div>

              {/* دسته‌بندی */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">
                  دسته‌بندی <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.categoryId || formData.category?._id || ""}
                  onValueChange={(v) => handleChange("categoryId", v)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="انتخاب دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* قیمت + نوع قیمت */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">
                    قیمت (تومان) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) =>
                      handleChange("price", parseInt(e.target.value) || 0)
                    }
                    placeholder="مثال: ۵۰۰۰۰۰۰۰۰"
                    className="h-10 rounded-xl focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">نوع قیمت</Label>
                  <Select
                    value={formData.priceType || "negotiable"}
                    onValueChange={(v) => handleChange("priceType", v)}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">قیمت ثابت</SelectItem>
                      <SelectItem value="negotiable">توافقی</SelectItem>
                      <SelectItem value="auction">مزایده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* نوع آگهی */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">نوع آگهی</Label>
                <Select
                  value={formData.adType || "sale"}
                  onValueChange={(v) => handleChange("adType", v)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">💰 فروش</SelectItem>
                    <SelectItem value="rent">🏠 اجاره</SelectItem>
                    <SelectItem value="daily_rent">📅 اجاره روزانه</SelectItem>
                    <SelectItem value="exchange">🔄 معاوضه</SelectItem>
                    <SelectItem value="mortgage">🏦 رهن</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* توضیحات */}
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">
                  توضیحات <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="توضیحات کامل آگهی خود را بنویسید..."
                  rows={6}
                  className="rounded-xl focus-visible:ring-primary resize-none"
                  required
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* تصاویر */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/20 bg-muted/10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                تصاویر آگهی
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label
                  className={
                    "flex flex-col items-center justify-center aspect-square " +
                    "border-2 border-dashed rounded-2xl cursor-pointer transition-all group " +
                    (uploading
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/30")
                  }
                >
                  <div className="flex flex-col items-center gap-2 p-3 text-center">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="text-xs font-bold text-foreground/70">
                      {uploading ? "آپلود..." : "افزودن عکس"}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                      حداکثر ۵ مگابایت
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>

                {formData.images?.map((img: string, idx: number) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl border border-border overflow-hidden bg-muted shadow-sm group"
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`تصویر ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.jpg";
                      }}
                    />
                    {idx === 0 && (
                      <div className="absolute bottom-1.5 right-1.5 bg-background/90 backdrop-blur-sm text-[10px] font-black text-primary px-2 py-0.5 rounded-lg border border-primary/20 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        تصویر اصلی
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="w-8 h-8 rounded-xl"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {(!formData.images || formData.images.length === 0) && (
                <p className="text-xs font-bold text-destructive mt-2">
                  حداقل یک تصویر الزامی است
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* موقعیت مکانی */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/20 bg-muted/10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                موقعیت مکانی
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">
                    شهر <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="مثال: تهران"
                    className="h-10 rounded-xl focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">محله</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) => handleChange("district", e.target.value)}
                    placeholder="مثال: پونک"
                    className="h-10 rounded-xl focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">آدرس دقیق</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="خیابان، کوچه، پلاک..."
                  className="h-10 rounded-xl focus-visible:ring-primary"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* اطلاعات تماس */}
        <motion.div variants={itemVariants}>
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/20 bg-muted/10">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                اطلاعات تماس
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">
                    شماره تماس <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) =>
                      handleChange("contactPhone", e.target.value)
                    }
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="h-10 rounded-xl focus-visible:ring-primary"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">نام تماس‌گیرنده</Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) =>
                      handleChange("contactName", e.target.value)
                    }
                    placeholder="نام شما برای نمایش در آگهی"
                    className="h-10 rounded-xl focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* دکمه‌ها */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-end gap-3 pt-2"
        >
          <Link
            href="/panel/user/my-ads"
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 rounded-xl h-10 border-border/60 hover:bg-muted"
            >
              انصراف
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto gap-2 rounded-xl h-10 px-6 bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/20 order-1 sm:order-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                ذخیره تغییرات
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}