const db = require("../config/db");

exports.getCurrencies = async (req, res, next) => {
  try {
    // 货币在 GnuCash 中是 'CURRENCY' 命名空间下的商品
    const sql =
      "SELECT guid, mnemonic, fullname FROM commodities WHERE namespace = 'CURRENCY'";
    const currencies = await db.query(sql);
    res.json(currencies);
  } catch (err) {
    next(err);
  }
};

exports.getPrice = async (req, res, next) => {
  try {
    // 示例: ?from_guid=...&to_guid=... (例如 USD -> CNY)
    const { from_guid, to_guid } = req.query;

    // 查询最新汇率
    const sql = `
      SELECT value_num, value_denom 
      FROM prices 
      WHERE commodity_guid = ? AND currency_guid = ?
      ORDER BY date DESC 
      LIMIT 1
    `;
    // GnuCash 存储 A->B 的价格。如果查询 B->A，可能需要反转
    // 为简化，我们只查询 A->B
    const price = await db.query(sql, [from_guid, to_guid]);

    if (price.length === 0) {
      return res.status(404).json({ message: "Price not found" });
    }

    // value_num 和 value_denom 是分数
    res.json({
      rate: parseFloat(price[0].value_num) / parseFloat(price[0].value_denom),
    });
  } catch (err) {
    next(err);
  }
};

exports.getStockItems = async (req, res, next) => {
  try {
    // 库存商品通常在 'TEMPLATE' 命名空间或自定义命名空间
    const sql =
      "SELECT guid, mnemonic, fullname FROM commodities WHERE namespace = 'TEMPLATE'"; // 假设
    const items = await db.query(sql);
    res.json(items);
  } catch (err) {
    next(err);
  }
};
