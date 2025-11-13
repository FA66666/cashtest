const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

const DENOMINATOR = 100;
const PARENT_AP_ACCOUNT_GUID = "a0000000000000000000000000000006"; // (来自 init.sql)

// --- 供应商 (Vendors) ---
exports.getAllVendors = async (req, res, next) => {
  try {
    const sql =
      "SELECT guid, name, id, active, currency, ap_account_guid FROM vendors";
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
      "SELECT guid, name, id, notes, active, currency, ap_account_guid FROM vendors WHERE guid = ?",
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
  const connection = await db.getConnection();
  try {
    const { name, id, notes, currency, active } = req.body;

    const vendor_guid = generateGuid();
    const ap_account_guid = generateGuid();

    await connection.beginTransaction();

    const accountSql = `
      INSERT INTO accounts (guid, name, account_type, commodity_guid, parent_guid, code, placeholder, 
                            commodity_scu, non_std_scu, hidden)
      VALUES (?, ?, 'LIABILITY', ?, ?, ?, 0, 100, 0, 0)
    `;
    await connection.execute(accountSql, [
      ap_account_guid,
      `A/P - ${name}`,
      currency,
      PARENT_AP_ACCOUNT_GUID,
      `2000-${id}`,
    ]);

    const vendorSql = `
      INSERT INTO vendors (guid, ap_account_guid, name, id, notes, active, currency, 
                           tax_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `;
    await connection.execute(vendorSql, [
      vendor_guid,
      ap_account_guid,
      name,
      id,
      notes || "",
      active ? 1 : 0,
      currency,
    ]);

    await connection.commit();

    res.status(201).json({
      guid: vendor_guid,
      name,
      id,
      notes,
      active,
      currency,
      ap_account_guid,
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Vendor ID or A/P Account Code already exists" });
    }
    next(err);
  } finally {
    connection.release();
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

    const accountSql = `UPDATE accounts SET name = ? WHERE guid = (SELECT ap_account_guid FROM vendors WHERE guid = ?)`;
    await db.query(accountSql, [`A/P - ${name}`, guid]);

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

    const accountGuidSql = "SELECT ap_account_guid FROM vendors WHERE guid = ?";
    const vendor = await db.query(accountGuidSql, [guid]);
    const ap_guid = vendor[0]?.ap_account_guid;

    if (ap_guid) {
      await db.query("DELETE FROM accounts WHERE guid = ?", [ap_guid]);
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

exports.createPurchaseBill = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { vendor_guid, date_opened, notes, line_items } = req.body;

    const vendor = await db.query(
      "SELECT currency, ap_account_guid FROM vendors WHERE guid = ?",
      [vendor_guid]
    );
    if (vendor.length === 0) {
      throw new Error(res.__("errors.vendor_not_found"));
    }
    const currency_guid = vendor[0].currency;
    const ap_account_guid = vendor[0].ap_account_guid;

    let total_value_num = 0;
    line_items.forEach((item) => {
      total_value_num += item.quantity * item.price * DENOMINATOR;
    });

    await connection.beginTransaction();

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

    const credit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      credit_split_guid,
      tx_guid,
      ap_account_guid,
      "Purchase",
      "Bill",
      "n",
      -total_value_num,
      DENOMINATOR,
      -total_value_num,
      DENOMINATOR,
    ]);

    for (const item of line_items) {
      const debit_split_guid = generateGuid();
      const item_value_num = item.quantity * item.price * DENOMINATOR;

      await connection.execute(splitSql, [
        debit_split_guid,
        tx_guid,
        item.asset_or_expense_account_guid,
        item.description,
        "Bill",
        "n",
        item_value_num,
        DENOMINATOR,
        item_value_num,
        DENOMINATOR,
      ]);

      const entry_guid = generateGuid();
      const entrySql = `
        INSERT INTO entries (guid, date, description, b_acct, quantity_num, quantity_denom, b_price_num, b_price_denom, bill)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const entryDate = new Date(date_opened)
        .toISOString()
        .slice(0, 19)
        .replace(/[-T:]/g, "");

      await connection.execute(entrySql, [
        entry_guid,
        entryDate,
        item.description,
        item.asset_or_expense_account_guid,
        item.quantity * DENOMINATOR,
        DENOMINATOR,
        item.price * DENOMINATOR,
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

// (已修改为步骤 3)
exports.createVendorPayment = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      date,
      description,
      currency_guid,
      checking_account_guid,
      vendor_guid, // <-- 正确
      amount,
    } = req.body;

    const vendor = await db.query(
      "SELECT ap_account_guid FROM vendors WHERE guid = ?",
      [vendor_guid]
    );
    if (vendor.length === 0) {
      throw new Error(res.__("errors.vendor_not_found"));
    }
    const ap_account_guid = vendor[0].ap_account_guid; // <-- 正确

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

    const debit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      debit_split_guid,
      tx_guid,
      ap_account_guid,
      "Vendor Payment",
      "Payment",
      "n",
      value_num,
      DENOMINATOR,
      value_num,
      DENOMINATOR,
    ]);

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
