// (修改点) 确保 dotenv 在最顶部被加载
require("dotenv").config();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// (修改点) 从 process.env 读取密钥
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 注册新用户
 */
exports.register = async (req, res, next) => {
  // 检查验证错误
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password, name } = req.body;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const sql =
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)";
    await db.query(sql, [username, password_hash, name || "", "user"]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Username already exists" });
    }
    next(err);
  }
};

/**
 * 登录用户
 */
exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, password } = req.body;

    const user = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (user.length === 0) {
      return res.status(401).json({ error: res.__("errors.login_failed") });
    }

    const foundUser = user[0];

    const isMatch = await bcrypt.compare(password, foundUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: res.__("errors.login_failed") });
    }

    const payload = {
      id: foundUser.id,
      username: foundUser.username,
      name: foundUser.name,
      role: foundUser.role,
    };

    // (修改点) 确保 JWT_SECRET 在这里被正确使用
    const token = jwt.sign(
      payload,
      JWT_SECRET, // <-- 必须确保这个值不是 undefined
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token: token,
    });
  } catch (err) {
    next(err);
  }
};
