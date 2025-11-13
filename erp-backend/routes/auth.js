const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { body } = require("express-validator");

// 简单的注册验证
const validateRegister = [
  // (修改点)
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// 简单的登录验证
const validateLogin = [
  // (修改点)
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// POST /api/v1/auth/register
router.post("/register", validateRegister, authController.register);

// POST /api/v1/auth/login
router.post("/login", validateLogin, authController.login);

module.exports = router;
