const express = require("express");
const router = express.Router();
const commoditiesController = require("../controllers/commoditiesController");
const { isAuthenticated } = require("../middleware/auth");

// 所有 /commodities 路由都需要认证
router.use(isAuthenticated);

// 获取所有已定义的货币 (e.g., USD, CNY)
router.get("/currencies", commoditiesController.getCurrencies);

// 获取货币对的最新汇率
router.get("/prices", commoditiesController.getPrice);

// 获取所有定义为库存的商品 (SKUs)
router.get("/stock-items", commoditiesController.getStockItems);

module.exports = router;
