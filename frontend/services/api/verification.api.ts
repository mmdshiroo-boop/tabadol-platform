import apiClient from "./client";

// ثبت درخواست تیک آبی (مشاور)
export const requestVerification = async (documents: string[]) => {
  const { data } = await apiClient.post("/verification/request", { documents });
  return data;
};

// دریافت وضعیت درخواست (مشاور)
export const getMyVerificationStatus = async () => {
  const { data } = await apiClient.get("/verification/my-status");
  return data;
};

// ادمین: لیست درخواست‌ها
export const getAllVerificationRequests = async (params?: any) => {
  const { data } = await apiClient.get("/verification/", { params });
  return data;
};

// ادمین: بررسی درخواست
export const reviewVerification = async (
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string
) => {
  const { data } = await apiClient.put(`/verification/${id}/review`, {
    status,
    reviewNote,
  });
  return data;
};