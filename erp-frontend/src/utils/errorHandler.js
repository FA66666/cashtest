/**
 * 解析来自 Axios 的错误
 * @param {Error} error - Axios 错误对象
 * @returns {String | Array} - 格式化的错误消息或错误数组
 */
export function parseApiError(error) {
  if (error.response) {
    // 后端返回了响应 (e.g., 400, 401, 500)
    const data = error.response.data;

    // 1. 检查来自 express-validator 的数组错误
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors;
    }

    // 2. 检查来自我们自定义错误处理器的单个错误
    if (data.error && typeof data.error === "string") {
      return data.error;
    }
  }

  // 3. 网络错误或其他未知错误
  return error.message || "An unknown error occurred.";
}
