"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PointsTransaction } from "@/types/loyalty";

interface Props {
  transactions: PointsTransaction[];
}

export default function PointsHistory({ transactions }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تاریخچه امتیازات</CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto">
        <div className="space-y-4">
          {transactions.length === 0 && (
            <p className="text-center text-muted-foreground">هنوز امتیازی ندارید</p>
          )}
          {transactions.map((tx) => (
            <div key={tx._id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{tx.description || tx.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <span className={tx.points > 0 ? "text-green-600" : "text-red-600"}>
                {tx.points > 0 ? `+${tx.points}` : tx.points}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}