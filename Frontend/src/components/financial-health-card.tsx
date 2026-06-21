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

  // Gauge Chart calculation
  const score = health.score;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  // Semicircle gauge: stroke-dasharray = circumference, stroke-dashoffset = circumference - (score / 100) * (circumference / 2)
  const offset = circumference - (score / 100) * (circumference / 2);

  let colorClass = "text-emerald-500";
  if (score < 40) colorClass = "text-rose-500";
  else if (score < 60) colorClass = "text-orange-500";
  else if (score < 80) colorClass = "text-blue-500";

  return (
    <div className="bg-white rounded-[28px] p-6 shadow-xl shadow-black/5 border border-gray-100 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">Sức khỏe Tài chính</h3>
          <p className="text-xs font-medium text-gray-500 mt-1">{health.healthStatus}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center relative z-10">
        {/* Gauge Chart */}
        <div className="relative w-[140px] h-[70px] overflow-hidden">
          <svg className="w-full h-[140px]" viewBox="0 0 140 140">
            {/* Background Arch */}
            <circle 
              cx="70" cy="70" r={radius} 
              fill="none" stroke="#f1f5f9" strokeWidth="12" 
              strokeDasharray={circumference} strokeDashoffset={circumference / 2}
              strokeLinecap="round"
              className="transform -rotate-180 origin-center"
            />
            {/* Value Arch */}
            <circle 
              cx="70" cy="70" r={radius} 
              fill="none" stroke="currentColor" strokeWidth="12" 
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round"
              className={`transform -rotate-180 origin-center transition-all duration-1000 ease-out ${colorClass}`}
            />
          </svg>
          <div className="absolute bottom-0 left-0 w-full text-center flex flex-col items-center">
            <span className={`text-3xl font-black ${colorClass}`}>{score}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-[-2px]">ĐIỂM</span>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-5 text-center bg-gray-50 p-3 rounded-2xl w-full leading-relaxed border border-gray-100">
          <span className="mr-1 text-sm">💡</span> {health.advice}
        </p>

      </div>
    </div>
  );
}
