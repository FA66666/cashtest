const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

const DENOMINATOR = 100;
const PARENT_AR_ACCOUNT_GUID = "a0000000000000000000000000000005";

// (辅助函数) 动态查找或创建多币种A/R账户
async function findOrCreateArAccount(connection, customer_guid, currency_guid) {
  const infoSql = `
    SELECT 
      c.name as customer_name, 
      com.mnemonic as currency_mnemonic
    FROM customers c, commodities com
    WHERE com.guid = ?
    AND c.guid = ?
  `;
  const [infoRows] = await connection.query(infoSql, [
    currency_guid,
    customer_guid,
  ]);
  const info = infoRows[0];
  if (!info) {
    throw new Error("Customer or Currency not found.");
  }
  const { customer_name, currency_mnemonic } = info;

  const account_name = `A/R - ${customer_name} (${currency_mnemonic})`;

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
    "",
  ]);
  return guid;
}

// (辅助函数) 创建一个GnuCash交易
async function createTransaction(connection, currency_guid, date, description) {
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
  return tx_guid;
}

// (辅助函数) 创建一个GnuCash分录
async function createSplit(
  connection,
  tx_guid,
  account_guid,
  memo,
  action,
  value_num,
  quantity_num
) {
  const split_guid = generateGuid();
  const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, 
                          value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
  await connection.execute(splitSql, [
    split_guid,
    tx_guid,
    account_guid,
    memo || "",
    action,
    "n",
    value_num,
    DENOMINATOR,
    quantity_num,
    DENOMINATOR,
  ]);
}

// ... (getAllCustomers, getCustomerByGuid, createCustomer, updateCustomer, deleteCustomer 保持不变) ...
exports.getAllCustomers = async (req, res, next) => {
  try {
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
    res.json({ guid, name, id, notes, active });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer ID already exists" });
    }
    next(err);
  }
};
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

// (已修改) 重构以自动处理 COGS 和成本
exports.createSalesInvoice = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      customer_guid,
      currency_guid, // 销售货币
      date_opened,
      notes,
      line_items,
    } = req.body;

    let total_sales_value_num = 0;

    await connection.beginTransaction();

    // 1. 查找/创建应收账款(A/R)账户
    const ar_account_guid = await findOrCreateArAccount(
      connection,
      customer_guid,
      currency_guid
    );

    // 2. 创建销售交易 (Transaction 1)
    const sales_tx_guid = await createTransaction(
      connection,
      currency_guid,
      date_opened,
      notes || `Sales Invoice`
    );

    const invoice_guid = generateGuid();
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
      sales_tx_guid, // (重要) 链接到销售交易
    ]);

    const entrySql = `
        INSERT INTO entries (guid, date, description, i_acct, quantity_num, quantity_denom, i_price_num, i_price_denom, invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    const entryDate = new Date(date_opened)
      .toISOString()
      .slice(0, 19)
      .replace(/[-T:]/g, "");

    // (新增) 用于存储按货币分组的成本
    const cogs_map = new Map();

    // 3. 循环行项目, 创建收入分录并计算成本
    for (const item of line_items) {
      // --- 3a. 处理销售/收入 (交易 1) ---
      const item_sales_value_num = Math.round(
        item.quantity * item.price * DENOMINATOR
      );
      total_sales_value_num += item_sales_value_num;

      // 贷 (Credit): 收入科目 (以销售货币)
      await createSplit(
        connection,
        sales_tx_guid,
        item.income_account_guid,
        item.description,
        "Invoice",
        -item_sales_value_num,
        -item_sales_value_num
      );

      const item_quantity_num = Math.round(item.quantity * DENOMINATOR);
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

      // --- 3b. (新增) 计算成本和COGS ---

      // 查找库存账户
      const stockSql = `SELECT guid, parent_guid FROM accounts WHERE commodity_guid = ? AND account_type = 'STOCK' LIMIT 1`;
      const [stock_acct] = await connection.query(stockSql, [
        item.commodity_guid,
      ]);
      if (!stock_acct) {
        throw new Error(
          `No STOCK account found for commodity: ${item.commodity_guid}`
        );
      }

      // 查找库存的记账货币 (通过其父账户)
      const parentSql = `SELECT commodity_guid FROM accounts WHERE guid = ? LIMIT 1`;
      const [parent_acct] = await connection.query(parentSql, [
        stock_acct.parent_guid,
      ]);
      const cost_currency_guid = parent_acct.commodity_guid;

      // 查找此货币对应的 COGS 账户
      const cogsSql = `SELECT guid FROM accounts WHERE account_type = 'EXPENSE' AND commodity_guid = ? AND name LIKE 'Cost of Goods Sold%' LIMIT 1`;
      const [cogs_acct] = await connection.query(cogsSql, [cost_currency_guid]);
      if (!cogs_acct) {
        throw new Error(
          `No COGS account found for currency: ${cost_currency_guid}`
        );
      }

      // 计算平均成本
      const costSql = `SELECT SUM(quantity_num / quantity_denom) AS stock_level, SUM(value_num / value_denom) AS total_value FROM splits WHERE account_guid = ?`;
      const [cost_data] = await connection.query(costSql, [stock_acct.guid]);

      let average_cost = 0;
      if (cost_data && cost_data.stock_level > 0) {
        average_cost = cost_data.total_value / cost_data.stock_level;
      }

      const item_cost_value_num = Math.round(
        item.quantity * average_cost * DENOMINATOR
      );

      // 将成本按货币分组
      if (!cogs_map.has(cost_currency_guid)) {
        cogs_map.set(cost_currency_guid, []);
      }
      cogs_map.get(cost_currency_guid).push({
        stock_account_guid: stock_acct.guid,
        cogs_account_guid: cogs_acct.guid,
        quantity_num: -item_quantity_num,
        value_num: -item_cost_value_num, // 贷方 (Credit)
      });
    }

    // 4. 创建 A/R 借方分录 (交易 1)
    // 借 (Debit): 应收账款 (以销售货币)
    await createSplit(
      connection,
      sales_tx_guid,
      ar_account_guid,
      "Sales",
      "Invoice",
      total_sales_value_num,
      total_sales_value_num
    );

    // 5. (新增) 循环 COGS 分组, 创建成本交易 (Transaction 2, 3...)
    for (const [cost_currency_guid, splits_data] of cogs_map.entries()) {
      const cogs_tx_guid = await createTransaction(
        connection,
        cost_currency_guid,
        date_opened,
        `COGS for Invoice ${invoice_guid}`
      );

      let total_cogs_value_num = 0;

      for (const split_data of splits_data) {
        // 贷 (Credit): 库存
        await createSplit(
          connection,
          cogs_tx_guid,
          split_data.stock_account_guid,
          "COGS",
          "Invoice",
          split_data.value_num, // 负数
          split_data.quantity_num // 负数
        );

        // 借 (Debit): COGS
        await createSplit(
          connection,
          cogs_tx_guid,
          split_data.cogs_account_guid,
          "COGS",
          "Invoice",
          -split_data.value_num, // 变为正数
          -split_data.value_num // Qty = Value
        );

        total_cogs_value_num += split_data.value_num;
      }

      // (注意: GnuCash 实际上会为每个 COGS 科目创建一个总借方,
      // 但我们上面的逐行借贷在会计上是平衡且等效的)
    }

    await connection.commit();

    res.status(201).json({
      message: res.__("messages.invoice_created"),
      invoice_guid: invoice_guid,
      transaction_guid: sales_tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// --- 客户付款 (Customer Payments) ---
exports.createCustomerPayment = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      date,
      description,
      currency_guid,
      checking_account_guid,
      customer_guid,
      amount,
    } = req.body;

    const ar_account_guid = await findOrCreateArAccount(
      connection,
      customer_guid,
      currency_guid
    );

    await connection.beginTransaction();

    const tx_guid = await createTransaction(
      connection,
      currency_guid,
      date,
      description
    );

    const value_num = Math.round(amount * DENOMINATOR);

    // 借 (Debit): 银行存款
    await createSplit(
      connection,
      tx_guid,
      checking_account_guid,
      "Customer Payment",
      "Payment",
      value_num,
      value_num
    );

    // 贷 (Credit): 应收账款 (来自动态查找)
    await createSplit(
      connection,
      tx_guid,
      ar_account_guid,
      "Customer Payment",
      "Payment",
      -value_num,
      -value_num
    );

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
