import axios from "axios";
import { safeStorage } from "./storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const getBaseUrl = () => {
  // 1. Try extracting host IP dynamically from Expo (Metro hostUri e.g. "192.168.123.200:8081")
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

  // 2. Android specific fallback (Try explicit LAN IP first, then 10.0.2.2 emulator loopback)
  if (Platform.OS === "android") {
    return "http://192.168.123.200:8080/api";
  }

  // 3. Fallback for Web / iOS Simulator
  return "http://localhost:8080/api";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    try {
      const activeUrl = getBaseUrl();
      config.baseURL = activeUrl;
      console.log(`[API REQUEST] ${config.method?.toUpperCase()} -> ${activeUrl}${config.url}`);
      const token = await safeStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error reading token from safeStorage", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log(
      `[API ERROR] ${error.config?.baseURL}${error.config?.url} ->`,
      error.message,
      error.response?.status || "NO_RESPONSE"
    );
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      try {
        await safeStorage.removeItem("token");
      } catch (storageErr) {
        console.error("Failed to clear token on 401/403", storageErr);
      }
    }
    return Promise.reject(error);
  }
);
