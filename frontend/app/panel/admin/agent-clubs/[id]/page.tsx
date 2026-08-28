"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Send,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Braces,
} from "lucide-react";
import { toast } from "sonner";
import { adminAgentClubApi } from "@/services/api/adminAgentClub.api";
import {
  exportToExcel,
  exportToPdf,
  exportToText,
  exportToJson,
  printElement,
} from "@/utils/agentClubExport";
import { useDebounce } from "@/hooks/useDebounce";

export default function AdminClubDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [details, setDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const debouncedMemberSearch = useDebounce(memberSearch, 500);

  // فیلتر کمپین‌ها
  const [campaignStatus, setCampaignStatus] = useState("");
  const [campaignStartDate, setCampaignStartDate] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchDetails();
    fetchMembers();
    fetchCampaigns();
    fetchActivities();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const data = await adminAgentClubApi.getClubDetails(id as string);
      setDetails(data);
    } catch (error) {
      toast.error("خطا در دریافت جزئیات");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = useCallback(async () => {
    try {
      const res = await adminAgentClubApi.getClubMembers(id as string, {
        page: memberPage,
        limit: 10,
        search: debouncedMemberSearch,
      });
      setMembers(res.data);
      setMemberTotalPages(res.pagination.pages);
    } catch (error) {
      toast.error("خطا در دریافت اعضا");
    }
  }, [id, memberPage, debouncedMemberSearch]);

  useEffect(() => {
    if (id) fetchMembers();
  }, [fetchMembers]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await adminAgentClubApi.getClubCampaigns(id as string, {
        page: 1,
        limit: 10,
        status: campaignStatus,
        startDate: campaignStartDate,
        endDate: campaignEndDate,
      } as any); // ✅ این cast خطای تایپ‌اسکریپت را برطرف می‌کند
      setCampaigns(res.data);
    } catch (error) {
      toast.error("خطا در دریافت کمپین‌ها");
    }
  }, [id, campaignStatus, campaignStartDate, campaignEndDate]);

  useEffect(() => {
    if (id) fetchCampaigns();
  }, [fetchCampaigns]);

  const fetchActivities = async () => {
    try {
      const res = await adminAgentClubApi.getClubActivities(id as string, { page: 1, limit: 20 });
      setActivities(res.data);
    } catch (error) {
      toast.error("خطا در دریافت فعالیت‌ها");
    }
  };

  const exportMembers = (format: "excel" | "pdf" | "txt" | "json") => {
    const rows = members.map((m) => ({
      "نام": m.name || m.phone,
      "شماره": m.phone,
      "تعاملات": m.interactionCount,
      "تاریخ عضویت": new Date(m.joinedAt).toLocaleDateString("fa-IR"),
    }));
    switch (format) {
      case "excel": exportToExcel(rows, "اعضای-باشگاه"); break;
      case "txt": exportToText(rows, "اعضای-باشگاه"); break;
      case "json": exportToJson(rows, "اعضای-باشگاه"); break;
      case "pdf": exportToPdf(Object.keys(rows[0] || {}), rows.map(Object.values), "اعضای-باشگاه", "لیست اعضا"); break;
    }
  };

  const exportCampaigns = (format: "excel" | "pdf" | "txt" | "json") => {
    const rows = campaigns.map((c) => ({
      "پیام": c.message,
      "گیرندگان": c.recipientsCount,
      "موفق": c.sentCount,
      "ناموفق": c.failedCount,
      "وضعیت": c.status,
      "تاریخ": new Date(c.createdAt).toLocaleDateString("fa-IR"),
    }));
    switch (format) {
      case "excel": exportToExcel(rows, "کمپین‌های-باشگاه"); break;
      case "txt": exportToText(rows, "کمپین‌های-باشگاه"); break;
      case "json": exportToJson(rows, "کمپین‌های-باشگاه"); break;
      case "pdf": exportToPdf(Object.keys(rows[0] || {}), rows.map(Object.values), "کمپین‌های-باشگاه", "لیست کمپین‌ها"); break;
    }
  };

  if (loading) {
    return <div className="space-y-4 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6"
      dir="rtl"
    >
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="no-print">
        <ArrowRight className="w-4 h-4 ml-1" /> بازگشت
      </Button>

      {/* هدر اطلاعات مشاور */}
      <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {details.agent?.avatar ? (
                <img src={details.agent.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black">
                  {details.agent?.firstName || ""} {details.agent?.lastName || ""}
                </h1>
                {details.agent?.isVerified && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                <span>{details.agent?.agencyName || "آژانس"}</span>
                {details.agent?.phone && <span dir="ltr">{details.agent.phone}</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              <MiniStat label="اعضا" value={details.stats.membersCount} icon={Users} />
              <MiniStat label="بازدید" value={details.stats.totalViews} icon={Activity} />
              <MiniStat label="پیام" value={details.stats.totalSmsSent} icon={Send} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 gap-1">
          <TabsTrigger value="members">اعضا</TabsTrigger>
          <TabsTrigger value="campaigns">کمپین‌ها</TabsTrigger>
          <TabsTrigger value="activities">فعالیت‌ها</TabsTrigger>
        </TabsList>

        {/* تب اعضا */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
                placeholder="جستجوی عضو..."
                className="pr-10 rounded-xl"
              />
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => exportMembers("excel")}>
                <FileSpreadsheet className="w-4 h-4 ml-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportMembers("pdf")}>
                <FileText className="w-4 h-4 ml-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportMembers("txt")}>
                <Download className="w-4 h-4 ml-1" /> TXT
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportMembers("json")}>
                <Braces className="w-4 h-4 ml-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => printElement("members-printable", "لیست اعضا")}>
                <Printer className="w-4 h-4 ml-1" /> چاپ
              </Button>
            </div>
          </div>
          <div id="members-printable">
            {members.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">عضوی یافت نشد</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <Card key={member._id} className="border-border/60 shadow-sm rounded-xl bg-card/60 p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold">{member.name || member.phone}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {member.phone}
                      </p>
                    </div>
                    <Badge variant="secondary">{member.interactionCount} تعامل</Badge>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(member.joinedAt).toLocaleDateString("fa-IR")}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
          {memberTotalPages > 1 && (
            <div className="flex justify-center gap-2 no-print">
              <Button disabled={memberPage === 1} onClick={() => setMemberPage(memberPage - 1)} variant="outline" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="py-2 px-3 text-sm">{memberPage} / {memberTotalPages}</span>
              <Button disabled={memberPage === memberTotalPages} onClick={() => setMemberPage(memberPage + 1)} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* تب کمپین‌ها */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={campaignStatus}
              onChange={(e) => setCampaignStatus(e.target.value)}
              className="h-11 rounded-xl bg-card border border-border text-foreground px-4 text-sm"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="sent">موفق</option>
              <option value="failed">ناموفق</option>
              <option value="partial">بخشی</option>
            </select>
            <Input
              type="date"
              value={campaignStartDate}
              onChange={(e) => setCampaignStartDate(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="از تاریخ"
            />
            <Input
              type="date"
              value={campaignEndDate}
              onChange={(e) => setCampaignEndDate(e.target.value)}
              className="h-11 rounded-xl"
              placeholder="تا تاریخ"
            />
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => exportCampaigns("excel")}>
                <FileSpreadsheet className="w-4 h-4 ml-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCampaigns("pdf")}>
                <FileText className="w-4 h-4 ml-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCampaigns("txt")}>
                <Download className="w-4 h-4 ml-1" /> TXT
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCampaigns("json")}>
                <Braces className="w-4 h-4 ml-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => printElement("campaigns-printable", "لیست کمپین‌ها")}>
                <Printer className="w-4 h-4 ml-1" /> چاپ
              </Button>
            </div>
          </div>
          <div id="campaigns-printable">
            {campaigns.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">کمپینی یافت نشد</p>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign._id} className="border-border/60 shadow-sm rounded-xl bg-card/60 p-3">
                    <p className="text-sm font-bold line-clamp-1">{campaign.message}</p>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1 flex-wrap gap-2">
                      <span>{campaign.recipientsCount} گیرنده</span>
                      <span>{campaign.sentCount} موفق / {campaign.failedCount} ناموفق</span>
                      <span>{new Date(campaign.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* تب فعالیت‌ها */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end no-print">
            <Button variant="outline" size="sm" onClick={() => printElement("activities-printable", "فعالیت‌ها")}>
              <Printer className="w-4 h-4 ml-1" /> چاپ
            </Button>
          </div>
          <div id="activities-printable">
            {activities.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">فعالیتی یافت نشد</p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div key={act._id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                    <span className="font-medium">{act.type}</span>
                    <span className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleString("fa-IR")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <Icon className="w-4 h-4 text-primary" />
        <p className="text-xl font-bold">{value}</p>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}