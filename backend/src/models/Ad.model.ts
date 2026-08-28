// backend/src/models/Ad.model.ts
import mongoose, { Schema, Document } from "mongoose";

export type PriceType = "fixed" | "negotiable" | "auction";
export type AdStatus =
  | "pending"
  | "active"
  | "sold"
  | "expired"
  | "rejected"
  | "flagged";
export type SourceType = "divar" | "sheypoor" | "bama" | "manual";
export type AdType = "sale" | "rent" | "daily_rent" | "exchange" | "mortgage";
export type OccupancyStatus = "empty" | "occupied" | "tenant";
export type FurnishingStatus = "furnished" | "semi_furnished" | "empty";
export type RenovationStatus =
  | "fully_renovated"
  | "partially_renovated"
  | "needs_renovation";

export type PropertyType =
  | "apartment"
  | "villa"
  | "house"
  | "land"
  | "suite"
  | "office"
  | "commercial"
  | "bare_land"
  | "penthouse"
  | "duplex"
  | "garden"
  | "hotel";

export type UsageType =
  | "maskani"
  | "tejarati"
  | "edari"
  | "sanati"
  | "amozeshi"
  | "behdashti"
  | "vardaneshi"
  | "other";

export type HeatingSystem =
  | "shoofazh"
  | "pakage"
  | "dastgah_markazi"
  | "heater"
  | "adeghi"
  | "other";

export type CoolingSystem =
  | "kooler_aby"
  | "kooler_gazi"
  | "split"
  | "chiller"
  | "fancoil"
  | "other";

export type FlooringType =
  | "ceramic"
  | "parket"
  | "moquet"
  | "sang"
  | "laminet"
  | "epoxy"
  | "other";

export type OfficeType =
  | "mustaqel"
  | "tabaghei"
  | "majmooe_edari"
  | "pasaazh"
  | "bazar_sanati"
  | "other";

export type LandUsageType =
  | "maskani"
  | "keshavarzi"
  | "sanati"
  | "tejarati"
  | "bagh"
  | "other";

export interface IAmenities {
  parking?: boolean;
  storage?: boolean;
  elevator?: boolean;
  balcony?: boolean;
  fireplace?: boolean;
  gym?: boolean;
  pool?: boolean;
  sauna?: boolean;
  jacuzzi?: boolean;
  wifi?: boolean;
  tv?: boolean;
  kitchen?: boolean;
  yard?: boolean;
}

export interface IAdditionalProperty {
  name: string;
  value: string;
}

export interface IAd extends Document {
  // فیلدهای اصلی
  title: string;
  slug: string;
  description: string;
  price: number;
  priceType: PriceType;
  priceString?: string;
  isPriceNegotiable?: boolean;

  // دسته‌بندی
  category: mongoose.Types.ObjectId;
  categoryName?: string;
  adType: AdType;
  customCategory?: string;
  propertyType?: PropertyType;

  // موقعیت مکانی
  province?: string;
  city: string;
  district?: string;
  neighborhood?: string;
  fullAddress?: string;
  address?: string;
  latitude?: number;
  longitude?: number;

  // مشخصات فیزیکی
  area?: number;
  buildingArea?: number;
  rooms?: number;
  buildingAge?: number;

  // مشخصات زمین
  landLength?: number;
  landWidth?: number;
  documentType?: string;

  // مشخصات ساختمان
  parkingCount?: number;
  floorCount?: number;
  floor?: number;
  unitsPerFloor?: number;
  yearBuilt?: number;
  occupancyStatus?: OccupancyStatus;
  buildingOrientation?: string;
  unitOrientation?: string;
  buildingFacade?: string;

  // کاربری ملک
  usage?: UsageType;

  // سیستم گرمایش و سرمایش
  heatingSystem?: HeatingSystem;
  coolingSystem?: CoolingSystem;

  // کف‌پوش
  flooring?: FlooringType;

  // وضعیت ملک
  furnishingStatus?: FurnishingStatus;
  renovationStatus?: RenovationStatus;
  region?: string;
  regionName?: string;

  // نوع دفتر/مغازه
  officeType?: OfficeType;

  // کاربری زمین
  landUsage?: LandUsageType;

  // برای اجاره روزانه
  rentalPricePerNight?: number;
  capacity?: number;

  // امکانات
  kitchenFeatures?: string[];
  securityFeatures?: string[];
  amenities?: IAmenities;
  additionalProperties?: IAdditionalProperty[];

  // تصاویر و رسانه
  images: string[];
  video?: string;

  // اطلاعات تماس
  contactPhone: string;
  contactName?: string;

  // اطلاعات فروشنده
  sellerName?: string;
  sellerType?: string;
  agencyName?: string;

  // آمار
  views: number;
  shares: number;
  saves: number;
  reports: number;

  // وضعیت
  status: AdStatus;
  isUrgent: boolean;
  urgentExpiry?: Date | null; // ✅ فیلد تاریخ انقضای فوری
  isVerified: boolean;
  rejectReason?: string;
  flagReason?: string;
  flagSeverity?: string;

  // VIP
  isVip: boolean;
  vipExpiry?: Date | null;
  vipViews?: number;
  vipClicks?: number;

  // منبع داده
  source: SourceType;
  sourceId?: string;
  sourceUrl?: string;

  // داده خام اصلی
  rawData?: any;
  rawAttributes?: Map<string, any>;

  // سیستمی
  userId: mongoose.Types.ObjectId;
  uploadedBy?: mongoose.Types.ObjectId;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // متدها
  incrementViews(): Promise<void>;
  incrementShares(): Promise<void>;
  isExpired(): boolean;
  isVipActive(): boolean;
}

const AdSchema = new Schema<IAd>(
  {
    // فیلدهای اصلی
    title: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, unique: true, sparse: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    priceType: {
      type: String,
      enum: ["fixed", "negotiable", "auction"],
      default: "fixed",
    },
    priceString: { type: String },
    isPriceNegotiable: { type: Boolean, default: false },

    // دسته‌بندی
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    categoryName: { type: String },
    adType: {
      type: String,
      enum: ["sale", "rent", "daily_rent", "exchange", "mortgage"],
      default: "sale",
      required: true,
    },
    customCategory: { type: String },
    propertyType: {
      type: String,
      enum: [
        "apartment",
        "villa",
        "house",
        "land",
        "suite",
        "office",
        "commercial",
        "bare_land",
        "penthouse",
        "duplex",
        "garden",
        "hotel",
      ],
      index: true,
    },

    // موقعیت مکانی
    province: { type: String },
    city: { type: String, required: true },
    district: { type: String },
    neighborhood: { type: String },
    fullAddress: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    region: {
      type: String,
      enum: ["شمال", "جنوب", "شرق", "غرب", "مرکز", "سایر"],
      index: true,
    },
    regionName: { type: String },

    // مشخصات فیزیکی
    area: { type: Number, min: 0 },
    buildingArea: { type: Number, min: 0 },
    rooms: { type: Number, min: 0 },
    buildingAge: { type: Number, min: 0 },

    // مشخصات زمین
    landLength: { type: Number },
    landWidth: { type: Number },
    documentType: { type: String },

    // مشخصات ساختمان
    parkingCount: { type: Number, default: 0, min: 0 },
    floorCount: { type: Number, min: 0 },
    floor: { type: Number, min: -2 },
    unitsPerFloor: { type: Number, min: 0 },
    yearBuilt: { type: Number, min: 1300, max: 1410 },
    occupancyStatus: {
      type: String,
      enum: ["empty", "occupied", "tenant"],
    },
    buildingOrientation: { type: String },
    unitOrientation: { type: String },
    buildingFacade: { type: String, index: true },

    // کاربری ملک
    usage: {
      type: String,
      enum: [
        "maskani",
        "tejarati",
        "edari",
        "sanati",
        "amozeshi",
        "behdashti",
        "vardaneshi",
        "other",
      ],
      index: true,
    },

    // سیستم گرمایش و سرمایش
    heatingSystem: {
      type: String,
      enum: [
        "shoofazh",
        "pakage",
        "dastgah_markazi",
        "heater",
        "adeghi",
        "other",
      ],
      index: true,
    },
    coolingSystem: {
      type: String,
      enum: [
        "kooler_aby",
        "kooler_gazi",
        "split",
        "chiller",
        "fancoil",
        "other",
      ],
      index: true,
    },

    // کف‌پوش
    flooring: {
      type: String,
      enum: [
        "ceramic",
        "parket",
        "moquet",
        "sang",
        "laminet",
        "epoxy",
        "other",
      ],
      index: true,
    },

    // وضعیت ملک
    furnishingStatus: {
      type: String,
      enum: ["furnished", "semi_furnished", "empty"],
    },
    renovationStatus: {
      type: String,
      enum: ["fully_renovated", "partially_renovated", "needs_renovation"],
    },

    // نوع دفتر/مغازه
    officeType: {
      type: String,
      enum: [
        "mustaqel",
        "tabaghei",
        "majmooe_edari",
        "pasaazh",
        "bazar_sanati",
        "other",
      ],
      index: true,
    },

    // کاربری زمین
    landUsage: {
      type: String,
      enum: ["maskani", "keshavarzi", "sanati", "tejarati", "bagh", "other"],
      index: true,
    },

    // برای اجاره روزانه
    rentalPricePerNight: { type: Number, default: 0, min: 0 },
    capacity: { type: Number, default: 0, min: 0 },

    // امکانات
    kitchenFeatures: [{ type: String }],
    securityFeatures: [{ type: String }],
    amenities: {
      parking: { type: Boolean, default: false },
      storage: { type: Boolean, default: false },
      elevator: { type: Boolean, default: false },
      balcony: { type: Boolean, default: false },
      fireplace: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      sauna: { type: Boolean, default: false },
      jacuzzi: { type: Boolean, default: false },
      wifi: { type: Boolean, default: false },
      tv: { type: Boolean, default: false },
      kitchen: { type: Boolean, default: false },
      yard: { type: Boolean, default: false },
    },
    additionalProperties: [
      {
        name: { type: String },
        value: { type: String },
      },
    ],

    // تصاویر و رسانه
    images: [{ type: String }],
    video: { type: String },

    // اطلاعات تماس
    contactPhone: { type: String, required: true },
    contactName: { type: String },

    // اطلاعات فروشنده
    sellerName: { type: String },
    sellerType: { type: String },
    agencyName: { type: String },

    // آمار
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },

    // وضعیت
    status: {
      type: String,
      enum: ["pending", "active", "sold", "expired", "rejected", "flagged"],
      default: "pending",
    },
    isUrgent: { type: Boolean, default: false },
    urgentExpiry: { type: Date, default: null }, 
    isVerified: { type: Boolean, default: false },
    rejectReason: { type: String },
    flagReason: { type: String },
    flagSeverity: { type: String },

    // VIP
    isVip: { type: Boolean, default: false },
    vipExpiry: { type: Date, default: null },
    vipViews: { type: Number, default: 0 },
    vipClicks: { type: Number, default: 0 },

    // منبع داده
    source: {
      type: String,
      enum: ["divar", "sheypoor", "bama", "manual"],
      default: "manual",
    },
    sourceId: { type: String },
    sourceUrl: { type: String },

    // داده خام اصلی
    rawData: { type: Schema.Types.Mixed },
    rawAttributes: { type: Map, of: Schema.Types.Mixed },

    // سیستمی
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      },
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true },
);

// ایندکس‌ها
AdSchema.index({ title: "text", description: "text" });
AdSchema.index({ city: 1, status: 1, createdAt: -1 });
AdSchema.index({ price: 1, category: 1 });
AdSchema.index({ userId: 1, createdAt: -1 });
AdSchema.index({ status: 1, expiresAt: 1 });
AdSchema.index({ isVip: 1, vipExpiry: 1 });
AdSchema.index({ isUrgent: 1, urgentExpiry: 1 });
AdSchema.index({ source: 1, sourceId: 1 }, { sparse: true });
AdSchema.index({ province: 1, city: 1 });
AdSchema.index({ area: 1 });
AdSchema.index({ rooms: 1 });
AdSchema.index({ buildingAge: 1 });
AdSchema.index({ rentalPricePerNight: 1 });
AdSchema.index({ capacity: 1 });
AdSchema.index({ "amenities.parking": 1 });
AdSchema.index({ "amenities.elevator": 1 });
AdSchema.index({ "amenities.pool": 1 });
AdSchema.index({ floor: 1 });
AdSchema.index({ floorCount: 1 });
AdSchema.index({ yearBuilt: 1 });
AdSchema.index({ "amenities.storage": 1 });
AdSchema.index({ "amenities.balcony": 1 });
AdSchema.index({ "amenities.yard": 1 });
AdSchema.index({ "amenities.sauna": 1 });
AdSchema.index({ documentType: 1 });
AdSchema.index({ landWidth: 1 });
AdSchema.index({ landLength: 1 });
AdSchema.index({ source: 1, sourceId: 1 }, { unique: true, sparse: true });
// Virtual
AdSchema.virtual("shortDescription").get(function (this: IAd) {
  return this.description.length > 200
    ? this.description.substring(0, 200) + "..."
    : this.description;
});

// Middleware
AdSchema.pre("save", async function () {
  if (this.isNew || this.isModified("title")) {
    const baseSlug = (this.title || "ad")
      .replace(/[^\w\u0600-\u06FF\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .substring(0, 60);
    const uniquePart = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.slug = `${baseSlug}-${uniquePart}`;
  }
});

// متدها
AdSchema.methods.incrementViews = async function (this: IAd): Promise<void> {
  this.views += 1;
  await this.save();
};

AdSchema.methods.incrementShares = async function (this: IAd): Promise<void> {
  this.shares += 1;
  await this.save();
};

AdSchema.methods.isExpired = function (this: IAd): boolean {
  return this.expiresAt < new Date();
};

AdSchema.methods.isVipActive = function (this: IAd): boolean {
  if (!this.isVip) return false;
  if (!this.vipExpiry) return true;
  return this.vipExpiry > new Date();
};

export const Ad = mongoose.model<IAd>("Ad", AdSchema);