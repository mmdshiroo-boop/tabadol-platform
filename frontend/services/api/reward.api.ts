import apiClient from "./client";

export const getRewards = async () => {
  const { data } = await apiClient.get("/rewards");
  return data.data;
};

export const redeemReward = async (rewardId: string) => {
  const { data } = await apiClient.post("/rewards/redeem", { rewardId });
  return data;
};