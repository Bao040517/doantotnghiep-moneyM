"use client";

import { useEffect } from "react";

interface ConfirmCashDialogProps {
  open: boolean;
  debtorName: string;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmCashDialog({
  open,
  debtorName,
  amount,
  onConfirm,
  onCancel,
}: ConfirmCashDialogProps) {
  const formatted = new Intl.NumberFormat("vi-VN").format(amount) + "đ";

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        backgroundColor: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[320px] rounded-[40px] p-8 flex flex-col items-center text-center"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Illustration */}
        <div className="relative mb-5">
          <div className="w-32 h-32 rounded-3xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <span className="text-6xl">🤝</span>
          </div>
          <span className="absolute -top-2 -right-2 text-yellow-400 text-xl">
            ✦
          </span>
          <span className="absolute top-1/2 -left-5 text-blue-300 text-base">
            ✦
          </span>
          <span className="absolute -bottom-1 right-3 text-pink-300 text-base">
            ✦
          </span>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold leading-tight mb-2 px-2"
          style={{ color: "#8B5E3C" }}
        >
          Xác nhận đã nhận tiền mặt?
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 text-sm leading-snug mb-1 px-2">
          <span className="font-semibold text-gray-700">{debtorName}</span> đã
          báo chuyển
        </p>
        <p className="text-2xl font-black mb-6" style={{ color: "#1B472C" }}>
          {formatted}
        </p>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 rounded-full font-semibold text-sm text-gray-600 transition-all active:scale-95"
            style={{ backgroundColor: "rgba(229,231,235,0.7)" }}
          >
            Để sau
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{
              backgroundColor: "#1B472C",
              boxShadow: "0 4px 14px rgba(27,71,44,0.35)",
            }}
          >
            Đã nhận rồi <span>✅</span>
          </button>
        </div>
      </div>
    </div>
  );
}
