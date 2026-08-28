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
import { Pencil, Trash2, Plus, Loader2, Gift, Coins, Search } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Reward {
  _id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  isActive: boolean;
  type: "discount" | "gift" | "service" | "other";
  discountPercent?: number;
  discountAmount?: number;
}

export function RewardsManager() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pointsCost: 0,
    stock: 0,
    isActive: true,
    type: "other" as Reward["type"],
    discountPercent: "",
    discountAmount: "",
  });

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/admin/rewards");
      setRewards(res.data.data);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast.error("خطا در دریافت جوایز");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const openCreateDialog = () => {
    setEditingReward(null);
    setFormData({
      title: "",
      description: "",
      pointsCost: 0,
      stock: 0,
      isActive: true,
      type: "other",
      discountPercent: "",
      discountAmount: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      title: reward.title,
      description: reward.description,
      pointsCost: reward.pointsCost,
      stock: reward.stock,
      isActive: reward.isActive,
      type: reward.type,
      discountPercent: reward.discountPercent?.toString() || "",
      discountAmount: reward.discountAmount?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || formData.pointsCost <= 0) {
      toast.error("عنوان و هزینه امتیاز الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        pointsCost: Number(formData.pointsCost),
        stock: Number(formData.stock),
        discountPercent: formData.discountPercent
          ? Number(formData.discountPercent)
          : undefined,
        discountAmount: formData.discountAmount
          ? Number(formData.discountAmount)
          : undefined,
      };
      if (editingReward) {
        await apiClient.put(`/admin/rewards/${editingReward._id}`, payload);
        toast.success("جایزه ویرایش شد");
      } else {
        await apiClient.post("/admin/rewards", payload);
        toast.success("جایزه ایجاد شد");
      }
      setDialogOpen(false);
      fetchRewards();
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error("خطا در ذخیره جایزه");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید؟")) return;
    try {
      await apiClient.delete(`/admin/rewards/${id}`);
      toast.success("جایزه حذف شد");
      fetchRewards();
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast.error("خطا در حذف جایزه");
    }
  };

  const filteredRewards = rewards.filter((reward) =>
    reward.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type: Reward["type"]) => {
    switch (type) {
      case "discount": return "تخفیف";
      case "gift": return "هدیه";
      case "service": return "خدمات";
      default: return "سایر";
    }
  };

  const getTypeColor = (type: Reward["type"]) => {
    switch (type) {
      case "discount": return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "gift": return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      case "service": return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    }
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
          <h2 className="text-2xl font-black text-foreground">جوایز باشگاه</h2>
          <p className="text-sm text-muted-foreground mt-1">
            جوایزی که کاربران می‌توانند با امتیاز خود دریافت کنند.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="w-4 h-4" />
          افزودن جایزه جدید
        </Button>
      </div>

      {/* جستجو */}
      <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="جستجو در جوایز..."
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
                <TableHead>عنوان</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>هزینه امتیاز</TableHead>
                <TableHead>موجودی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    جایزه‌ای یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredRewards.map((reward) => (
                  <TableRow key={reward._id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">{reward.title}</TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded-md text-xs font-bold", getTypeColor(reward.type))}>
                        {getTypeLabel(reward.type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-bold">
                        <Coins className="w-4 h-4 text-amber-500" />
                        {reward.pointsCost}
                      </span>
                    </TableCell>
                    <TableCell>{reward.stock}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          reward.isActive
                            ? "bg-emerald-100 text-emerald-600 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-300"
                        )}
                      >
                        {reward.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(reward)}
                          className="border-border/50 hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(reward._id)}
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
        {filteredRewards.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-border/50">
            جایزه‌ای یافت نشد
          </div>
        ) : (
          filteredRewards.map((reward) => (
            <Card key={reward._id} className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold">{reward.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("px-2 py-0.5 rounded-md", getTypeColor(reward.type))}>
                      {getTypeLabel(reward.type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" />
                      {reward.pointsCost}
                    </span>
                    <span>موجودی: {reward.stock}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(reward)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(reward._id)}>
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
            <DialogTitle>{editingReward ? "ویرایش جایزه" : "افزودن جایزه جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>نوع</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Reward["type"] })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3"
                >
                  <option value="other">سایر</option>
                  <option value="discount">تخفیف</option>
                  <option value="gift">هدیه</option>
                  <option value="service">خدمات</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>هزینه امتیاز</Label>
                <Input
                  type="number"
                  value={formData.pointsCost}
                  onChange={(e) => setFormData({ ...formData, pointsCost: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>موجودی</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>درصد تخفیف</Label>
                <Input
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>مبلغ تخفیف (تومان)</Label>
                <Input
                  type="number"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                />
              </div>
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