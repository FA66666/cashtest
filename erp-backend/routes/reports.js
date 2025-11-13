const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reportsController");
const { isAuthenticated, hasRole } = require("../middleware/auth"); // (可选) 报表可能需要特定角色

// 所有 /reports 路由都需要认证
router.use(isAuthenticated);

// (可选) 假设只有 'admin' 或 'finance' 角色可以看报表
// router.use(hasRole(['admin', 'finance']));

// 获取 试算平衡表
router.get("/trial-balance", reportsController.getTrialBalance);

// 获取 利润表 (损益表)
router.get("/profit-loss", reportsController.getProfitLoss);

// 获取 资产负债表
router.get("/balance-sheet", reportsController.getBalanceSheet);

module.exports = router;
