// backend/src/middleware/auth.middleware.ts
import jwt from "jsonwebtoken";
import { User } from "../models/User.model";
import { Agent } from "../models/Agent.model";
import { Request, Response, NextFunction } from "express";
import Session from "../models/Session";
import Role from "../models/Role";

export interface AuthRequest extends Request {
  user?: any;
  sessionId?: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("🔒 Protect middleware - URL:", req.originalUrl, "Method:", req.method);

    const isAdminOrUserRoute =
      req.originalUrl.includes("/admin/") || req.originalUrl.includes("/me");

    if (!isAdminOrUserRoute) {
      const publicPaths = [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/send-code",
        "/api/auth/verify-code",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/public",
        "/api/locations/provinces",
        "/api/locations/cities",
        "/api/locations/from-ip",
        "/api/locations/reverse-geocode",
        "/api/categories",
        "/api/properties/market-analysis",
        "/api/ad-banners",
        "/api/market-analysis",
        "/api/market",
        "/api/health",
        "/api/page-view",
        "/api-docs",
      ];

      if (publicPaths.some((path) => req.originalUrl.startsWith(path))) {
        console.log("✅ Public path - skipping auth");
        return next();
      }

      if (req.method === "GET") {
        const publicGetIdPatterns = [
          /^\/api\/properties\/[a-f0-9]{24}$/,
          /^\/api\/ads\/[a-f0-9]{24}$/,
          /^\/api\/agents\/[a-f0-9]{24}$/,
        ];

        if (publicGetIdPatterns.some((pattern) => pattern.test(req.originalUrl))) {
          console.log("✅ Public GET id route - skipping auth");
          return next();
        }
      }

      const publicGetPatterns = [
        /^\/api\/ads(\?|$)/,
        /^\/api\/ads\/search/,
        /^\/api\/ads\/category/,
        /^\/api\/ads\/popular-categories/,
        /^\/api\/ads\/price-range/,
        /^\/api\/ads\/filter/,
        /^\/api\/ads\/category-names/,
        /^\/api\/properties\?/,
        /^\/api\/properties$/,
        /^\/api\/agents\/public/,
        /^\/api\/conversations\/[a-f0-9]{24}\/messages$/,
        /^\/api\/comments\/ad\//,
        /^\/api\/users\/public\//,
      ];

      const isPublicGet =
        req.method === "GET" &&
        publicGetPatterns.some((pattern) => pattern.test(req.originalUrl));

      if (isPublicGet) {
        console.log("✅ Public GET route - skipping auth");
        return next();
      }
    }

    let token = req.headers.authorization?.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    if (!token && req.cookies?.token) token = req.cookies.token;
    if (!token && req.query.token) token = req.query.token as string;

    console.log("🎫 Token found:", token ? "✅ Yes" : "❌ No");

    if (!token) {
      return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      sessionId?: string;
    };
    console.log("🔑 Token decoded - User ID:", decoded.id);

    if (decoded.sessionId) {
      const sessionExists = await Session.exists({ _id: decoded.sessionId });
      if (!sessionExists) {
        console.log("❌ Session not found:", decoded.sessionId);
        return res.status(401).json({
          success: false,
          message: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
        });
      }
    }

    req.sessionId = decoded.sessionId;

    let user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("❌ User not found:", decoded.id);
      return res.status(401).json({ success: false, message: "کاربر یافت نشد" });
    }

    console.log("👤 User found - Role:", user.role);

    // ✅ بررسی پروفایل مشاور بدون توجه به role کاربر
    const agentProfile = await Agent.findOne({ userId: user._id }).lean();

    if (agentProfile) {
      user.role = "agent"; // نقش را agent می‌کنیم
      (user as any).agentId = agentProfile._id;
      (user as any).agencyId = agentProfile.agencyId;
      (user as any).propertiesCount = agentProfile.propertiesCount || 0;
      (user as any).agentStatus = agentProfile.status;
      (user as any).isVerified = agentProfile.isVerified;
      (user as any).verificationRequestId = agentProfile.verificationRequestId;

      if (agentProfile.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "حساب کارشناس شما غیرفعال شده است",
        });
      }
    } else if (user.role === "agent") {
      console.log("⚠️ Agent profile not found for user:", user._id);
    }

    req.user = user;
    console.log("✅ Auth successful");
    next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    if (error instanceof jwt.JsonWebTokenError)
      return res.status(401).json({ success: false, message: "توکن نامعتبر" });
    if (error instanceof jwt.TokenExpiredError)
      return res.status(401).json({ success: false, message: "توکن منقضی شده" });
    return res.status(500).json({ success: false, message: "خطا در احراز هویت" });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "لطفاً وارد شوید" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `شما دسترسی به این بخش ندارید. نقش شما: ${req.user.role}`,
      });
    }
    next();
  };
};

export const hasPermission = (...requiredPermissions: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "شما وارد نشده‌اید" });
    }

    // ✅ دسترسی کامل برای super_admin بدون نیاز به Role
    if (req.user.role === "super_admin") {
      console.log("✅ super_admin bypassing permission check");
      return next();
    }

    const roleDoc = await Role.findOne({ name: req.user.role, isActive: true });
    if (!roleDoc) {
      return res.status(403).json({ success: false, message: "نقش شما یافت نشد یا غیرفعال است" });
    }
    const userPermissions = roleDoc.permissions || [];
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        message: `شما مجوز کافی برای این عملیات را ندارید. مجوزهای لازم: ${requiredPermissions.join("، ")}`,
      });
    }
    next();
  };
};

export const adminOnly = requireRole("admin", "super_admin");
export const superAdminOnly = requireRole("super_admin");
export const agentOnly = requireRole("agent", "admin", "super_admin");
export const developerOnly = requireRole("developer", "admin", "super_admin");

export const ownerOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "شما وارد نشده‌اید" });
  const resourceUserId = req.params.userId || req.body.userId;
  if (req.user.role === "admin" || req.user.role === "super_admin") return next();
  if (req.user._id.toString() !== resourceUserId) {
    return res.status(403).json({ success: false, message: "شما اجازه دسترسی به این منبع را ندارید" });
  }
  next();
};

export const profileComplete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ success: false, message: "شما وارد نشده‌اید" });
  if (!req.user.firstName || !req.user.lastName || !req.user.email) {
    return res.status(403).json({ success: false, message: "لطفاً ابتدا پروفایل خود را کامل کنید" });
  }
  next();
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.headers.authorization?.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    if (!token && req.cookies?.token) token = req.cookies.token;
    if (!token && req.query.token) token = req.query.token as string;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      sessionId?: string;
    };

    let user = await User.findById(decoded.id).select("-password");
    if (user) {
      const agentProfile = await Agent.findOne({ userId: user._id }).lean();
      if (agentProfile) {
        user.role = "agent";
        (user as any).agentId = agentProfile._id;
        (user as any).agencyId = agentProfile.agencyId;
        (user as any).isVerified = agentProfile.isVerified;
      }
      req.user = user;
    }
  } catch (error) {
    // خطا در احراز اختیاری – نادیده گرفته می‌شود
  }
  next();
};

export const authMiddleware = protect;