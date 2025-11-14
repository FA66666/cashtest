const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");

// 假设 API 接收浮点数
const DENOMINATOR = 100;
// (新增)
const CNY_CURRENCY_GUID = "f4b3e81a3d3e4ed8b46a7c06f8c4c7b8";

/**
 * 获取特定商品的库存水平
 * (已修改) 现在将所有价值换算为 CNY
 */
exports.getStockLevel = async (req, res, next) => {
  try {
    const { commodity_guid } = req.params;

    // 1. 找到与该商品关联的 'STOCK' (库存) 账户
    const acctSql = `
      SELECT guid 
      FROM accounts 
      WHERE commodity_guid = ? AND account_type = 'STOCK' 
      LIMIT 1
    `;
    const accounts = await db.query(acctSql, [commodity_guid]);

    if (accounts.length === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.stock_account_not_found") });
    }
    const stock_account_guid = accounts[0].guid;

    // 2. (修改) 汇总 'quantity' 和 换算后的 'value'
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
                AND p.currency_guid = ?              -- (修改) 硬编码为 CNY
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ), 
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 -- (修改) 硬编码为 CNY
              ELSE NULL 
            END
          )
        ) AS total_value
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      WHERE s.account_guid = ?
    `;
    const result = await db.query(splitSql, [
      CNY_CURRENCY_GUID,
      CNY_CURRENCY_GUID,
      stock_account_guid,
    ]);
    const stock_level = result[0].stock_level || 0;
    const total_value = result[0].total_value || 0;

    // 3. (修改) 返回更丰富的数据
    res.json({
      commodity_guid: commodity_guid,
      stock_account_guid: stock_account_guid,
      stock_level: parseFloat(stock_level),
      total_value: parseFloat(total_value),
      currency_code: "CNY", // (修改) 总是返回 CNY
      currency_fraction: 100,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 调整库存 (例如 盘亏 / 盘盈)
 * 这是一个事务性操作，会创建一笔复式记账
 * (已重写以接受 commodity_guid)
 */
exports.adjustInventory = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    // 1. 解析输入
    const {
      commodity_guid, // (修改)
      currency_guid, // (新增)
      adjustment_expense_account_guid, // '库存盘亏' 等费用科目
      quantity_change, // e.g., -10 (盘亏10个) or 10 (盘盈10个)
      cost_per_unit, // 该商品的单位成本
      notes,
    } = req.body;

    // 2. 获取费用账户信息 (验证货币)
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

    // 3. (新增) 查找此商品关联的 STOCK 账户
    const stockAcctSql =
      "SELECT guid, commodity_guid FROM accounts WHERE commodity_guid = ? AND account_type = 'STOCK' LIMIT 1";
    const stock_acct = await db.query(stockAcctSql, [commodity_guid]);

    if (stock_acct.length === 0) {
      throw new Error(res.__("errors.stock_account_not_found"));
    }
    const stock_account_guid = stock_acct[0].guid;

    // 4. 计算总价值变化
    const total_value_change = quantity_change * cost_per_unit;

    // 5. 开始事务
    await connection.beginTransaction();

    // 6. 生成 GUIDs
    const tx_guid = generateGuid();
    const date_now_str = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // 7. 插入 Transaction (使用传入的 currency_guid)
    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid, // (修改)
      "",
      date_now_str,
      date_now_str,
      notes || "Inventory Adjustment",
    ]);

    // 8. 插入 Splits
    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // A. 库存账户 (Stock Account)
    const stock_split_guid = generateGuid();
    await connection.execute(splitSql, [
      stock_split_guid,
      tx_guid,
      stock_account_guid, // (修改) 动态查找到的
      `Adjust ${quantity_change} units`,
      "Adjust",
      "n",
      Math.round(total_value_change * DENOMINATOR),
      DENOMINATOR,
      Math.round(quantity_change * DENOMINATOR),
      DENOMINATOR,
    ]);

    // B. 费用账户 (Expense Account)
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

    // 9. 提交事务
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
