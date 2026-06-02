import axios from "axios";

export const TOKEN_KEY = "hive_token";

const client = axios.create({ baseURL: "/api" });

// 自动附加 JWT
client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 统一解包 {code,data}；401 跳登录
client.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  (err) => {
    if (err.response?.status === 401 && location.pathname !== "/login") {
      localStorage.removeItem(TOKEN_KEY);
      location.href = "/login";
    }
    return Promise.reject(err.response?.data?.message ?? err.message);
  }
);

export default client;
