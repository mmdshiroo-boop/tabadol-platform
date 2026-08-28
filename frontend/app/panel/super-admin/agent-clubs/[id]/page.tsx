"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Users,
  Send,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { adminAgentClubApi } from "@/services/api/adminAgentClub.api";
import { cn } from "@/lib/utils";

export default function AdminClubDetailPage() {
  const { id } = useParams();
  const [details, setDetails] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (id) {
      fetchDetails();
      fetchMembers();
    }
  }, [id]);

  const fetchDetails = async () => {
    try {
      const data = await adminAgentClubApi.getClubDetails(id as string);
      setDetails(data);
    } catch (error) {
      toast.error("خطا در دریافت جزئیات باشگاه");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await adminAgentClubApi.getClubMembers(id as string, { page: memberPage, limit: 10, search });
      setMembers(res.data);
      setMemberTotalPages(res.pagination.pages);
    } catch (error) {
      toast.error("خطا در دریافت اعضا");
    }
  };

  useEffect(() => {
    if (id) fetchMembers();
  }, [memberPage, search]);

  const fetchCampaigns = async () => {
    try {
      const res = await adminAgentClubApi.getClubCampaigns(id as string, { page: 1, limit: 10 });
      setCampaigns(res.data);
    } catch (error) {
      toast.error("خطا در دریافت کمپین‌ها");
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await adminAgentClubApi.getClubActivities(id as string, { page: 1, limit: 20 });
      setActivities(res.data);
    } catch (error) {
      toast.error("خطا در دریافت فعالیت‌ها");
    }
  };

  useEffect(() => {
    if (id) {
      fetchCampaigns();
      fetchActivities();
    }
  }, [id]);

  if (loading) {
    return <div className="space-y-4 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 px-3 sm:px-6 pb-24 md:pb-6" dir="rtl">
      {/* اطلاعات مشاور */}
      <Card className="border-border/60 shadow-sm rounded-2xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {details.agent?.avatar ? (
                <img src={details.agent.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black">
                {details.agent?.firstName || ""} {details.agent?.lastName || ""}
              </h1>
              <p className="text-sm text-muted-foreground">
                {details.agent?.agencyName || "آژانس"} 
                {details.agent?.phone && <span dir="ltr" className="mr-2">{details.agent.phone}</span>}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{details.stats.membersCount}</p>
                <p className="text-xs text-muted-foreground">اعضا</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{details.stats.totalViews}</p>
                <p className="text-xs text-muted-foreground">بازدید</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{details.stats.totalSmsSent}</p>
                <p className="text-xs text-muted-foreground">پیام</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">اعضا</TabsTrigger>
          <TabsTrigger value="campaigns">کمپین‌ها</TabsTrigger>
          <TabsTrigger value="activities">فعالیت‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setMemberPage(1); }} placeholder="جستجوی عضو..." className="pr-10 rounded-xl" />
            </div>
            {members.length === 0 ? <p className="text-center py-8 text-muted-foreground">عضوی یافت نشد</p> : (
              <div className="space-y-2">
                {members.map((member) => (
                  <Card key={member._id} className="border-border/60 shadow-sm rounded-xl bg-card/60 p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold">{member.name || member.phone}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {member.phone}</p>
                    </div>
                    <Badge variant="secondary">{member.interactionCount} تعامل</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString("fa-IR")}</span>
                  </Card>
                ))}
              </div>
            )}
            {memberTotalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button disabled={memberPage === 1} onClick={() => setMemberPage(memberPage - 1)} variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                <span className="py-2 px-3 text-sm">{memberPage} / {memberTotalPages}</span>
                <Button disabled={memberPage === memberTotalPages} onClick={() => setMemberPage(memberPage + 1)} variant="outline" size="sm"><ChevronLeft className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          {campaigns.length === 0 ? <p className="text-center py-8 text-muted-foreground">کمپینی یافت نشد</p> : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <Card key={campaign._id} className="border-border/60 shadow-sm rounded-xl bg-card/60 p-3">
                  <p className="text-sm font-bold line-clamp-1">{campaign.message}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{campaign.recipientsCount} گیرنده</span>
                    <span>{campaign.sentCount} موفق / {campaign.failedCount} ناموفق</span>
                    <span>{new Date(campaign.createdAt).toLocaleDateString("fa-IR")}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities">
          {activities.length === 0 ? <p className="text-center py-8 text-muted-foreground">فعالیتی یافت نشد</p> : (
            <div className="space-y-2">
              {activities.map((act) => (
                <div key={act._id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                  <span>{act.type}</span>
                  <span className="text-xs text-muted-foreground">{new Date(act.createdAt).toLocaleString("fa-IR")}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}