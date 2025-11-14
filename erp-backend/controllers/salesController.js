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

    const ar_account_guid = await findOrCreateArAccount(
      connection,
      customer_guid,
      currency_guid
    );

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
      sales_tx_guid,
    ]);

    const entrySql = `
        INSERT INTO entries (guid, date, description, i_acct, quantity_num, quantity_denom, i_price_num, i_price_denom, invoice)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    const entryDate = new Date(date_opened)
      .toISOString()
      .slice(0, 19)
      .replace(/[-T:]/g, "");

    const cogs_map = new Map();

    for (const item of line_items) {
      const item_sales_value_num = Math.round(
        item.quantity * item.price * DENOMINATOR
      );
      total_sales_value_num += item_sales_value_num;

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

      const stock_account_guid = item.stock_account_guid;

      const parentSql = `SELECT p.commodity_guid 
                       FROM accounts a 
                       JOIN accounts p ON a.parent_guid = p.guid 
                       WHERE a.guid = ? LIMIT 1`;
      const [parent_acct_rows] = await connection.query(parentSql, [
        stock_account_guid,
      ]);
      if (!parent_acct_rows || parent_acct_rows.length === 0) {
        throw new Error(
          `Invalid stock account selected: ${stock_account_guid}`
        );
      }
      const cost_currency_guid = parent_acct_rows[0].commodity_guid;

      const cogsSql = `SELECT guid FROM accounts WHERE account_type = 'EXPENSE' AND commodity_guid = ? AND name LIKE 'Cost of Goods Sold%' LIMIT 1`;
      const [cogs_acct_rows] = await connection.query(cogsSql, [
        cost_currency_guid,
      ]);
      if (!cogs_acct_rows || cogs_acct_rows.length === 0) {
        throw new Error(
          `No COGS account found for currency: ${cost_currency_guid}`
        );
      }
      const cogs_acct = cogs_acct_rows[0];

      const costSql = `SELECT SUM(quantity_num / quantity_denom) AS stock_level, SUM(value_num / value_denom) AS total_value FROM splits WHERE account_guid = ?`;
      const [cost_data_rows] = await connection.query(costSql, [
        stock_account_guid,
      ]);
      const cost_data = cost_data_rows[0];

      const current_stock_level =
        cost_data && cost_data.stock_level
          ? parseFloat(cost_data.stock_level)
          : 0;

      // (!!!) (修改) 检查库存并抛出带变量的错误 (!!!)
      if (item.quantity > current_stock_level) {
        // (新增) 获取商品 SKU 以便显示
        const [comm_rows] = await connection.query(
          "SELECT mnemonic FROM commodities WHERE guid = ?",
          [item.commodity_guid]
        );
        const itemName = comm_rows[0] ? comm_rows[0].mnemonic : "unknown item";

        // 抛出一个带 i18n 键和插值变量的错误
        const err = new Error("errors.insufficient_stock");
        err.interpolation = { item: itemName }; // (新增)
        throw err;
      }

      let average_cost = 0;
      if (current_stock_level > 0) {
        average_cost = cost_data.total_value / current_stock_level;
      }

      const item_cost_value_num = Math.round(
        item.quantity * average_cost * DENOMINATOR
      );

      if (!cogs_map.has(cost_currency_guid)) {
        cogs_map.set(cost_currency_guid, []);
      }
      cogs_map.get(cost_currency_guid).push({
        stock_account_guid: stock_account_guid,
        cogs_account_guid: cogs_acct.guid,
        quantity_num: -item_quantity_num,
        value_num: -item_cost_value_num,
      });
    }

    await createSplit(
      connection,
      sales_tx_guid,
      ar_account_guid,
      "Sales",
      "Invoice",
      total_sales_value_num,
      total_sales_value_num
    );

    for (const [cost_currency_guid, splits_data] of cogs_map.entries()) {
      const cogs_tx_guid = await createTransaction(
        connection,
        cost_currency_guid,
        date_opened,
        `COGS for Invoice ${invoice_guid}`
      );

      for (const split_data of splits_data) {
        await createSplit(
          connection,
          cogs_tx_guid,
          split_data.stock_account_guid,
          "COGS",
          "Invoice",
          split_data.value_num,
          split_data.quantity_num
        );

        await createSplit(
          connection,
          cogs_tx_guid,
          split_data.cogs_account_guid,
          "COGS",
          "Invoice",
          -split_data.value_num,
          -split_data.value_num
        );
      }
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

    await createSplit(
      connection,
      tx_guid,
      checking_account_guid,
      "Customer Payment",
      "Payment",
      value_num,
      value_num
    );

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
