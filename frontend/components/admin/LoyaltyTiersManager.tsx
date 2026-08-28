"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Search,
  Trophy,
  Medal,
  Crown,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LoyaltyTier {
  _id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  icon?: string;
  color?: string;
  isActive: boolean;
}

export function LoyaltyTiersManager() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    minPoints: 0,
    maxPoints: "",
    benefits: "",
    icon: "",
    color: "",
    isActive: true,
  });

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/loyalty/tiers");
      setTiers(res.data.data);
    } catch (error) {
      console.error("Error fetching tiers:", error);
      toast.error("خطا در دریافت سطوح");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const openCreateDialog = () => {
    setEditingTier(null);
    setFormData({
      name: "",
      minPoints: 0,
      maxPoints: "",
      benefits: "",
      icon: "",
      color: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      minPoints: tier.minPoints,
      maxPoints: tier.maxPoints?.toString() || "",
      benefits: tier.benefits.join(", "),
      icon: tier.icon || "",
      color: tier.color || "",
      isActive: tier.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.minPoints < 0) {
      toast.error("نام و حداقل امتیاز الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        minPoints: Number(formData.minPoints),
        maxPoints: formData.maxPoints ? Number(formData.maxPoints) : null,
        benefits: formData.benefits
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
      };
      if (editingTier) {
        await apiClient.put(`/admin/loyalty/tiers/${editingTier._id}`, payload);
        toast.success("سطح ویرایش شد");
      } else {
        await apiClient.post("/admin/loyalty/tiers", payload);
        toast.success("سطح ایجاد شد");
      }
      setDialogOpen(false);
      fetchTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error("خطا در ذخیره سطح");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید؟")) return;
    try {
      await apiClient.delete(`/admin/loyalty/tiers/${id}`);
      toast.success("سطح حذف شد");
      fetchTiers();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("خطا در حذف سطح");
    }
  };

  const filteredTiers = tiers.filter((tier) =>
    tier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTierIcon = (icon?: string) => {
    return icon || <Medal className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">سطوح باشگاه مشتریان</h2>
          <p className="text-sm text-muted-foreground mt-1">
            سطح‌های وفاداری کاربران و مزایای هر سطح را مدیریت کنید.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="w-4 h-4" />
          افزودن سطح جدید
        </Button>
      </div>

      {/* جستجو */}
      <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="جستجو در سطوح..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* جدول دسکتاپ */}
      <Card className="hidden md:block border-border/50 shadow-lg">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام سطح</TableHead>
                <TableHead>حداقل امتیاز</TableHead>
                <TableHead>حداکثر امتیاز</TableHead>
                <TableHead>مزایا</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    سطحی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredTiers.map((tier) => (
                  <TableRow key={tier._id} className="hover:bg-muted/30">
                    <TableCell className="font-bold flex items-center gap-2">
                      <span className="text-xl">{getTierIcon(tier.icon)}</span>
                      {tier.name}
                    </TableCell>
                    <TableCell>{tier.minPoints}</TableCell>
                    <TableCell>{tier.maxPoints ?? "∞"}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {tier.benefits.join("، ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          tier.isActive
                            ? "bg-emerald-100 text-emerald-600 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        )}
                      >
                        {tier.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(tier)}
                          className="border-border/50 hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(tier._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* کارت‌های موبایل */}
      <div className="md:hidden space-y-3">
        {filteredTiers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-border/50">
            سطحی یافت نشد
          </div>
        ) : (
          filteredTiers.map((tier) => (
            <Card key={tier._id} className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-2">
                    <span>{getTierIcon(tier.icon)}</span>
                    {tier.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>از {tier.minPoints} تا {tier.maxPoints ?? "∞"} امتیاز</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        tier.isActive
                          ? "bg-emerald-100 text-emerald-600 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      )}
                    >
                      {tier.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(tier)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(tier._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* دیالوگ فرم */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTier ? "ویرایش سطح" : "افزودن سطح جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>آیکون (emoji)</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>حداقل امتیاز</Label>
                <Input
                  type="number"
                  value={formData.minPoints}
                  onChange={(e) => setFormData({ ...formData, minPoints: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>حداکثر امتیاز (خالی = بی‌نهایت)</Label>
                <Input
                  type="number"
                  value={formData.maxPoints}
                  onChange={(e) => setFormData({ ...formData, maxPoints: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>مزایا (با کاما جدا کنید)</Label>
              <Input
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label>فعال باشد</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}