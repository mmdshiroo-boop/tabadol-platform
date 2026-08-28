export interface LoyaltyTier {
  _id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  benefits: string[];
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface LoyaltyStatus {
  points: number;
  tier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  referralCode: string;
  referredBy: string | null;
}

export interface PointsTransaction {
  _id: string;
  points: number;
  reason: string;
  description?: string;
  createdAt: string;
}

export interface VerificationRequest {
  _id: string;
  agent: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    agencyName?: string;
  };
  documents: string[];
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
}