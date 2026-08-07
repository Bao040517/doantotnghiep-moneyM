import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.slate900,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.slate900,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.slate900,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.slate700,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.slate600,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate400,
    lineHeight: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
};
