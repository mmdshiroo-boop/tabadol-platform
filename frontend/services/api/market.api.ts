// market.api.ts
import apiClient from "./client";

export const marketApi = {
  getAllStats: () =>
    apiClient.get("/market-analysis/stats").then((r) => r.data),
  getProvinces: () =>
    apiClient.get("/market-analysis/provinces").then((r) => r.data),
  getRegionStats: (slug: string) =>
    apiClient.get(`/market-analysis/region/${slug}`).then((r) => r.data),
  getHotZones: (slug: string) =>
    apiClient
      .get(`/market-analysis/region/${slug}/hot-zones`)
      .then((r) => r.data),
  refreshStats: () =>
    apiClient.post("/market-analysis/refresh").then((r) => r.data),

  // در صورت نیاز به تحلیل عمیق با فیلتر (market.controller)
  getDeepAnalysis: (params?: any) =>
    apiClient.get("/market/analysis", { params }).then((r) => r.data),
};
