const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");
require("dotenv").config();

// (新增)
// 假设我们的 API 价格总是2位小数
const DENOMINATOR = 100;

// (已有)
exports.getAccountHierarchy = async (req, res, next) => {
  try {
    const sql =
      "SELECT guid, name, account_type, code, parent_guid, placeholder, commodity_guid FROM accounts ORDER BY code";
    const accounts = await db.query(sql);
    res.json(accounts);
  } catch (err) {
    next(err);
  }
};

// (已有)
exports.getAccountByGuid = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const account = await db.query(
      "SELECT guid, name, account_type, code, parent_guid, placeholder, commodity_guid FROM accounts WHERE guid = ?",
      [guid]
    );
    if (account.length === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.account_not_found") });
    }
    res.json(account[0]);
  } catch (err) {
    next(err);
  }
};

// (已有)
exports.getAccountBalance = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const { end_date } = req.query;

    const sql = `
      SELECT 
        SUM(s.value_num / s.value_denom) AS balance
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      WHERE s.account_guid = ? 
      ${end_date ? "AND t.post_date <= ?" : ""}
    `;

    const params = [guid];
    if (end_date) params.push(end_date + " 23:59:59");

    const result = await db.query(sql, params);
    const balance = result[0].balance || 0;

    res.json({ account_guid: guid, balance: parseFloat(balance) });
  } catch (err) {
    next(err);
  }
};

// (已修改) 创建手动日记账 (MJE)
exports.createJournalEntry = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    // 1. 从请求体获取数据 (已由 validator 验证)
    const { date, description, currency_guid, splits } = req.body;

    // (新增) 2. 服务器端货币验证
    const accountGuids = splits.map((s) => s.account_guid);
    if (accountGuids.length > 0) {
      // 动态生成 '?' 占位符
      const placeholders = accountGuids.map(() => "?").join(",");
      const sql = `SELECT guid, commodity_guid FROM accounts WHERE guid IN (${placeholders})`;
      const accounts = await db.query(sql, accountGuids);

      // 检查是否所有账户的货币都与交易货币匹配
      for (const account of accounts) {
        if (account.commodity_guid !== currency_guid) {
          throw new Error(
            "Currency mismatch: An account's currency does not match the transaction's currency."
          );
        }
      }
    }

    // (新增) 检查平衡 (从验证器移至此处)
    const sum = splits.reduce((acc, split) => acc + (split.value || 0), 0);
    if (Math.abs(sum) > 0.001) {
      throw new Error(
        "Journal entry does not balance. The sum of all splits must be zero."
      );
    }

    // (新增) 3. 检查净效应 (防止 COGS 借贷 COGS)
    const accountTotals = new Map();
    for (const split of splits) {
      const current = accountTotals.get(split.account_guid) || 0;
      accountTotals.set(split.account_guid, current + split.value);
    }

    let hasNetEffect = false;
    for (const total of accountTotals.values()) {
      // 检查是否有任何一个账户的*最终*净变化不是 0
      if (Math.abs(total) > 0.001) {
        hasNetEffect = true;
        break;
      }
    }

    if (!hasNetEffect) {
      // (修改) 抛出一个 i18n 键，而不是一个长字符串
      throw new Error("errors.no_net_effect");
    }

    await connection.beginTransaction();

    // 4. 创建 Transaction (交易总表)
    const tx_guid = generateGuid();
    const txSql = `
      INSERT INTO transactions (guid, currency_guid, num, post_date, enter_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(txSql, [
      tx_guid,
      currency_guid,
      "", // 手动分录通常没有编号
      date,
      new Date().toISOString().slice(0, 19).replace("T", " "),
      description,
    ]);

    // 5. 创建 Splits (交易明细)
    const splitSql = `
      INSERT INTO splits (guid, tx_guid, account_guid, memo, action, reconcile_state, 
                          value_num, value_denom, quantity_num, quantity_denom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const split of splits) {
      const split_guid = generateGuid();
      // 将浮点数 (如 150.75) 转换为 GnuCash 分数 (15075 / 100)
      // 借方 (Debits) 为正, 贷方 (Credits) 为负
      const value_num = Math.round(split.value * DENOMINATOR);

      // 对于货币分录, value 和 quantity 相同
      await connection.execute(splitSql, [
        split_guid,
        tx_guid,
        split.account_guid,
        split.memo || "",
        "Manual", // 'action'
        "n", // 'reconcile_state'
        value_num, // value_num (e.g., 15075 or -15075)
        DENOMINATOR, // value_denom (100)
        value_num, // quantity_num
        DENOMINATOR, // quantity_denom
      ]);
    }

    // 6. 提交事务
    await connection.commit();

    res.status(201).json({
      message: res.__("messages.journal_created"), // (我们需要在 locales 中添加这个)
      transaction_guid: tx_guid,
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// (已有)
exports.createAccount = async (req, res, next) => {
  try {
    const {
      name,
      account_type,
      commodity_guid,
      parent_guid,
      code,
      placeholder,
    } = req.body;
    const guid = generateGuid();

    const sql = `
      INSERT INTO accounts (guid, name, account_type, commodity_guid, parent_guid, code, placeholder, 
                            commodity_scu, non_std_scu, hidden)
      VALUES (?, ?, ?, ?, ?, ?, ?, 100, 0, 0)
    `;

    await db.query(sql, [
      guid,
      name,
      account_type,
      commodity_guid,
      parent_guid || null,
      code || "",
      placeholder ? 1 : 0,
    ]);

    res.status(201).json({
      guid,
      name,
      account_type,
      commodity_guid,
      parent_guid,
      code,
      placeholder,
    });
  } catch (err) {
    next(err);
  }
};

// (已有)
exports.updateAccount = async (req, res, next) => {
  try {
    const { guid } = req.params;
    const {
      name,
      account_type,
      commodity_guid,
      parent_guid,
      code,
      placeholder,
    } = req.body;

    const sql = `
      UPDATE accounts 
      SET name = ?, account_type = ?, commodity_guid = ?, parent_guid = ?, code = ?, placeholder = ?
      WHERE guid = ?
    `;

    const result = await db.query(sql, [
      name,
      account_type,
      commodity_guid,
      parent_guid || null,
      code || "",
      placeholder ? 1 : 0,
      guid,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: res.__("errors.account_not_found") });
    }

    res.json({
      guid,
      name,
      account_type,
      commodity_guid,
      parent_guid,
      code,
      placeholder,
    });
  } catch (err) {
    next(err);
  }
};
