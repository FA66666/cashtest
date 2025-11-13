/**
 * 集中错误处理中间件
 * @param {Error} err - 抛出的错误对象
 * @param {object} req - Express request 对象
 * @param {object} res - Express response 对象
 * @param {function} next - Express next 函数
 */
function errorHandler(err, req, res, next) {
  // 打印错误日志
  console.error("================ ERROR ================");
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  console.error("Error Message:", err.message);
  console.error("Error Stack:", err.stack);
  console.error("======================================");

  // 获取 i18n 翻译函数
  const translate = res.__ || ((key) => key);

  let statusCode = err.statusCode || 500;

  // 尝试使用 err.message 作为 i18n 的 key
  let message = translate(err.message);
  if (message === err.message) {
    // 检查翻译是否失败
    if (message.startsWith("errors.")) {
      message = translate(message);
    } else {
      // 如果它是一个未知的错误（如数据库错误），则显示通用消息
      message = translate("errors.generic");
    }
  }

  // (可选) 为特定类型的错误自定义状态码
  if (err.code === "ECONNREFUSED") {
    statusCode = 503; // Service Unavailable (e.g., DB is down)
    message = translate("errors.db_connection_failed");
  }

  // 确保在响应发送之前没有其他内容被发送
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    error: message,
  });
}

module.exports = errorHandler;
