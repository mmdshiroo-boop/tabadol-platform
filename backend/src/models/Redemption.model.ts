import mongoose, { Schema, Document } from "mongoose";

export interface IRedemption extends Document {
  user: mongoose.Types.ObjectId;
  reward: mongoose.Types.ObjectId;
  pointsSpent: number;
  status: "pending" | "fulfilled" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionSchema = new Schema<IRedemption>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reward: { type: Schema.Types.ObjectId, ref: "Reward", required: true },
    pointsSpent: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "fulfilled", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Redemption = mongoose.model<IRedemption>("Redemption", RedemptionSchema);