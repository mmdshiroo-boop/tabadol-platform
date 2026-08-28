"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MessageCircle,
  UserPlus,
  UserCheck,
  MapPin,
  ArrowLeft,
  Building,
  Crown,
  Users,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import apiClient from "@/services/api/client";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { FollowListModal } from "@/components/follow/FollowListModal";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/getImageUrl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PublicProfile {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email?: string;
  role: string;
  isVerified?: boolean;
  rating: number;
  createdAt: string;
  adsCount: number;
  recentAds: Array<{
    _id: string;
    title: string;
    price: number;
    city: string;
    images: string[];
    createdAt: string;
  }>;
  followers: number;
  following: number;
}

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [followState, setFollowState] = useState({
    followers: 0,
    following: 0,
    isFollowing: false,
  });
  const [loading, setLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followModal, setFollowModal] = useState<{
    open: boolean;
    type: "followers" | "following";
  }>({
    open: false,
    type: "followers",
  });

  useEffect(() => {
    if (!id) return;
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, followRes] = await Promise.all([
        apiClient.get(`/users/public/${id}`),
        apiClient.get(`/follow/counts/${id}`),
      ]);

      setProfile(profileRes.data.data);
      setFollowState(followRes.data.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("خطا در دریافت پروفایل");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push(
        `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (currentUser._id === id) {
      return;
    }

    setIsFollowLoading(true);
    try {
      if (followState.isFollowing) {
        await apiClient.delete(`/follow/${id}`);
        setFollowState((prev) => ({
          ...prev,
          isFollowing: false,
          followers: Math.max(0, prev.followers - 1),
        }));
        toast.success("آنفالو شد");
      } else {
        await apiClient.post(`/follow/${id}`);
        setFollowState((prev) => ({
          ...prev,
          isFollowing: true,
          followers: prev.followers + 1,
        }));
        toast.success("فالو شد");
      }
    } catch (error) {
      console.error("Follow action error:", error);
      toast.error("خطا در انجام عملیات");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      router.push(
        `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (currentUser._id === id) {
      toast.info("این پروفایل خودتان است");
      return;
    }
    router.push(`/chat?userId=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 p-4 md:p-6" dir="rtl">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-black">کاربر یافت نشد</h2>
        </div>
      </div>
    );
  }

  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const roleIcon =
    profile.role === "agent" ? (
      <Building className="w-4 h-4" />
    ) : profile.role === "vip" ? (
      <Crown className="w-4 h-4 text-amber-500" />
    ) : (
      <User className="w-4 h-4" />
    );

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6 pb-24 md:pb-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* دکمه بازگشت */}
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          بازگشت
        </Button>

        {/* ─── کارت پروفایل ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border border-border/50 shadow-xl bg-card">
            {/* هدر گرادیانی */}
            <div className="h-32 bg-gradient-to-l from-orange-100 via-orange-50 to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-orange-500/10 dark:to-orange-400/10" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            <div className="px-4 sm:px-6 pb-6 -mt-14 relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* آواتار */}
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-xl rounded-full">
                  <AvatarImage
                    src={
                      profile.avatar
                        ? getImageUrl(profile.avatar)
                        : "/images/user.webp"
                    }
                    alt={fullName}
                    className="object-cover"
                  />
                  {/* جایگزین AvatarFallback */}
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-muted font-bold text-2xl">
                    {fullName?.[0] || "U"}
                  </span>
                </Avatar>

                {/* اطلاعات اصلی */}
                <div className="flex-1 text-center sm:text-right">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl font-black">{fullName || "کاربر"}</h1>
                    {profile.isVerified && <VerifiedBadge size="lg" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-1">
                    {roleIcon}
                    {profile.role === "agent"
                      ? "مشاور املاک"
                      : profile.role === "vip"
                        ? "کاربر ویژه"
                        : "کاربر عادی"}
                  </p>

                  {/* آمار فالوور/فالوینگ/ستاره */}
                  <div className="flex justify-center sm:justify-start items-center gap-4 mt-3 text-sm">
                    <button
                      onClick={() =>
                        setFollowModal({ open: true, type: "followers" })
                      }
                      className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted/70 rounded-xl px-3 py-1.5 transition-colors"
                    >
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">{followState.followers}</span>
                      <span className="text-muted-foreground">فالوور</span>
                    </button>
                    <button
                      onClick={() =>
                        setFollowModal({ open: true, type: "following" })
                      }
                      className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted/70 rounded-xl px-3 py-1.5 transition-colors"
                    >
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold">{followState.following}</span>
                      <span className="text-muted-foreground">دنبال‌شونده</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-bold">{profile.rating || 0}</span>
                    </div>
                  </div>
                </div>

                {/* دکمه‌های اکشن */}
                {currentUser?._id !== id && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={followState.isFollowing ? "outline" : "default"}
                      className={cn(
                        "gap-2 h-11 border-orange-500/30 text-orange-500",
                        followState.isFollowing
                          ? "hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-600"
                          : "bg-orange-500 hover:bg-orange-600 text-white border-0"
                      )}
                    >
                      {followState.isFollowing ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {followState.isFollowing ? "دنبال می‌کنید" : "دنبال کردن"}
                    </Button>

                    <Button
                      onClick={handleMessage}
                      variant="outline"
                      className="gap-2 h-11 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-600"
                    >
                      <MessageCircle className="w-4 h-4" />
                      پیام
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ─── آگهی‌های اخیر ─── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold">آگهی‌های اخیر</h2>
            <Badge variant="outline" className="text-xs">
              {profile.adsCount} آگهی
            </Badge>
          </div>

          {profile.recentAds?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.recentAds.map((ad, index) => (
                <motion.div
                  key={ad._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow border-border/50 bg-card overflow-hidden"
                    onClick={() => router.push(`/ad/${ad._id}`)}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      {ad.images && ad.images[0] ? (
                        <img
                          src={getImageUrl(ad.images[0])}
                          alt={ad.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          بدون تصویر
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="font-bold line-clamp-1">{ad.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ad.city}
                      </p>
                      <p className="font-black text-orange-500 mt-2">
                        {ad.price > 0
                          ? ad.price.toLocaleString("fa-IR") + " تومان"
                          : "توافقی"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8 bg-muted/20 rounded-2xl">
              هنوز آگهی فعالی وجود ندارد
            </div>
          )}
        </div>

        {/* مودال لیست فالوور/فالوینگ */}
        <FollowListModal
          open={followModal.open}
          onClose={() => setFollowModal({ ...followModal, open: false })}
          userId={profile._id}
          type={followModal.type}
        />
      </div>
    </div>
  );
}