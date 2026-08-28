import apiClient from "./client";
import { User } from "@/types";

export interface LoginData {
  phone: string;
  password?: string;
}

export interface RegisterData {
  phone: string;
  firstName: string;
  lastName: string;
  nationalCode?: string;
  password?: string;
}

export interface VerifyCodeData {
  phone?: string;
  code: string;
  firstName?: string;
  lastName?: string;
  nationalCode?: string;
  password?: string;
  email?: string;
  referralCode?: string; // ✅ اضافه شد
}

// ✅ اضافه شد
export interface ResetPasswordData {
  phone: string;
  code: string;
  newPassword: string;
}

export const authApi = {
  sendCode: async (phone: string) => {
    const response = await apiClient.post("/auth/send-code", { phone });
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await apiClient.post("/users/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteAvatar: async () => {
    const response = await apiClient.delete("/users/avatar");
    return response.data;
  },

  verifyCode: async (data: VerifyCodeData) => {
    const response = await apiClient.post("/auth/verify-code", data);
    return response.data;
  },

  resendCode: async (phone: string) => {
    const response = await apiClient.post("/auth/resend-code", { phone });
    return response.data;
  },

  login: async (data: { phone: string; password: string }) => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },

  verifyNationalCode: async (nationalCode: string) => {
    const response = await apiClient.post("/auth/verify-national-code", {
      nationalCode,
    });
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData) => {
    const response = await apiClient.post("/auth/reset-password", data);
    return response.data;
  },
};