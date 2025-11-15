import apiClient from "./api";

// 获取库存商品列表 (来自 commodities)
export const getStockItems = () => {
  return apiClient.get("/commodities/stock-items");
};

// (!!新增!!) 批量获取库存水平和商品信息
export const getStockLevelsBatch = () => {
  return apiClient.get("/inventory/stock-levels-batch");
};

// (新增) 获取单个库存商品的详细信息
export const getInventoryItemDetails = (commodity_guid) => {
  return apiClient.get(`/inventory/item/${commodity_guid}`);
};

// 获取特定商品库存水平
export const getStockLevel = (commodity_guid) => {
  return apiClient.get(`/inventory/stock/${commodity_guid}`);
};

// 调整库存
export const adjustInventory = (adjustmentData) => {
  return apiClient.post("/inventory/adjustments", adjustmentData);
};
