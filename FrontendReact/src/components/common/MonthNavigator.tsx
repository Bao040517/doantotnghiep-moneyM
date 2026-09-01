import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import { colors } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";

interface MonthNavigatorProps {
  selectedMonth: number;
  selectedYear: number;
  onChangeMonth: (offset: number) => void;
  labelPrefix?: string;
  style?: StyleProp<ViewStyle>;
  isCurrentMonth?: boolean;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  selectedMonth,
  selectedYear,
  onChangeMonth,
  labelPrefix = "Tháng",
  style,
  isCurrentMonth,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark ? themeColors.surface : colors.white,
            borderColor: isDark ? themeColors.border : colors.slate200,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => onChangeMonth(-1)}
          style={styles.navBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={18} color={isDark ? themeColors.textPrimary : colors.slate700} />
        </TouchableOpacity>

        <View style={styles.centerRow}>
          <Calendar size={14} color={colors.indigo600} style={{ marginRight: 6 }} />
          <Text
            style={[
              styles.monthText,
              { color: isDark ? themeColors.textPrimary : colors.slate800 },
            ]}
          >
            {labelPrefix} {selectedMonth}/{selectedYear}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onChangeMonth(1)}
          style={styles.navBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={18} color={isDark ? themeColors.textPrimary : colors.slate700} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 220,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
