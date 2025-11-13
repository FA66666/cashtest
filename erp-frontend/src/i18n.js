import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import zh_CN from "./locales/zh_CN.json";

const i18n = createI18n({
  legacy: false, // 必须使用 Composition API 模式
  locale: "zh_CN", // 默认语言
  fallbackLocale: "zh_CN", // 回退语言
  messages: {
    en: en,
    zh_CN: zh_CN,
  },
});

export default i18n;
