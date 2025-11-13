// (修改点) 确保 dotenv 在最顶部被加载
require("dotenv").config();
const jwt = require("jsonwebtoken");

// (修改点) 从 process.env 读取密钥
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 认证中间件
 * 检查 'Authorization: Bearer <token>' 头部
 */
function isAuthenticated(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ error: res.__("errors.unauthorized") });
  }

  // (修改点) 确保 JWT_SECRET 在这里被正确使用
  jwt.verify(token, JWT_SECRET, (err, user) => {
    // <-- 必须确保这个值不是 undefined
    if (err) {
      // (修改点) 明确打印验证错误，这有助于调试
      console.error("JWT Verification Error:", err.message);
      return res.status(403).json({ error: res.__("errors.forbidden") });
    }

    req.user = user;
    next();
  });
}

/**
 * 授权中间件 (可选)
 */
function hasRole(roles = []) {
  return (req, res, next) => {
    const { user } = req;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: res.__("errors.forbidden") });
    }

    next();
  };
}

module.exports = {
  isAuthenticated,
  hasRole,
};
