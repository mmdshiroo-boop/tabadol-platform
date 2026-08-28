// backend/src/services/notification.service.ts
import { User } from "../models";
import { NotificationType } from "../models/Notification.model";
import { UserNotificationSetting } from "../models/UserNotificationSetting.model";
import { sendRealTimeNotification } from "../socket";
import { Notification } from "../models/Notification.model";
type NotificationRole =
  | "user"
  | "vip"
  | "agent"
  | "expert"
  | "admin"
  | "super_admin"
  | "developer";

export const sendNotificationToUser = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => {
  try {
    const user = await User.findById(userId).select("role");
    const targetRole: NotificationRole =
      (user?.role as NotificationRole) || "user";

    const notification = await Notification.create({
      userId,
      targetRole,
      title,
      message,
      type,
      link,
      metadata,
      isRead: false,
    });

    console.log(`✅ Notification sent to ${targetRole}: ${title}`);

    sendRealTimeNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error("❌ sendNotificationToUser error:", error);
    return null;
  }
};

const notifyByRoles = async (
  roles: NotificationRole[],
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
  metadata?: Record<string, any>,
) => {
  try {
    const users = await User.find({
      role: { $in: roles },
      isActive: true,
    }).select("_id role");

    if (!users.length) return;

    const notifications = users.map((u) => ({
      userId: u._id,
      targetRole: u.role as NotificationRole,
      title,
      message,
      type,
      link,
      metadata,
      isRead: false,
    }));

    const created = await Notification.insertMany(notifications);

    for (let i = 0; i < users.length; i++) {
      sendRealTimeNotification(users[i]._id.toString(), created[i]);
    }

    console.log(
      `✅ Sent ${notifications.length} notifications to roles: ${roles.join(", ")}`,
    );
  } catch (error) {
    console.error("❌ notifyByRoles error:", error);
  }
};

// ✅ اصلاح‌شده: شامل admin و super_admin
export const notifyAdmins = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) =>
  notifyByRoles(["admin", "super_admin"], title, message, type, link, metadata);

export const notifyExperts = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => notifyByRoles(["expert"], title, message, type, link, metadata);

export const notifyAgents = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => notifyByRoles(["agent"], title, message, type, link, metadata);

export const notifyVipUsers = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => notifyByRoles(["vip"], title, message, type, link, metadata);

export const notifyDevelopers = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => notifyByRoles(["developer"], title, message, type, link, metadata);

export const notifySuperAdmins = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) => notifyByRoles(["super_admin"], title, message, type, link, metadata);
export const sendEmail = async (
  userId: string,
  subject: string,
  body: string,
) => {
  // بررسی تنظیمات کاربر
  const settings = await UserNotificationSetting.findOne({ user: userId });
  if (settings && !settings.emailNotifications) {
    console.log(`📧 Email skipped for user ${userId}: notifications disabled`);
    return; // ارسال نکن
  }

  // ... کد اصلی ارسال ایمیل (مثلاً با nodemailer)
  console.log(`📧 Email sent to user ${userId}: ${subject}`);
};
export const notifyAllUsers = (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  metadata?: Record<string, any>,
) =>
  notifyByRoles(
    ["user", "vip", "agent", "expert", "admin", "super_admin", "developer"],
    title,
    message,
    type,
    link,
    metadata,
  );

export const notifyVipUser = async (
  userId: string,
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
) => {
  return sendNotificationToUser(userId, title, message, type, link);
};

export const notifyAllVipUsers = async (
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
) => {
  return notifyByRoles(["vip"], title, message, type, link);
};

export const notifyAllDevelopers = async (
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
) => {
  return notifyByRoles(["developer"], title, message, type, link);
};
