"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Send,
  RefreshCw,
  History,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { agentClubApi, ClubMember, SmsCampaign } from "@/services/api/agentClub.api";
import { cn } from "@/lib/utils";

export default function ClubSmsPage() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendAll, setSendAll] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignTotalPages, setCampaignTotalPages] = useState(1);
  const [campaignStatus, setCampaignStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, campaignsRes] = await Promise.all([
        agentClubApi.getMembers({ limit: 1000 }),
        agentClubApi.getSmsCampaigns({
          page: campaignPage,
          limit: 10,
          status: campaignStatus,
        }),
      ]);
      setMembers(membersRes.data);
      setCampaigns(campaignsRes.data);
      setCampaignTotalPages(campaignsRes.pagination.pages);
    } catch (error) {
      toast.error("خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [campaignPage, campaignStatus]);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("متن پیام را وارد کنید");
      return;
    }
    setSending(true);
    try {
      const payload: any = { message };
      if (sendAll) {
        payload.sendAll = true;
      } else {
        if (selectedIds.length === 0) {
          toast.error("حداقل یک گیرنده انتخاب کنید");
          setSending(false);
          return;
        }
        payload.recipientIds = selectedIds;
      }
      const res = await agentClubApi.sendSms(payload);
      toast.success(res.message || "پیام ارسال شد");
      setMessage("");
      setSelectedIds([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطا در ارسال پیام");
    } finally {
      setSending(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6"
      dir="rtl"
    >
      <div>
        <h1 className="text-2xl font-extrabold">ارسال پیام به اعضا</h1>
        <p className="text-sm text-muted-foreground">
          ارسال پیام داخلی به اعضای باشگاه (اعلان + گفتگو)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* فرم ارسال */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-black">متن پیام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              rows={5}
              className="rounded-xl"
            />
            <div className="flex items-center gap-3">
              <Checkbox
                checked={sendAll}
                onCheckedChange={(checked) => setSendAll(!!checked)}
              />
              <span className="text-sm font-bold">
                ارسال به همه اعضا ({members.length} نفر)
              </span>
            </div>
            {!sendAll && (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {members.map((m) => (
                  <label key={m._id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedIds.includes(m._id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds((prev) =>
                          checked
                            ? [...prev, m._id]
                            : prev.filter((id) => id !== m._id)
                        );
                      }}
                    />
                    <span>
                      {m.name || m.phone} - {m.phone}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-xl gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "در حال ارسال..." : "ارسال پیام"}
            </Button>
          </CardContent>
        </Card>

        {/* تاریخچه */}
        <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <History className="w-4 h-4" />
              تاریخچه پیام‌ها
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* جستجو در تاریخچه */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجو در پیام‌ها..."
                className="pr-10 rounded-xl"
              />
            </div>

            {/* فیلتر وضعیت */}
            <div className="flex gap-2">
              <Button
                variant={campaignStatus === "" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCampaignStatus("")}
                className="rounded-full text-xs"
              >
                همه
              </Button>
              <Button
                variant={campaignStatus === "sent" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCampaignStatus("sent")}
                className="rounded-full text-xs"
              >
                موفق
              </Button>
              <Button
                variant={campaignStatus === "failed" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCampaignStatus("failed")}
                className="rounded-full text-xs"
              >
                ناموفق
              </Button>
              <Button
                variant={campaignStatus === "partial" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCampaignStatus("partial")}
                className="rounded-full text-xs"
              >
                بخشی
              </Button>
            </div>

            {/* لیست کمپین‌ها */}
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                پیامی ارسال نشده است
              </p>
            ) : (
              <div className="space-y-2">
                {filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign._id}
                    className="p-3 rounded-xl bg-muted/20 border border-border/30"
                  >
                    <p className="text-sm font-bold line-clamp-2">
                      {campaign.message}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>
                        گیرندگان: {campaign.recipientsCount.toLocaleString("fa-IR")}
                      </span>
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          campaign.status === "sent"
                            ? "success"
                            : campaign.status === "failed"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-[10px]"
                      >
                        {campaign.status === "sent" && "موفق"}
                        {campaign.status === "failed" && "ناموفق"}
                        {campaign.status === "partial" && "بخشی"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {campaign.sentCount} ارسال موفق، {campaign.failedCount} ناموفق
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* صفحه‌بندی */}
            {campaignTotalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-2">
                <Button
                  disabled={campaignPage === 1}
                  onClick={() => setCampaignPage((p) => p - 1)}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  {campaignPage} / {campaignTotalPages}
                </span>
                <Button
                  disabled={campaignPage === campaignTotalPages}
                  onClick={() => setCampaignPage((p) => p + 1)}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}