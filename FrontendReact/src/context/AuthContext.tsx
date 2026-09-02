import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform, Alert } from "react-native";
import { safeStorage } from "../services/storage";
import { UserSummary, LoginPayload, RegisterPayload } from "../types";
import { authService } from "../services/authService";
import * as WebBrowser from "expo-web-browser";

// Ensure browser auth sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth2 constants
const GOOGLE_CLIENT_ID_WEB = "NOT_SET"; // Will be replaced with real Client ID

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<any>;
  register: (payload: RegisterPayload) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
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
          } catch (e) {
            await safeStorage.removeItem("token");
            await safeStorage.removeItem("refreshToken");
            if (isMounted) {
              setToken(null);
              setUser(null);
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

  const loginWithGoogle = async () => {
    try {
      if (GOOGLE_CLIENT_ID_WEB === "NOT_SET") {
        Alert.alert(
          "Chưa cấu hình",
          "Google Client ID chưa được thiết lập. Vui lòng liên hệ admin để cấu hình."
        );
        return;
      }

      // Build Google OAuth2 Authorization URL
      const redirectUri = Platform.select({
        web: `${window.location.origin}`,
        default: "https://auth.expo.io/@ducbao/FrontendReact",
      });

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID_WEB}` +
        `&redirect_uri=${encodeURIComponent(redirectUri || "")}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent("openid email profile")}` +
        `&nonce=${Date.now()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri || undefined);

      if (result.type === "success" && result.url) {
        // Extract id_token from URL fragment (#id_token=...)
        const url = result.url;
        const fragment = url.split("#")[1];
        if (!fragment) throw new Error("Không nhận được token từ Google");

        const params = new URLSearchParams(fragment);
        const idToken = params.get("id_token");
        if (!idToken) throw new Error("Không nhận được id_token từ Google");

        // Send id_token to backend for verification
        const res = await authService.googleLogin(idToken);
        const activeToken = res.token || res.accessToken || "";
        await safeStorage.setItem("token", activeToken);
        if (res.refreshToken) {
          await safeStorage.setItem("refreshToken", res.refreshToken);
        }
        setToken(activeToken);
        setUser(res.user);
        return res;
      }
    } catch (e: any) {
      console.error("Google login error:", e);
      throw e;
    }
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
        loginWithGoogle,
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
