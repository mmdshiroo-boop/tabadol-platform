import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  // ─── user ───────────────────────────────
  | "ad_submitted"
  | "ad_approved"
  | "ad_rejected"
  | "ad_expired"
  | "new_message"
  | "vip_upgrade"
  | "loyalty_points_earned"   // 🆕
  | "tier_upgrade"            // 🆕
  // ─── admin ──────────────────────────────
  | "new_ad_pending"
  | "new_user_registered"
  | "new_comment"
  | "new_comment_reply"
  | "new_user"
  | "user_reported"
  | "ad_reported"
  | "user_banned"
  | "user_unbanned"
  | "report_created"
  // ─── تیکت‌ها ──────────────────────────────
  | "ticket_created"
  | "ticket_reply"
  | "ticket_closed"
  // ─── expert ─────────────────────────────
  | "ad_assigned"
  | "verification_request"
  // ─── agent ──────────────────────────────
  | "new_lead"
  | "listing_inquiry"
  | "new_agent"
  | "property_submitted"
  | "new_property_pending"
  | "property_assigned"
  | "property_approved"
  | "property_rejected"
  | "property_updated"
  | "property_sold"
  // ─── super_admin ────────────────────────
  | "system_alert"
  | "admin_action"
  | "revenue_milestone"
  | "backup_created"
  // ─── developer ──────────────────────────
  | "server_error"
  | "api_limit"
  | "deploy_success"
  // ─── عمومی ──────────────────────────────
  | "info"
  | "success"
  | "warning"
  | "error";

export type TargetRole =
  | "user"
  | "vip"
  | "agent"
  | "expert"
  | "admin"
  | "super_admin"
  | "developer";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  targetRole: TargetRole;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  priority?: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      enum: [
        "user",
        "vip",
        "agent",
        "expert",
        "admin",
        "super_admin",
        "developer",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        // user
        "ad_submitted",
        "ad_approved",
        "ad_rejected",
        "ad_expired",
        "new_message",
        "vip_upgrade",
        "loyalty_points_earned", // 🆕
        "tier_upgrade",          // 🆕
        // admin
        "new_ad_pending",
        "new_user_registered",
        "new_comment",
        "new_comment_reply",
        "new_user",
        "user_reported",
        "ad_reported",
        "user_banned",
        "report_created",
        "user_unbanned",
        // tickets
        "ticket_created",
        "ticket_reply",
        "ticket_closed",
        // expert
        "ad_assigned",
        "verification_request",
        // agent
        "new_lead",
        "listing_inquiry",
        "new_agent",
        "property_submitted",
        "new_property_pending",
        "property_assigned",
        "property_approved",
        "property_rejected",
        "property_updated",
        "property_sold",
        // super_admin
        "system_alert",
        "admin_action",
        "revenue_milestone",
        "backup_created",
        // developer
        "server_error",
        "api_limit",
        "deploy_success",
        // general
        "info",
        "success",
        "warning",
        "error",
      ],
      default: "info",
    },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, targetRole: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);