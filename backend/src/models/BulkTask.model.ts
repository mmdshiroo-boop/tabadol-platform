import mongoose, { Schema, Document } from "mongoose";

export interface IBulkTask extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    total: number;
    processed: number;
    success: number;
    errors: number;
    skipped: number;
  };
  errorLog: { row: string; index: number; message: string }[];
  result: any;
  createdAt: Date;
  updatedAt: Date;
}

const BulkTaskSchema = new Schema<IBulkTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    progress: {
      total: { type: Number, default: 0 },
      processed: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
    errorLog: [
      {
        row: String,
        index: Number,
        message: String,
      },
    ],
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const BulkTask = mongoose.model<IBulkTask>("BulkTask", BulkTaskSchema);