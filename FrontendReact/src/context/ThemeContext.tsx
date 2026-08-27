import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { safeStorage } from "../services/storage";
import { lightColors, darkColors, ThemeColors } from "../constants/theme";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

const THEME_STORAGE_KEY = "sharemoney_theme_mode";

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Khôi phục trạng thái theme từ AsyncStorage khi mở app
  useEffect(() => {
    safeStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === "dark") {
        setIsDark(true);
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      safeStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light").catch(() => {});
      return next;
    });
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook để sử dụng theme trong mọi component/screen.
 * @returns { isDark, toggleTheme, colors }
 */
export function useTheme() {
  return useContext(ThemeContext);
}
