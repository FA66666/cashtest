const express = require("express");
const router = express.Router();
const ledgerController = require("../controllers/ledgerController");
const { isAuthenticated, hasRole } = require("../middleware/auth");
// (修改) 导入新的验证器
const {
  validateAccount,
  validateJournalEntry,
} = require("../middleware/validators");

// 所有 /ledger 路由都需要认证
router.use(isAuthenticated);

// (已有) 获取所有会计科目
router.get("/accounts", ledgerController.getAccountHierarchy);

// (已有) GET /api/v1/ledger/accounts/:guid
router.get("/accounts/:guid", ledgerController.getAccountByGuid);

// (已有) 获取单个科目的余额
router.get("/accounts/:guid/balance", ledgerController.getAccountBalance);

// (新增) POST /api/v1/ledger/journal-entries
// (只有 admin 或 finance 角色可以创建)
router.post(
  "/journal-entries",
  hasRole(["admin", "finance"]),
  validateJournalEntry,
  ledgerController.createJournalEntry
);

// (已有) POST /api/v1/ledger/accounts
router.post(
  "/accounts",
  hasRole(["admin"]),
  validateAccount,
  ledgerController.createAccount
);

// (已有) PUT /api/v1/ledger/accounts/:guid
router.put(
  "/accounts/:guid",
  hasRole(["admin"]),
  validateAccount,
  ledgerController.updateAccount
);

module.exports = router;
