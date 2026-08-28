import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole =
  | "user"
  | "vip"
  | "agent"
  | "developer"
  | "expert"
  | "admin"
  | "super_admin";

export interface INotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  newAdAlerts: boolean;
  adStatusAlerts: boolean;
  messageAlerts: boolean;
  messageAlertSchedule: "always" | "daytime" | "working_hours";
}

export interface IUserStats {
  totalLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  totalCommission: number;
}

export interface IUser extends Document {
  phone: string;
  stats: IUserStats;
  nationalCode?: string;
  phoneVerified: boolean;
  nationalCodeVerified: boolean;
  firstName?: string;
  lastName?: string;
  agencyName?: string;
  email?: string;
  avatar?: string;
  isVerified?: boolean;
  role: UserRole;
  province?: string;
  city?: string;
  district?: string;
  password?: string;
  adsCount: number;
  totalViews: number;
  rating: number;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  notificationSettings: INotificationSettings;

  // 🆕 باشگاه مشتریان
  loyaltyPoints: number;
  referralCode: string;
  referredBy?: Schema.Types.ObjectId | null;
  loyaltyTier?: Schema.Types.ObjectId | null;

  // 🆕 VIP
  isVip: boolean;

  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementAdsCount(): Promise<void>;
  incrementViews(views: number): Promise<void>;
}

const defaultNotificationSettings: INotificationSettings = {
  emailNotifications: true,
  smsNotifications: false,
  marketingEmails: false,
  newAdAlerts: true,
  adStatusAlerts: true,
  messageAlerts: true,
  messageAlertSchedule: "always",
};

const UserSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: [true, "شماره موبایل الزامی است"],
      unique: true,
      match: [/^09[0-9]{9}$/, "شماره موبایل معتبر نیست"],
      index: true,
    },
    nationalCode: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, "کد ملی باید ۱۰ رقم باشد"],
    },
    stats: {
      totalLeads: { type: Number, default: 0 },
      convertedLeads: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalCommission: { type: Number, default: 0 },
    },
    agencyName: { type: String, default: "" },
    phoneVerified: { type: Boolean, default: false },
    nationalCodeVerified: { type: Boolean, default: false },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "ایمیل معتبر نیست"],
    },
    avatar: {
      type: String,
      default: "/uploads/avatar/user.webp",
    },
    role: {
      type: String,
      enum: [
        "user",
        "vip",
        "agent",
        "developer",
        "expert",
        "admin",
        "super_admin",
      ],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    province: { type: String, default: "" },
    city: { type: String, default: "" },
    district: { type: String, default: "" },
    password: { type: String, select: false },
    adsCount: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    lastLogin: { type: Date, default: Date.now },
    notificationSettings: {
      type: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false },
        newAdAlerts: { type: Boolean, default: true },
        adStatusAlerts: { type: Boolean, default: true },
        messageAlerts: { type: Boolean, default: true },
        messageAlertSchedule: {
          type: String,
          enum: ["always", "daytime", "working_hours"],
          default: "always",
        },
      },
      default: defaultNotificationSettings,
    },

    // 🆕 فیلدهای باشگاه
    loyaltyPoints: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    loyaltyTier: { type: Schema.Types.ObjectId, ref: "LoyaltyTier", default: null },

    // 🆕 فیلد VIP
    isVip: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.index({ firstName: "text", lastName: "text", phone: "text" });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1, isBanned: 1 });

UserSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

UserSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.incrementAdsCount = async function (): Promise<void> {
  this.adsCount += 1;
  await this.save();
};

UserSchema.methods.incrementViews = async function (
  views: number,
): Promise<void> {
  this.totalViews += views;
  await this.save();
};

export const User = mongoose.model<IUser>("User", UserSchema);