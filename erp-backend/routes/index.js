const express = require("express");
const router = express.Router();

// 导入所有模块的路由
const authRoutes = require("./auth"); // <-- 新增
const salesRoutes = require("./sales");
const purchaseRoutes = require("./purchases");
const ledgerRoutes = require("./ledger");
const reportsRoutes = require("./reports");
const inventoryRoutes = require("./inventory");
const commoditiesRoutes = require("./commodities");

// 注册认证路由 (这些路由不应受 JWT 保护)
router.use("/auth", authRoutes); // <-- 新增

// 注册所有受保护的业务路由
router.use("/sales", salesRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/ledger", ledgerRoutes);
router.use("/reports", reportsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/commodities", commoditiesRoutes);

module.exports = router;
