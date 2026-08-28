"use client";

import { useEffect, useState } from "react";
import { requestVerification, getMyVerificationStatus } from "@/services/api/verification.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgentVerificationPage() {
  const [documents, setDocuments] = useState<string[]>([]);
  const [newDoc, setNewDoc] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await getMyVerificationStatus();
        setStatus(res.data);
      } catch (error) {
        console.error("Error fetching verification status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const addDocument = () => {
    if (newDoc.trim()) {
      setDocuments([...documents, newDoc.trim()]);
      setNewDoc("");
    }
  };

  const submitRequest = async () => {
    if (documents.length === 0) return;
    setSubmitting(true);
    try {
      const res = await requestVerification(documents);
      setStatus(res.data);
    } catch (error) {
      console.error("Error submitting verification request:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>در حال بارگذاری...</div>;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">درخواست تیک آبی</h1>

      {status?.status === "approved" && (
        <Card>
          <CardContent className="p-4 text-green-600">
            حساب شما تأیید شده است و نشان آبی دریافت کرده‌اید.
          </CardContent>
        </Card>
      )}

      {status?.status === "pending" && (
        <Card>
          <CardContent className="p-4 text-yellow-600">
            درخواست شما در حال بررسی است.
          </CardContent>
        </Card>
      )}

      {status?.status === "rejected" && (
        <Card>
          <CardContent className="p-4 text-red-600">
            درخواست شما رد شده است: {status.reviewNote || "دلیل نامشخص"}
          </CardContent>
        </Card>
      )}

      {(!status || status.status !== "pending") && (
        <Card>
          <CardHeader>
            <CardTitle>مدارک مورد نیاز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                placeholder="آدرس فایل مدرک (مثلاً /uploads/docs/...)"
              />
              <Button type="button" onClick={addDocument}>افزودن</Button>
            </div>
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                  <span className="truncate">{doc}</span>
                  <Button variant="ghost" size="sm" onClick={() => setDocuments(documents.filter((_, i) => i !== idx))}>
                    حذف
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={submitRequest} disabled={documents.length === 0 || submitting}>
              {submitting ? "در حال ارسال..." : "ارسال درخواست"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}