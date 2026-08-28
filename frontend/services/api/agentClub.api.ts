// frontend/services/api/agentClub.api.ts
import apiClient from "./client";

export interface ClubOverview {
  membersCount: number;
  totalViews: number;
  totalSmsSent: number;
  totalCampaigns: number;
  newThisMonth: number;
  recentActivities: any[];
}

export interface ClubMember {
  _id: string;
  agentId: string;
  userId?: any | null;
  phone: string;
  name?: string;
  joinedAt: string;
  notes?: string;
  interactionCount: number;
}

export interface SmsCampaign {
  _id: string;
  message: string;
  recipientsCount: number;
  status: "pending" | "sent" | "failed" | "partial";
  sentCount: number;
  failedCount: number;
  sentAt?: string;
  createdAt: string;
}

export interface RankingItem {
  rank: number;
  agentId: string;
  userId: string;
  agentName: string;
  agencyName?: string;
  city?: string;
  avatar?: string;
  rating: number;
  isVerified: boolean;
  phone?: string;
  membersCount: number;
  totalViews: number;
  totalSmsSent: number;
  score: number;
  performance: {
    totalAds: number;
    activeAds: number;
    soldAds: number;
    totalAdViews: number;
    totalRevenue: number;
    conversionRate: number;
  };
}
export interface GraphData {
  nodes: any[];
  edges: any[];
}

export const agentClubApi = {
  // ─── نمای کلی ───
  getOverview: async (): Promise<ClubOverview> => {
    const { data } = await apiClient.get("/agent/club/overview");
    return data.data;
  },

  // ─── اعضا ───
  getMembers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
  }) => {
    const { data } = await apiClient.get("/agent/club/members", { params });
    return data;
  },
  addMember: async (payload: {
    phone: string;
    name?: string;
    notes?: string;
    userId?: string;
  }) => {
    const { data } = await apiClient.post("/agent/club/members", payload);
    return data;
  },
  updateMember: async (
    id: string,
    payload: { name?: string; phone?: string; notes?: string }
  ) => {
    const { data } = await apiClient.put(`/agent/club/members/${id}`, payload);
    return data;
  },
  deleteMember: async (id: string) => {
    const { data } = await apiClient.delete(`/agent/club/members/${id}`);
    return data;
  },
  bulkDeleteMembers: async (ids: string[]) => {
    const { data } = await apiClient.post("/agent/club/members/bulk-delete", {
      ids,
    });
    return data;
  },
  exportMembers: async () => {
    const response = await apiClient.get("/agent/club/members/export", {
      responseType: "blob",
    });
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `اعضای-باشگاه-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  importMembers: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post(
      "/agent/club/members/import",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  },
  getMemberDetail: async (id: string) => {
    const { data } = await apiClient.get(`/agent/club/members/${id}/detail`);
    return data.data;
  },

  // ─── پیامک ───
  sendSms: async (payload: {
    message: string;
    sendAll?: boolean;
    recipientIds?: string[];
  }) => {
    const { data } = await apiClient.post("/agent/club/sms/send", payload);
    return data;
  },
  getSmsCampaigns: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => {
    const { data } = await apiClient.get("/agent/club/sms/campaigns", {
      params,
    });
    return data;
  },

  // ─── آنالیتیکس و گزارش ───
  getAnalytics: async (days: number = 30) => {
    const { data } = await apiClient.get("/agent/club/analytics", {
      params: { days },
    });
    return data.data;
  },
  getClubReport: async (period: "daily" | "weekly" | "monthly") => {
    const { data } = await apiClient.get(`/agent/club/report/${period}`);
    return data.data;
  },

  // ─── رتبه‌بندی و گراف ───
  getRanking: async (city?: string): Promise<RankingItem[]> => {
    const { data } = await apiClient.get("/agent/club/ranking", {
      params: { city },
    });
    return data.data;
  },
  getGraph: async (): Promise<GraphData> => {
    const { data } = await apiClient.get("/agent/club/graph");
    return data.data;
  },

  // بعد از getMemberDetail یا در بخش مربوطه
getActivities: async (limit: number = 20) => {
  const { data } = await apiClient.get("/agent/club/activities", {
    params: { limit },
  });
  return data.data;
},
};