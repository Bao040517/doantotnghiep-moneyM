import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { BottomSheet } from "../ui/BottomSheet";
import { colors } from "../../constants/colors";
import { financialServices } from "../../services/financialServices";
import { CashflowPoint } from "../../types";

interface CashflowComparisonBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedYear?: number;
  selectedMonth?: number;
  currentMonthExpense?: number;
  currentMonthIncome?: number;
}

export const CashflowComparisonBottomSheet: React.FC<CashflowComparisonBottomSheetProps> = ({
  visible,
  onClose,
  selectedYear,
  selectedMonth,
  currentMonthExpense = 0,
  currentMonthIncome = 0,
}) => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [activeType, setActiveType] = useState<"income" | "expense" | "diff">("expense");
  const [selectedIndex, setSelectedIndex] = useState<number>(5);
  const [weeksData, setWeeksData] = useState<CashflowPoint[]>([]);
  const [monthsData, setMonthsData] = useState<CashflowPoint[]>([]);
  const [yearsData, setYearsData] = useState<CashflowPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDiffDetailModal, setShowDiffDetailModal] = useState(false);

  const now = new Date();
  const targetYear = selectedYear || now.getFullYear();
  const targetMonth = selectedMonth || (now.getMonth() + 1);

  // Helper: Get Monday 00:00:00 of the week for a given Date
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    setLoading(true);

    const loadRealData = async () => {
      try {
        // ─── 1. Generate 6 Weeks counting back from current/target week ───
        const isCurrentMonthYear =
          targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1;
        const refDate = isCurrentMonthYear
          ? new Date()
          : new Date(targetYear, targetMonth, 0); // Last day of targetMonth

        const currentMonday = getMonday(refDate);
        const weeksMeta: Array<{
          startDate: Date;
          endDate: Date;
          label: string;
          periodTitle: string;
          fullEndDateStr: string;
          startDateStr: string;
          endDateStr: string;
          isCurrentWeek: boolean;
          yearMonthKeys: { year: number; month: number }[];
        }> = [];

        for (let i = 5; i >= 0; i--) {
          const monday = new Date(currentMonday);
          monday.setDate(currentMonday.getDate() - i * 7);
          monday.setHours(0, 0, 0, 0);

          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          const sD = monday.getDate();
          const sM = monday.getMonth() + 1;
          const sY = monday.getFullYear();

          const eD = sunday.getDate();
          const eM = sunday.getMonth() + 1;
          const eY = sunday.getFullYear();

          const isCurrentWeek = i === 0 && isCurrentMonthYear;

          let label = "";
          if (isCurrentWeek) {
            label = "Tuần này";
          } else if (sM === eM) {
            label = `${pad(sD)} - ${pad(eD)}`;
          } else {
            label = `${pad(sD)}/${pad(sM)} - ${pad(eD)}/${pad(eM)}`;
          }

          const periodTitle = `Tuần ${pad(sD)}/${pad(sM)} - ${pad(eD)}/${pad(eM)}`;
          const fullEndDateStr = `${pad(eD)}/${pad(eM)}/${eY}`;
          const startDateStr = `${pad(sD)}/${pad(sM)}`;
          const endDateStr = `${pad(eD)}/${pad(eM)}`;

          const ymKeys = [{ year: sY, month: sM }];
          if (sY !== eY || sM !== eM) {
            ymKeys.push({ year: eY, month: eM });
          }

          weeksMeta.push({
            startDate: monday,
            endDate: sunday,
            label,
            periodTitle,
            fullEndDateStr,
            startDateStr,
            endDateStr,
            isCurrentWeek,
            yearMonthKeys: ymKeys,
          });
        }

        // Fetch monthly transactions for all months in the 6 weeks
        const uniqueYM = Array.from(
          new Set(
            weeksMeta.flatMap((w) => w.yearMonthKeys.map((k) => `${k.year}-${k.month}`))
          )
        ).map((str) => {
          const [y, m] = str.split("-").map(Number);
          return { year: y, month: m };
        });

        const txPromises = uniqueYM.map(({ year, month }) =>
          financialServices.getMonthlyTransactions(year, month).catch(() => [])
        );

        // ─── 2. Generate 6 Months counting back from (targetYear, targetMonth) ───
        const last6Months: { year: number; month: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          let m = targetMonth - i;
          let y = targetYear;
          while (m <= 0) {
            m += 12;
            y -= 1;
          }
          last6Months.push({ year: y, month: m });
        }

        const monthPromises = last6Months.map(({ year: y, month: m }) =>
          financialServices
            .getMonthlySummary(y, m)
            .then((res) => {
              const inc = Number(res?.currentMonth?.totalIncome ?? res?.totalIncome ?? 0);
              const exp = Number(res?.currentMonth?.totalExpense ?? res?.totalExpense ?? 0);
              const isCrossYear = y !== targetYear;
              const lastDayOfMonth = new Date(y, m, 0).getDate();
              return {
                period: isCrossYear ? `Tháng ${m}/${String(y).slice(-2)}` : `Tháng ${m}`,
                label: isCrossYear ? `T${m}/${String(y).slice(-2)}` : `T${m}`,
                fullEndDateStr: `${pad(lastDayOfMonth)}/${pad(m)}/${y}`,
                income: inc,
                expense: exp,
                net: inc - exp,
              };
            })
            .catch(() => {
              const lastDayOfMonth = new Date(y, m, 0).getDate();
              return {
                period: `Tháng ${m}`,
                label: `T${m}`,
                fullEndDateStr: `${pad(lastDayOfMonth)}/${pad(m)}/${y}`,
                income: 0,
                expense: 0,
                net: 0,
              };
            })
        );

        // ─── 3. Load 5 Years Data (targetYear - 4 to targetYear) ───
        const last5Years: number[] = [];
        for (let i = 4; i >= 0; i--) {
          last5Years.push(targetYear - i);
        }

        // Try getting backend-calculated cashflow summary first (fast single SQL query)
        const cashflowRes = await financialServices
          .getCashflowSummary(targetYear, targetMonth)
          .catch(() => null);

        let fetchedYears: CashflowPoint[] = [];

        if (cashflowRes?.years && cashflowRes.years.length > 0) {
          fetchedYears = cashflowRes.years.map((y) => ({
            period: y.period.startsWith("Năm") ? y.period : `Năm ${y.period}`,
            label: String(y.label),
            fullEndDateStr: `31/12/${y.label}`,
            income: Number(y.income || 0),
            expense: Number(y.expense || 0),
            net: Number(y.net || (Number(y.income || 0) - Number(y.expense || 0))),
          }));
        } else {
          // Fallback: calculate for 5 years
          const yearPromises = last5Years.map(async (y) => {
            try {
              const monthsInY = y === now.getFullYear() ? targetMonth : 12;
              const resList = await Promise.all(
                Array.from({ length: monthsInY }, (_, i) =>
                  financialServices.getMonthlySummary(y, i + 1).catch(() => null)
                )
              );
              const totalInc = resList.reduce((s, r) => s + Number(r?.currentMonth?.totalIncome ?? 0), 0);
              const totalExp = resList.reduce((s, r) => s + Number(r?.currentMonth?.totalExpense ?? 0), 0);
              return {
                period: `Năm ${y}`,
                label: String(y),
                fullEndDateStr: `31/12/${y}`,
                income: totalInc,
                expense: totalExp,
                net: totalInc - totalExp,
              };
            } catch (e) {
              return {
                period: `Năm ${y}`,
                label: String(y),
                fullEndDateStr: `31/12/${y}`,
                income: 0,
                expense: 0,
                net: 0,
              };
            }
          });
          fetchedYears = await Promise.all(yearPromises);
        }

        const [txResults, fetchedMonths] = await Promise.all([
          Promise.all(txPromises),
          Promise.all(monthPromises),
        ]);

        const allTxs = txResults.flat();

        const calculatedWeeksData: CashflowPoint[] = weeksMeta.map((w) => {
          let inc = 0;
          let exp = 0;
          allTxs.forEach((t: any) => {
            if (!t?.transactionDate) return;
            const tDate = new Date(t.transactionDate);
            if (tDate >= w.startDate && tDate <= w.endDate) {
              const amt = Number(t.amount || 0);
              if (t.type === "INCOME") inc += amt;
              else if (t.type === "EXPENSE") exp += amt;
            }
          });

          return {
            period: w.periodTitle,
            label: w.label,
            fullEndDateStr: w.fullEndDateStr,
            startDateStr: w.startDateStr,
            endDateStr: w.endDateStr,
            income: inc,
            expense: exp,
            net: inc - exp,
          };
        });

        if (isMounted) {
          setWeeksData(calculatedWeeksData);
          setMonthsData(fetchedMonths);
          setYearsData(fetchedYears);

          const curLen =
            timeRange === "year"
              ? fetchedYears.length
              : timeRange === "month"
              ? fetchedMonths.length
              : calculatedWeeksData.length;
          setSelectedIndex(Math.max(0, curLen - 1));
        }
      } catch (err) {
        console.error("Failed to load real cashflow data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRealData();

    return () => {
      isMounted = false;
    };
  }, [visible, targetYear, targetMonth]);

  const switchTimeRange = (range: "week" | "month" | "year") => {
    setTimeRange(range);
    const dataLen =
      range === "year"
        ? yearsData.length
        : range === "month"
        ? monthsData.length
        : weeksData.length;
    setSelectedIndex(Math.max(0, dataLen - 1));
  };

  const switchActiveType = (type: "income" | "expense" | "diff") => {
    setActiveType(type);
  };

  const fmt = (n: number) => {
    const safe = Math.round(Math.abs(Number(n) || 0));
    return safe.toLocaleString("vi-VN") + "đ";
  };

  // 100% REAL DATA FROM DATABASE
  const compData: CashflowPoint[] =
    timeRange === "year"
      ? yearsData
      : timeRange === "month"
      ? monthsData
      : weeksData;

  // Selected item based on user tap or default to latest
  const validIndex = Math.min(selectedIndex, Math.max(0, compData.length - 1));
  const activeItem = compData[validIndex] || compData[compData.length - 1];

  // Active period amount for Hero Box
  const activeHeroVal =
    activeType === "income"
      ? (activeItem?.income || 0)
      : activeType === "expense"
      ? (activeItem?.expense || 0)
      : ((activeItem?.income || 0) - (activeItem?.expense || 0));

  // Comparison with previous period item (for the comparison pill below Hero amount)
  const prevItem = validIndex > 0 ? compData[validIndex - 1] : null;
  let compDiff = 0;
  if (prevItem) {
    const curVal =
      activeType === "income"
        ? (activeItem?.income || 0)
        : activeType === "expense"
        ? (activeItem?.expense || 0)
        : ((activeItem?.income || 0) - (activeItem?.expense || 0));
    const prevVal =
      activeType === "income"
        ? (prevItem?.income || 0)
        : activeType === "expense"
        ? (prevItem?.expense || 0)
        : ((prevItem?.income || 0) - (prevItem?.expense || 0));
    compDiff = curVal - prevVal;
  }

  // Calculation for the exclamation mark detail modal
  const incChange = (activeItem?.income || 0) - (prevItem?.income || 0);
  const expChange = (activeItem?.expense || 0) - (prevItem?.expense || 0);

  let explanationText = "";
  if (incChange > 0 && expChange < 0) {
    explanationText = `Rất tốt! Thu nhập tăng ${fmt(incChange)} đồng thời Chi tiêu giảm ${fmt(Math.abs(expChange))}, giúp chênh lệch tăng mạnh ${fmt(Math.abs(compDiff))}.`;
  } else if (incChange > 0 && expChange > 0) {
    if (compDiff > 0) {
      explanationText = `Thu nhập tăng ${fmt(incChange)} bù đắp cho mức tăng Chi tiêu ${fmt(expChange)}, giúp chênh lệch vẫn tăng ${fmt(compDiff)}.`;
    } else {
      explanationText = `Dù Thu nhập tăng ${fmt(incChange)}, nhưng Chi tiêu tăng nhiều hơn (${fmt(expChange)}), khiến chênh lệch giảm ${fmt(Math.abs(compDiff))}.`;
    }
  } else if (incChange < 0 && expChange < 0) {
    if (compDiff > 0) {
      explanationText = `Chi tiêu tiết kiệm giảm ${fmt(Math.abs(expChange))} vượt qua mức giảm Thu nhập ${fmt(Math.abs(incChange))}, giúp chênh lệch vẫn tăng ${fmt(compDiff)}.`;
    } else {
      explanationText = `Thu nhập giảm ${fmt(Math.abs(incChange))} nhiều hơn mức cắt giảm Chi tiêu (${fmt(Math.abs(expChange))}), khiến chênh lệch giảm ${fmt(Math.abs(compDiff))}.`;
    }
  } else if (incChange < 0 && expChange > 0) {
    explanationText = `Cảnh báo: Thu nhập giảm ${fmt(Math.abs(incChange))} trong khi Chi tiêu lại tăng ${fmt(expChange)}, làm chênh lệch sụt giảm ${fmt(Math.abs(compDiff))}.`;
  } else if (incChange === 0 && expChange !== 0) {
    explanationText = expChange < 0 
      ? `Thu nhập giữ nguyên, Chi tiêu tiết kiệm được ${fmt(Math.abs(expChange))}.`
      : `Thu nhập giữ nguyên, Chi tiêu tăng thêm ${fmt(expChange)}.`;
  } else if (expChange === 0 && incChange !== 0) {
    explanationText = incChange > 0 
      ? `Chi tiêu giữ nguyên, Thu nhập tăng thêm ${fmt(incChange)}.`
      : `Chi tiêu giữ nguyên, Thu nhập giảm ${fmt(Math.abs(incChange))}.`;
  } else {
    explanationText = `Cả Thu nhập và Chi tiêu đều không thay đổi so với kỳ trước.`;
  }

  // ─── UNIFIED 2-COLOR DESIGN SYSTEM (BLUE: Thu nhập | PINK: Chi tiêu) ───
  const COLOR_BLUE = "#2563EB";
  const COLOR_BLUE_LIGHT = "#BFDBFE";
  const COLOR_BLUE_STROKE = "#93C5FD";
  const COLOR_PINK = "#FF69B4";        // HotPink (#FF69B4 - 255,105,180)
  const COLOR_PINK_LIGHT = "#FFB6C1";  // LightPink (#FFB6C1 - 255,182,193)
  const COLOR_PINK_STROKE = "#FF8DA1"; // Matching pink stroke

  // Tab theme color: Blue for Income, HotPink for Expense, Dynamic for Diff
  const themeColor =
    activeType === "expense"
      ? COLOR_PINK
      : activeType === "income"
      ? COLOR_BLUE
      : ((activeItem?.income || 0) - (activeItem?.expense || 0)) >= 0
      ? COLOR_BLUE
      : COLOR_PINK;

  const isDiffNegative = activeHeroVal < 0;
  const heroValColor =
    activeType === "income"
      ? COLOR_BLUE
      : activeType === "expense"
      ? COLOR_PINK
      : isDiffNegative
      ? COLOR_PINK
      : COLOR_BLUE;

  // DYNAMIC SVG BAR CHART CALCULATION
  const renderChart = () => {
    if (compData.length === 0) {
      return (
        <View style={[styles.chartContainer, { height: 215, justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ fontSize: 12, color: "#94a3b8", fontWeight: "600" }}>Đang tải dữ liệu thực tế...</Text>
        </View>
      );
    }

    const W = 320, H = 215, PAD_LEFT = 42, PAD_RIGHT = 14, PAD_TOP = 42, PAD_BOTTOM = 35;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;

    // Check if we need bi-directional (diverging) zero baseline for 'diff'
    const isDiffMode = activeType === "diff";
    const hasNegativeDiff = isDiffMode && compData.some((d) => (d.income || 0) < (d.expense || 0));

    // Calculate raw values in Millions
    const rawValsInMillions = compData.map((d) => {
      if (activeType === "income") return (d.income || 0) / 1000000;
      if (activeType === "expense") return (d.expense || 0) / 1000000;
      return ((d.income || 0) - (d.expense || 0)) / 1000000;
    });

    const maxAbsVal = Math.max(...rawValsInMillions.map(Math.abs), 0.01);

    // Dynamic fine-grained niceMax scale to keep bars tall and proportional for any amount range
    let niceMax = 10;
    if (maxAbsVal <= 0.05) niceMax = 0.05;       // <= 50k VND
    else if (maxAbsVal <= 0.1) niceMax = 0.1;    // <= 100k VND
    else if (maxAbsVal <= 0.2) niceMax = 0.2;    // <= 200k VND
    else if (maxAbsVal <= 0.35) niceMax = 0.35;  // <= 350k VND
    else if (maxAbsVal <= 0.5) niceMax = 0.5;    // <= 500k VND
    else if (maxAbsVal <= 0.8) niceMax = 0.8;    // <= 800k VND
    else if (maxAbsVal <= 1.2) niceMax = 1.2;    // <= 1.2M VND
    else if (maxAbsVal <= 2) niceMax = 2;        // <= 2M VND
    else if (maxAbsVal <= 3) niceMax = 3;        // <= 3M VND
    else if (maxAbsVal <= 5) niceMax = 5;        // <= 5M VND
    else if (maxAbsVal <= 8) niceMax = 8;        // <= 8M VND
    else if (maxAbsVal <= 12) niceMax = 12;      // <= 12M VND
    else if (maxAbsVal <= 20) niceMax = 20;      // <= 20M VND
    else if (maxAbsVal <= 35) niceMax = 35;      // <= 35M VND
    else if (maxAbsVal <= 50) niceMax = 50;      // <= 50M VND
    else if (maxAbsVal <= 80) niceMax = 80;      // <= 80M VND
    else if (maxAbsVal <= 120) niceMax = 120;    // <= 120M VND
    else if (maxAbsVal <= 200) niceMax = 200;    // <= 200M VND
    else if (maxAbsVal <= 400) niceMax = 400;    // <= 400M VND
    else if (maxAbsVal <= 800) niceMax = 800;    // <= 800M VND
    else niceMax = Math.ceil(maxAbsVal / 100) * 100;

    // Grid baseline and tick calculations
    const yBaseline = hasNegativeDiff ? PAD_TOP + chartH / 2 : H - PAD_BOTTOM;
    const scaleH = hasNegativeDiff ? chartH / 2 : chartH;

    const yLevels: { val: number; y: number; isZero: boolean; label: string }[] = [];

    const fmtTick = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2))));

    if (hasNegativeDiff) {
      // Bi-directional ticks: +niceMax, 0, -niceMax
      yLevels.push(
        { val: niceMax, y: yBaseline - scaleH, isZero: false, label: fmtTick(niceMax) },
        { val: 0, y: yBaseline, isZero: true, label: "0" },
        { val: -niceMax, y: yBaseline + scaleH, isZero: false, label: `-${fmtTick(niceMax)}` }
      );
    } else {
      // Single-sided ticks: 0, step1, step2, niceMax
      const step = niceMax / 3;
      const tVals = [
        0,
        Number((step).toFixed(niceMax < 1 ? 2 : niceMax <= 5 ? 1 : 0)),
        Number((step * 2).toFixed(niceMax < 1 ? 2 : niceMax <= 5 ? 1 : 0)),
        Number(niceMax.toFixed(niceMax < 1 ? 2 : 0)),
      ];
      tVals.forEach((v, i) => {
        const y = yBaseline - (i / (tVals.length - 1)) * scaleH;
        yLevels.push({ val: v, y, isZero: v === 0, label: fmtTick(v) });
      });
    }

    // Responsive bar dimensions
    const numBars = compData.length;
    const slotW = chartW / Math.max(1, numBars);
    const barW = Math.max(12, Math.min(32, slotW * 0.55));
    const svgKey = `chart-${timeRange}-${activeType}-${numBars}-${compData.map((d) => d.period).join("-")}`;

    // Selected Column tooltip calculation
    const selData = compData[validIndex];
    const selRawVal = selData
      ? activeType === "income"
        ? (selData.income || 0) / 1000000
        : activeType === "expense"
        ? (selData.expense || 0) / 1000000
        : ((selData.income || 0) - (selData.expense || 0)) / 1000000
      : 0;

    const isSelNegative = selRawVal < 0;
    const selBarH = (Math.abs(selRawVal) / niceMax) * scaleH;
    const selTipY = isSelNegative ? yBaseline + selBarH : yBaseline - selBarH;
    const selCenterX = PAD_LEFT + (validIndex + 0.5) * slotW;

    const tooltipW = 76;
    const tooltipH = 34;
    const tooltipX = Math.max(PAD_LEFT - 4, Math.min(W - PAD_RIGHT - tooltipW + 4, selCenterX - tooltipW / 2));
    const tooltipY = isSelNegative
      ? Math.max(4, yBaseline - tooltipH - 10)
      : Math.max(4, Math.min(PAD_TOP - 4, selTipY - tooltipH - 8));

    const selAmtStr = selData
      ? isDiffMode
        ? selRawVal >= 0
          ? `+${fmt(selData.income - selData.expense)}`
          : `-${fmt(Math.abs(selData.income - selData.expense))}`
        : fmt(activeType === "income" ? selData.income : selData.expense)
      : "0đ";

    const selDateStr = selData?.fullEndDateStr || selData?.label || "";
    const tooltipColor = isDiffMode ? (isSelNegative ? COLOR_PINK : COLOR_BLUE) : themeColor;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.unitText}>(Triệu)</Text>
        <Svg key={svgKey} width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Dynamic grid lines and labels */}
          {yLevels.map(({ val, y, isZero, label }) => (
            <G key={`grid-${val}-${y}`}>
              <Line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke={isZero && hasNegativeDiff ? "#94A3B8" : "#E2E8F0"}
                strokeWidth={isZero && hasNegativeDiff ? 1.5 : 1}
              />
              <SvgText
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fontWeight={isZero && hasNegativeDiff ? "900" : "700"}
                fill={isZero && hasNegativeDiff ? "#0F172A" : "#64748B"}
                fontFamily="Roboto"
              >
                {label || val}
              </SvgText>
            </G>
          ))}

          {/* Vertical Bars: Bi-directional for Diff (Negative below 0, Positive above 0) */}
          {compData.map((d, i) => {
            const x = PAD_LEFT + (i + 0.5) * slotW - barW / 2;
            const isSelected = i === validIndex;

            const rawVal =
              activeType === "income"
                ? (d.income || 0) / 1000000
                : activeType === "expense"
                ? (d.expense || 0) / 1000000
                : ((d.income || 0) - (d.expense || 0)) / 1000000;

            const isNegative = rawVal < 0;
            const hasValue = Math.abs(rawVal) > 0;
            const barH = (Math.abs(rawVal) / niceMax) * scaleH;
            const y = isNegative ? yBaseline : yBaseline - Math.max(hasValue ? 4 : 0, barH);

            let barFill = COLOR_BLUE_LIGHT;
            let barStroke = COLOR_BLUE_STROKE;

            if (activeType === "income") {
              barFill = isSelected ? COLOR_BLUE : COLOR_BLUE_LIGHT;
              barStroke = isSelected ? "#1D4ED8" : COLOR_BLUE_STROKE;
            } else if (activeType === "expense") {
              barFill = isSelected ? COLOR_PINK : COLOR_PINK_LIGHT;
              barStroke = isSelected ? "#BE123C" : COLOR_PINK_STROKE;
            } else {
              barFill = isSelected
                ? isNegative
                  ? COLOR_PINK
                  : COLOR_BLUE
                : isNegative
                ? COLOR_PINK_LIGHT
                : COLOR_BLUE_LIGHT;
              barStroke = isSelected
                ? isNegative
                  ? "#FF69B4"
                  : "#1D4ED8"
                : isNegative
                ? COLOR_PINK_STROKE
                : COLOR_BLUE_STROKE;
            }

            return (
              <G key={`bar-${d.period}-${i}-${activeType}`}>
                {hasValue && (
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(4, barH)}
                    rx={numBars > 6 ? 3 : 5}
                    fill={barFill}
                    stroke={barStroke}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                )}
                <SvgText
                  x={x + barW / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={d.label.length > 8 ? 7.5 : 8.5}
                  fontWeight={isSelected ? "900" : "600"}
                  fill={isSelected ? (isDiffMode ? (isNegative ? COLOR_PINK : COLOR_BLUE) : themeColor) : "#64748B"}
                  fontFamily="Roboto"
                >
                  {d.label}
                </SvgText>
              </G>
            );
          })}

          {/* Floating Tooltip Callout over the selected column */}
          {selData && (
            <G key={`tooltip-${validIndex}`}>
              <Line
                x1={selCenterX}
                y1={tooltipY + tooltipH}
                x2={selCenterX}
                y2={selTipY}
                stroke={tooltipColor}
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
              <Rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipW}
                height={tooltipH}
                rx={6}
                fill="#FFFFFF"
                stroke={tooltipColor}
                strokeWidth={1.2}
              />
              <SvgText
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 13}
                textAnchor="middle"
                fontSize={8}
                fontWeight="700"
                fill="#64748B"
                fontFamily="Roboto"
              >
                {selDateStr}
              </SvgText>
              <SvgText
                x={tooltipX + tooltipW / 2}
                y={tooltipY + 26}
                textAnchor="middle"
                fontSize={9}
                fontWeight="900"
                fill={tooltipColor}
                fontFamily="Roboto"
              >
                {selAmtStr}
              </SvgText>
            </G>
          )}

          {/* Transparent touch areas across each column slot */}
          {compData.map((_, i) => (
            <Rect
              key={`touch-${i}`}
              x={PAD_LEFT + i * slotW}
              y={0}
              width={slotW}
              height={H}
              fill="transparent"
              onPress={() => setSelectedIndex(i)}
            />
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Biến động thu chi">
      <ScrollView
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* ─── TIME RANGE TAB SELECTOR (Row 1) ─── */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            onPress={() => switchTimeRange("week")}
            style={[styles.pillBtn, timeRange === "week" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "week" && styles.pillTextActive]}>Theo tuần</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchTimeRange("month")}
            style={[styles.pillBtn, timeRange === "month" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "month" && styles.pillTextActive]}>Theo tháng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchTimeRange("year")}
            style={[styles.pillBtn, timeRange === "year" && styles.pillBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, timeRange === "year" && styles.pillTextActive]}>Theo năm</Text>
          </TouchableOpacity>
        </View>

        {/* ─── SUB-TYPE TAB SELECTOR (Row 2 - Blue for Income, Pink for Expense) ─── */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            onPress={() => switchActiveType("income")}
            style={[styles.subTabBtn, activeType === "income" && styles.subTabActiveIncome]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "income" && styles.subTabIncomeText]}>Thu nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchActiveType("expense")}
            style={[styles.subTabBtn, activeType === "expense" && styles.subTabActiveExpense]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "expense" && styles.subTabExpenseText]}>Chi tiêu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchActiveType("diff")}
            style={[styles.subTabBtn, activeType === "diff" && styles.subTabActiveDiff]}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeType === "diff" && styles.subTabDiffText]}>Chênh lệch</Text>
          </TouchableOpacity>
        </View>

        {/* ─── HERO AMOUNT BOX (Locked Height to Prevent Layout Shifting) ─── */}
        <View style={styles.heroBox}>
          <Text style={styles.heroSub} numberOfLines={1}>
            {timeRange === "week"
              ? `Tổng ${activeType === "income" ? "thu" : activeType === "expense" ? "chi" : "chênh lệch"} ${activeItem?.period || `tuần này`}`
              : timeRange === "month"
              ? `Tổng ${activeType === "income" ? "thu nhập" : activeType === "expense" ? "chi tiêu" : "chênh lệch"} ${activeItem?.period || `tháng ${targetMonth}`}`
              : `Tổng ${activeType === "income" ? "thu nhập" : activeType === "expense" ? "chi tiêu" : "chênh lệch"} ${activeItem?.period || `năm ${targetYear}`}`}
          </Text>

          <Text style={[styles.heroVal, { color: heroValColor }]} numberOfLines={1}>
            {activeType === "diff"
              ? activeHeroVal >= 0
                ? `+${fmt(activeHeroVal)}`
                : `-${fmt(Math.abs(activeHeroVal))}`
              : fmt(activeHeroVal)}
          </Text>

          {/* Locked Comparison Slot (Fixed Height to Prevent Layout Shifting) */}
          <View style={styles.compPillSlot}>
            {prevItem ? (
              <View
                style={[
                  styles.compPill,
                  {
                    backgroundColor: compDiff >= 0 ? "#FFF1F2" : "#EFF6FF",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.compPillText,
                    {
                      color: compDiff >= 0 ? COLOR_PINK : COLOR_BLUE,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {compDiff > 0 ? "↑ Tăng " : compDiff < 0 ? "↓ Giảm " : "= Bằng "}
                  {fmt(Math.abs(compDiff))} so với {timeRange === "week" ? "tuần trước" : timeRange === "month" ? "tháng trước" : "năm trước"}
                </Text>

                {/* Small '!' Info Button at the tail of the line - ONLY IN DIFF TAB */}
                {activeType === "diff" && (
                  <TouchableOpacity
                    onPress={() => setShowDiffDetailModal(true)}
                    style={[
                      styles.infoBtn,
                      { backgroundColor: compDiff >= 0 ? COLOR_PINK : COLOR_BLUE },
                    ]}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.infoBtnText}>!</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.compPill, { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#F1F5F9" }]}>
                <Text style={[styles.compPillText, { color: "#94A3B8" }]} numberOfLines={1}>
                  — Kỳ đầu tiên trong danh sách —
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── BAR CHART SECTION ─── */}
        <Text style={styles.sectionHeaderTitle}>
          Biến động ({timeRange === "week" ? `6 tuần gần nhất` : timeRange === "month" ? `6 tháng gần nhất (đến T${targetMonth})` : `${compData.length} năm`})
        </Text>
        {loading ? (
          <View style={{ height: 215, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="small" color={themeColor} />
          </View>
        ) : (
          renderChart()
        )}

        {/* ─── COMPARISON BREAKDOWN LIST (2-Line Week Badge matching Thu & Chi) ─── */}
        <View style={styles.compList}>
          {compData.map((d, idx) => {
            const diff = d.income - d.expense;
            const isSelected = idx === validIndex;
            const activeBg = activeType === "expense" ? "#FFF1F2" : "#EFF6FF";

            return (
              <TouchableOpacity
                key={d.period}
                style={[
                  styles.compRowItem,
                  isSelected && {
                    borderColor: themeColor,
                    backgroundColor: activeBg,
                  },
                ]}
                onPress={() => setSelectedIndex(idx)}
                activeOpacity={0.7}
              >
                {/* Left Date / Week Badge (2 lines for week, 1 line for month/year) */}
                <View
                  style={[
                    styles.compBadge,
                    isSelected && {
                      borderColor: themeColor,
                      backgroundColor: activeBg,
                    },
                  ]}
                >
                  {timeRange === "week" ? (
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <Text
                        style={[styles.compWeekLineText, isSelected && { color: themeColor }]}
                        numberOfLines={1}
                      >
                        {d.startDateStr || d.period} -
                      </Text>
                      <Text
                        style={[styles.compWeekLineText, isSelected && { color: themeColor }]}
                        numberOfLines={1}
                      >
                        {d.endDateStr || ""}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[styles.compYearText, isSelected && { color: themeColor }]}
                      numberOfLines={1}
                    >
                      {d.period}
                    </Text>
                  )}
                </View>

                {/* Middle: Thu (Blue) & Chi (Pink) */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.compSubText}>
                    Thu <Text style={[styles.compValText, { color: COLOR_BLUE }]}>{fmt(d.income)}</Text>
                  </Text>
                  <Text style={styles.compSubText}>
                    Chi <Text style={[styles.compValText, { color: COLOR_PINK }]}>{fmt(d.expense)}</Text>
                  </Text>
                </View>

                {/* Right: Còn lại (Net) */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.remainLabel}>Còn lại</Text>
                  <Text style={[styles.remainVal, { color: diff >= 0 ? COLOR_BLUE : COLOR_PINK }]}>
                    {fmt(diff)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* ─── EXPLANATORY DETAIL MODAL (When tapping '!' button in Diff Tab) ─── */}
      <Modal
        visible={showDiffDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiffDetailModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDiffDetailModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconCircle, { backgroundColor: compDiff >= 0 ? "#EFF6FF" : "#FFF1F2" }]}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: compDiff >= 0 ? COLOR_BLUE : COLOR_PINK }}>ℹ️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Chi tiết biến động chênh lệch</Text>
                    <Text style={styles.modalSubTitle}>
                      So sánh {activeItem?.period} với {prevItem?.period}
                    </Text>
                  </View>
                </View>

                {/* 2 Breakdown Cards: Thu nhập & Chi tiêu */}
                <View style={styles.modalBody}>
                  {/* Thu nhập */}
                  <View style={[styles.breakdownBox, { borderColor: "#BFDBFE", backgroundColor: "#F8FAFC" }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.breakdownLabel, { color: COLOR_BLUE }]}>🔵 Thu nhập</Text>
                      <Text style={[styles.breakdownStatus, { color: incChange >= 0 ? COLOR_BLUE : COLOR_PINK }]}>
                        {incChange > 0 ? `↑ Tăng ${fmt(incChange)}` : incChange < 0 ? `↓ Giảm ${fmt(Math.abs(incChange))}` : "= Không đổi"}
                      </Text>
                    </View>
                    <Text style={styles.breakdownValRange}>
                      {fmt(prevItem?.income || 0)} ➔ {fmt(activeItem?.income || 0)}
                    </Text>
                  </View>

                  {/* Chi tiêu */}
                  <View style={[styles.breakdownBox, { borderColor: "#FFB6C1", backgroundColor: "#FFF0F5" }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.breakdownLabel, { color: COLOR_PINK }]}>💖 Chi tiêu</Text>
                      <Text style={[styles.breakdownStatus, { color: expChange <= 0 ? COLOR_BLUE : COLOR_PINK }]}>
                        {expChange > 0 ? `↑ Tăng ${fmt(expChange)}` : expChange < 0 ? `↓ Giảm ${fmt(Math.abs(expChange))}` : "= Không đổi"}
                      </Text>
                    </View>
                    <Text style={styles.breakdownValRange}>
                      {fmt(prevItem?.expense || 0)} ➔ {fmt(activeItem?.expense || 0)}
                    </Text>
                  </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: compDiff >= 0 ? COLOR_BLUE : COLOR_PINK }]}
                  onPress={() => setShowDiffDetailModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseBtnText}>Đã hiểu</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  /* Time Range Pills */
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 16,
  },
  pillBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#0F172A",
    fontWeight: "800",
  },

  /* Sub-Tab Selector */
  subTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabActiveIncome: {
    borderBottomColor: "#2563EB",
  },
  subTabActiveExpense: {
    borderBottomColor: "#FF69B4",
  },
  subTabActiveDiff: {
    borderBottomColor: "#2563EB",
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  subTabIncomeText: {
    color: "#2563EB",
    fontWeight: "800",
  },
  subTabExpenseText: {
    color: "#FF69B4",
    fontWeight: "800",
  },
  subTabDiffText: {
    color: "#2563EB",
    fontWeight: "800",
  },

  /* Hero Amount Box */
  heroBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    minHeight: 96,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 16,
  },
  heroVal: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginVertical: 2,
  },
  compPillSlot: {
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  compPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    maxWidth: 320,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  compPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
  },
  infoBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },

  /* Modal Explanatory Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  modalBody: {
    gap: 10,
    marginBottom: 18,
  },
  breakdownBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  breakdownStatus: {
    fontSize: 12,
    fontWeight: "800",
  },
  breakdownValRange: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  insightBox: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  insightText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 17,
  },
  modalCloseBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Bar Chart */
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
    marginBottom: 8,
  },
  chartContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    position: "relative",
  },
  unitText: {
    position: "absolute",
    top: 10,
    left: 12,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    zIndex: 1,
  },

  /* Comparison List */
  compList: {
    marginTop: 16,
    gap: 8,
  },
  compRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  compBadge: {
    minWidth: 70,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compWeekLineText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 15,
  },
  compYearText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  compSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  compValText: {
    fontWeight: "800",
  },
  remainLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  remainVal: {
    fontSize: 13,
    fontWeight: "900",
  },
});
