"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface CreateGroupModalProps {
  // Old-style props (direct usage)
  onClose?: () => void;
  onCreated?: () => void;
  // New-style props (controlled via open/onOpenChange)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onGroupCreated?: () => void;
}

export function CreateGroupModal({
  onClose,
  onCreated,
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupModalProps) {
  // Support both calling conventions
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };
  const handleCreated = () => {
    onCreated?.();
    onGroupCreated?.();
    handleClose();
  };

  // If using controlled mode (open prop), don't render when closed
  if (open === false) return null;
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await api.post("/groups", form);
      toast.success("Tạo nhóm thành công! 🎉");
      handleCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tạo nhóm");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Drawer */}
      <div
        className="w-full max-w-lg bg-white rounded-t-[40px] p-6 pb-10 shadow-2xl"
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />

        <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
          Tạo nhóm mới
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Tên nhóm *
            </label>
            <input
              type="text"
              placeholder="Phượt Đà Lạt, Tiền nhà tháng 5..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border-2 border-[#B3E5D1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#45b39d] transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              placeholder="Mô tả ngắn về nhóm..."
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#45b39d] transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-4 rounded-full text-white font-bold text-base mt-2 transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#8bc3a1" }}
          >
            {loading ? "Đang tạo..." : "Tạo nhóm 🚀"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 rounded-full text-gray-500 font-medium text-sm"
          >
            Huỷ
          </button>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
