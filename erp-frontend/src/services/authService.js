import apiClient from "./api";

/**
 * 登录
 * @param {object} credentials - { email, password }
 */
export function login(credentials) {
  // 指向 /api/v1/auth/login
  return apiClient.post("/auth/login", credentials);
}

/**
 * 注册
 * @param {object} userInfo - { email, password, name }
 */
export function register(userInfo) {
  // 指向 /api/v1/auth/register
  return apiClient.post("/auth/register", userInfo);
}
