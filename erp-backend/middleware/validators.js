const { body, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateGUID = (fieldName) =>
  body(fieldName)
    .isString()
    .withMessage(`${fieldName} must be a string`)
    .isLength({ min: 32, max: 32 })
    .withMessage(`${fieldName} must be a 32-character GUID`)
    .matches(/^[a-fA-F0-9]{32}$/)
    .withMessage(`${fieldName} contains invalid characters`);

// --- 路由特定的验证器 ---

// (已修改)
const validateCreateSalesInvoice = [
  validateGUID("customer_guid"),
  validateGUID("currency_guid"), // (重新添加)
  body("date_opened")
    .isISO8601()
    .withMessage(
      "date_opened must be a valid ISO 8601 datetime string (e.g., YYYY-MM-DD HH:MM:SS)"
    ),
  validateGUID("cogs_account_guid"),
  body("line_items")
    .isArray({ min: 1 })
    .withMessage("line_items must be an array with at least one item"),
  validateGUID("line_items.*.income_account_guid"),
  validateGUID("line_items.*.commodity_guid"),
  body("line_items.*.cost")
    .isFloat({ gte: 0 })
    .withMessage("Line item cost must be 0 or greater"),
  body("line_items.*.quantity")
    .isFloat({ gt: 0 })
    .withMessage("line_item quantity must be a number greater than 0"),
  body("line_items.*.price")
    .isFloat({ gte: 0 })
    .withMessage("line_item price must be a number (0 or greater)"),
  handleValidationErrors,
];

// (已修改)
const validateCreatePurchaseBill = [
  validateGUID("vendor_guid"),
  validateGUID("currency_guid"), // (重新添加)
  body("date_opened")
    .isISO8601()
    .withMessage("date_opened must be a valid ISO 8601 datetime string"),
  body("line_items")
    .isArray({ min: 1 })
    .withMessage("line_items must be an array with at least one item"),
  // (注意: asset_or_expense_account_guid 是在后端动态处理的, 但我们仍然验证它是否存在)
  validateGUID("line_items.*.asset_or_expense_account_guid"),
  handleValidationErrors,
];

const validateAdjustInventory = [
  validateGUID("commodity_guid"),
  validateGUID("currency_guid"),
  validateGUID("adjustment_expense_account_guid"),
  body("quantity_change")
    .isFloat()
    .withMessage("quantity_change must be a number (can be negative)"),
  body("cost_per_unit")
    .isFloat({ gte: 0 })
    .withMessage("cost_per_unit must be a number (0 or greater)"),
  handleValidationErrors,
];

// (已修改)
const validateCustomer = [
  body("name").notEmpty().withMessage("Name is required"),
  body("id").notEmpty().withMessage("Customer ID is required"),
  // (移除) currency
  body("active").isBoolean().withMessage("Active must be true or false"),
  handleValidationErrors,
];

// (已修改)
const validateUpdateCustomer = [
  body("name").notEmpty().withMessage("Name is required"),
  body("id").notEmpty().withMessage("Customer ID is required"),
  body("active").isBoolean().withMessage("Active must be true or false"),
  handleValidationErrors,
];

// (已修改)
const validateVendor = [
  body("name").notEmpty().withMessage("Name is required"),
  body("id").notEmpty().withMessage("Vendor ID is required"),
  // (移除) currency
  body("active").isBoolean().withMessage("Active must be true or false"),
  handleValidationErrors,
];

// (已修改)
const validateUpdateVendor = [
  body("name").notEmpty().withMessage("Name is required"),
  body("id").notEmpty().withMessage("Vendor ID is required"),
  body("active").isBoolean().withMessage("Active must be true or false"),
  handleValidationErrors,
];

const validateAccount = [
  body("name").notEmpty().withMessage("Name is required"),
  body("account_type").notEmpty().withMessage("Account type is required"),
  validateGUID("commodity_guid"),
  body("placeholder")
    .isBoolean()
    .withMessage("Placeholder must be true or false"),
  handleValidationErrors,
];

const validateJournalEntry = [
  body("date").isISO8601().withMessage("Date is required"),
  body("description").notEmpty().withMessage("Description is required"),
  validateGUID("currency_guid"),
  body("splits")
    .isArray({ min: 2 })
    .withMessage("A journal entry must have at least two splits"),
  body("splits.*.account_guid")
    .isString()
    .isLength({ min: 32, max: 32 })
    .withMessage("Each split must have a valid account GUID"),
  body("splits.*.value")
    .isFloat()
    .withMessage("Each split value must be a number"),
  handleValidationErrors,
];

// (已修改)
const validateCustomerPayment = [
  body("date").isISO8601().withMessage("Date is required"),
  body("description").notEmpty().withMessage("Description is required"),
  validateGUID("currency_guid"),
  validateGUID("checking_account_guid"),
  validateGUID("customer_guid"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than zero"),
  handleValidationErrors,
];

// (已修改)
const validateVendorPayment = [
  body("date").isISO8601().withMessage("Date is required"),
  body("description").notEmpty().withMessage("Description is required"),
  validateGUID("currency_guid"),
  validateGUID("checking_account_guid"),
  validateGUID("vendor_guid"),
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than zero"),
  handleValidationErrors,
];

module.exports = {
  validateCreateSalesInvoice,
  validateCreatePurchaseBill,
  validateAdjustInventory,
  validateCustomer,
  validateUpdateCustomer,
  validateVendor,
  validateUpdateVendor,
  validateAccount,
  validateJournalEntry,
  validateCustomerPayment,
  validateVendorPayment,
};
