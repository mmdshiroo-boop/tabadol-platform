import { Schema, model, Document } from 'mongoose';

export interface IPointsTransaction extends Document {
  user: Schema.Types.ObjectId;
  points: number; // مثبت برای دریافت، منفی برای کسر
  reason: string; // شناسه دلیل: 'registration', 'complete_profile', 'create_ad', 'referral'
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const pointsTransactionSchema = new Schema<IPointsTransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

export const PointsTransaction = model<IPointsTransaction>(
  'PointsTransaction',
  pointsTransactionSchema
);