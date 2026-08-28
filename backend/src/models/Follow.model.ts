import mongoose, { Schema, Document } from "mongoose";

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId; // کسی که فالو می‌کند
  following: mongoose.Types.ObjectId; // کسی که فالو می‌شود
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = mongoose.model<IFollow>("Follow", FollowSchema);