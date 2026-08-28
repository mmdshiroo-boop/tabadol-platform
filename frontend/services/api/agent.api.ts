// ============================================================
// 1️⃣ FRONTEND: services/api/agent.api.ts (اصلاح‌شده کامل)
// ============================================================
// frontend/services/api/agent.api.ts
import apiClient from "./client";

export interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nationalCode: string;
  role: string;
  agencyId: string;
  propertiesCount: number;
  status: "active" | "inactive";
  joinedAt: string;
  lastLogin?: string;
}

export interface AgentStats {
  properties: {
    total: number;
    active: number;
    sold: number;
    pending: number;
    expired: number;
  };
  views: { total: number; averagePerProperty: number };
  leads: {
    total: number;
    new: number;
    converted: number;
    conversionRate: number;
  };
  revenue: { total: number; commission: number; averagePerSale: number };
  topProperties: Array<{
    id: string;
    title: string;
    views: number;
    leads: number;
    status: string;
  }>;
}

export interface CreateAgentData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nationalCode: string;
  password?: string;
}

export const agentApi = {
  // ─── دریافت آمار ───
  getStats: async (params?: { startDate?: string; endDate?: string }): Promise<AgentStats> => {
    const response = await apiClient.get("/agents/stats", { params });
    return response.data.data;
  },

  // ─── دریافت لیست مشاوران ───
  getAgents: async (): Promise<Agent[]> => {
    const response = await apiClient.get("/agents/agency");
    return response.data.data;
  },

  // ─── دریافت یک مشاور ───
  getById: async (id: string): Promise<Agent> => {
    const response = await apiClient.get(`/agents/${id}`);
    return response.data.data;
  },

  // ─── ایجاد مشاور ───
  create: async (data: CreateAgentData): Promise<Agent> => {
    const response = await apiClient.post("/agents", data);
    return response.data.data;
  },

  // ─── ویرایش مشاور ───
  update: async (id: string, data: Partial<CreateAgentData>): Promise<Agent> => {
    const response = await apiClient.put(`/agents/${id}`, data);
    return response.data.data;
  },

  // ─── حذف مشاور ───
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/agents/${id}`);
  },

  // ─── تغییر وضعیت ───
  toggleStatus: async (id: string): Promise<Agent> => {
    const response = await apiClient.patch(`/agents/${id}/toggle-status`);
    return response.data.data;
  },

  // ─── گزارشات ───
  getReports: async (limit: number = 30) => {
    const response = await apiClient.get(`/agents/reports/list?limit=${limit}`);
    return response.data.data;
  },

  getReportByRange: async (startDate: string, endDate: string) => {
    const response = await apiClient.get(
      `/agents/reports/range?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data;
  },

  // ─── ذخیره گزارش روزانه ───
  generateDailyReport: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.post("/agents/reports/daily", params);
    return response.data.data;
  },

  // ─── دانلود گزارش اکسل ───
  downloadReportExcel: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await apiClient.get("/agents/report/excel", {
        params,
        responseType: "blob",
      });
      
      // ایجاد URL برای دانلود
      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `گزارش-آژانس-${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error: any) {
      console.error("Error downloading Excel:", error);
      throw new Error(error.response?.data?.message || "خطا در دانلود فایل اکسل");
    }
  },

  // ─── دانلود گزارش PDF ───
  downloadReportPDF: async (params?: { startDate?: string; endDate?: string }) => {
    try {
      const response = await apiClient.get("/agents/report/pdf", {
        params,
        responseType: "blob",
      });
      
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `گزارش-آژانس-${new Date().toISOString().slice(0,10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      throw new Error(error.response?.data?.message || "خطا در دانلود فایل PDF");
    }
  },
};