"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
}

interface ExpenseChartProps {
  expenses: Expense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Ăn uống":    "#10b981", // emerald
  "Di chuyển":  "#3b82f6", // blue
  "Lưu trú":    "#8b5cf6", // violet
  "Giải trí":   "#f59e0b", // amber
  "Mua sắm":    "#ec4899", // pink
  "Sức khỏe":   "#06b6d4", // cyan
  "Hóa đơn":    "#2980b9", // strong blue
  "Khác":       "#6b7280", // gray
};

const DEFAULT_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ec4899", "#06b6d4", "#f97316", "#6b7280",
];

function getColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// SVG Pie Chart helpers
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end   = polarToCartesian(cx, cy, r, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export function ExpenseChart({ expenses }: ExpenseChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter out settlement expenses
  const realExpenses = expenses.filter(e => e.category !== "SETTLEMENT");

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of realExpenses) {
      const cat = e.category || "Khác";
      map[cat] = (map[cat] ?? 0) + e.amount;
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt], i) => ({
        category: cat,
        amount: amt,
        pct: total > 0 ? (amt / total) * 100 : 0,
        color: getColor(cat, i),
      }));
  }, [realExpenses]);

  const totalAmount = categoryData.reduce((s, d) => s + d.amount, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("vi-VN").format(v) + "đ";

  if (realExpenses.length === 0) return null;

  // Build pie slices
  const CX = 110, CY = 110, R = 98, IR = 75; // Increased size and relative thickness
  let cursor = 0;
  const slices = categoryData.map((d, i) => {
    // If degree is exactly 360, SVG arc path fails because start and end points are identical.
    // We cap it at 359.99 to make the circle render correctly.
    const deg = (d.pct / 100) * 360;
    const safeDeg = deg === 360 ? 359.99 : deg;
    const path = arcPath(CX, CY, R, cursor, cursor + safeDeg);
    
    // Calculate center point of the slice for the text label
    const midAngle = cursor + (safeDeg / 2);
    const textRadius = (R + IR) / 2; // perfectly centered in the ring
    const textPos = polarToCartesian(CX, CY, textRadius, midAngle);

    const slice = { ...d, path, index: i, startDeg: cursor, deg: safeDeg, textPos };
    cursor += safeDeg;
    return slice;
  });

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <PieChart className="h-5 w-5 text-emerald-500" />
          Phân tích Chi tiêu theo Danh mục
        </CardTitle>
        <p className="text-xs text-slate-500">
          Tổng: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(totalAmount)}</span>
        </p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          
          {/* SVG Donut Chart */}
          <div className="relative shrink-0">
            <svg width={220} height={220} viewBox="0 0 220 220">
              {slices.map((sl, i) => (
                <g key={sl.category}>
                  <path
                    d={sl.path}
                    fill={sl.color}
                    opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.4}
                    style={{
                      transform: hoveredIdx === i ? `scale(1.04)` : "scale(1)",
                      transformOrigin: `${CX}px ${CY}px`,
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                </g>
              ))}
              {/* Center label & Donut Hole */}
              <circle cx={CX} cy={CY} r={IR} fill="white" className="dark:fill-slate-900 pointer-events-none" />
              
              {/* Percentage Text on Slices */}
              {slices.map((sl, i) => {
                // Only show text if slice is big enough to fit it (> 5%)
                if (sl.pct < 5) return null;
                return (
                  <text
                    key={`text-${sl.category}`}
                    x={sl.textPos.x}
                    y={sl.textPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="10"
                    fontWeight="700"
                    className="pointer-events-none drop-shadow-sm"
                    opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0}
                    style={{ transition: "opacity 0.2s ease" }}
                  >
                    {Math.round(sl.pct)}%
                  </text>
                );
              })}

              {hoveredIdx !== null ? (
                <>
                  <text x={CX} y={CY - 8} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="500" className="pointer-events-none">
                    {slices[hoveredIdx].category}
                  </text>
                  <text x={CX} y={CY + 10} textAnchor="middle" fontSize="13" fill="#0f172a" fontWeight="800"
                    className="dark:fill-white pointer-events-none">
                    {formatCurrency(slices[hoveredIdx].amount)}
                  </text>
                </>
              ) : (
                <>
                  <text x={CX} y={CY - 6} textAnchor="middle" fontSize="10" fill="#64748b" className="pointer-events-none">Tổng chi tiêu</text>
                  <text x={CX} y={CY + 12} textAnchor="middle" fontSize="13" fill="#0f172a" fontWeight="800"
                    className="dark:fill-white pointer-events-none">
                    {formatCurrency(totalAmount)}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2 w-full">
            {slices.map((sl, i) => (
              <div
                key={sl.category}
                className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 transition-all"
                style={{
                  background: hoveredIdx === i ? `${sl.color}18` : "transparent",
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                  style={{ background: sl.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {sl.category}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 ml-3 shrink-0">
                      {sl.pct.toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${sl.pct}%`, background: sl.color }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(sl.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
