import { useState } from "react";
import api from "@/lib/axios";
import { UserSummary } from "@/lib/hooks/use-app-data";

interface PhoneSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserSummary | null;
  onSuccess: (newPhone: string) => void;
}

export function PhoneSetupModal({ open, onOpenChange, currentUser, onSuccess }: PhoneSetupModalProps) {
  const [phoneForm, setPhoneForm] = useState("");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  if (!open) return null;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPhone(true);
    setPhoneError("");
    try {
      await api.put(`/users/me/phone`, { phone: phoneForm });
      onSuccess(phoneForm);
      onOpenChange(false);
    } catch (err: any) {
      setPhoneError(err?.response?.data?.message || "Đã có lỗi xảy ra khi cập nhật số điện thoại.");
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#e2f8f4] rounded-3xl p-6 shadow-2xl border border-white/50 relative overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #e2f8f4 0%, #cff1e9 100%)" }}>
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/20 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-[#6ebda9]/20 blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md bg-[#6ebda9]">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold text-[#437d6e] mb-2 text-center">Cập nhật Số điện thoại</h2>
          <p className="text-sm text-[#437d6e]/80 mb-6 text-center leading-relaxed">
            Bạn cần thêm số điện thoại để bạn bè có thể tìm thấy và mời bạn vào nhóm.
          </p>

          <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-[#437d6e] block mb-1">Số điện thoại cũ</label>
              <input
                type="tel"
                value={currentUser?.phone || "Chưa có"}
                disabled
                className="w-full bg-white/50 border border-[#b3e5d1]/50 rounded-2xl px-4 py-3.5 text-gray-500 cursor-not-allowed shadow-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#437d6e] block mb-1">Số điện thoại mới</label>
              <input
                type="tel"
                placeholder="VD: 0912345678"
                value={phoneForm}
                onChange={e => setPhoneForm(e.target.value)}
                required
                className="w-full bg-white/80 border border-[#b3e5d1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6ebda9] transition shadow-sm"
              />
            </div>

            {phoneError && (
              <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">{phoneError}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-4 rounded-full text-[#437d6e] text-lg font-bold shadow-sm bg-white border border-[#b3e5d1] hover:bg-gray-50 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmittingPhone || !phoneForm.trim() || phoneForm === currentUser?.phone}
                className="flex-1 py-4 rounded-full text-white text-lg font-bold shadow-lg active:scale-95 transition-all disabled:opacity-60 bg-[#6ebda9]"
              >
                {isSubmittingPhone ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
