const express = require("express");
const router = express.Router();
const salesController = require("../controllers/salesController");
const { isAuthenticated, hasRole } = require("../middleware/auth");
const {
  validateCreateSalesInvoice,
  validateCustomer,
  validateUpdateCustomer, // (新增)
  validateCustomerPayment,
} = require("../middleware/validators");

// 所有 /sales 路由都需要认证
router.use(isAuthenticated);

// --- 客户 (Customers) ---
router.get("/customers", salesController.getAllCustomers);
router.get("/customers/:guid", salesController.getCustomerByGuid);
router.post(
  "/customers",
  hasRole(["admin"]),
  validateCustomer,
  salesController.createCustomer
);
router.put(
  "/customers/:guid",
  hasRole(["admin"]),
  validateUpdateCustomer, // (修改)
  salesController.updateCustomer
);
router.delete(
  "/customers/:guid",
  hasRole(["admin"]),
  salesController.deleteCustomer
);

// --- 销售发票 (Sales Invoices) ---
router.get("/invoices", salesController.getSalesInvoices);
router.post(
  "/invoices",
  validateCreateSalesInvoice,
  salesController.createSalesInvoice
);
router.get("/invoices/:guid", salesController.getInvoiceDetails);

// (新增) --- 销售付款 (Customer Payments) ---
router.post(
  "/payments",
  hasRole(["admin", "finance"]), // 假设 finance 角色也可以
  validateCustomerPayment,
  salesController.createCustomerPayment
);

module.exports = router;
