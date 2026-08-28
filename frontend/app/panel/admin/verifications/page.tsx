"use client";

import { useEffect, useState } from "react";
import { getAllVerificationRequests, reviewVerification } from "@/services/api/verification.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VerificationRequest } from "@/types/loyalty";

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      const res = await getAllVerificationRequests(
        filterStatus ? { status: filterStatus } : undefined,
      );
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
    }
  };

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    if (status === "rejected" && !reviewNote) {
      alert("لطفاً دلیل رد را بنویسید");
      return;
    }
    try {
      await reviewVerification(id, status, reviewNote);
      fetchRequests();
      setReviewNote("");
    } catch (error) {
      console.error("Error reviewing request:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">درخواست‌های تیک آبی</h1>
      <div className="flex gap-2">
        <Input
          placeholder="فیلتر وضعیت"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
      </div>
      <div className="space-y-4">
        {requests.map((req) => (
          <Card key={req._id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {req.agent?.firstName || ""} {req.agent?.lastName || ""}
                {/* اصلاح: حذف variant="success" و افزودن کلاس‌های سفارشی برای حالت تأیید */}
                <Badge
                  variant={
                    req.status === "pending"
                      ? "default"
                      : req.status === "approved"
                        ? "secondary"
                        : "destructive"
                  }
                  className={
                    req.status === "approved"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800"
                      : ""
                  }
                >
                  {req.status === "pending"
                    ? "در انتظار"
                    : req.status === "approved"
                      ? "تأیید شده"
                      : "رد شده"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">مدارک:</p>
                <ul className="list-disc list-inside">
                  {req.documents.map((doc, idx) => (
                    <li key={idx}>
                      <a href={doc} target="_blank" className="text-blue-500">
                        {doc}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              {req.status === "pending" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="دلیل رد (در صورت رد)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <Button onClick={() => handleReview(req._id, "approved")}>
                    تأیید
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview(req._id, "rejected")}
                  >
                    رد
                  </Button>
                </div>
              )}
              {req.reviewNote && (
                <p className="text-sm text-muted-foreground">
                  دلیل: {req.reviewNote}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}