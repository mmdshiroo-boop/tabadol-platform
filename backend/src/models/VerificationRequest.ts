import { Schema, model, Document } from 'mongoose';

export interface IVerificationRequest extends Document {
  agent: Schema.Types.ObjectId;
  documents: string[]; // آدرس فایل‌های آپلود شده
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: Schema.Types.ObjectId;
  reviewNote?: string;
}

const verificationRequestSchema = new Schema<IVerificationRequest>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, unique: true },
    documents: [{ type: String, required: true }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

export const VerificationRequest = model<IVerificationRequest>(
  'VerificationRequest',
  verificationRequestSchema
);