const db = require("../config/db");
require("dotenv").config();

// (已删除) 不再硬编码基础货币
// const BASE_CURRENCY_GUID = 'ade56487e45e41219b5810c14b76c11d'; // USD

/**
 * 试算平衡表 (Trial Balance)
 * (已修正为支持动态多币种换算)
 */
exports.getTrialBalance = async (req, res, next) => {
  try {
    // (修改)
    // 现在需要两个参数：as_of_date 和 base_currency_guid
    const { as_of_date, base_currency_guid } = req.query;
    if (!as_of_date || !base_currency_guid) {
      return res.status(400).json({
        error:
          "Missing required query parameters: as_of_date and base_currency_guid",
      });
    }

    const end_datetime = as_of_date + " 23:59:59";

    const sql = `
      SELECT 
        a.guid,
        a.name, 
        a.code, 
        a.account_type,
        SUM(
          (s.value_num / s.value_denom)
          *
          COALESCE(
            (
              SELECT (p.value_num / p.value_denom)
              FROM prices p
              WHERE 
                p.commodity_guid = t.currency_guid -- (例如: 从 CNY)
                AND p.currency_guid = ?              -- (修改: 换算到选定的货币)
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ), 
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 -- (修改: 检查是否等于选定的货币)
              ELSE 0.0 
            END
          )
        ) AS balance
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      JOIN accounts a ON s.account_guid = a.guid
      WHERE t.post_date <= ?
      GROUP BY a.guid, a.name, a.code, a.account_type
      HAVING ABS(balance) > 0.001
      ORDER BY a.code, a.name
    `;

    const accounts = await db.query(sql, [
      base_currency_guid, // (修改)
      base_currency_guid, // (修改)
      end_datetime,
    ]);

    const total_balance = accounts.reduce(
      (sum, acc) => sum + parseFloat(acc.balance),
      0
    );

    res.json({
      as_of_date: as_of_date,
      base_currency: base_currency_guid, // (修改)
      accounts: accounts,
      total_balance: total_balance.toFixed(2),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 利润表 (Profit & Loss Statement)
 * (已修正为支持动态多币种换算)
 */
exports.getProfitLoss = async (req, res, next) => {
  try {
    // (修改)
    const { start_date, end_date, base_currency_guid } = req.query;
    if (!start_date || !end_date || !base_currency_guid) {
      return res.status(400).json({
        error:
          "Missing query parameters: start_date, end_date, and base_currency_guid",
      });
    }

    const start_datetime = start_date + " 00:00:00";
    const end_datetime = end_date + " 23:59:59";

    const sql = `
      SELECT 
        a.guid,
        a.name, 
        a.code, 
        a.account_type,
        SUM(
          (s.value_num / s.value_denom)
          *
          COALESCE(
            (
              SELECT (p.value_num / p.value_denom)
              FROM prices p
              WHERE 
                p.commodity_guid = t.currency_guid
                AND p.currency_guid = ?
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ),
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 
              ELSE 0.0 
            END
          )
        ) AS balance
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      JOIN accounts a ON s.account_guid = a.guid
      WHERE 
        a.account_type IN ('INCOME', 'EXPENSE')
        AND t.post_date BETWEEN ? AND ?
      GROUP BY a.guid, a.name, a.code, a.account_type
      HAVING ABS(balance) > 0.001
      ORDER BY a.account_type, a.code
    `;

    const accounts = await db.query(sql, [
      base_currency_guid, // (修改)
      base_currency_guid, // (修改)
      start_datetime,
      end_datetime,
    ]);

    let total_income = 0;
    let total_expense = 0;
    const income_accounts = [];
    const expense_accounts = [];

    accounts.forEach((acc) => {
      const balance = parseFloat(acc.balance);
      if (acc.account_type === "INCOME") {
        total_income += -balance;
        income_accounts.push({ ...acc, balance: -balance });
      } else if (acc.account_type === "EXPENSE") {
        total_expense += balance;
        expense_accounts.push({ ...acc, balance: balance });
      }
    });

    const net_income = total_income - total_expense;

    res.json({
      start_date: start_date,
      end_date: end_date,
      base_currency: base_currency_guid, // (修改)
      total_income: total_income,
      total_expense: total_expense,
      net_income: net_income,
      income_accounts: income_accounts,
      expense_accounts: expense_accounts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 资产负债表 (Balance Sheet)
 * (已修正为支持动态多币种换算)
 */
exports.getBalanceSheet = async (req, res, next) => {
  try {
    // (修改)
    const { as_of_date, base_currency_guid } = req.query;
    if (!as_of_date || !base_currency_guid) {
      return res.status(400).json({
        error:
          "Missing required query parameters: as_of_date and base_currency_guid",
      });
    }

    const end_datetime = as_of_date + " 23:59:59";

    const sql = `
      SELECT 
        a.guid,
        a.name, 
        a.code, 
        a.account_type,
        SUM(
          (s.value_num / s.value_denom)
          *
          COALESCE(
            (
              SELECT (p.value_num / p.value_denom)
              FROM prices p
              WHERE 
                p.commodity_guid = t.currency_guid
                AND p.currency_guid = ?
                AND p.date <= t.post_date
              ORDER BY p.date DESC
              LIMIT 1
            ),
            CASE 
              WHEN t.currency_guid = ? THEN 1.0 
              ELSE 0.0 
            END
          )
        ) AS balance
      FROM splits s
      JOIN transactions t ON s.tx_guid = t.guid
      JOIN accounts a ON s.account_guid = a.guid
      WHERE 
        a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'STOCK')
        AND t.post_date <= ?
      GROUP BY a.guid, a.name, a.code, a.account_type
      HAVING ABS(balance) > 0.001
      ORDER BY a.account_type, a.code
    `;

    const accounts = await db.query(sql, [
      base_currency_guid, // (修改)
      base_currency_guid, // (修改)
      end_datetime,
    ]);

    let total_assets = 0;
    let total_liabilities = 0;
    let total_equity = 0;
    let net_income = 0;

    const asset_accounts = [];
    const liability_accounts = [];
    const equity_accounts = [];

    accounts.forEach((acc) => {
      const balance = parseFloat(acc.balance);
      switch (acc.account_type) {
        case "ASSET":
        case "STOCK":
          total_assets += balance;
          asset_accounts.push({ ...acc, balance: balance });
          break;
        case "LIABILITY":
          total_liabilities += -balance;
          liability_accounts.push({ ...acc, balance: -balance });
          break;
        case "EQUITY":
          total_equity += -balance;
          equity_accounts.push({ ...acc, balance: -balance });
          break;
        case "INCOME":
          net_income += balance;
          break;
        case "EXPENSE":
          net_income += balance;
          break;
      }
    });

    net_income = -net_income;

    const total_equity_and_net_income = total_equity + net_income;
    const total_liabilities_and_equity =
      total_liabilities + total_equity_and_net_income;

    res.json({
      as_of_date: as_of_date,
      base_currency: base_currency_guid, // (修改)
      assets: {
        accounts: asset_accounts,
        total: total_assets,
      },
      liabilities: {
        accounts: liability_accounts,
        total: total_liabilities,
      },
      equity: {
        accounts: equity_accounts,
        net_income: net_income,
        total_equity_base: total_equity,
        total: total_equity_and_net_income,
      },
      total_liabilities_and_equity: total_liabilities_and_equity,
      check_balance: (total_assets - total_liabilities_and_equity).toFixed(2),
    });
  } catch (err) {
    next(err);
  }
};
