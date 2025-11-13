import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { jwtDecode } from "jwt-decode";
import * as authService from "../services/authService";
import apiClient from "../services/api";
import router from "../router"; // 导入 router

export const useAuthStore = defineStore("auth", () => {
  // --- State ---
  const token = ref(localStorage.getItem("token") || null);
  const user = ref(JSON.parse(localStorage.getItem("user")) || null);

  // --- Getters ---
  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role || "user");

  const hasRole = (roles) => {
    return roles.includes(userRole.value);
  };

  // (Helper) 解析 Token 并设置 State
  function setAuthState(newToken) {
    token.value = newToken;

    const decodedToken = jwtDecode(newToken);
    // (修改点)
    user.value = {
      id: decodedToken.id,
      username: decodedToken.username, // <-- 从 email 变为 username
      name: decodedToken.name,
      role: decodedToken.role,
    };

    // 持久化到 localStorage
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(user.value));

    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  }

  // (Helper) 清除 State
  function clearAuthState() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete apiClient.defaults.headers.common["Authorization"];
  }

  // --- Actions ---

  async function login(credentials) {
    try {
      // (注意) credentials 对象现在是 { username, password }
      // authService.login 只是传递它，所以不需要修改
      const response = await authService.login(credentials);
      setAuthState(response.data.token);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      clearAuthState();
      return false;
    }
  }

  function logout() {
    clearAuthState();
    router.push({ name: "Login" });
  }

  function checkTokenOnLoad() {
    if (token.value) {
      try {
        const decodedToken = jwtDecode(token.value);
        if (decodedToken.exp * 1000 < Date.now()) {
          console.log("Token expired, logging out.");
          logout();
        } else {
          setAuthState(token.value);
        }
      } catch (e) {
        console.error("Invalid token on load, logging out.", e);
        logout();
      }
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    userRole,
    hasRole,
    login,
    logout,
    checkTokenOnLoad,
  };
});
