import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  firstName: string;
  lastName: string;
  agencyName: string;
  phone: string;
  email?: string;
  nationalCode?: string;
  password: string;
  userId: mongoose.Types.ObjectId; // ✅ اضافه شد: حساب کاربری مشاور
  agencyId: mongoose.Types.ObjectId; // آژانس مادر
  propertiesCount: number;
  status: "active" | "inactive";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // تیک آبی
  isVerified: boolean;
  verificationRequestId?: mongoose.Types.ObjectId | null;
}

const AgentSchema = new Schema<IAgent>(
  {
    firstName: { type: String, required: true, trim: true },
    agencyName: { type: String, default: "" },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, lowercase: true, unique: true, sparse: true },
    nationalCode: { type: String, unique: true, sparse: true },
    password: { type: String, required: true, select: false },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // ✅
    agencyId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    propertiesCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationRequestId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationRequest",
      default: null,
    },
  },
  { timestamps: true },
);

AgentSchema.index({ userId: 1 }); // ✅
AgentSchema.index({ agencyId: 1, status: 1 });
AgentSchema.index({ phone: 1 });

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);