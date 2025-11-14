import apiClient from "./api";

// 获取所有货币
export const getCurrencies = () => {
  return apiClient.get("/commodities/currencies");
};

// (新增) 创建库存商品
export const createStockItem = (itemData) => {
  return apiClient.post("/commodities/stock-items", itemData);
};
