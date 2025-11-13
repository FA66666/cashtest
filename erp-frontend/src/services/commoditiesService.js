import apiClient from "./api";

// 获取所有货币
export const getCurrencies = () => {
  return apiClient.get("/commodities/currencies");
};
