import mongoose, { Schema, Document } from "mongoose";

export interface IReward extends Document {
  title: string;
  description: string;
  pointsCost: number;
  stock: number; // موجودی (تعداد)
  isActive: boolean;
  type: "discount" | "gift" | "service" | "other";
  discountPercent?: number;
  discountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    pointsCost: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 1, min: 0 },
    isActive: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ["discount", "gift", "service", "other"],
      default: "other",
    },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountAmount: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export const Reward = mongoose.model<IReward>("Reward", RewardSchema);