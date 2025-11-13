const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");

// 假设 API 接收浮点数
const DENOMINATOR = 100;

/**
 * 获取特定商品的库存水平
 * 库存水平是基于 'quantity' (数量), 而不是 'value' (价值)
 */
exports.getStockLevel = async (req, res, next) => {
  try {
    const { commodity_guid } = req.params;

    // 1. 找到与该商品关联的 'STOCK' (库存) 账户
    // 这是一个关键假设：一个 'STOCK' 类型的账户在 'commodity_guid' 字段
    // 中存储了它所跟踪的商品 GUID。
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
        .json({ error: res.__("errors.stock_account_not_found") }); // 假设 i18n 中已添加
    }
    const stock_account_guid = accounts[0].guid;

    // 2. 汇总该账户所有 'splits' 的 'quantity'
    const splitSql = `
      SELECT SUM(quantity_num / quantity_denom) AS stock_level
      FROM splits
      WHERE account_guid = ?
    `;
    const result = await db.query(splitSql, [stock_account_guid]);
    const stock_level = result[0].stock_level || 0;

    res.json({
      commodity_guid: commodity_guid,
      stock_account_guid: stock_account_guid,
      stock_level: parseFloat(stock_level),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 调整库存 (例如 盘亏 / 盘盈)
 * 这是一个事务性操作，会创建一笔复式记账
 */
exports.adjustInventory = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    // 1. 解析输入
    const {
      stock_account_guid,
      adjustment_expense_account_guid, // '库存盘亏' 等费用科目
      quantity_change, // e.g., -10 (盘亏10个) or 10 (盘盈10个)
      cost_per_unit, // 该商品的单位成本
      notes,
    } = req.body;

    // 2. 获取账户信息 (货币)
    const accSql = "SELECT commodity_guid FROM accounts WHERE guid = ?";
    const stock_acct = await db.query(accSql, [stock_account_guid]);
    const expense_acct = await db.query(accSql, [
      adjustment_expense_account_guid,
    ]);

    if (stock_acct.length === 0 || expense_acct.length === 0) {
      throw new Error(res.__("errors.account_not_found"));
    }

    // 交易的货币 (currency_guid) 应来自 '费用' 账户
    const currency_guid = expense_acct[0].commodity_guid;
    // 物品 (commodity_guid) 来自 '库存' 账户
    const commodity_guid = stock_acct[0].commodity_guid;

    // 3. 计算总价值变化
    // e.g., -10 * 15.50 = -155.00
    const total_value_change = quantity_change * cost_per_unit;

    // 4. 开始事务
    await connection.beginTransaction();

    // 5. 生成 GUIDs
    const tx_guid = generateGuid();
    const date_now_str = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // 6. 插入 Transaction
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

    // 7. 插入 Splits
    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 案例：盘亏 (quantity_change = -10, total_value_change = -155)
    // A. 贷 (Credit): 库存 (Asset) 账户减少
    //    value = -155, quantity = -10
    // B. 借 (Debit): 费用 (Expense) 账户增加
    //    value = 155, quantity = 155 (因为此账户的 'commodity' 是货币)

    // A. 库存账户 (Stock Account)
    const stock_split_guid = generateGuid();
    await connection.execute(splitSql, [
      stock_split_guid,
      tx_guid,
      stock_account_guid,
      `Adjust ${quantity_change} units`,
      "Adjust",
      "n",
      total_value_change * DENOMINATOR, // e.g., -15500
      DENOMINATOR,
      quantity_change * DENOMINATOR, // e.g., -1000 (假设库存商品的分母也是100)
      DENOMINATOR, // 假设
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
      -total_value_change * DENOMINATOR, // e.g., 15500 (借方为正)
      DENOMINATOR,
      -total_value_change * DENOMINATOR, // e.g., 15500 (此账户的商品是货币, quantity=value)
      DENOMINATOR,
    ]);

    // 8. 提交事务
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
