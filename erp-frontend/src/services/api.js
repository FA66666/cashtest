import axios from "axios";
import { useAuthStore } from "../store/auth";
import router from "../router";

// 1. 创建 Axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. 请求拦截器 (Request Interceptor)
//    在 *每个* 请求被发送之前执行
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (token) {
      // 将 JWT 令牌附加到 Authorization 头部
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. 响应拦截器 (Response Interceptor)
//    在收到响应时执行
apiClient.interceptors.response.use(
  (response) => {
    // 任何 2xx 状态码都会触发这里
    return response;
  },
  (error) => {
    // 任何非 2xx 状态码都会触发这里
    const authStore = useAuthStore();

    if (error.response) {
      const { status } = error.response;

      // 检查是否是 401 (Unauthorized) 或 403 (Forbidden)
      // 这通常意味着令牌无效或已过期
      if (status === 401 || status === 403) {
        console.error("Authentication error. Logging out.");
        // 调用 Pinia store 中的 logout action
        authStore.logout();
        // 重定向到登录页面
        router.push("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
