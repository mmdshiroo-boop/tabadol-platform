"use client";

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  tooltip?: string;
}

export default function VerifiedBadge({
  className,
  size = "md",
  tooltip = "حساب تأیید شده",
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <span
      title={tooltip}
      className="inline-flex items-center flex-shrink-0"
    >
      <BadgeCheck
        className={cn(
          sizeClasses[size],
          "text-blue-500 drop-shadow-sm",
          className
        )}
      />
    </span>
  );
}