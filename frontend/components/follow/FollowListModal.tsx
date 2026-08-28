"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import apiClient from "@/services/api/client";
import { getImageUrl } from "@/lib/getImageUrl";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { toast } from "sonner";

interface FollowUser {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isVerified?: boolean;
  role?: string;
}

interface FollowListModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
}

export function FollowListModal({
  open,
  onClose,
  userId,
  type,
}: FollowListModalProps) {
  const router = useRouter();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const endpoint =
          type === "followers"
            ? `/follow/followers/${userId}`
            : `/follow/following/${userId}`;
        const res = await apiClient.get(endpoint);
        setUsers(res.data.data || []);
      } catch (error) {
        console.error("Error fetching follow list:", error);
        toast.error("خطا در دریافت لیست");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, userId, type]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md rounded-3xl p-5" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center font-extrabold text-base">
            {type === "followers" ? "فالوورها" : "دنبال‌شونده‌ها"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              هنوز کسی وجود ندارد
            </p>
          ) : (
            users.map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  router.push(`/profile/${u._id}`);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-right"
              >
                <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                  <AvatarImage
                    src={u.avatar ? getImageUrl(u.avatar) : "/images/user.webp"}
                    alt={u.firstName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold" />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    {u.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.role === "agent" ? "مشاور املاک" : u.role === "vip" ? "کاربر ویژه" : "کاربر"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}