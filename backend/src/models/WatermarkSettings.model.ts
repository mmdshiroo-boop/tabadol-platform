import mongoose, { Schema, Document } from "mongoose";

export interface IWatermarkSettings extends Document {
  enabled: boolean;
  text: string;
  opacity: number;
  fontSize: number;
  color: string;
  position: "tiled" | "corner" | "center";
  tileSize: number;
  rotation: number;
  fontFamily: string;
  fontWeight: string;
  minWidth: number;
  minHeight: number;
  applyTo: "all" | "ads_only";
  createdAt: Date;
  updatedAt: Date;
}

const WatermarkSettingsSchema = new Schema<IWatermarkSettings>(
  {
    enabled: { type: Boolean, default: true },
    text: { type: String, default: "تبادل", trim: true },
    opacity: { type: Number, default: 0.12, min: 0, max: 1 },
    fontSize: { type: Number, default: 18, min: 10, max: 120 }, // ✅ کوچک‌تر
    color: { type: String, default: "#ffffff" },
    position: {
      type: String,
      enum: ["tiled", "corner", "center"],
      default: "corner", // ✅ پایین سمت چپ
    },
    tileSize: { type: Number, default: 220, min: 80, max: 600 },
    rotation: { type: Number, default: 0, min: -90, max: 90 }, // بدون چرخش برای گوشه
    fontFamily: { type: String, default: "sans-serif" },
    fontWeight: {
      type: String,
      enum: ["normal", "bold", "lighter"],
      default: "bold",
    },
    minWidth: { type: Number, default: 200, min: 0 },
    minHeight: { type: Number, default: 200, min: 0 },
    applyTo: {
      type: String,
      enum: ["all", "ads_only"],
      default: "ads_only",
    },
  },
  { timestamps: true },
);

WatermarkSettingsSchema.index({}, { unique: true });

export const WatermarkSettings = mongoose.model<IWatermarkSettings>(
  "WatermarkSettings",
  WatermarkSettingsSchema,
);