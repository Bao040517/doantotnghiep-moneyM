import { useState, useEffect, useCallback } from "react";
import { safeStorage } from "../services/storage";
import { UserSummary, LoginPayload, RegisterPayload } from "../types";
import { authService } from "../services/authService";

export function useAuth() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedToken = await safeStorage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (e) {
          await safeStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      console.error("Auth verification failed", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    await safeStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    await safeStorage.setItem("token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await safeStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return { user, token, isAuthenticated: !!token, isLoading, login, register, logout, refreshProfile: checkAuth };
}
