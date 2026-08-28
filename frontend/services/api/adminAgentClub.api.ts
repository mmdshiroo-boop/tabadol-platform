import apiClient from "./client";

export interface ClubSummary {
  _id: string;
  agentId: string;
  membersCount: number;
  totalViews: number;
  totalSmsSent: number;
  createdAt: string;
  agentInfo?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    agencyName?: string;
    phone?: string;
    isVerified?: boolean;
  };
  userInfo?: {
    avatar?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
  };
}

export interface ClubDetails {
  club: any;
  agent: any;
  stats: {
    membersCount: number;
    campaignsCount: number;
    activitiesCount: number;
    totalViews: number;
    totalSmsSent: number;
  };
}

export interface ClubMemberItem {
  _id: string;
  agentId: string;
  userId?: any;
  phone: string;
  name?: string;
  joinedAt: string;
  notes?: string;
  interactionCount: number;
}

export interface ClubCampaign {
  _id: string;
  message: string;
  recipientsCount: number;
  status: "pending" | "sent" | "failed" | "partial";
  sentCount: number;
  failedCount: number;
  sentAt?: string;
  createdAt: string;
}

export interface ClubActivityItem {
  _id: string;
  agentId: string;
  type: string;
  metadata?: any;
  createdAt: string;
}

export const adminAgentClubApi = {
  // ─── عمومی (مشترک بین ادمین و سوپرادمین) ───
  getClubs: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get("/admin/agent-clubs", { params });
    return data;
  },
  getSystemStats: async () => {
    const { data } = await apiClient.get("/admin/agent-clubs/stats");
    return data.data;
  },
  getClubDetails: async (clubId: string) => {
    const { data } = await apiClient.get(`/admin/agent-clubs/${clubId}`);
    return data.data;
  },
  getClubMembers: async (clubId: string, params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get(`/admin/agent-clubs/${clubId}/members`, { params });
    return data;
  },
  getClubCampaigns: async (clubId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await apiClient.get(`/admin/agent-clubs/${clubId}/campaigns`, { params });
    return data;
  },
  getClubActivities: async (clubId: string, params?: { page?: number; limit?: number }) => {
    const { data } = await apiClient.get(`/admin/agent-clubs/${clubId}/activities`, { params });
    return data;
  },

  // ─── مخصوص سوپرادمین ───
  deleteClub: async (clubId: string) => {
    const { data } = await apiClient.delete(`/super-admin/agent-clubs/${clubId}`);
    return data;
  },
  deleteClubMember: async (clubId: string, memberId: string) => {
    const { data } = await apiClient.delete(`/super-admin/agent-clubs/${clubId}/members/${memberId}`);
    return data;
  },
  updateClubMember: async (clubId: string, memberId: string, payload: { name?: string; phone?: string; notes?: string }) => {
    const { data } = await apiClient.put(`/super-admin/agent-clubs/${clubId}/members/${memberId}`, payload);
    return data;
  },
  updateClubSettings: async (clubId: string, settings: { maxMembers?: number }) => {
    const { data } = await apiClient.put(`/super-admin/agent-clubs/${clubId}/settings`, settings);
    return data;
  },
};