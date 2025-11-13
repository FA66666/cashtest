require("dotenv").config();
const express = require("express");
const cors = require("cors");
const i18n = require("./config/i18n");
const mainRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler"); // <-- 导入

const app = express();
const port = process.env.API_PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化 i18n (多语言)
app.use(i18n.init);

// (可选) 中间件，使翻译函数在 req 对象上可用
app.use((req, res, next) => {
  res.locals.__ = res.__; // res.__() 是 i18n 的翻译函数
  next();
});

// API 路由
app.use("/api/v1", mainRoutes);

// 根路由
app.get("/", (req, res) => {
  res.json({
    message: "ERP API is running.",
    language_test: res.__("messages.invoice_created"), // 测试 i18n
  });
});

// 统一错误处理
// !! 必须在所有路由之后声明 !!
app.use(errorHandler); // <-- 使用新的错误处理器

// 启动服务器
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
