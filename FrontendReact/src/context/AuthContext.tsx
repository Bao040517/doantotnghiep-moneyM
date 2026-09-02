import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Platform, Alert, AppState, AppStateStatus } from "react-native";
import { safeStorage } from "../services/storage";
import { UserSummary, LoginPayload, RegisterPayload } from "../types";
import { authService } from "../services/authService";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

// Ensure browser auth sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth2 constants
const GOOGLE_CLIENT_ID_WEB =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "273294037353-v96k6smbe50vv7of3a39obvu0nam70af.apps.googleusercontent.com";

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
  const isAuthenticatingRef = useRef<boolean>(false);

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

  // Tự động xóa phiên đăng nhập & xoá cache token mỗi khi thoát khỏi app (Bảo mật cấp ngân hàng)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        (nextAppState === "background" || (Platform.OS === "ios" && nextAppState === "inactive")) &&
        !isAuthenticatingRef.current
      ) {
        try {
          await safeStorage.removeItem("token");
          await safeStorage.removeItem("refreshToken");
          setToken(null);
          setUser(null);
        } catch (e) {
          console.warn("[AuthContext] Error clearing session on app exit:", e);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
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
    isAuthenticatingRef.current = true;
    try {
      const res = await authService.login(payload);
      const activeToken = res.token || res.accessToken || "";
      await safeStorage.setItem("token", activeToken);
      if (res.refreshToken) {
        await safeStorage.setItem("refreshToken", res.refreshToken);
      }
      setToken(activeToken);
      setUser(res.user);
      return res;
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const register = async (payload: RegisterPayload) => {
    isAuthenticatingRef.current = true;
    try {
      const res = await authService.register(payload);
      const activeToken = res.token || res.accessToken || "";
      await safeStorage.setItem("token", activeToken);
      if (res.refreshToken) {
        await safeStorage.setItem("refreshToken", res.refreshToken);
      }
      setToken(activeToken);
      setUser(res.user);
      return res;
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const loginWithGoogle = async () => {
    isAuthenticatingRef.current = true;
    try {
      if (GOOGLE_CLIENT_ID_WEB === "NOT_SET") {
        Alert.alert(
          "Chưa cấu hình",
          "Google Client ID chưa được thiết lập. Vui lòng liên hệ admin để cấu hình."
        );
        return;
      }

      // Safe cross-platform redirect URI for standalone & Expo Go
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "sharemoney",
      });

      // Build Google OAuth2 Authorization URL
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID_WEB)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent("openid email profile")}` +
        `&nonce=${Date.now()}` +
        `&prompt=select_account`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const url = result.url;
        let token = "";

        // Extract id_token or access_token from hash fragment (#id_token=... or #access_token=...)
        if (url.includes("#")) {
          const fragment = url.split("#")[1];
          const params = new URLSearchParams(fragment);
          token = params.get("id_token") || params.get("access_token") || "";
        }

        // Fallback to query params (?id_token=... or ?access_token=...)
        if (!token && url.includes("?")) {
          const queryString = url.split("?")[1].split("#")[0];
          const params = new URLSearchParams(queryString);
          token = params.get("id_token") || params.get("access_token") || "";
        }

        if (!token) {
          throw new Error("Không nhận được token xác thực từ Google");
        }

        // Send token to backend for verification
        const res = await authService.googleLogin(token);
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
    } finally {
      isAuthenticatingRef.current = false;
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
