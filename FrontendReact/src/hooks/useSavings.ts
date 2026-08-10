import { useState, useEffect, useCallback } from "react";
import { financialServices } from "../services/financialServices";
import { SavingsGoal, AutoAllocateResponse } from "../types";

export function useSavings(walletBalance: number, safeToSpend: number) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [lastAllocationResult, setLastAllocationResult] = useState<AutoAllocateResponse | null>(null);

  // Safety Reserve Floor Calculation: Derived from backend safeToSpend
  const requiredReserve = walletBalance - safeToSpend;
  const isSafetyFloorReached = safeToSpend <= 0;

  const fetchGoals = useCallback(async () => {
    try {
      const data = await financialServices.getSavingsGoals();
      setGoals(data || []);
    } catch (e) {
      console.log("Failed to fetch savings goals:", e);
      setGoals([]);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const autoAllocate = async (): Promise<AutoAllocateResponse> => {
    if (isSafetyFloorReached) {
      throw new Error("SAFETY_RESERVE_VIOLATION");
    }
    setIsAllocating(true);
    try {
      const res = await financialServices.autoAllocateSavings();
      setLastAllocationResult(res);
      await fetchGoals();
      return res;
    } finally {
      setIsAllocating(false);
    }
  };

  return {
    goals,
    requiredReserve,
    safeToSpend,
    isSafetyFloorReached,
    autoAllocate,
    isAllocating,
    lastAllocationResult,
    refreshGoals: fetchGoals,
  };
}
