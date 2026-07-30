"use client";

import { useState, useEffect } from "react";
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

  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [pastMembers, setPastMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: "", description: "" });
      setSelectedMemberIds([]);
      setFetchingMembers(true);
      api
        .get("/groups/past-members")
        .then((res) => setPastMembers(res.data))
        .catch((err) => console.error(err))
        .finally(() => setFetchingMembers(false));
    }
  }, [open]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await api.post("/groups", { ...form, memberIds: selectedMemberIds });
      toast.success("Tạo nhóm thành công! 🎉");
      handleCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tạo nhóm");
    } finally {
      setLoading(false);
    }
  };

  // If using controlled mode (open prop), don't render when closed
  if (open === false) return null;

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
              className="w-full border-2 border-[#B3E5D1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6366f1] transition"
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
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6366f1] transition resize-none"
            />
          </div>

          {(pastMembers.length > 0 || fetchingMembers) && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Thêm thành viên
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border-2 border-slate-100 rounded-2xl p-2.5">
                {fetchingMembers ? (
                  <div className="text-xs text-center text-slate-400 py-4">Đang tải...</div>
                ) : (
                  pastMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors border ${
                          isSelected
                            ? "border-[#6366f1] bg-[#f0f9f6]"
                            : "border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
                          <img
                            src={
                              member.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                member.name
                              )}`
                            }
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {member.name}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-[#6366f1] border-[#6366f1]"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3.5 h-3.5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

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
