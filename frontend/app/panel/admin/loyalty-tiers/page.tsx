"use client";

import { useEffect, useState } from "react";
import { getAllTiers, createTier, updateTier, deleteTier } from "@/services/api/loyalty.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoyaltyTier } from "@/types/loyalty";

export default function AdminLoyaltyTiersPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    minPoints: 0,
    maxPoints: null as number | null,
    benefits: "",
    icon: "",
    color: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await getAllTiers();
      setTiers(res.data);
    } catch (error) {
      console.error("Error fetching tiers:", error);
    }
  };

  const openCreate = () => {
    setFormData({ name: "", minPoints: 0, maxPoints: null, benefits: "", icon: "", color: "", isActive: true });
    setEditingTier(null);
    setIsDialogOpen(true);
  };

  const openEdit = (tier: LoyaltyTier) => {
    setFormData({
      name: tier.name,
      minPoints: tier.minPoints,
      maxPoints: tier.maxPoints,
      benefits: tier.benefits.join(", "),
      icon: tier.icon || "",
      color: tier.color || "",
      isActive: tier.isActive,
    });
    setEditingTier(tier);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        maxPoints: formData.maxPoints ? Number(formData.maxPoints) : null,
        benefits: formData.benefits.split(",").map((b) => b.trim()).filter(Boolean),
      };

      if (editingTier) {
        await updateTier(editingTier._id, payload);
      } else {
        await createTier(payload);
      }
      setIsDialogOpen(false);
      fetchTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("آیا مطمئن هستید؟")) {
      try {
        await deleteTier(id);
        fetchTiers();
      } catch (error) {
        console.error("Error deleting tier:", error);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مدیریت سطوح وفاداری</h1>
        <Button onClick={openCreate}>ایجاد سطح جدید</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نام</TableHead>
            <TableHead>حداقل امتیاز</TableHead>
            <TableHead>حداکثر امتیاز</TableHead>
            <TableHead>مزایا</TableHead>
            <TableHead>فعال</TableHead>
            <TableHead>عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => (
            <TableRow key={tier._id}>
              <TableCell>{tier.icon} {tier.name}</TableCell>
              <TableCell>{tier.minPoints}</TableCell>
              <TableCell>{tier.maxPoints ?? "∞"}</TableCell>
              <TableCell>{tier.benefits.join("، ")}</TableCell>
              <TableCell>{tier.isActive ? "✅" : "❌"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openEdit(tier)}>ویرایش</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(tier._id)}>حذف</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "ویرایش سطح" : "ایجاد سطح"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>نام</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>حداقل امتیاز</Label>
              <Input type="number" value={formData.minPoints} onChange={(e) => setFormData({ ...formData, minPoints: Number(e.target.value) })} />
            </div>
            <div>
              <Label>حداکثر امتیاز (خالی = بی‌نهایت)</Label>
              <Input type="number" value={formData.maxPoints ?? ""} onChange={(e) => setFormData({ ...formData, maxPoints: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>مزایا (با کاما جدا کنید)</Label>
              <Input value={formData.benefits} onChange={(e) => setFormData({ ...formData, benefits: e.target.value })} />
            </div>
            <div>
              <Label>آیکون (emoji)</Label>
              <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label>فعال</Label>
            </div>
            <Button onClick={handleSubmit}>{editingTier ? "ذخیره" : "ایجاد"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}