const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

const DENOMINATOR = 100;
// (已移除)
// const PARENT_AR_ACCOUNT_GUID = '...';

// --- 客户 (Customers) ---
exports.getAllCustomers = async (req, res, next) => {
  try {
    // (已修改) 移除了 ar_account_guid
    const customers = await db.query(
      "SELECT guid, name, id, active, currency FROM customers"
    );
    res.json(customers);
  } catch (err) {
    next(err);
  }
};
exports.getCustomerByGuid = async (req, res, next) => {
  try {
    const { guid } = req.params;
    // (已修改) 移除了 ar_account_guid
    const customer = await db.query(
      "SELECT guid, name, id, notes, active, currency FROM customers WHERE guid = ?",
      [guid]
    );
    if (customer.length === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.customer_not_found") });
    }
    res.json(customer[0]);
  } catch (err) {
    next(err);
  }
};

// (已修改) 回到简单的创建逻辑
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, id, notes, currency, active } = req.body;
    const guid = generateGuid();

    // (已修改) 移除了 ar_account_guid
    const sql = `
      INSERT INTO customers (guid, name, id, notes, active, currency, 
                             discount_num, discount_denom, credit_num, credit_denom, tax_override)
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, 1, 0)
    `;

    await db.query(sql, [
      guid,
      name,
      id,
      notes || "",
      active ? 1 : 0,
      currency,
    ]);

    res.status(201).json({ guid, name, id, notes, active, currency });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer ID already exists" });
    }
    next(err);
  }
};

// (已修改)
exports.updateCustomer = async (req, res, next) => {
  try {
    const { guid } = req.params;
    // (已修改) currency 现在可以修改了
    const { name, id, notes, currency, active } = req.body;

    const sql = `
      UPDATE customers 
      SET name = ?, id = ?, notes = ?, currency = ?, active = ?
      WHERE guid = ?
    `;
    const result = await db.query(sql, [
      name,
      id,
      notes || "",
      currency,
      active ? 1 : 0,
      guid,
    ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.customer_not_found") });
    }

    res.json({ guid, name, id, notes, active, currency });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer ID already exists" });
    }
    next(err);
  }
};

// (已修改) 移除了 A/R 账户的删除逻辑
exports.deleteCustomer = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const checkSql =
      "SELECT guid FROM invoices WHERE owner_guid = ? AND owner_type = 1 LIMIT 1";
    const invoices = await db.query(checkSql, [guid]);

    if (invoices.length > 0) {
      return res.status(400).json({
        error:
          "Cannot delete customer: Invoices are associated with this customer.",
      });
    }

    const result = await db.query("DELETE FROM customers WHERE guid = ?", [
      guid,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.customer_not_found") });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// --- 发票 (Invoices) ---
exports.getSalesInvoices = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        i.guid, i.id, i.date_opened, i.notes,
        c.name as customer_name,
        com.mnemonic as currency_code 
      FROM invoices i
      JOIN customers c ON i.owner_guid = c.guid
      LEFT JOIN commodities com ON i.currency = com.guid
      WHERE i.owner_type = 1
      ORDER BY i.date_opened DESC
    `;
    const invoices = await db.query(sql);
    res.json(invoices);
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceDetails = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const invoiceSql = "SELECT * FROM invoices WHERE guid = ?";
    const [invoice] = await db.query(invoiceSql, [guid]); // 使用解构
    if (!invoice || invoice.length === 0) {
      // 检查
      return res
        .status(404)
        .json({ message: res.__("errors.invoice_not_found") });
    }
    const [entries] = await db.query(
      "SELECT * FROM entries WHERE invoice = ?",
      [guid]
    ); // 使用解构
    res.json({
      ...invoice[0],
      entries: entries,
    });
  } catch (err) {
    next(err);
  }
};

// (已修改为步骤 7)
exports.createSalesInvoice = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      customer_guid,
      date_opened,
      notes,
      line_items,
      cogs_account_guid,
      ar_account_guid, // (新增)
      currency_guid, // (新增)
    } = req.body;

    let total_value_num = 0;

    await connection.beginTransaction();

    const invoice_guid = generateGuid();
    const tx_guid = generateGuid();

    // (已修改) 'currency' 现在来自请求体
    const invoiceSql = `
      INSERT INTO invoices (guid, id, date_opened, date_posted, notes, active, currency, owner_type, owner_guid, post_txn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(invoiceSql, [
      invoice_guid,
      `INV-${Date.now()}`,
      date_opened,
      date_opened,
      notes || "",
      1,
      currency_guid,
      1,
      customer_guid,
      tx_guid,
    ]);

    // (已修改) 'currency_guid' 现在来自请求体
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
      notes || `Sales Invoice ${invoice_guid}`,
    ]);

    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, 
                          value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of line_items) {
      // --- 分录 1：记录收入 (贷方) ---
      const item_value_num = Math.round(
        item.quantity * item.price * DENOMINATOR
      );
      total_value_num += item_value_num;

      const credit_split_guid = generateGuid();
      await connection.execute(splitSql, [
        credit_split_guid,
        tx_guid,
        item.income_account_guid,
        item.description,
        "Invoice",
        "n",
        -item_value_num,
        DENOMINATOR,
        -item_value_num,
        DENOMINATOR,
      ]);

      // --- 分录 2, 3, 4：记录 COGS ---
      const stockAccountSql = `SELECT guid FROM accounts WHERE commodity_guid = ? AND account_type = 'STOCK' LIMIT 1`;
      const [stockAccountRows] = await connection.execute(stockAccountSql, [
        item.commodity_guid,
      ]);

      if (stockAccountRows.length === 0) {
        throw new Error(
          `No STOCK account found for commodity GUID: ${item.commodity_guid}`
        );
      }
      const inventory_account_guid = stockAccountRows[0].guid;

      const item_cost_num = Math.round(item.quantity * item.cost * DENOMINATOR);

      const debit_cogs_guid = generateGuid();
      await connection.execute(splitSql, [
        debit_cogs_guid,
        tx_guid,
        cogs_account_guid,
        `COGS for ${item.description || "item"}`,
        "Invoice",
        "n",
        item_cost_num,
        DENOMINATOR,
        item_cost_num,
        DENOMINATOR,
      ]);

      const credit_inv_guid = generateGuid();
      const item_quantity_num = Math.round(item.quantity * DENOMINATOR);

      await connection.execute(splitSql, [
        credit_inv_guid,
        tx_guid,
        inventory_account_guid,
        `Sale of ${item.description || "item"}`,
        "Invoice",
        "n",
        -item_cost_num,
        DENOMINATOR,
        -item_quantity_num,
        DENOMINATOR,
      ]);

      // 5. (可选) 插入 Entries 表
      const entry_guid = generateGuid();
      const entrySql = `
        INSERT INTO entries (guid, date, description, i_acct, quantity_num, quantity_denom, i_price_num, i_price_denom, invoice)
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
        item.income_account_guid,
        item_quantity_num,
        DENOMINATOR,
        Math.round(item.price * DENOMINATOR),
        DENOMINATOR,
        invoice_guid,
      ]);
    }

    // (已修改) A. 借 (Debit): A/R 科目来自请求体
    const debit_ar_guid = generateGuid();
    await connection.execute(splitSql, [
      debit_ar_guid,
      tx_guid,
      ar_account_guid,
      "Sales",
      "Invoice",
      "n",
      total_value_num,
      DENOMINATOR,
      total_value_num,
      DENOMINATOR,
    ]);

    await connection.commit();

    res.status(201).json({
      message: res.__("messages.invoice_created"),
      invoice_guid: invoice_guid,
      transaction_guid: tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// --- 客户付款 (Customer Payments) ---
// (已修改为步骤 7)
exports.createCustomerPayment = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      date,
      description,
      currency_guid,
      checking_account_guid,
      ar_account_guid, // (修改) 现在来自请求体
      amount,
    } = req.body;

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

    // 借 (Debit): 银行存款
    const debit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      debit_split_guid,
      tx_guid,
      checking_account_guid,
      "Customer Payment",
      "Payment",
      "n",
      value_num,
      DENOMINATOR,
      value_num,
      DENOMINATOR,
    ]);

    // 贷 (Credit): 应收账款 (来自请求体)
    const credit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      credit_split_guid,
      tx_guid,
      ar_account_guid,
      "Customer Payment",
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
