const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

const DENOMINATOR = 100;
const PARENT_AP_ACCOUNT_GUID = "a0000000000000000000000000000006"; // (来自 init.sql)

// (新增) 辅助函数：动态查找或创建多币种A/P账户
async function findOrCreateApAccount(connection, vendor_guid, currency_guid) {
  // 1. 获取供应商名称和货币助记符
  const infoSql = `
    SELECT 
      v.name as vendor_name, 
      com.mnemonic as currency_mnemonic
    FROM vendors v, commodities com
    WHERE com.guid = ?
    AND v.guid = ?
  `;
  // (修改) 修复了查询
  const [infoRows] = await connection.query(infoSql, [
    currency_guid,
    vendor_guid,
  ]);
  const info = infoRows[0];
  if (!info) {
    throw new Error("Vendor or Currency not found.");
  }
  const { vendor_name, currency_mnemonic } = info;

  // 2. 定义子账户名称
  const account_name = `A/P - ${vendor_name} (${currency_mnemonic})`;

  // 3. 尝试查找
  const findSql =
    "SELECT guid FROM accounts WHERE name = ? AND commodity_guid = ?";
  const [existingRows] = await connection.query(findSql, [
    account_name,
    currency_guid,
  ]);
  const existing = existingRows[0];
  if (existing) {
    return existing.guid;
  }

  // 4. 如果未找到，则创建
  const guid = generateGuid();
  const createSql = `
    INSERT INTO accounts (guid, name, account_type, commodity_guid, parent_guid, code, placeholder, 
                          commodity_scu, non_std_scu, hidden)
    VALUES (?, ?, 'LIABILITY', ?, ?, ?, 0, 100, 0, 0)
  `;
  await connection.execute(createSql, [
    guid,
    account_name,
    currency_guid,
    PARENT_AP_ACCOUNT_GUID,
    "", // A/P 子账户通常没有代码
  ]);
  return guid;
}

// --- 供应商 (Vendors) ---
exports.getAllVendors = async (req, res, next) => {
  try {
    const sql = "SELECT guid, name, id, active FROM vendors";
    const vendors = await db.query(sql);
    res.json(vendors);
  } catch (err) {
    next(err);
  }
};

exports.getVendorByGuid = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const vendor = await db.query(
      "SELECT guid, name, id, notes, active FROM vendors WHERE guid = ?",
      [guid]
    );
    if (vendor.length === 0) {
      return res.status(404).json({ error: res.__("errors.vendor_not_found") });
    }
    res.json(vendor[0]);
  } catch (err) {
    next(err);
  }
};

exports.createVendor = async (req, res, next) => {
  try {
    const { name, id, notes, active } = req.body;
    const vendor_guid = generateGuid();

    const vendorSql = `
      INSERT INTO vendors (guid, name, id, notes, active, 
                           tax_override)
      VALUES (?, ?, ?, ?, ?, 0)
    `;
    await db.query(vendorSql, [
      vendor_guid,
      name,
      id,
      notes || "",
      active ? 1 : 0,
    ]);

    res.status(201).json({
      guid: vendor_guid,
      name,
      id,
      notes,
      active,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Vendor ID already exists" });
    }
    next(err);
  }
};

exports.updateVendor = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const { name, id, notes, active } = req.body;

    const sql = `
      UPDATE vendors 
      SET name = ?, id = ?, notes = ?, active = ?
      WHERE guid = ?
    `;
    const result = await db.query(sql, [
      name,
      id,
      notes || "",
      active ? 1 : 0,
      guid,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: res.__("errors.vendor_not_found") });
    }

    res.json({ guid, name, id, notes, active });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Vendor ID already exists" });
    }
    next(err);
  }
};

exports.deleteVendor = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const checkSql =
      "SELECT guid FROM invoices WHERE owner_guid = ? AND owner_type = 2 LIMIT 1";
    const bills = await db.query(checkSql, [guid]);

    if (bills.length > 0) {
      return res.status(400).json({
        error: "Cannot delete vendor: Bills are associated with this vendor.",
      });
    }

    const result = await db.query("DELETE FROM vendors WHERE guid = ?", [guid]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: res.__("errors.vendor_not_found") });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// --- 采购账单 (Purchase Bills) ---
exports.getPurchaseBills = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        i.guid, i.id, i.date_opened, i.notes,
        v.name as vendor_name,
        com.mnemonic as currency_code
      FROM invoices i
      JOIN vendors v ON i.owner_guid = v.guid
      LEFT JOIN commodities com ON i.currency = com.guid
      WHERE i.owner_type = 2
      ORDER BY i.date_opened DESC
    `;
    const bills = await db.query(sql);
    res.json(bills);
  } catch (err) {
    next(err);
  }
};

exports.getPurchaseBillDetails = async (req, res, next) => {
  try {
    const { guid } = req.params;

    const billSql = `
      SELECT 
        i.*,
        v.name as vendor_name,
        com.mnemonic as currency_code
      FROM invoices i
      JOIN vendors v ON i.owner_guid = v.guid
      LEFT JOIN commodities com ON i.currency = com.guid
      WHERE i.guid = ? AND i.owner_type = 2
    `;
    const bills = await db.query(billSql, [guid]);

    if (!bills || bills.length === 0) {
      return res
        .status(404)
        .json({ message: res.__("errors.invoice_not_found") });
    }
    const bill = bills[0];

    const entriesSql = `
      SELECT 
        e.guid, e.description, e.quantity_num, e.quantity_denom,
        e.b_price_num, e.b_price_denom,
        a.name as account_name
      FROM entries e
      LEFT JOIN accounts a ON e.b_acct = a.guid
      WHERE e.bill = ?
    `;
    const entries = await db.query(entriesSql, [guid]);

    res.json({
      ...bill,
      entries: entries,
    });
  } catch (err) {
    next(err);
  }
};

// (已修改)
exports.createPurchaseBill = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { vendor_guid, currency_guid, date_opened, notes, line_items } =
      req.body;

    let total_value_num = 0;
    line_items.forEach((item) => {
      total_value_num += item.quantity * item.price * DENOMINATOR;
    });

    await connection.beginTransaction();

    // (新增) 动态查找/创建 A/P 账户
    const ap_account_guid = await findOrCreateApAccount(
      connection,
      vendor_guid,
      currency_guid
    );

    const bill_guid = generateGuid();
    const tx_guid = generateGuid();

    const invoiceSql = `
      INSERT INTO invoices (guid, id, date_opened, date_posted, notes, active, currency, owner_type, owner_guid, post_txn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(invoiceSql, [
      bill_guid,
      `BILL-${Date.now()}`,
      date_opened,
      date_opened,
      notes || "",
      1,
      currency_guid,
      2,
      vendor_guid,
      tx_guid,
    ]);

    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid,
      "",
      date_opened,
      new Date().toISOString().slice(0, 19).replace("T", " "),
      notes || `Purchase Bill ${bill_guid}`,
    ]);

    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // A. 贷 (Credit): 应付账款 (总金额)
    const credit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      credit_split_guid,
      tx_guid,
      ap_account_guid, // (修改) 动态 A/P 账户
      "Purchase",
      "Bill",
      "n",
      -total_value_num,
      DENOMINATOR,
      -total_value_num,
      DENOMINATOR,
    ]);

    const entrySql = `
        INSERT INTO entries (guid, date, description, b_acct, quantity_num, quantity_denom, b_price_num, b_price_denom, bill)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    const entryDate = new Date(date_opened)
      .toISOString()
      .slice(0, 19)
      .replace(/[-T:]/g, "");

    // B. 借 (Debit): 费用或库存 (逐行)
    for (const item of line_items) {
      const debit_split_guid = generateGuid();
      const item_value_num = Math.round(
        item.quantity * item.price * DENOMINATOR
      );
      let item_quantity_num;

      if (item.isStockItem) {
        item_quantity_num = Math.round(item.quantity * DENOMINATOR);
      } else {
        item_quantity_num = item_value_num;
      }

      await connection.execute(splitSql, [
        debit_split_guid,
        tx_guid,
        item.asset_or_expense_account_guid,
        item.description,
        "Bill",
        "n",
        item_value_num,
        DENOMINATOR,
        item_quantity_num,
        DENOMINATOR,
      ]);

      const entry_guid = generateGuid();
      await connection.execute(entrySql, [
        entry_guid,
        entryDate,
        item.description,
        item.asset_or_expense_account_guid,
        item_quantity_num,
        DENOMINATOR,
        Math.round(item.price * DENOMINATOR),
        DENOMINATOR,
        bill_guid,
      ]);
    }

    await connection.commit();

    res.status(201).json({
      message: res.__("messages.bill_created"),
      bill_guid: bill_guid,
      transaction_guid: tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// --- 采购付款 (Vendor Payments) ---
exports.createVendorPayment = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      date,
      description,
      currency_guid,
      checking_account_guid,
      vendor_guid, // (修改)
      amount,
    } = req.body;

    // (新增) 动态查找/创建 A/P 账户
    const ap_account_guid = await findOrCreateApAccount(
      connection,
      vendor_guid,
      currency_guid
    );

    await connection.beginTransaction();

    const tx_guid = generateGuid();
    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid,
      "",
      date,
      new Date().toISOString().slice(0, 19).replace("T", " "),
      description,
    ]);

    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, 
                          value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const value_num = Math.round(amount * DENOMINATOR);

    // 借 (Debit): 应付账款 (来自动态查找)
    const debit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      debit_split_guid,
      tx_guid,
      ap_account_guid, // (修改)
      "Vendor Payment",
      "Payment",
      "n",
      value_num,
      DENOMINATOR,
      value_num,
      DENOMINATOR,
    ]);

    // 贷 (Credit): 银行存款
    const credit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      credit_split_guid,
      tx_guid,
      checking_account_guid,
      "Vendor Payment",
      "Payment",
      "n",
      -value_num,
      DENOMINATOR,
      -value_num,
      DENOMINATOR,
    ]);

    await connection.commit();

    res.status(201).json({
      message: res.__("messages.payment_created"),
      transaction_guid: tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
