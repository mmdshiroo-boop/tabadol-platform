"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Pencil,
  RefreshCw,
  Download,
  Upload,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { agentClubApi, ClubMember } from "@/services/api/agentClub.api";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

export default function ClubMembersPage() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [currentMember, setCurrentMember] = useState<ClubMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "bulk";
    label: string;
    ids?: string[];
  } | null>(null);

  const [newMember, setNewMember] = useState({
    phone: "",
    name: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    notes: "",
  });
  const [memberDetail, setMemberDetail] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await agentClubApi.getMembers({
        page,
        limit,
        search: debouncedSearch,
        sortBy,
      });
      setMembers(res.data);
      setTotal(res.pagination.total);
      setSelectedIds([]);
    } catch (error) {
      toast.error("خطا در دریافت لیست اعضا");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sortBy]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ─── عملیات افزودن ───
  const handleAddMember = async () => {
    try {
      await agentClubApi.addMember(newMember);
      toast.success("عضو با موفقیت اضافه شد");
      setAddOpen(false);
      setNewMember({ phone: "", name: "", notes: "" });
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در افزودن عضو");
    }
  };

  // ─── عملیات ویرایش ───
  const handleEditMember = async () => {
    if (!currentMember) return;
    try {
      await agentClubApi.updateMember(currentMember._id, editForm);
      toast.success("اطلاعات عضو به‌روزرسانی شد");
      setEditOpen(false);
      setCurrentMember(null);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در ویرایش عضو");
    }
  };

  // ─── حذف تکی ───
  const openDeleteSingle = (member: ClubMember) => {
    setDeleteTarget({
      type: "single",
      label: member.name || member.phone,
      ids: [member._id],
    });
    setDeleteOpen(true);
  };

  // ─── حذف گروهی ───
  const openDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    setDeleteTarget({
      type: "bulk",
      label: `${selectedIds.length} عضو`,
      ids: selectedIds,
    });
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.ids || deleteTarget.ids.length === 0) return;
    try {
      if (deleteTarget.type === "single" && deleteTarget.ids.length === 1) {
        await agentClubApi.deleteMember(deleteTarget.ids[0]);
        toast.success("عضو حذف شد");
      } else {
        await agentClubApi.bulkDeleteMembers(deleteTarget.ids);
        toast.success(`${deleteTarget.ids.length} عضو حذف شد`);
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      setSelectedIds([]);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در حذف");
    }
  };

  // ─── اکسپورت ───
  const handleExport = async () => {
    try {
      await agentClubApi.exportMembers();
      toast.success("اکسپورت با موفقیت انجام شد");
    } catch (error) {
      toast.error("خطا در اکسپورت اعضا");
    }
  };

  // ─── ایمپورت ───
  const handleImport = async () => {
    if (!importFile) {
      toast.error("لطفاً یک فایل انتخاب کنید");
      return;
    }
    try {
      await agentClubApi.importMembers(importFile);
      toast.success("ایمپورت انجام شد");
      setImportFile(null);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در ایمپورت اعضا");
    }
  };

  // ─── مرتب‌سازی ───
  const handleSort = (field: string) => {
    if (sortBy === field + "_asc") setSortBy(field + "_desc");
    else setSortBy(field + "_asc");
  };

  // ─── انتخاب‌ها ───
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m._id));
    }
  };

  // ─── جزئیات ───
  const handleOpenDetail = async (id: string) => {
    try {
      const data = await agentClubApi.getMemberDetail(id);
      setMemberDetail(data);
      setDetailOpen(true);
    } catch (error) {
      toast.error("خطا در دریافت جزئیات عضو");
    }
  };

  const handleOpenEdit = (member: ClubMember) => {
    setCurrentMember(member);
    setEditForm({
      name: member.name || "",
      phone: member.phone,
      notes: member.notes || "",
    });
    setEditOpen(true);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-8"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">مدیریت اعضای باشگاه</h1>
          <p className="text-sm text-muted-foreground">
            افزودن، ویرایش، حذف و جستجوی اعضا
          </p>
        </div>
        <div className="flex gap-2">
          {/* Import */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl">
                <Upload className="w-4 h-4" />
                ایمپورت
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="p-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleImport}
                  className="mt-2 w-full rounded-lg"
                  disabled={!importFile}
                >
                  بارگذاری فایل
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExport}>
            <Download className="w-4 h-4" />
            اکسپورت
          </Button>

          {/* Add member */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                افزودن عضو
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>افزودن عضو جدید</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">شماره موبایل *</label>
                  <Input
                    value={newMember.phone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">نام (اختیاری)</label>
                  <Input
                    value={newMember.name}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">یادداشت (اختیاری)</label>
                  <Input
                    value={newMember.notes}
                    onChange={(e) =>
                      setNewMember({ ...newMember, notes: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleAddMember} className="w-full rounded-xl">
                  ذخیره
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا شماره..."
            className="pr-10 rounded-xl"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            className="gap-2 rounded-xl"
            onClick={openDeleteBulk}
          >
            <Trash2 className="w-4 h-4" />
            حذف {selectedIds.length} عضو
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        members.length > 0 &&
                        selectedIds.length === members.length
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort("name")}
                    >
                      نام
                      {sortBy === "name_asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : sortBy === "name_desc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : null}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">شماره موبایل</TableHead>
                  <TableHead className="text-right">یادداشت</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort("interactions")}
                    >
                      تعاملات
                      {sortBy === "interactions_desc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : sortBy === "interactions_asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : null}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort("newest")}
                    >
                      تاریخ عضویت
                      {sortBy === "newest" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : null}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      عضوی یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow
                      key={member._id}
                      className="hover:bg-muted/20"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(member._id)}
                          onCheckedChange={() =>
                            handleToggleSelect(member._id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-bold">
                        {member.name || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {member.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {member.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {member.interactionCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(member._id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(member)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteSingle(member)}
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            variant="outline"
            size="sm"
          >
            قبلی
          </Button>
          <span className="py-2 px-3 text-sm">
            صفحه {page} از {totalPages}
          </span>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            variant="outline"
            size="sm"
          >
            بعدی
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      {currentMember && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>ویرایش عضو</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">نام</label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">شماره موبایل</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">یادداشت</label>
                <Input
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleEditMember} className="w-full rounded-xl">
                ذخیره تغییرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      {memberDetail && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>جزئیات عضو</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground">نام</p>
                  <p className="font-bold">
                    {memberDetail.member.name || "—"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground">شماره</p>
                  <p className="font-bold" dir="ltr">
                    {memberDetail.member.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-center">
                  <p className="text-lg font-extrabold">
                    {memberDetail.stats.views}
                  </p>
                  <p className="text-xs">بازدید</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/10 text-center">
                  <p className="text-lg font-extrabold">
                    {memberDetail.stats.sms}
                  </p>
                  <p className="text-xs">پیامک</p>
                </div>
                <div className="p-2 rounded-lg bg-success/10 text-center">
                  <p className="text-lg font-extrabold">
                    {memberDetail.stats.chats}
                  </p>
                  <p className="text-xs">گفتگو</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold mb-2">تاریخچه فعالیت‌ها</p>
                {memberDetail.activities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    فعالیتی ثبت نشده است
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {memberDetail.activities.map((act: any) => (
                      <div
                        key={act._id}
                        className="flex justify-between text-xs p-2 rounded bg-muted/20"
                      >
                        <span>{act.type}</span>
                        <span className="text-muted-foreground">
                          {new Date(act.createdAt).toLocaleString("fa-IR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              تأیید حذف
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "single" ? (
                <>
                  آیا از حذف <span className="font-bold">{deleteTarget.label}</span> مطمئن هستید؟
                  این عملیات غیرقابل بازگشت است.
                </>
              ) : (
                <>
                  آیا از حذف <span className="font-bold">{deleteTarget?.label}</span> مطمئن هستید؟
                  این عملیات غیرقابل بازگشت است.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl"
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="rounded-xl gap-2"
            >
              <Trash2 className="w-4 h-4" />
              بله، حذف شود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}