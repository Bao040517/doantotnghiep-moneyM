"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

interface FinancialHealth {
  score: number;
  healthStatus: string;
  advice: string;
  savingsRatioScore: number;
  debtToIncomeScore: number;
  emergencyFundScore: number;
  budgetAdherenceScore: number;
}

export function FinancialHealthCard() {
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const res = await api.get(`/financial-health/${user.id}`);
        setHealth(res.data);
      } catch (error) {
        console.error("Failed to fetch financial health", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-[28px] p-6 shadow-xl shadow-black/5 border border-gray-100 flex items-center justify-center min-h-[160px]">
        <div className="w-6 h-6 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!health) return null;

  const score = health.score;

  let colorClass = "text-emerald-500";
  if (score < 40) colorClass = "text-rose-500";
  else if (score < 60) colorClass = "text-orange-500";
  else if (score < 80) colorClass = "text-blue-500";

  return (
    <div className="bg-white rounded-[28px] p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-[17px] font-extrabold text-gray-800 tracking-tight">
              Sức khỏe Tài chính
            </h3>
            <p className="text-[11px] text-gray-400 font-medium">
              Đánh giá dựa trên thu chi và nợ
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              score >= 80
                ? "bg-emerald-50 text-emerald-600"
                : score >= 60
                  ? "bg-blue-50 text-blue-600"
                  : score >= 40
                    ? "bg-amber-50 text-amber-600"
                    : "bg-rose-50 text-rose-600"
            }`}
          >
            {health.healthStatus}
          </span>
        </div>

        {/* Main section: Circle Score + Metric bars */}
        <div className="grid grid-cols-1 xs:grid-cols-12 gap-5 items-center">
          {/* Left column: Total score circle */}
          <div className="xs:col-span-4 flex justify-center relative">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${score} 100`}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${colorClass}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-[26px] leading-none font-black ${colorClass}`}
                >
                  {score}
                </span>
                <span className="text-[8px] text-gray-400 font-black tracking-wider mt-0.5">
                  ĐIỂM
                </span>
              </div>
            </div>
          </div>

          {/* Right column: Indicators breakdown */}
          <div className="xs:col-span-8 space-y-3">
            {[
              {
                label: "Tỷ lệ tích lũy",
                score: health.savingsRatioScore,
                icon: "🌱",
                color:
                  health.savingsRatioScore >= 20
                    ? "bg-emerald-500"
                    : health.savingsRatioScore >= 10
                      ? "bg-amber-400"
                      : "bg-rose-500",
              },
              {
                label: "Tuân thủ ngân sách",
                score: health.budgetAdherenceScore,
                icon: "📊",
                color:
                  health.budgetAdherenceScore >= 20
                    ? "bg-emerald-500"
                    : health.budgetAdherenceScore >= 10
                      ? "bg-amber-400"
                      : "bg-rose-500",
              },
              {
                label: "Kiểm soát nợ",
                score: health.debtToIncomeScore,
                icon: "💸",
                color:
                  health.debtToIncomeScore >= 20
                    ? "bg-emerald-500"
                    : health.debtToIncomeScore >= 10
                      ? "bg-amber-400"
                      : "bg-rose-500",
              },
              {
                label: "Quỹ dự phòng",
                score: health.emergencyFundScore,
                icon: "🛡️",
                color:
                  health.emergencyFundScore >= 20
                    ? "bg-emerald-500"
                    : health.emergencyFundScore >= 10
                      ? "bg-amber-400"
                      : "bg-rose-500",
              },
            ].map((item, idx) => {
              const pct = (item.score / 25) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider ${
                          item.score >= 20
                            ? "text-emerald-500"
                            : item.score >= 15
                              ? "text-blue-500"
                              : item.score >= 10
                                ? "text-amber-500"
                                : "text-rose-500"
                        }`}
                      >
                        {item.score >= 20
                          ? "Tuyệt vời"
                          : item.score >= 15
                            ? "Khá tốt"
                            : item.score >= 10
                              ? "Tạm ổn"
                              : "Báo động"}
                      </span>
                      <div className="flex gap-0.5 ml-1">
                        {[...Array(10)].map((_, i) => {
                          const score10 = Math.round((item.score / 25) * 10);
                          const isActive = i < score10;
                          const activeColor =
                            item.score >= 20
                              ? "bg-emerald-500"
                              : item.score >= 15
                                ? "bg-blue-500"
                                : item.score >= 10
                                  ? "bg-amber-500"
                                  : "bg-rose-500";
                          return (
                            <div
                              key={i}
                              className={`w-1.5 h-3.5 rounded-[2px] transition-all duration-500 ${isActive ? activeColor : "bg-slate-200"}`}
                            />
                          );
                        })}
                      </div>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advice block */}
        <p className="text-[11px] text-gray-500 font-medium bg-slate-50 border border-slate-100 p-3 rounded-2xl leading-relaxed flex items-start gap-2 mt-1">
          <span className="text-xs shrink-0">💡</span>
          <span>{health.advice}</span>
        </p>
      </div>
    </div>
  );
}
