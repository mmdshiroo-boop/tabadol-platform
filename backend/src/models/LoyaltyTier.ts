import { Schema, model, Document } from 'mongoose';

export interface ILoyaltyTier extends Document {
  name: string;
  minPoints: number;
  maxPoints: number | null; // null یعنی بالاترین سطح
  benefits: string[];
  icon?: string;
  color?: string;
  isActive: boolean;
}

const loyaltyTierSchema = new Schema<ILoyaltyTier>(
  {
    name: { type: String, required: true, unique: true },
    minPoints: { type: Number, required: true },
    maxPoints: { type: Number, default: null },
    benefits: [{ type: String }],
    icon: { type: String },
    color: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const LoyaltyTier = model<ILoyaltyTier>('LoyaltyTier', loyaltyTierSchema);