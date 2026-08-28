// backend/src/models/AgentActivity.model.ts
import mongoose, { Schema, Document } from "mongoose";

export type AgentActivityType =
  | "member_added"
  | "member_removed"
  | "sms_sent"
  | "view"
  | "chat"
  | "rank_changed";

export interface IAgentActivity extends Document {
  agentId: mongoose.Types.ObjectId;
  type: AgentActivityType;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AgentActivitySchema = new Schema<IAgentActivity>({
  agentId: {
    type: Schema.Types.ObjectId,
    ref: "Agent",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["member_added", "member_removed", "sms_sent", "view", "chat", "rank_changed"],
    required: true,
  },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

AgentActivitySchema.index({ agentId: 1, createdAt: -1 });
AgentActivitySchema.index({ type: 1 });

export const AgentActivity = mongoose.model<IAgentActivity>("AgentActivity", AgentActivitySchema);