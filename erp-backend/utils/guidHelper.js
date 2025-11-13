const { v4: uuidv4 } = require("uuid");

/**
 * 为 GnuCash 生成一个32位的GUID (CHAR(32)，无连字符)
 * @returns {string}
 */
function generateGuid() {
  return uuidv4().replace(/-/g, "");
}

module.exports = {
  generateGuid,
};
