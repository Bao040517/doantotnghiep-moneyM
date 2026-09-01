import axios from "axios";
import { safeStorage } from "./storage";
import { Platform } from "react-native";

let Constants: any = null;
try {
  Constants = require("expo-constants")?.default || require("expo-constants");
} catch (e) {
  Constants = {};
}

export const getBaseUrl = () => {
  // 0. Production / Environment configured URL (if not stale duckdns)
  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes("duckdns")) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // 1. Try extracting host IP dynamically from Expo (Metro hostUri e.g. "192.168.10.106:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as any)?.hostUri ||
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ||
    (Constants as any).debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:8080/api`;
    }
  }

  // 2. Android specific fallback (10.0.2.2 is Android Emulator alias for PC localhost)
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080/api";
  }

  // 3. Fallback for Web / Local
  return "http://localhost:8080/api";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 90000,
});

// Request Interceptor: Tự động đính kèm Access Token vào Authorization header
api.interceptors.request.use(
  async (config) => {
    try {
      const activeUrl = getBaseUrl();
      config.baseURL = activeUrl;
      const token = await safeStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("[API] Error reading token from safeStorage", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables for managing refresh token queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Bắt lỗi 401 & Tự động gọi Refresh Token âm thầm (Silent Refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Không refresh nếu là các request auth cơ bản hoặc đã từng retry rồi
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh");

    const isAuthError =
      error.response?.status === 401 || error.response?.status === 403;

    if (isAuthError && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Đang có 1 tiến trình refresh token chạy, đưa request này vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await safeStorage.getItem("refreshToken");
        if (!storedRefreshToken) {
          throw new Error("No refresh token available");
        }

        const activeUrl = getBaseUrl();
        // Gọi thẳng axios instance riêng để tránh loop interceptors
        const refreshResponse = await axios.post(`${activeUrl}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = refreshResponse.data?.token || refreshResponse.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.refreshToken;

        if (newAccessToken) {
          await safeStorage.setItem("token", newAccessToken);
          if (newRefreshToken) {
            await safeStorage.setItem("refreshToken", newRefreshToken);
          }

          api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error("Failed to receive new access token");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        try {
          await safeStorage.removeItem("token");
          await safeStorage.removeItem("refreshToken");
        } catch (e) {
          console.error("Failed to clear auth storage", e);
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
