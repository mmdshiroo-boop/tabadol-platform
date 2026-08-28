// components/cookie-ui/DownloadBehaviorModal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileText, FileJson, FileSpreadsheet, FileCode } from "lucide-react";
import { adminApi } from "@/services/api/admin.api";
import { cn } from "@/lib/utils";

const FORMATS = [
  { value: "json", label: "JSON", icon: FileJson, color: "text-blue-600" },
  { value: "csv", label: "CSV", icon: FileSpreadsheet, color: "text-emerald-600" },
  { value: "txt", label: "TXT", icon: FileText, color: "text-gray-600" },
  { value: "pdf", label: "PDF", icon: FileCode, color: "text-rose-600" },
];

export function DownloadBehaviorModal({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [format, setFormat] = useState<"json" | "csv" | "txt" | "pdf">("json");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await adminApi.downloadBehaviorReport(userId, format);
      toast.success(`✅ فایل ${format.toUpperCase()} با موفقیت دانلود شد`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(error.message || "خطا در دانلود فایل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            دانلود گزارش رفتار کاربر
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            گزارش جامع رفتار کاربر شامل اطلاعات هویتی، جستجوها، بازدیدها،
            علاقه‌مندی‌ها و رویدادهای امنیتی را به یکی از فرمت‌های زیر دانلود کنید.
          </p>

          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as any)}
            className="grid grid-cols-2 gap-3"
          >
            {FORMATS.map((f) => {
              const Icon = f.icon;
              const isSelected = format === f.value;
              return (
                <div
                  key={f.value}
                  className={cn(
                    "relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/20"
                  )}
                  onClick={() => setFormat(f.value as any)}
                >
                  <RadioGroupItem
                    value={f.value}
                    id={f.value}
                    className="absolute opacity-0"
                  />
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", f.color)} />
                  </div>
                  <div>
                    <Label
                      htmlFor={f.value}
                      className="text-sm font-bold cursor-pointer"
                    >
                      {f.label}
                    </Label>
                    {isSelected && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 ml-2 border-primary/50 text-primary"
                      >
                        انتخاب شده
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            انصراف
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading}
            className="gap-2 rounded-xl bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCode className="w-4 h-4" />
            )}
            دانلود
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}