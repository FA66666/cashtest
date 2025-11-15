const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");

// 假设 API 接收浮点数
const DENOMINATOR = 100;
const CNY_CURRENCY_GUID = "f4b3e81a3d3e4ed8b46a7c06f8c4c7b8";

/**
 * 获取特定商品的库存水平 (用于列表)
 */
exports.getStockLevel = async (req, res, next) => {
  try {
    const { commodity_guid } = req.params;

    // 1. 找到所有关联的 STOCK 账户
    const acctSql = `
      SELECT guid 
      FROM accounts 
      WHERE commodity_guid = ? AND account_type = 'STOCK'
    `;
    const accounts = await db.query(acctSql, [commodity_guid]);

    if (accounts.length === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.stock_account_not_found") });
    }
    const accountGuids = accounts.map((a) => a.guid);
    const placeholders = accountGuids.map(() => "?").join(",");

    // 2. 汇总 'quantity' 和 换算后的 'value' (CNY)
    const splitSql = `
      SELECT 
        SUM(s.quantity_num / s.quantity_denom) AS stock_level,
        SUM(
          (s.value_num / s.value_denom)
          *
          COALESCE(
            (
              SELECT (p.value_num / p.value_denom)
              FROM prices p
              WHERE 
                p.commodity_guid = t.currency_guid 
                AND p.currency_guid = ?              -- 硬编码为 CNY
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ), 
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 -- 硬编码为 CNY
              ELSE NULL 
            END
          )
        ) AS total_value
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      WHERE s.account_guid IN (${placeholders})
    `;

    const params = [CNY_CURRENCY_GUID, CNY_CURRENCY_GUID, ...accountGuids];

    const result = await db.query(splitSql, params);
    const stock_level = result[0].stock_level || 0;
    const total_value = result[0].total_value || 0;

    res.json({
      commodity_guid: commodity_guid,
      stock_level: parseFloat(stock_level),
      total_value: parseFloat(total_value),
      currency_code: "CNY",
      currency_fraction: 100,
    });
  } catch (err) {
    next(err);
  }
};

// (新增) 获取商品详情 (汇总 + 流水)
exports.getInventoryItemDetails = async (req, res, next) => {
  try {
    const { commodity_guid } = req.params;

    // 1. 查找所有关联的 STOCK 账户
    const stockAccountsSql = `
      SELECT a.guid, a.name, p_comm.mnemonic as currency_code
      FROM accounts a
      JOIN accounts p ON a.parent_guid = p.guid
      JOIN commodities p_comm ON p.commodity_guid = p_comm.guid
      WHERE a.commodity_guid = ? 
        AND a.account_type = 'STOCK'
        AND p_comm.namespace = 'CURRENCY'
    `;
    const stockAccounts = await db.query(stockAccountsSql, [commodity_guid]);

    if (stockAccounts.length === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.stock_account_not_found") });
    }

    const accountGuids = stockAccounts.map((a) => a.guid);
    const placeholders = accountGuids.map(() => "?").join(",");

    // 2. 获取按货币汇总的明细
    const summarySql = `
      SELECT 
        s.account_guid, 
        SUM(s.quantity_num / s.quantity_denom) as total_quantity,
        SUM(s.value_num / s.value_denom) as total_value
      FROM splits s
      WHERE s.account_guid IN (${placeholders})
      GROUP BY s.account_guid
    `;
    const summaryData = await db.query(summarySql, accountGuids);

    // 3. 将汇总数据合并到账户信息中
    const summary = stockAccounts.map((account) => {
      const data =
        summaryData.find((s) => s.account_guid === account.guid) || {};
      return {
        ...account,
        total_quantity: parseFloat(data.total_quantity || 0),
        total_value: parseFloat(data.total_value || 0),
      };
    });

    // 4. 获取详细流水
    const ledgerSql = `
      SELECT 
        t.post_date,
        t.description,
        s.account_guid,
        a.name as account_name,
        s.quantity_num, s.quantity_denom,
        s.value_num, s.value_denom,
        t_comm.mnemonic as currency_code
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      JOIN accounts a ON s.account_guid = a.guid
      JOIN commodities t_comm ON t.currency_guid = t_comm.guid
      WHERE s.account_guid IN (${placeholders})
      ORDER BY t.post_date DESC
    `;
    const ledger = await db.query(ledgerSql, accountGuids);

    res.json({
      summary: summary, // 按货币汇总
      ledger: ledger, // 详细流水
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 调整库存 (例如 盘亏 / 盘盈)
 * (此函数保持不变)
 */
exports.adjustInventory = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      commodity_guid,
      currency_guid,
      adjustment_expense_account_guid,
      quantity_change,
      cost_per_unit,
      notes,
    } = req.body;

    const accSql = "SELECT commodity_guid FROM accounts WHERE guid = ?";
    const expense_acct = await db.query(accSql, [
      adjustment_expense_account_guid,
    ]);

    if (expense_acct.length === 0) {
      throw new Error(res.__("errors.account_not_found") + " (Expense)");
    }
    if (expense_acct[0].commodity_guid !== currency_guid) {
      throw new Error(
        "Expense account currency does not match transaction currency."
      );
    }

    const stockAcctSql = `
      SELECT a.guid 
      FROM accounts a
      JOIN accounts p ON a.parent_guid = p.guid
      WHERE a.commodity_guid = ? 
      AND a.account_type = 'STOCK'
      AND p.commodity_guid = ?
      LIMIT 1
    `;
    const stock_acct = await db.query(stockAcctSql, [
      commodity_guid,
      currency_guid,
    ]);

    if (stock_acct.length === 0) {
      throw new Error(
        res.__("errors.stock_account_not_found") + " for the selected currency."
      );
    }
    const stock_account_guid = stock_acct[0].guid;

    const total_value_change = quantity_change * cost_per_unit;

    await connection.beginTransaction();

    const tx_guid = generateGuid();
    const date_now_str = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid,
      "",
      date_now_str,
      date_now_str,
      notes || "Inventory Adjustment",
    ]);

    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stock_split_guid = generateGuid();
    await connection.execute(splitSql, [
      stock_split_guid,
      tx_guid,
      stock_account_guid,
      `Adjust ${quantity_change} units`,
      "Adjust",
      "n",
      Math.round(total_value_change * DENOMINATOR),
      DENOMINATOR,
      Math.round(quantity_change * DENOMINATOR),
      DENOMINATOR,
    ]);

    const expense_split_guid = generateGuid();
    await connection.execute(splitSql, [
      expense_split_guid,
      tx_guid,
      adjustment_expense_account_guid,
      `Cost of ${quantity_change} units`,
      "Adjust",
      "n",
      Math.round(-total_value_change * DENOMINATOR),
      DENOMINATOR,
      Math.round(-total_value_change * DENOMINATOR),
      DENOMINATOR,
    ]);

    await connection.commit();

    res.status(201).json({
      message: "Inventory adjusted successfully.",
      transaction_guid: tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * (!!新增!!) 批量获取所有商品的库存水平和价值
 */
exports.getBatchStockLevels = async (req, res, next) => {
  try {
    // 这个查询结合了 commodities, accounts, splits, transactions, 和 prices
    // 1. 从 'TEMPLATE' (商品) 开始
    // 2. 找到对应的 'STOCK' 账户
    // 3. 汇总所有 'splits' (分录) 的 quantity
    // 4. 汇总所有 'splits' (分录) 的 value，并使用 'prices' 表统一换算为 CNY
    const sql = `
      SELECT 
        c.guid, 
        c.mnemonic, 
        c.fullname,
        COALESCE(SUM(s.quantity_num / s.quantity_denom), 0) AS stock_level,
        COALESCE(SUM(
          (s.value_num / s.value_denom)
          *
          COALESCE(
            (
              SELECT (p.value_num / p.value_denom)
              FROM prices p
              WHERE 
                p.commodity_guid = t.currency_guid 
                AND p.currency_guid = ?              -- 硬编码为 CNY
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ), 
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 -- 硬编码为 CNY
              ELSE 0.0 -- (修改) 使用 0.0 替代 NULL 来防止SUM忽略
            END
          )
        ), 0) AS total_value
      FROM commodities c
      LEFT JOIN accounts a ON a.commodity_guid = c.guid AND a.account_type = 'STOCK'
      LEFT JOIN splits s ON s.account_guid = a.guid
      LEFT JOIN transactions t ON s.tx_guid = t.guid
      WHERE c.namespace = 'TEMPLATE'
      GROUP BY c.guid, c.mnemonic, c.fullname
      ORDER BY c.mnemonic;
    `;

    const params = [CNY_CURRENCY_GUID, CNY_CURRENCY_GUID];

    const results = await db.query(sql, params);

    // 为前端添加 currency_code
    const responseData = results.map((item) => ({
      ...item,
      stock_level: parseFloat(item.stock_level),
      total_value: parseFloat(item.total_value),
      currency_code: "CNY", // 因为所有价值都已转换为CNY
    }));

    res.json(responseData);
  } catch (err) {
    next(err);
  }
};
