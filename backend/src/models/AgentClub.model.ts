// backend/src/models/AgentClub.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IAgentClub extends Document {
  agentId: mongoose.Types.ObjectId;
  membersCount: number;
  totalViews: number;
  totalSmsSent: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentClubSchema = new Schema<IAgentClub>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
      unique: true,
      index: true,
    },
    membersCount: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalSmsSent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AgentClubSchema.index({ totalViews: -1 });
AgentClubSchema.index({ membersCount: -1 });

export const AgentClub = mongoose.model<IAgentClub>("AgentClub", AgentClubSchema);