
import mongoose, { Schema, Document } from "mongoose";

export interface IDailyAgentReport extends Document {
  userId: string;
  date: Date;
  totalAds: number;
  totalViews: number;
  activeAds: number;
  soldAds: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyAgentReportSchema = new Schema<IDailyAgentReport>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    totalAds: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    activeAds: { type: Number, default: 0 },
    soldAds: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// کامپوزیت یونیک ایندکس برای هر کاربر در هر روز
DailyAgentReportSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyAgentReport = mongoose.model<IDailyAgentReport>(
  "DailyAgentReport",
  DailyAgentReportSchema
);