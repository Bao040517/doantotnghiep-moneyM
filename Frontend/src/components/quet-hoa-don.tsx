"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X, RotateCcw, Check, ScanLine } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────
interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface ScanResult {
  amount: number;
  note: string;
  items: ReceiptItem[];
}

interface Member {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: string;
}

// Mỗi item sẽ có danh sách userId được gán
interface ItemAssignment {
  item: ReceiptItem;
  assignedUserIds: string[];
}

interface ReceiptScannerProps {
  members: Member[];
  onConfirm: (data: {
    title: string;
    amount: number;
    splitAmounts: Record<string, number>;
  }) => void;
  onCancel: () => void;
}

const AVATAR_COLORS = [
  "#2585A6",
  "#2CA880",
  "#ED5C5C",
  "#F39C12",
  "#9B59B6",
  "#E67E22",
  "#1ABC9C",
  "#3498DB",
];

export function ReceiptScanner({
  members,
  onConfirm,
  onCancel,
}: ReceiptScannerProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "assign">("upload");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Step 1: Upload ảnh ───────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview ảnh
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Bắt đầu scan
    setStep("scanning");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post("/ai/scan-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data: ScanResult = res.data;

      if (!data.items || data.items.length === 0) {
        toast.error("Không nhận diện được món hàng nào trên hóa đơn.");
        setStep("upload");
        return;
      }

      setScanResult(data);

      // Khởi tạo assignments: mặc định tất cả thành viên được gán cho mỗi món
      const initialAssignments: ItemAssignment[] = data.items.map((item) => ({
        item,
        assignedUserIds: members.map((m) => m.user.id),
      }));
      setAssignments(initialAssignments);
      setStep("assign");
    } catch (err: any) {
      console.error("Receipt scan error:", err);
      toast.error(
        err.response?.data?.message ||
          "Lỗi khi quét hóa đơn. Vui lòng thử lại.",
      );
      setStep("upload");
    }
  };

  // ─── Toggle user cho 1 item ──────────────────────────
  const toggleUserForItem = (itemIndex: number, userId: string) => {
    setAssignments((prev) => {
      const updated = [...prev];
      const current = updated[itemIndex];
      if (current.assignedUserIds.includes(userId)) {
        current.assignedUserIds = current.assignedUserIds.filter(
          (id) => id !== userId,
        );
      } else {
        current.assignedUserIds = [...current.assignedUserIds, userId];
      }
      return updated;
    });
  };

  // ─── Tính tổng nợ mỗi người ─────────────────────────
  const calculateSplitAmounts = (): Record<string, number> => {
    const result: Record<string, number> = {};

    for (const assignment of assignments) {
      const itemTotal = assignment.item.totalPrice || 0;
      const count = assignment.assignedUserIds.length;
      if (count === 0) continue;

      const perPerson = Math.round(itemTotal / count);

      for (const userId of assignment.assignedUserIds) {
        result[userId] = (result[userId] || 0) + perPerson;
      }
    }

    return result;
  };

  // ─── Xác nhận & gửi dữ liệu về parent ──────────────
  const handleConfirm = () => {
    // Validate: mỗi item phải có ít nhất 1 người
    const emptyItem = assignments.find(
      (a) => a.assignedUserIds.length === 0 && (a.item.totalPrice || 0) > 0,
    );
    if (emptyItem) {
      toast.error(`Món "${emptyItem.item.description}" chưa được gán cho ai!`);
      return;
    }

    const splitAmounts = calculateSplitAmounts();
    const totalCalculated = Object.values(splitAmounts).reduce(
      (a, b) => a + b,
      0,
    );

    onConfirm({
      title: scanResult?.note || "Hóa đơn quét",
      amount: totalCalculated,
      splitAmounts,
    });
  };

  const splitAmounts = step === "assign" ? calculateSplitAmounts() : {};

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ──── Step 1: Upload ──── */}
      {step === "upload" && (
        <div className="flex flex-col items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-[#b8e6d0] rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#f0faf5] transition-all active:scale-[0.98]"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#74e5b8] to-[#27AE60] flex items-center justify-center shadow-lg">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">
                Chụp hoặc chọn ảnh hóa đơn
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Hỗ trợ JPG, PNG. AI sẽ tự động đọc từng món hàng.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Hủy quét
          </button>
        </div>
      )}

      {/* ──── Step 2: Scanning Animation ──── */}
      {step === "scanning" && (
        <div className="flex flex-col items-center gap-4 py-6">
          {previewUrl && (
            <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={previewUrl}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
              {/* Scan line animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#27AE60] to-transparent opacity-80"
                  style={{
                    animation: "scanLine 2s ease-in-out infinite",
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-[#27AE60] animate-pulse" />
                  <span className="text-sm font-bold text-gray-800">
                    Đang quét...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-[#27AE60]" />
            <span className="text-sm font-medium">
              AI đang nhận diện hóa đơn...
            </span>
          </div>
        </div>
      )}

      {/* ──── Step 3: Itemized Assignment ──── */}
      {step === "assign" && scanResult && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="text-lg">🧾</span>
                {scanResult.note || "Hóa đơn"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {scanResult.items.length} món · Tổng{" "}
                <span className="font-bold text-[#27AE60]">
                  {new Intl.NumberFormat("vi-VN").format(
                    Object.values(splitAmounts).reduce((a, b) => a + b, 0),
                  )}
                  đ
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                setStep("upload");
                setScanResult(null);
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 rounded-xl px-3 py-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Quét lại
            </button>
          </div>

          {/* Danh sách Item */}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
            {assignments.map((assignment, idx) => {
              const itemTotal = assignment.item.totalPrice || 0;
              const assignedCount = assignment.assignedUserIds.length;
              const perPerson =
                assignedCount > 0 ? Math.round(itemTotal / assignedCount) : 0;

              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm"
                >
                  {/* Tên món & giá */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {assignment.item.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {assignment.item.quantity > 1 &&
                          `x${assignment.item.quantity} · `}
                        {assignment.item.unitPrice
                          ? `${new Intl.NumberFormat("vi-VN").format(assignment.item.unitPrice)}đ/cái`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat("vi-VN").format(itemTotal)}đ
                      </p>
                      {assignedCount > 0 && (
                        <p className="text-[10px] text-[#27AE60] font-medium">
                          {new Intl.NumberFormat("vi-VN").format(perPerson)}
                          đ/người
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Avatar row: tick chọn thành viên */}
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((member, mIdx) => {
                      const isAssigned = assignment.assignedUserIds.includes(
                        member.user.id,
                      );
                      const bgColor =
                        AVATAR_COLORS[mIdx % AVATAR_COLORS.length];

                      return (
                        <button
                          key={member.user.id}
                          type="button"
                          onClick={() => toggleUserForItem(idx, member.user.id)}
                          className="relative group transition-all"
                          title={member.user.name}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs transition-all overflow-hidden ${
                              isAssigned
                                ? "ring-2 ring-[#27AE60] ring-offset-1 scale-100"
                                : "opacity-30 scale-90 hover:opacity-60 hover:scale-95"
                            }`}
                            style={{ backgroundColor: bgColor }}
                          >
                            {member.user.avatarUrl ? (
                              <img
                                src={member.user.avatarUrl}
                                alt={member.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              member.user.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          {isAssigned && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#27AE60] rounded-full flex items-center justify-center shadow-sm">
                              <Check
                                className="w-2.5 h-2.5 text-white"
                                strokeWidth={3}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tóm tắt chia tiền */}
          <div className="bg-[#f0faf5] border border-[#d1f2e6] rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-700 mb-2">
              💰 Tóm tắt chia tiền
            </p>
            <div className="space-y-1.5">
              {members.map((member, mIdx) => {
                const amount = splitAmounts[member.user.id] || 0;
                if (amount === 0) return null;
                const bgColor = AVATAR_COLORS[mIdx % AVATAR_COLORS.length];

                return (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden"
                        style={{ backgroundColor: bgColor }}
                      >
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          member.user.name.substring(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {member.user.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#27AE60]">
                      {new Intl.NumberFormat("vi-VN").format(amount)}đ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm transition-all active:scale-95 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #27AE60 0%, #2ecc71 100%)",
                boxShadow: "0 4px 15px rgba(39, 174, 96, 0.3)",
              }}
            >
              ✓ Xác nhận chia tiền
            </button>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes scanLine {
          0% {
            top: -5%;
          }
          50% {
            top: 95%;
          }
          100% {
            top: -5%;
          }
        }
      `}</style>
    </div>
  );
}
