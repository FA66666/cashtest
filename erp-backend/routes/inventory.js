const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const { isAuthenticated } = require("../middleware/auth");
const { validateAdjustInventory } = require("../middleware/validators");

// 所有 /inventory 路由都需要认证
router.use(isAuthenticated);

// (新增) 获取特定商品的详细信息 (汇总 + 流水)
router.get(
  "/item/:commodity_guid",
  inventoryController.getInventoryItemDetails
);

// 获取特定商品的当前库存水平 (用于列表)
router.get("/stock/:commodity_guid", inventoryController.getStockLevel);

// 创建一笔库存调整 (盘点盘盈/盘亏)
router.post(
  "/adjustments",
  validateAdjustInventory, // 验证
  inventoryController.adjustInventory // 执行
);

module.exports = router;
