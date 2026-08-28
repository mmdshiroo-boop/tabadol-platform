"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  referralCode: string;
}

export default function ReferralBox({ referralCode }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>معرفی دوستان</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <p className="text-lg font-mono font-bold">{referralCode}</p>
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "کپی شد" : "کپی"}
        </Button>
      </CardContent>
    </Card>
  );
}