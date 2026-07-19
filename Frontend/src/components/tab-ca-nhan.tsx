import { UserSummary } from "@/lib/hooks/use-app-data";
import { ProfileSetupDrawer } from "@/components/ngan-keo-cap-nhat-ho-so";

interface ProfileTabProps {
  currentUser: UserSummary | null;
  onOpenPhoneModal: () => void;
  onLogout: () => void;
  onProfileSaved: () => void;
}

const POPULAR_BANKS = [
  { bin: "970436", name: "Vietcombank", shortName: "VCB" },
  { bin: "970407", name: "Techcombank", shortName: "TCB" },
  { bin: "970422", name: "MBBank", shortName: "MB" },
  { bin: "970416", name: "ACB", shortName: "ACB" },
  { bin: "970415", name: "VietinBank", shortName: "CTG" },
  { bin: "970418", name: "BIDV", shortName: "BIDV" },
  { bin: "970405", name: "Agribank", shortName: "VBA" },
  { bin: "970423", name: "TPBank", shortName: "TPB" },
  { bin: "970432", name: "VPBank", shortName: "VPB" },
];

export function ProfileTab({
  currentUser,
  onOpenPhoneModal,
  onLogout,
  onProfileSaved,
}: ProfileTabProps) {
  return (
    <main className="px-5 mt-8 max-w-md mx-auto w-full pb-28">
      {/* ─── PROFILE HEADER ─── */}
      <section className="flex flex-col items-center mb-8">
        <div
          className="mb-4 shadow-sm p-1.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, #a7f3d0 0%, #7dd3fc 100%)",
          }}
        >
          <img
            alt="Profile Picture"
            className="w-[110px] h-[110px] rounded-full object-cover border-4 border-white"
            src={
              currentUser?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || "U")}`
            }
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-700 mb-1">
          {currentUser?.name}
        </h1>
        <p className="text-slate-500 text-sm">Tiêu xài thông minh ✨</p>
      </section>

      {/* ─── CARDS SECTION ─── */}
      <section className="space-y-4">
        {/* Personal Info Card */}
        <article
          className="p-5 rounded-[1.25rem] shadow-sm"
          style={{ backgroundColor: "#fcf9f2" }}
        >
          <h2 className="text-lg font-medium text-slate-800 mb-4">
            Thông tin cá nhân
          </h2>
          <div className="space-y-5">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center mr-4 shrink-0">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <span className="text-slate-700 truncate">Email</span>
                <span className="text-slate-800 ml-2 truncate">
                  {currentUser?.email || "Chưa cập nhật"}
                </span>
              </div>
            </div>
            <div
              className="flex items-center cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
              onClick={onOpenPhoneModal}
            >
              <div className="w-10 h-10 rounded-xl bg-[#d1fae5] flex items-center justify-center mr-4 shrink-0">
                <svg
                  className="w-5 h-5 text-teal-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
              </div>
              <div className="flex-1 flex items-center min-w-0">
                <span className="text-slate-700 truncate flex-1">
                  Số điện thoại
                </span>
                <span className="text-slate-800 ml-2 truncate">
                  {currentUser?.phone || "Chưa cập nhật"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 ml-2 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </article>

        {/* Unified Financial Info & VietQR Card */}
        <ProfileSetupDrawer onSave={onProfileSaved}>
          <article
            className="p-5 rounded-[1.25rem] shadow-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ backgroundColor: "#fcf9f2" }}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-medium text-slate-800">
                Tài chính & Nhận tiền
              </h2>
              {(currentUser?.bankQrUrl ||
                (currentUser?.bankBin && currentUser?.bankAccountNo)) && (
                <div className="bg-white p-1 rounded-lg shadow-sm">
                  <img
                    alt="QR Code"
                    className="w-8 h-8 object-contain"
                    src={
                      currentUser?.bankQrUrl ||
                      `https://img.vietqr.io/image/${currentUser.bankBin}-${currentUser.bankAccountNo}-compact2.png?amount=0&addInfo=&accountName=${encodeURIComponent(currentUser.name)}`
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center mr-4 shrink-0">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
              </div>
              <div className="flex-1 flex items-center min-w-0">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-slate-700 truncate">Ngân hàng</span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">
                    Nhấn để cấu hình VietQR
                  </span>
                </div>
                <span className="text-slate-800 ml-2 truncate font-medium">
                  {POPULAR_BANKS.find((b) => b.bin === currentUser?.bankBin)
                    ?.shortName || "Chưa cấu hình"}{" "}
                  {currentUser?.bankAccountNo
                    ? `- *${currentUser.bankAccountNo.slice(-4)}`
                    : ""}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 ml-2 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </article>
        </ProfileSetupDrawer>

        {/* Logout Card */}
        <button
          onClick={onLogout}
          className="w-full bg-[#fcf9f2] rounded-[1.25rem] p-4 flex items-center justify-center gap-2 text-red-500 shadow-sm hover:bg-red-50 transition-colors mt-8"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
            />
          </svg>
          <span className="font-semibold text-lg">Đăng xuất tài khoản</span>
        </button>
      </section>
    </main>
  );
}
