import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import { safeStorage } from "../services/storage";
import { UserSummary, LoginPayload, RegisterPayload } from "../types";
import { authService } from "../services/authService";

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<any>;
  register: (payload: RegisterPayload) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserSummary | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial auth check on app launch
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        const savedToken = await safeStorage.getItem("token");
        if (savedToken) {
          if (isMounted) setToken(savedToken);
          try {
            const profile = await authService.getProfile();
            if (isMounted) setUser(profile);
          } catch (e: any) {
            // Chỉ xóa token nếu máy chủ báo lỗi 401 Unauthorized (Token hết hạn/không hợp lệ)
            if (e?.response?.status === 401) {
              await safeStorage.removeItem("token");
              await safeStorage.removeItem("refreshToken");
              if (isMounted) {
                setToken(null);
                setUser(null);
              }
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } catch (e) {
        console.error("Auth verification failed", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Silent profile refresh (does NOT toggle isLoading or unmount navigators)
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      if (profile) {
        setUser(profile);
      }
    } catch (e) {
      console.warn("Silent profile refresh failed", e);
    }
  }, []);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    const activeToken = res.token || res.accessToken || "";
    await safeStorage.setItem("token", activeToken);
    if (res.refreshToken) {
      await safeStorage.setItem("refreshToken", res.refreshToken);
    }
    setToken(activeToken);
    setUser(res.user);
    return res;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    const activeToken = res.token || res.accessToken || "";
    await safeStorage.setItem("token", activeToken);
    if (res.refreshToken) {
      await safeStorage.setItem("refreshToken", res.refreshToken);
    }
    setToken(activeToken);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      const storedRefreshToken = await safeStorage.getItem("refreshToken");
      await authService.logout(storedRefreshToken || undefined);
    } catch (e) {
      console.warn("Logout remote call failed", e);
    } finally {
      await safeStorage.removeItem("token");
      await safeStorage.removeItem("refreshToken");
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
