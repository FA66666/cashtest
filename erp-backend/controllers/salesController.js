const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

const DENOMINATOR = 100;
const PARENT_AR_ACCOUNT_GUID = "a0000000000000000000000000000005";

// (新增) 辅助函数：动态查找或创建多币种A/R账户
async function findOrCreateArAccount(connection, customer_guid, currency_guid) {
  // 1. 获取客户名称和货币助记符
  const infoSql = `
    SELECT 
      c.name as customer_name, 
      com.mnemonic as currency_mnemonic
    FROM customers c
    JOIN commodities com ON com.guid = ?
    WHERE c.guid = ?
  `;
  const [info] = await connection.query(infoSql, [
    currency_guid,
    customer_guid,
  ]);
  if (!info) {
    throw new Error("Customer or Currency not found.");
  }
  const { customer_name, currency_mnemonic } = info;

  // 2. 定义子账户名称
  const account_name = `A/R - ${customer_name} (${currency_mnemonic})`;

  // 3. 尝试查找
  const findSql =
    "SELECT guid FROM accounts WHERE name = ? AND commodity_guid = ?";
  const [existing] = await connection.query(findSql, [
    account_name,
    currency_guid,
  ]);
  if (existing) {
    return existing.guid;
  }

  // 4. 如果未找到，则创建
  const guid = generateGuid();
  const createSql = `
    INSERT INTO accounts (guid, name, account_type, commodity_guid, parent_guid, code, placeholder, 
                          commodity_scu, non_std_scu, hidden)
    VALUES (?, ?, 'ASSET', ?, ?, ?, 0, 100, 0, 0)
  `;
  await connection.execute(createSql, [
    guid,
    account_name,
    currency_guid,
    PARENT_AR_ACCOUNT_GUID,
    "", // A/R 子账户通常没有代码
  ]);
  return guid;
}

// --- 客户 (Customers) ---
exports.getAllCustomers = async (req, res, next) => {
  try {
    // (修改) 移除了 ar_account_guid 和 currency
    const customers = await db.query(
      "SELECT guid, name, id, active FROM customers"
    );
    res.json(customers);
  } catch (err) {
    next(err);
  }
};
exports.getCustomerByGuid = async (req, res, next) => {
  try {
    const { guid } = req.params;
    // (修改) 移除了 ar_account_guid 和 currency
    const customer = await db.query(
      "SELECT guid, name, id, notes, active FROM customers WHERE guid = ?",
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

// (已修改) 简化：不再创建A/R账户
exports.createCustomer = async (req, res, next) => {
  try {
    const { name, id, notes, active } = req.body;
    const guid = generateGuid();

    const sql = `
      INSERT INTO customers (guid, name, id, notes, active, 
                             discount_num, discount_denom, credit_num, credit_denom, tax_override)
      VALUES (?, ?, ?, ?, ?, 0, 1, 0, 1, 0)
    `;

    await db.query(sql, [guid, name, id, notes || "", active ? 1 : 0]);

    res.status(201).json({ guid, name, id, notes, active });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer ID already exists" });
    }
    next(err);
  }
};

// (已修改) 简化：不再更新A/R账户
exports.updateCustomer = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const { name, id, notes, active } = req.body;

    const sql = `
      UPDATE customers 
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
      return res
        .status(404)
        .json({ error: res.__("errors.customer_not_found") });
    }

    // (TODO) 理想情况下，我们还应该更新所有关联的A/R子账户的名称
    // 例如 "A/R - Old Name (USD)" -> "A/R - New Name (USD)"

    res.json({ guid, name, id, notes, active });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer ID already exists" });
    }
    next(err);
  }
};

// (已修改) 简化：不再删除A/R账户
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

    // (TODO) 理想情况下, 我们应该在这里删除所有关联的A/R子账户
    // (例如 `DELETE FROM accounts WHERE name LIKE 'A/R - CustomerName (%)'`)
    // 但这需要更复杂的检查（例如账户是否仍有余额）

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

    const invoiceSql = `
      SELECT 
        i.*,
        c.name as customer_name,
        com.mnemonic as currency_code
      FROM invoices i
      JOIN customers c ON i.owner_guid = c.guid
      LEFT JOIN commodities com ON i.currency = com.guid
      WHERE i.guid = ? AND i.owner_type = 1
    `;
    const invoices = await db.query(invoiceSql, [guid]);

    if (!invoices || invoices.length === 0) {
      return res
        .status(404)
        .json({ message: res.__("errors.invoice_not_found") });
    }
    const invoice = invoices[0];

    const entriesSql = `
      SELECT 
        e.guid, e.description, e.quantity_num, e.quantity_denom,
        e.i_price_num, e.i_price_denom,
        a.name as account_name
      FROM entries e
      LEFT JOIN accounts a ON e.i_acct = a.guid
      WHERE e.invoice = ?
    `;
    const entries = await db.query(entriesSql, [guid]);

    res.json({
      ...invoice,
      entries: entries,
    });
  } catch (err) {
    next(err);
  }
};

// (已修改)
exports.createSalesInvoice = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      customer_guid,
      currency_guid, // (新增)
      date_opened,
      notes,
      line_items,
      cogs_account_guid,
    } = req.body;

    let total_value_num = 0;

    await connection.beginTransaction();

    // (新增) 动态查找/创建A/R账户
    const ar_account_guid = await findOrCreateArAccount(
      connection,
      customer_guid,
      currency_guid
    );

    const invoice_guid = generateGuid();
    const tx_guid = generateGuid();

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
      currency_guid, // (修改)
      1,
      customer_guid,
      tx_guid,
    ]);

    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid, // (修改)
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

    const entrySql = `
        INSERT INTO entries (guid, date, description, i_acct, quantity_num, quantity_denom, i_price_num, i_price_denom, invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    const entryDate = new Date(date_opened)
      .toISOString()
      .slice(0, 19)
      .replace(/[-T:]/g, "");

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

    // (已修改) A. 借 (Debit): A/R 科目来自动态查找
    const debit_ar_guid = generateGuid();
    await connection.execute(splitSql, [
      debit_ar_guid,
      tx_guid,
      ar_account_guid, // (修改)
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
// (已修改)
exports.createCustomerPayment = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      date,
      description,
      currency_guid,
      checking_account_guid,
      customer_guid, // (修改)
      amount,
    } = req.body;

    // (新增) 动态查找/创建A/R账户
    const ar_account_guid = await findOrCreateArAccount(
      connection,
      customer_guid,
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

    // 贷 (Credit): 应收账款 (来自动态查找)
    const credit_split_guid = generateGuid();
    await connection.execute(splitSql, [
      credit_split_guid,
      tx_guid,
      ar_account_guid, // (修改)
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
