const db = require("../config/db");
const { generateGuid } = require("../utils/guidHelper");

exports.getCurrencies = async (req, res, next) => {
  try {
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
    const { from_guid, to_guid } = req.query;

    const sql = `
      SELECT value_num, value_denom 
      FROM prices 
      WHERE commodity_guid = ? AND currency_guid = ?
      ORDER BY date DESC 
      LIMIT 1
    `;
    const price = await db.query(sql, [from_guid, to_guid]);

    if (price.length === 0) {
      return res.status(404).json({ message: "Price not found" });
    }

    res.json({
      rate: parseFloat(price[0].value_num) / parseFloat(price[0].value_denom),
    });
  } catch (err) {
    next(err);
  }
};

// (已修改)
exports.getStockItems = async (req, res, next) => {
  try {
    // (修改) 移除所有 JOIN，只返回唯一的商品
    const sql =
      "SELECT guid, mnemonic, fullname FROM commodities WHERE namespace = 'TEMPLATE'";
    const items = await db.query(sql);
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.createStockItem = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      mnemonic, // SKU
      fullname, // 商品名称
      parent_inventory_account_guid, // 选中的父库存账户 (例如 '1301 - Inventory (CNY)')
    } = req.body;

    await connection.beginTransaction();

    // 1. 创建商品 (Commodity)
    const commodity_guid = generateGuid();
    const commoditySql = `
      INSERT INTO commodities (guid, namespace, mnemonic, fullname, fraction, quote_flag)
      VALUES (?, 'TEMPLATE', ?, ?, 100, 0)
    `;
    await connection.execute(commoditySql, [
      commodity_guid,
      mnemonic,
      fullname,
    ]);

    // 2. 创建关联的 STOCK 账户
    const stock_account_guid = generateGuid();
    const accountSql = `
      INSERT INTO accounts (guid, name, account_type, commodity_guid, commodity_scu, non_std_scu, 
                            parent_guid, code, description, hidden, placeholder)
      VALUES (?, ?, 'STOCK', ?, 100, 0, ?, ?, ?, 0, 0)
    `;
    await connection.execute(accountSql, [
      stock_account_guid,
      `Inventory - ${fullname}`, // 账户名称
      commodity_guid,
      parent_inventory_account_guid,
      "", // Code (可选)
      `Tracks ${mnemonic} quantity`,
    ]);

    await connection.commit();

    res.status(201).json({
      commodity_guid: commodity_guid,
      stock_account_guid: stock_account_guid,
      message: "Stock item created successfully.",
    });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "SKU (mnemonic) already exists" });
    }
    next(err);
  } finally {
    connection.release();
  }
};
