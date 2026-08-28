import { Request, Response } from "express";
import { User } from "../models/User.model";
import { Otp } from "../models/Otp.model";
import { Agent } from "../models/Agent.model";
import Session from "../models/Session";
import { parseDevice } from "../utils/deviceParser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  notifyAdmins,
  notifySuperAdmins,
  sendNotificationToUser,
} from "../services/notification.service";
import { WebhookService } from "../services/webhook.service";
import { createAuditLog } from "../services/auditLog.service";
import { CookieMonitorService } from "../services/cookieMonitor.service";
import { AuditAction } from "../models/AuditLog.model";
import { generateReferralCode, grantPoints, applyReferralCode } from "../services/loyalty.service";
import { LOYALTY_RULES } from "../config/loyalty";
import { addMemberByUserId } from "../services/agentClub.service";
const generateCode = (): string => {
  return "123456";
};

const createSession = async (userId: string, req: Request) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const { device, browser, os } = parseDevice(req.headers["user-agent"] || "");

  const existingSession = await Session.findOne({
    user: userId,
    ip,
    device,
    browser,
    os,
  });

  if (existingSession) {
    await Session.updateMany(
      { user: userId, isCurrent: true },
      { isCurrent: false },
    );

    existingSession.lastActive = new Date();
    existingSession.isCurrent = true;
    await existingSession.save();

    return existingSession._id.toString();
  }

  await Session.updateMany(
    { user: userId, isCurrent: true },
    { isCurrent: false },
  );

  const session = await Session.create({
    user: userId,
    ip,
    userAgent: req.headers["user-agent"] || "",
    device,
    browser,
    os,
    lastActive: new Date(),
    isCurrent: true,
  });

  return session._id.toString();
};

// ================== LOGIN ==================
export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({
        success: false,
        message: "لطفاً شماره موبایل و رمز عبور را وارد کنید",
      });

    let user: any = await User.findOne({ phone }).select("+password");
    let isAgent = false;

    if (!user) {
      const agent = (await Agent.findOne({ phone }).lean()) as any;
      if (agent) {
        user = await User.findById(agent.userId).select("+password");
        if (user) {
          isAgent = true;
          user.agentId = agent._id;
          user.agencyId = agent.agencyId;
          user.agentStatus = agent.status;
          user.isVerified = agent.isVerified;
        }
      }
    }

    if (!user)
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });

    if (isAgent) {
      if (user.agentStatus === "inactive")
        return res.status(403).json({
          success: false,
          message: "حساب کارشناس شما غیرفعال شده است.",
        });
    } else {
      if (user.isBanned)
        return res
          .status(403)
          .json({ success: false, message: "حساب کاربری شما مسدود شده است." });
      if (!user.isActive)
        return res
          .status(403)
          .json({ success: false, message: "حساب کاربری شما فعال نیست." });
    }

    // ✅ ذخیره‌ی lastLogin قبلی برای تشخیص اولین ورود
    const isFirstLogin = !user.lastLogin;

    // ✅ به‌روزرسانی lastLogin
    user.lastLogin = new Date();
    await user.save();

    const sessionId = await createSession(user._id.toString(), req);
    const token = jwt.sign(
      { id: user._id, sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" },
    );

    await CookieMonitorService.logEvent({
      userId: user._id.toString(),
      sessionId,
      type: "login",
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      cookieName: "access_token",
      status: "success",
    });

    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.USER_LOGIN,
      resource: "User",
      resourceId: user._id.toString(),
      description: `کاربر با شماره ${phone} وارد حساب کاربری خود شد.`,
      req,
    });

    // ✅ فقط در صورت اولین ورود، نوتیفیکیشن خوش‌آمدگویی ارسال شود
    if (isFirstLogin) {
      await sendNotificationToUser(
        user._id.toString(),
        "👋 خوش آمدید",
        `شما با موفقیت وارد حساب خود شدید.`,
        "success",
        "/panel/user/dashboard",
      );
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "این حساب با کد تأیید ساخته شده و رمز عبور ندارد. لطفاً از ورود با کد تأیید استفاده کنید.",
      });
    }

    const userData = {
      id: user._id,
      phone: user.phone,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: isAgent ? "agent" : user.role,
      avatar: user.avatar || "",
      isVerified: user.isVerified || false,
    };

    return res.status(200).json({ success: true, token, data: userData });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "خطایی در سرور رخ داده است." });
  }
};

export const requestVerificationCode = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.match(/^09[0-9]{9}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "شماره موبایل معتبر نیست" });
    }

    await Otp.deleteMany({ phone });
    const code = generateCode();
    await Otp.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      isUsed: false,
    });

    res.json({
      success: true,
      message: `کد تایید ارسال شد${process.env.NODE_ENV === "development" ? ` (برای تست: ${code})` : ""}`,
      expiresIn: 300,
    });
  } catch (error) {
    console.error("❌ Request code error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در درخواست کد تایید" });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "لطفاً رمز عبور فعلی و جدید را وارد کنید",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "حساب شما فاقد رمز عبور است. لطفاً از گزینه فراموشی رمز استفاده کنید.",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "رمز عبور فعلی اشتباه است",
      });
    }

    user.password = newPassword;
    await user.save();

    await createAuditLog({
      userId: userId.toString(),
      action: AuditAction.USER_CHANGE_PASSWORD,
      resource: "User",
      resourceId: userId.toString(),
      description: `کاربر ${user.firstName || user.phone} رمز عبور خود را تغییر داد.`,
      req,
    });

    return res.json({ success: true, message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ================== VERIFY CODE & AUTH ==================
export const verifyCodeAndAuth = async (req: Request, res: Response) => {
  try {
    const { phone, code, nationalCode, firstName, lastName, password, referralCode } = req.body;
    if (!phone || !code)
      return res.status(400).json({
        success: false,
        message: "شماره موبایل و کد تایید الزامی است",
      });

    const otpRecord = await Otp.findOne({
      phone,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otpRecord)
      return res
        .status(400)
        .json({ success: false, message: "کد تایید نامعتبر یا منقضی شده است" });

    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = new User({
        phone,
        password,
        nationalCode: nationalCode || undefined,
        firstName: firstName || "کاربر",
        lastName: lastName || "جدید",
        avatar: "/images/user.webp",
        phoneVerified: true,
        nationalCodeVerified: !!nationalCode,
        isActive: true,
        isBanned: false,
        role: "user",
        lastLogin: new Date(),
      });
      await user.save();
      isNewUser = true;

      // 🆕 تولید کد معرف یکتا
      user.referralCode = await generateReferralCode();
      await user.save();

      // 🆕 اعطای امتیاز ثبت‌نام
      await grantPoints(
        user._id.toString(),
        LOYALTY_RULES.REGISTRATION,
        "registration",
        "امتیاز ثبت‌نام"
      );

      // 🆕 در صورت وجود کد معرف، اعمال پاداش معرفی
// 🆕 افزودن خودکار کاربر به باشگاه مشاور معرف
if (referralCode) {
  const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
  if (referrer && referrer.role === "agent") {
    const agent = await Agent.findOne({ userId: referrer._id });
    if (agent) {
      try {
        await addMemberByUserId(agent._id.toString(), user._id.toString());
        console.log(`✅ کاربر ${user.phone} به باشگاه مشاور ${agent.firstName} اضافه شد`);
      } catch (err) {
        console.error("❌ افزودن به باشگاه ناموفق:", err);
      }
    }
  }
}

      await WebhookService.dispatchEvent("user.registered", {
        userId: user._id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      });

      await notifyAdmins(
        "👤 کاربر جدید ثبت‌نام کرد",
        `کاربر جدید با شماره ${phone} در سایت ثبت‌نام کرد.`,
        "new_user",
        `/admin/users/${user._id}`,
        { userId: user._id, userPhone: phone },
      );
      await notifySuperAdmins(
        "👤 کاربر جدید ثبت‌نام کرد",
        `کاربر جدید با شماره ${phone} در سایت ثبت‌نام کرد.`,
        "new_user",
        `/super-admin/users/${user._id}`,
        { userId: user._id, userPhone: phone },
      );

      await createAuditLog({
        userId: user._id.toString(),
        action: AuditAction.USER_REGISTER,
        resource: "User",
        resourceId: user._id.toString(),
        description: `کاربری با شماره ${phone} ثبت‌نام کرد.`,
        req,
      });

      await sendNotificationToUser(
        user._id.toString(),
        "🎉 خوش آمدید",
        "ثبت‌نام شما با موفقیت انجام شد. حالا می‌توانید آگهی خود را ثبت کنید.",
        "success",
        "/panel/user/dashboard",
      );
    } else {
      const isFirstLogin = !user.lastLogin;

      user.phoneVerified = true;
      user.lastLogin = new Date();
      await user.save();

      await createAuditLog({
        userId: user._id.toString(),
        action: AuditAction.USER_LOGIN,
        resource: "User",
        resourceId: user._id.toString(),
        description: `کاربر با شماره ${phone} وارد حساب کاربری خود شد.`,
        req,
      });

      if (isFirstLogin) {
        await sendNotificationToUser(
          user._id.toString(),
          "👋 خوش آمدید",
          "شما با موفقیت وارد حساب خود شدید.",
          "success",
          "/panel/user/dashboard",
        );
      }
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    const sessionId = await createSession(user._id.toString(), req);
    const token = jwt.sign(
      { id: user._id, role: user.role, sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    await CookieMonitorService.logEvent({
      userId: user._id.toString(),
      sessionId,
      type: "login",
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      cookieName: "access_token",
      status: "success",
    });

    res.json({
      success: true,
      message: isNewUser ? "ثبت‌نام موفق" : "ورود موفق",
      data: {
        id: user._id,
        phone: user.phone,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: user.role,
        avatar: user.avatar || "/images/user.webp",
        phoneVerified: user.phoneVerified,
        nationalCodeVerified: user.nationalCodeVerified,
        isVerified: user.isVerified || false,
      },
      token,
    });
  } catch (error) {
    console.error("❌ Verify code error:", error);
    res.status(500).json({ success: false, message: "خطا در تایید کد" });
  }
};

export const loginWithPassword = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "لطفاً شماره موبایل و رمز عبور را وارد کنید",
      });
    }

    let user: any = await User.findOne({ phone }).select("+password");
    let isAgent = false;

    if (!user) {
      const agent = await Agent.findOne({ phone }).select("+password");
      if (agent) {
        user = await User.findById(agent.userId).select("+password");
        isAgent = true;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "شماره موبایل یا رمز عبور اشتباه است",
      });
    }

    if (isAgent) {
      if (user.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "حساب کارشناس شما غیرفعال شده است.",
        });
      }
    } else {
      if (user.isBanned) {
        return res
          .status(403)
          .json({ success: false, message: "حساب کاربری شما مسدود شده است." });
      }
    }

    const isFirstLogin = !user.lastLogin;
    user.lastLogin = new Date();
    await user.save();

    const sessionId = await createSession(user._id.toString(), req);

    const token = jwt.sign(
      { id: user._id, sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" },
    );

    await CookieMonitorService.logEvent({
      userId: user._id.toString(),
      sessionId,
      type: "login",
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "",
      cookieName: "access_token",
      status: "success",
      navigation: {
        currentPath: req.originalUrl,
        referrer: req.headers["referer"] || "",
      },
      cookieData: {
        name: "access_token",
      },
    });

    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.USER_LOGIN,
      resource: "User",
      resourceId: user._id.toString(),
      description: `کاربر با شماره ${phone} وارد حساب کاربری خود شد.`,
      req,
    });

    if (isFirstLogin) {
      await sendNotificationToUser(
        user._id.toString(),
        "👋 خوش آمدید",
        "شما با موفقیت وارد حساب خود شدید.",
        "success",
        "/panel/user/dashboard",
      );
    }

    const userData = {
      id: user._id,
      phone: user.phone,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: isAgent ? "agent" : user.role,
      avatar: user.avatar || "",
      isVerified: user.isVerified || false,
    };

    if (isAgent) {
      await user.save();
    }

    return res.status(200).json({ success: true, token, data: userData });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "خطایی در سرور رخ داده است." });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.match(/^09[0-9]{9}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "شماره موبایل معتبر نیست" });
    }

    await Otp.deleteMany({ phone });
    const code = generateCode();
    await Otp.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      isUsed: false,
    });

    res.json({
      success: true,
      message: `کد جدید ارسال شد${process.env.NODE_ENV === "development" ? ` (برای تست: ${code})` : ""}`,
      expiresIn: 300,
    });
  } catch (error) {
    console.error("❌ Resend code error:", error);
    res
      .status(500)
      .json({ success: false, message: "خطا در درخواست کد تایید" });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "کاربر احراز هویت نشده است" });

    let user = await User.findById(userId).select("-password").lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "کاربر یافت نشد" });

    if (user.role === "agent") {
      const agent = (await Agent.findOne({ userId }).lean()) as any;
      if (agent) {
        (user as any).agentId = agent._id;
        (user as any).agencyId = agent.agencyId;
        (user as any).agentStatus = agent.status;
        (user as any).propertiesCount = agent.propertiesCount || 0;
        (user as any).isVerified = agent.isVerified;
      }
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.sessionId;
    if (sessionId && req.user) {
      await CookieMonitorService.logEvent({
        userId: req.user._id.toString(),
        sessionId,
        type: "logout",
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.headers["user-agent"] || "",
        cookieName: "access_token",
        status: "success",
      });
    }

    res.clearCookie("token");
    res.json({ success: true, message: "با موفقیت خارج شدید" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل، کد تایید و رمز عبور جدید الزامی هستند",
      });
    }

    if (!phone.match(/^09[0-9]{9}$/)) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل معتبر نیست",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد",
      });
    }

    const otpRecord = await Otp.findOne({
      phone,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "کد تایید نامعتبر یا منقضی شده است",
      });
    }

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "کاربری با این شماره موبایل یافت نشد",
      });
    }

    user.password = newPassword;
    await user.save();

    otpRecord.isUsed = true;
    await otpRecord.save();

    await createAuditLog({
      userId: user._id.toString(),
      action: AuditAction.USER_CHANGE_PASSWORD,
      resource: "User",
      resourceId: user._id.toString(),
      description: `کاربر ${user.firstName || user.phone} رمز عبور خود را از طریق فراموشی رمز تغییر داد.`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "خطایی در سرور رخ داده است",
    });
  }
};