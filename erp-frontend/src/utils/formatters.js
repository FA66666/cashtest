/**
 * 格式化数字为货币字符串
 * @param {number | string} value - 数字值
 * @param {string} currencyCode - e.g., 'USD' (在SOP（生产）系统中应动态传入)
 */
export function formatCurrency(value, currencyCode = "USD") {
  const numericValue = parseFloat(value) || 0;
  return numericValue.toLocaleString("en-US", {
    style: "currency",
    currency: currencyCode,
  });
}

/**
 * 格式化日期时间字符串
 * @param {string} isoDateTime - ISO 日期时间字符串
 */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return "N/A";
  const date = new Date(isoDateTime);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 格式化 <input type="date"> 的值为 YYYY-MM-DD
 */
export function getISODate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

/**
 * 将 YYYY-MM-DDTHH:MM (来自 datetime-local) 转换为 YYYY-MM-DD HH:MM:SS (API 需要的)
 */
export function formatDateTimeForAPI(localDateTime) {
  if (!localDateTime) return null;
  const date = new Date(localDateTime);
  return (
    date.getFullYear() +
    "-" +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + date.getDate()).slice(-2) +
    " " +
    ("0" + date.getHours()).slice(-2) +
    ":" +
    ("0" + date.getMinutes()).slice(-2) +
    ":" +
    ("0" + date.getSeconds()).slice(-2)
  );
}
