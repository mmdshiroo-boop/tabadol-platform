"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Check,
  X,
  Loader2,
  BadgeCheck,
  User,
  FileText,
  Mail,
  Phone,
  Building,
  Calendar,
  Star,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { getImageUrl } from "@/lib/getImageUrl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface VerificationRequest {
  _id: string;
  agent: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    agencyName?: string;
    avatar?: string;
    email?: string;
    createdAt?: string;
    rating?: number;
    isVerified?: boolean;
  };
  documents: string[];
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
}

export function VerificationsManager() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/verification", {
        params: filterStatus ? { status: filterStatus } : undefined,
      });
      setRequests(res.data.data);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      toast.error("خطا در دریافت درخواست‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    if (status === "rejected" && !reviewNote) {
      toast.error("لطفاً دلیل رد را بنویسید");
      return;
    }
    setProcessingId(id);
    try {
      await apiClient.put(`/verification/${id}/review`, { status, reviewNote });
      toast.success(status === "approved" ? "درخواست تأیید شد" : "درخواست رد شد");
      setReviewNote("");
      fetchRequests();
    } catch (error) {
      console.error("Error reviewing request:", error);
      toast.error("خطا در بررسی درخواست");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const fullName = `${req.agent?.firstName || ""} ${req.agent?.lastName || ""}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      (req.agent?.phone || "").includes(search) ||
      (req.agent?.agencyName || "").toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: VerificationRequest["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-600 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
            در انتظار
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400">
            تأیید شده
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400">
            رد شده
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fa-IR");
  };

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <Skeleton className="h-16 w-48 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* هدر */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">درخواست‌های تیک آبی</h2>
          <p className="text-sm text-muted-foreground mt-1">
            درخواست‌های تأیید هویت مشاوران را بررسی کنید.
          </p>
        </div>
      </div>

      {/* فیلتر و جستجو */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="جستجو بر اساس نام، شماره تماس یا آژانس..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
        </select>
      </div>

      {/* لیست درخواست‌ها */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-2xl border border-border/50">
          <BadgeCheck className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">درخواستی یافت نشد</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRequests.map((req) => (
            <Card key={req._id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              {/* هدر کارت */}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                 <Avatar className="h-14 w-14 border-2 border-orange-500/20">
  <AvatarImage
    src={req.agent?.avatar ? getImageUrl(req.agent.avatar) : "/images/user.webp"}
    alt={`${req.agent?.firstName || ""} ${req.agent?.lastName || ""}`}
    className="object-cover"
  />
  <span className="flex h-full w-full items-center justify-center rounded-full bg-muted font-bold">
    {(req.agent?.firstName?.[0] || "") + (req.agent?.lastName?.[0] || "")}
  </span>
</Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">
                          {req.agent?.firstName || ""} {req.agent?.lastName || ""}
                        </p>
                        {req.agent?.isVerified && (
                          <BadgeCheck className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      {req.agent?.agencyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5" />
                          {req.agent.agencyName}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* اطلاعات تماس */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 text-orange-500" />
                    <span dir="ltr">{req.agent?.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 text-orange-500" />
                    <span className="truncate">{req.agent?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span>{formatDate(req.agent?.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>{req.agent?.rating || 0}</span>
                  </div>
                </div>

                {/* مدارک */}
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-1 text-foreground">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    مدارک:
                  </p>
                  <div className="space-y-1.5">
                    {req.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-orange-500 hover:underline truncate bg-muted/30 rounded-lg px-3 py-1.5"
                      >
                        {doc}
                      </a>
                    ))}
                  </div>
                </div>

                {/* لینک مشاهده پروفایل عمومی */}
<Button
  variant="outline"
  size="sm"
  className="gap-1.5 border-orange-500/30 text-orange-500 hover:bg-orange-50 hover:text-orange-600"
onClick={() => router.push(`/profile/${(req.agent as any).userId || req.agent._id}`)}>
  <ExternalLink className="w-4 h-4" />
  مشاهده پروفایل کامل
</Button>

                {/* عملیات بررسی */}
                {req.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <input
                      placeholder="دلیل رد (در صورت رد)"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <Button
                      onClick={() => handleReview(req._id, "approved")}
                      disabled={processingId === req._id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {processingId === req._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      تأیید
                    </Button>
                    <Button
                      onClick={() => handleReview(req._id, "rejected")}
                      disabled={processingId === req._id}
                      variant="destructive"
                      className="gap-2"
                    >
                      {processingId === req._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      رد
                    </Button>
                  </div>
                )}

                {req.reviewNote && req.status !== "pending" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    دلیل بررسی: {req.reviewNote}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}