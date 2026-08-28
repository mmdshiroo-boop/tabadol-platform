import apiClient from "./client";
import { cookieAuditService } from "@/services/api/cookieAudit.api";

// ==================== تایپ‌ها ====================

export interface AdminUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  nationalCode?: string;
  role: "admin" | "super_admin";
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface SystemStats {
  totalUsers: number;
  totalAdmins: number;
  totalAds: number;
  totalViews: number;
  totalProperties: number;
  pendingAds: number;
  pendingProperties: number;
  serverUptime: string;
  databaseSize: string;
  monthlyGrowth: number;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    banned: number;
    byRole: {
      user: number;
      vip: number;
      agent: number;
      expert: number;
      admin: number;
      super_admin: number;
      developer: number;
    };
  };
  ads: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  revenue: {
    total: number;
  };
}

export interface AdminReport {
  _id: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  period: {
    start: string;
    end: string;
  };
  stats: AdminStats;
  createdAt: string;
}

export interface SystemLog {
  _id: string;
  action: string;
  user: string;
  userRole: string;
  ip: string;
  timestamp: string;
  status: "success" | "error" | "warning";
  details: string;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  siteFavicon: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  adApprovalRequired: boolean;
  maxAdImages: number;
  defaultAdDuration: number;
  freeAdLimitPerUser: number;
  vipAdPrice: number;
  enableSmsNotifications: boolean;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  maintenanceMode: boolean;
  debugMode: boolean;
  itemsPerPage: number;
  cacheDuration: number;
}

// ==================== API ====================
export const adminApi = {
  // ==================== آمار سیستم ====================
  getStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get("/super-admin/dashboard");
    return response.data?.data ?? response.data;
  },

  getAdminStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get("/admin/stats");
    return response.data?.data ?? response.data;
  },

  getReports: async (limit: number = 30): Promise<AdminReport[]> => {
    const response = await apiClient.get(`/admin/reports?limit=${limit}`);
    return response.data?.data ?? response.data ?? [];
  },

  generateDailyReport: async (): Promise<AdminReport> => {
    const response = await apiClient.post("/admin/reports/daily");
    return response.data?.data ?? response.data;
  },

  // ==================== مدیریت ادمین‌ها ====================
  getAdmins: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get("/super-admin/admins");
    return response.data?.data ?? response.data ?? [];
  },

  createAdmin: async (
    data: Pick<AdminUser, "phone" | "firstName" | "lastName" | "role"> & {
      nationalCode?: string;
    },
  ) => {
    const response = await apiClient.post("/super-admin/admins", data);
    return response.data?.data ?? response.data;
  },

  updateAdmin: async (
    id: string,
    data: Partial<
      Pick<AdminUser, "firstName" | "lastName" | "role" | "isActive">
    >,
  ) => {
    const response = await apiClient.put(`/super-admin/admins/${id}`, data);
    return response.data?.data ?? response.data;
  },

  deleteAdmin: async (id: string): Promise<void> => {
    await apiClient.delete(`/super-admin/admins/${id}`);
  },

  toggleAdminStatus: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.patch(
      `/super-admin/admins/${id}/toggle-status`,
    );
    return response.data?.data ?? response.data;
  },

  // ==================== مدیریت کاربران ====================
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => {
    const response = await apiClient.get("/super-admin/users", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  updateUserRole: async (id: string, role: string): Promise<void> => {
    await apiClient.patch(`/super-admin/users/${id}/role`, { role });
  },

  banUser: async (id: string, reason?: string): Promise<void> => {
    await apiClient.post(`/super-admin/users/${id}/ban`, { reason });
  },

  unbanUser: async (id: string): Promise<void> => {
    await apiClient.post(`/super-admin/users/${id}/unban`);
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/super-admin/users/${id}`);
  },

  forceDeleteAd: async (id: string): Promise<void> => {
    await apiClient.delete(`/super-admin/ads/${id}/force`);
  },

  // ==================== مدیریت آگهی‌ها ====================
  getAdminAds: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) => {
    const response = await apiClient.get("/admin/ads", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  getAllAds: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await apiClient.get("/super-admin/ads", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  updateAdStatus: async (
    id: string,
    status: string,
    rejectReason?: string,
  ): Promise<void> => {
    await apiClient.put(`/admin/ads/${id}/status`, { status, rejectReason });
  },

  deleteAd: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/ads/${id}`);
  },

  // ==================== کاربران (ادمین عادی) ====================
  getAdminUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    status?: string;
  }) => {
    const response = await apiClient.get("/admin/users", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  updateUserStatus: async (
    id: string,
    isBanned: boolean,
    banReason?: string,
  ): Promise<void> => {
    await apiClient.put(`/admin/users/${id}/status`, { isBanned, banReason });
  },

  deleteUserByAdmin: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  // ==================== تنظیمات ====================
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get("/super-admin/settings");
    return response.data?.data ?? response.data;
  },

  updateSettings: async (data: Partial<SystemSettings>): Promise<any> => {
    const response = await apiClient.put("/super-admin/settings", data);
    return response.data;
  },

  // ==================== لاگ‌های سیستمی ====================
  getLogs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const response = await apiClient.get("/super-admin/logs", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  clearLogs: async (): Promise<void> => {
    await apiClient.delete("/super-admin/logs");
  },

  // ==================== بکاپ ====================
  getBackups: async (): Promise<any[]> => {
    const response = await apiClient.get("/super-admin/backups");
    return response.data?.data ?? response.data ?? [];
  },

  createBackup: async (): Promise<any> => {
    const response = await apiClient.post("/super-admin/backups");
    return response.data;
  },

  downloadBackup: async (filename: string): Promise<void> => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/super-admin/backups/${filename}/download`,
      "_blank",
    );
  },

  deleteBackup: async (filename: string): Promise<void> => {
    await apiClient.delete(`/super-admin/backups/${filename}`);
  },

  // ==================== لاگ‌های تجاری (AuditLog) ====================
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await apiClient.get("/super-admin/audit-logs", { params });
    return response.data;
  },

  // ==================== لاگ‌های ترافیک (PageView) ====================
  getPageViews: async (params?: {
    page?: number;
    limit?: number;
    ip?: string;
    path?: string;
    sessionId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await apiClient.get("/super-admin/page-views", { params });
    return response.data;
  },

  // ==================== مدیریت آگهی‌های ویژه (VIP و فوری) ====================

  getSpecialAds: async (params?: {
    type?: "vip" | "urgent" | "all";
    status?: "active" | "expired" | "all";
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await apiClient.get("/ads/admin/special", { params });
    return {
      data: response.data?.data ?? [],
      pagination: response.data?.pagination ?? {},
    };
  },

  getVipAds: async (params?: {
    status?: "active" | "expired" | "all";
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    return adminApi.getSpecialAds({ ...params, type: "vip" });
  },

  getUrgentAds: async (params?: {
    status?: "active" | "expired" | "all";
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    return adminApi.getSpecialAds({ ...params, type: "urgent" });
  },

  getSpecialStats: async () => {
    try {
      const [vipRes, urgentRes] = await Promise.all([
        adminApi.getSpecialAds({ type: "vip", status: "all", limit: 1 }),
        adminApi.getSpecialAds({ type: "urgent", status: "all", limit: 1 }),
      ]);

      const vipActiveRes = await adminApi.getSpecialAds({
        type: "vip",
        status: "active",
        limit: 1,
      });
      const urgentActiveRes = await adminApi.getSpecialAds({
        type: "urgent",
        status: "active",
        limit: 1,
      });

      return {
        data: {
          vip: {
            total: vipRes.pagination?.total || 0,
            active: vipActiveRes.pagination?.total || 0,
          },
          urgent: {
            total: urgentRes.pagination?.total || 0,
            active: urgentActiveRes.pagination?.total || 0,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching special stats:", error);
      return {
        data: {
          vip: { total: 0, active: 0 },
          urgent: { total: 0, active: 0 },
        },
      };
    }
  },

  toggleVipStatus: async (
    id: string,
    action: "activate" | "deactivate",
    durationDays?: number,
  ) => {
    const url =
      action === "activate"
        ? `/ads/admin/${id}/vip/activate`
        : `/ads/admin/${id}/vip/deactivate`;
    const payload =
      action === "activate" ? { durationDays: durationDays || 30 } : {};
    const response = await apiClient.post(url, payload);
    return response.data;
  },

  toggleUrgentStatus: async (
    id: string,
    action: "activate" | "deactivate",
    durationDays?: number,
  ) => {
    const url =
      action === "activate"
        ? `/ads/admin/${id}/urgent/activate`
        : `/ads/admin/${id}/urgent/deactivate`;
    const payload =
      action === "activate" ? { durationDays: durationDays || 7 } : {};
    const response = await apiClient.post(url, payload);
    return response.data;
  },

  extendVip: async (id: string, extraDays: number) => {
    const response = await apiClient.post(`/ads/admin/${id}/vip/extend`, {
      extraDays,
    });
    return response.data;
  },

  extendUrgent: async (id: string, extraDays: number) => {
    const response = await apiClient.post(`/ads/admin/${id}/urgent/extend`, {
      extraDays,
    });
    return response.data;
  },

  getUserBehaviorReport: async (
    userId: string,
    params?: { startDate?: string; endDate?: string },
  ) => {
    const response = await apiClient.get("/super-admin/user-behavior-report", {
      params: { userId, ...params },
    });
    return response.data.data;
  },

  downloadBehaviorReport: async (
    userId: string,
    format: "json" | "csv" | "txt" | "pdf",
  ) => {
    try {
      // دریافت داده‌های کامل رفتار کاربر از endpoint مربوط به مودال
      const detailsRes = await cookieAuditService.getUserDetails(userId);
      const details = detailsRes?.data || detailsRes || {};

      const mergedReport = {
        user: details.user,
        behavior: details.behavior || null,
        viewedAds: details.viewedAds || [],
        favorites: details.favorites || [],
        favoritesCount: details.favoritesCount || 0,
        interactionScore: details.interactionScore || 0,
        scoreBreakdown: details.scoreBreakdown || null,
        activityPeriod: details.activityPeriod || null,
        stats: {
          totalPageViews: details.activityPeriod?.totalPageViews || 0,
          totalFavorites: details.favoritesCount || 0,
          totalViewedAds: details.viewedAdsCount || 0,
        },
      };

      const {
        exportBehaviorReportToJSON,
        exportBehaviorReportToCSV,
        exportBehaviorReportToTXT,
        exportBehaviorReportToPDF,
      } = await import("@/lib/behaviorReportExport");

      switch (format) {
        case "json":
          exportBehaviorReportToJSON(mergedReport, userId);
          break;
        case "csv":
          exportBehaviorReportToCSV(mergedReport, userId);
          break;
        case "txt":
          exportBehaviorReportToTXT(mergedReport, userId);
          break;
        case "pdf":
          await exportBehaviorReportToPDF(mergedReport, userId);
          break;
        default:
          throw new Error("فرمت نامعتبر است");
      }

      return true;
    } catch (error: any) {
      console.error("Download error:", error);
      throw new Error(error.message || "خطا در دانلود فایل");
    }
  },
};