const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // GnuCash 使用的分数（Num/Denom）存储为BIGINT，需要支持
  supportBigNumbers: true,
  bigNumberStrings: true,
});

/**
 * 执行SQL查询
 * @param {string} sql 原生SQL语句
 * @param {Array} params 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * 获取一个数据库连接用于事务
 * @returns {Promise<mysql.PoolConnection>}
 */
async function getConnection() {
  return await pool.getConnection();
}

module.exports = {
  query,
  getConnection,
};
