import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import "./assets/main.scss"; // 导入全局 SCSS
import { useAuthStore } from "./store/auth"; // <-- 导入

const app = createApp(App);
const pinia = createPinia(); // <-- 创建 Pinia 实例

// 1. 使用 Pinia
app.use(pinia);

// !! 关键步骤: 在路由启动前检查 Token !!
// 确保 Pinia store 已初始化
const authStore = useAuthStore();
authStore.checkTokenOnLoad();

// 2. 使用 Vue-i18n
app.use(i18n);
// 3. 使用 Vue Router
app.use(router);

app.mount("#app");
