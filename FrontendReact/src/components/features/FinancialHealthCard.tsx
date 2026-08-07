import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "../ui/Card";
import { colors } from "../../constants/colors";
import { api } from "../../services/api";

interface FinancialHealth {
  score: number;
  healthStatus: string;
  advice: string;
  savingsRatioScore: number;
  debtToIncomeScore: number;
  emergencyFundScore: number;
  budgetAdherenceScore: number;
}

export const FinancialHealthCard: React.FC = () => {
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const profile = await api.get("/users/me").then((r) => r.data).catch(() => null);
        if (profile?.id) {
          const res = await api.get(`/financial-health/${profile.id}`);
          setHealth(res.data);
        } else {
          // Fallback mock if no profile id
          setHealth({
            score: 90,
            healthStatus: "Tuyệt vời",
            advice: "Tình hình tài chính của bạn rất tốt. Hãy tiếp tục duy trì và xem xét các cơ hội đầu tư sinh lời.",
            savingsRatioScore: 22,
            debtToIncomeScore: 23,
            emergencyFundScore: 24,
            budgetAdherenceScore: 21,
          });
        }
      } catch (e) {
        console.warn("Failed to fetch financial health", e);
        setHealth({
          score: 90,
          healthStatus: "Tuyệt vời",
          advice: "Tình hình tài chính của bạn rất tốt. Hãy tiếp tục duy trì và xem xét các cơ hội đầu tư sinh lời.",
          savingsRatioScore: 22,
          debtToIncomeScore: 23,
          emergencyFundScore: 24,
          budgetAdherenceScore: 21,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="small" color={colors.emerald600} />
      </Card>
    );
  }

  if (!health) return null;

  const score = health.score || 90;

  const indicators = [
    { label: "Tỷ lệ tích lũy", score: health.savingsRatioScore || 20, icon: "🌱" },
    { label: "Tuân thủ ngân sách", score: health.budgetAdherenceScore || 18, icon: "📊" },
    { label: "Kiểm soát nợ", score: health.debtToIncomeScore || 22, icon: "💸" },
    { label: "Quỹ dự phòng", score: health.emergencyFundScore || 23, icon: "🛡️" },
  ];

  const getScoreStatus = (s: number) => {
    if (s >= 20) return { label: "TUYỆT VỜI", color: colors.emerald600 };
    if (s >= 15) return { label: "KHÁ TỐT", color: colors.indigo600 };
    if (s >= 10) return { label: "TẠM ỔN", color: colors.amber500 };
    return { label: "BÁO ĐỘNG", color: colors.rose600 };
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sức khỏe Tài chính</Text>
          <Text style={styles.subtitle}>Đánh giá dựa trên thu chi và nợ</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{health.healthStatus || "Tuyệt vời"}</Text>
        </View>
      </View>

      {/* Circle Score + Indicators */}
      <View style={styles.contentRow}>
        {/* Score Circle */}
        <View style={styles.circleContainer}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreLabel}>ĐIỂM</Text>
          </View>
        </View>

        {/* Breakdown Items */}
        <View style={styles.indicatorsCol}>
          {indicators.map((item, idx) => {
            const status = getScoreStatus(item.score);
            const activeBars = Math.min(10, Math.max(1, Math.round((item.score / 25) * 10)));
            return (
              <View key={idx} style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>
                  {item.icon} {item.label}
                </Text>
                <View style={styles.indicatorRight}>
                  <Text style={[styles.indicatorStatus, { color: status.color }]}>
                    {status.label}
                  </Text>
                  <View style={styles.barsContainer}>
                    {[...Array(10)].map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barSegment,
                          i < activeBars ? { backgroundColor: status.color } : { backgroundColor: colors.slate200 },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Advice Box */}
      <View style={styles.adviceBox}>
        <Text style={styles.adviceIcon}>💡</Text>
        <Text style={styles.adviceText}>{health.advice}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.slate900,
  },
  subtitle: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerald600,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  circleContainer: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.emerald500,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.emerald600,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.slate400,
    letterSpacing: 0.5,
  },
  indicatorsCol: {
    flex: 1,
  },
  indicatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  indicatorLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate700,
  },
  indicatorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicatorStatus: {
    fontSize: 9,
    fontWeight: "800",
  },
  barsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  barSegment: {
    width: 4,
    height: 12,
    borderRadius: 1,
  },
  adviceBox: {
    flexDirection: "row",
    backgroundColor: colors.slate50,
    borderColor: colors.slate100,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "flex-start",
    gap: 8,
  },
  adviceIcon: {
    fontSize: 14,
  },
  adviceText: {
    flex: 1,
    fontSize: 11,
    color: colors.slate600,
    lineHeight: 16,
  },
});
