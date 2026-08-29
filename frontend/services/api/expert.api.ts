// frontend/services/api/expert.api.ts
import apiClient from "./client";

export interface ExpertStats {
  pendingAds: number;
  reviewedToday: number;
  totalReports: number;
  pendingReports: number;
  approvedToday: number;
  rejectedToday: number;
  totalReviewed: number;
  expertInfo?: {
    verifiedAds: number;
    rejectedAds: number;
    rating: number;
  };
}

export interface PendingAd {
  _id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  images: string[];
  userId: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  category: { name: string };
  createdAt: string;
}

export interface PendingReport {
  _id: string;
  type: string;
  description?: string;
  reporter: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  targetType: string;
  createdAt: string;
}

export interface ExpertProfile {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  avatar?: string;
  specialty: string[];
  experienceYears: number;
  licenseNumber?: string;
  description?: string;
  verifiedAds: number;
  rejectedAds: number;
  rating: number;
  status: string;
}

export const expertApi = {
  // ==================== آمار داشبورد ====================
  getStats: async (): Promise<ExpertStats> => {
    const response = await apiClient.get("/expert/stats");
    return response.data.data;
  },
  
uploadBulkAds: async (formData: FormData) => {
  const response = await apiClient.post("/expert/bulk-ads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // ۵ دقیقه برای آپلود فایل‌های بزرگ
  });
  return response.data;
},
  getTaskStatus: async (taskId: string) => {
    const response = await apiClient.get(`/expert/bulk-ads/task/${taskId}`);
    return response.data.data;
  },
  // ==================== آگهی‌های در انتظار ====================
  getPendingAds: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await apiClient.get("/ads/admin/pending", { params });
    return response.data;
  },

  // ==================== همه آگهی‌ها (با فیلتر وضعیت) ====================
  getAllAds: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const response = await apiClient.get("/ads/admin/all", { params });
    return response.data;
  },

  // ==================== گزارشات در انتظار ====================
  getPendingReports: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: PendingReport[]; pagination: any }> => {
    const response = await apiClient.get("/reports/pending", { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        total: (response.data.data || []).length,
      },
    };
  },

  // ==================== همه گزارشات ====================
  getAllReports: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PendingReport[]; pagination: any }> => {
    const response = await apiClient.get("/reports", { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        total: (response.data.data || []).length,
      },
    };
  },

  // ==================== بررسی و تایید گزارش ====================
  resolveReport: async (id: string, resolution?: string) => {
    const response = await apiClient.patch(`/reports/${id}/resolve`, {
      resolution,
    });
    return response.data;
  },

  // ==================== رد گزارش ====================
  rejectReport: async (id: string, reason?: string) => {
    const response = await apiClient.patch(`/reports/${id}/reject`, { reason });
    return response.data;
  },

  // ==================== دریافت جزئیات یک آگهی ====================
  getPendingAdById: async (id: string) => {
    const response = await apiClient.get(`/ads/${id}`);
    return response.data;
  },

  // ==================== تایید آگهی ====================
  approveAd: async (id: string) => {
    const response = await apiClient.post(`/ads/admin/${id}/approve`);
    return response.data;
  },

  // ==================== رد آگهی ====================
  rejectAd: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/ads/admin/${id}/reject`, {
      reason,
    });
    return response.data;
  },

  // ==================== آگهی‌های تایید شده ====================
  getApprovedAds: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: any[]; pagination: any }> => {
    const response = await apiClient.get("/ads/expert/approved", { params });
    return response.data;
  },

  // ==================== آگهی‌های رد شده ====================
  getRejectedAds: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: any[]; pagination: any }> => {
    const response = await apiClient.get("/ads/expert/rejected", { params });
    return response.data;
  },

  // ==================== حذف آگهی (با مسیر مخصوص ادمین/سوپرادمین) ====================
  deleteAd: async (id: string) => {
    // مسیر force delete برای کاربران با مجوز ads:delete
    const response = await apiClient.delete(`/ads/${id}/force`);
    return response.data;
  },

  // ==================== پروفایل کارشناس ====================
  getProfile: async (): Promise<ExpertProfile> => {
    const response = await apiClient.get("/expert/profile");
    return response.data.data;
  },

  // ==================== به‌روزرسانی پروفایل کارشناس ====================
  updateProfile: async (
    data: Partial<ExpertProfile>,
  ): Promise<ExpertProfile> => {
    const response = await apiClient.put("/expert/profile", data);
    return response.data.data;
  },
};

// ==================== توابع اعلانات برای کارشناس ====================
export const expertNotificationApi = {
  getNotifications: async (page: number = 1, limit: number = 20) => {
    const response = await apiClient.get("/notifications", {
      params: { page, limit },
    });
    return response.data.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.put("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAllRead: async () => {
    const response = await apiClient.delete("/notifications/read/all");
    return response.data;
  },

  getUnreadCount: async () => {
    try {
      const response = await apiClient.get(
        "/notifications?unreadOnly=true&limit=1",
      );
      return response.data.data.unreadCount;
    } catch (error) {
      return 0;
    }
  },

  getSettings: async () => {
    const response = await apiClient.get("/notifications/settings");
    return response.data.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.put("/notifications/settings", settings);
    return response.data.data;
  },
};
