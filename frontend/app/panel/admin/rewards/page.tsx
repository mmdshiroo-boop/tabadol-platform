"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";

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

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
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
        discountPercent: formData.discountPercent ? Number(formData.discountPercent) : undefined,
        discountAmount: formData.discountAmount ? Number(formData.discountAmount) : undefined,
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">مدیریت جوایز باشگاه</h1>
          <p className="text-sm text-muted-foreground mt-1">
            جوایزی که کاربران می‌توانند با امتیاز خود دریافت کنند.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          افزودن جایزه جدید
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>لیست جوایز</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              هنوز جایزه‌ای ثبت نشده است
            </p>
          ) : (
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
                {rewards.map((reward) => (
                  <TableRow key={reward._id}>
                    <TableCell className="font-medium">{reward.title}</TableCell>
                    <TableCell>
                      {reward.type === "discount"
                        ? "تخفیف"
                        : reward.type === "gift"
                          ? "هدیه"
                          : reward.type === "service"
                            ? "خدمات"
                            : "سایر"}
                    </TableCell>
                    <TableCell>{reward.pointsCost}</TableCell>
                    <TableCell>{reward.stock}</TableCell>
                    <TableCell>
                      <Badge variant={reward.isActive ? "default" : "secondary"}>
                        {reward.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(reward)}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : "ذخیره"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}