"use client";

import React from "react";

interface UserAvatarProps {
  user: any;
  isOnline?: boolean;
  isSelected?: boolean;
  isVip?: boolean;
  isUrgent?: boolean;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  isOnline = false,
  isSelected = false,
  isVip = false,
  isUrgent = false,
  size,
  className = "",
}) => {
  // رنگ‌بندی طبق منطق شما
  let borderColor = isOnline ? "#10B981" : "#94A3B8"; // سبز یا خاکستری
  if (isSelected) borderColor = "#EA580C"; // نارنجی برند تبادل
  if (isVip) borderColor = "#8B5CF6"; // بنفش VIP

  // سایز آواتار
  const avatarSize = size || (isSelected ? 48 : 36);

  // آدرس آواتار با فال‌بک پیش‌فرض
  const avatarUrl =
    user?.avatar || user?.userId?.avatar || "/images/user.webp"; // 

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
    >
      {/* انیمیشن پالس برای کاربران آنلاین یا انتخاب‌شده */}
      {(isOnline || isSelected) && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ backgroundColor: borderColor }}
        />
      )}

      {/* تصویر آواتار */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden border-2 shadow-md bg-white transition-all duration-300"
        style={{ borderColor }}
      >
        <img
          src={avatarUrl}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/user.webp"; // 
          }}
          alt={user?.name || user?.fullName || "user"}
        />
      </div>

      {/* بج‌های روی آواتار */}
      {isVip ? (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm z-10">
          ★
        </div>
      ) : isUrgent ? (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm z-10">
          !
        </div>
      ) : null}
    </div>
  );
};