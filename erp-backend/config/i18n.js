const i18n = require("i18n");
const path = require("path");

i18n.configure({
  locales: ["en", "zh_CN"],
  defaultLocale: "en",
  directory: path.join(__dirname, "..", "locales"),
  autoReload: true,
  syncFiles: true,
  objectNotation: true, // 允许 'errors.invoice_not_found'

  // 允许通过 ?lang=zh_CN 或请求头 Accept-Language 切换语言
  queryParameter: "lang",
  header: "accept-language",
});

module.exports = i18n;
