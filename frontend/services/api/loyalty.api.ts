import apiClient from "./client";

// دریافت وضعیت باشگاه کاربر
export const getMyLoyalty = async () => {
  const { data } = await apiClient.get("/loyalty/me");
  return data;
};

// دریافت تاریخچه امتیازات
export const getPointsHistory = async () => {
  const { data } = await apiClient.get("/loyalty/history");
  return data;
};

// ثبت کد معرف
export const applyReferralCode = async (code: string) => {
  const { data } = await apiClient.post("/loyalty/referral/apply", { code });
  return data;
};

// ───── توابع مدیریتی ادمین برای سطوح ─────
export const getAllTiers = async () => {
  const { data } = await apiClient.get("/loyalty/tiers");
  return data;
};

export const createTier = async (payload: any) => {
  const { data } = await apiClient.post("/admin/loyalty/tiers", payload);
  return data;
};

export const updateTier = async (id: string, payload: any) => {
  const { data } = await apiClient.put(`/admin/loyalty/tiers/${id}`, payload);
  return data;
};

export const deleteTier = async (id: string) => {
  const { data } = await apiClient.delete(`/admin/loyalty/tiers/${id}`);
  return data;
};

