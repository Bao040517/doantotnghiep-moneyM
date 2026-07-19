interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowQuickAction: (show: boolean) => void;
}

export function BottomNavigation({
  activeTab,
  setActiveTab,
  setShowQuickAction,
}: BottomNavigationProps) {
  return (
    <nav
      className="fixed bottom-0 w-full bg-white flex justify-between items-end px-6 pb-6 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] z-40"
      style={{
        boxShadow: "0px -4px 30px rgba(69, 179, 157, 0.1)",
      }}
    >
      {/* Dashboard (Home) */}
      <button
        onClick={() => setActiveTab("dashboard")}
        className="flex flex-col items-center gap-1"
      >
        <svg
          className={`w-6 h-6 ${activeTab === "dashboard" ? "text-[#45b39d]" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
        <span
          className={`text-[10px] font-medium ${activeTab === "dashboard" ? "text-[#45b39d]" : "text-gray-400"}`}
        >
          Home
        </span>
      </button>

      {/* Report (Thống kê) */}
      <button
        onClick={() => setActiveTab("report")}
        className="flex flex-col items-center gap-1"
      >
        <svg
          className={`w-6 h-6 ${activeTab === "report" ? "text-[#45b39d]" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
          />
        </svg>
        <span
          className={`text-[10px] font-medium ${activeTab === "report" ? "text-[#45b39d]" : "text-gray-400"}`}
        >
          Thống kê
        </span>
      </button>

      {/* Center Add Button (Quick Actions) */}
      <button
        onClick={() => setShowQuickAction(true)}
        className="relative flex items-center justify-center -top-6 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-lg shadow-emerald-200 border-4 border-white hover:scale-105 active:scale-95 transition-transform"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      {/* Advisor (Tư vấn) */}
      <button
        onClick={() => setActiveTab("advisor")}
        className="flex flex-col items-center gap-1"
      >
        <svg
          className={`w-6 h-6 ${activeTab === "advisor" ? "text-[#45b39d]" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span
          className={`text-[10px] font-medium ${activeTab === "advisor" ? "text-[#45b39d]" : "text-gray-400"}`}
        >
          Tư vấn
        </span>
      </button>

      {/* Profile */}
      <button
        onClick={() => setActiveTab("profile")}
        className="flex flex-col items-center gap-1"
      >
        <svg
          className={`w-6 h-6 ${activeTab === "profile" ? "text-[#45b39d]" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
        <span
          className={`text-[10px] font-medium ${activeTab === "profile" ? "text-[#45b39d]" : "text-gray-400"}`}
        >
          Cá nhân
        </span>
      </button>
    </nav>
  );
}
