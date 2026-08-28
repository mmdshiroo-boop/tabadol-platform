// backend/src/models/ClubMember.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IClubMember extends Document {
  agentId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  phone: string;
  name?: string;
  joinedAt: Date;
  notes?: string;
  interactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClubMemberSchema = new Schema<IClubMember>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    phone: { type: String, required: true, index: true },
    name: { type: String, trim: true },
    joinedAt: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    interactionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ClubMemberSchema.index({ agentId: 1, phone: 1 }, { unique: true });
ClubMemberSchema.index({ agentId: 1, joinedAt: -1 });
ClubMemberSchema.index({ agentId: 1, name: "text", phone: "text" });

export const ClubMember = mongoose.model<IClubMember>("ClubMember", ClubMemberSchema);