// backend/src/models/SmsCampaign.model.ts
import mongoose, { Schema, Document } from "mongoose";

export type SmsCampaignStatus = "pending" | "sent" | "failed" | "partial";

export interface ISmsCampaign extends Document {
  agentId: mongoose.Types.ObjectId;
  message: string;
  recipients: string[];
  recipientsCount: number;
  status: SmsCampaignStatus;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SmsCampaignSchema = new Schema<ISmsCampaign>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    recipients: [{ type: String }],
    recipientsCount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "partial"],
      default: "pending",
    },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

SmsCampaignSchema.index({ agentId: 1, createdAt: -1 });

export const SmsCampaign = mongoose.model<ISmsCampaign>("SmsCampaign", SmsCampaignSchema);