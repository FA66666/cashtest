const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");
const { isAuthenticated, hasRole } = require("../middleware/auth");
const {
  validateCreatePurchaseBill,
  validateVendor,
  validateUpdateVendor, // (新增)
  validateVendorPayment,
} = require("../middleware/validators");

// 所有 /purchases 路由都需要认证
router.use(isAuthenticated);

// --- 供应商 (Vendors) ---
router.get("/vendors", purchaseController.getAllVendors);
router.get("/vendors/:guid", purchaseController.getVendorByGuid);
router.post(
  "/vendors",
  hasRole(["admin"]),
  validateVendor,
  purchaseController.createVendor
);
router.put(
  "/vendors/:guid",
  hasRole(["admin"]),
  validateUpdateVendor, // (修改)
  purchaseController.updateVendor
);
router.delete(
  "/vendors/:guid",
  hasRole(["admin"]),
  purchaseController.deleteVendor
);

// --- 采购账单 (Purchase Bills) ---
router.get("/bills", purchaseController.getPurchaseBills);
// (新增)
router.get("/bills/:guid", purchaseController.getPurchaseBillDetails);
router.post(
  "/bills",
  validateCreatePurchaseBill,
  purchaseController.createPurchaseBill
);

// (新增) --- 采购付款 (Vendor Payments) ---
router.post(
  "/payments",
  hasRole(["admin", "finance"]),
  validateVendorPayment,
  purchaseController.createVendorPayment
);

module.exports = router;
