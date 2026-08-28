import React from "react";

export function StatPill({ label, value, icon, trend }: any) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[9px] text-muted-foreground font-bold">{label}</p>
      </div>
      <p
        className={`text-sm font-black tabular-nums ${
          trend === "up"
            ? "text-emerald-600"
            : trend === "down"
              ? "text-rose-600"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}