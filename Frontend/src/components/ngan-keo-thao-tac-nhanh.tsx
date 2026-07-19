interface QuickActionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTxType: (type: "EXPENSE" | "INCOME") => void;
  onSelectCreateGroup: () => void;
}

export function QuickActionDrawer({
  open,
  onOpenChange,
  onSelectTxType,
  onSelectCreateGroup,
}: QuickActionDrawerProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-[2rem] p-6 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
          Bạn muốn làm gì?
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              onSelectTxType("EXPENSE");
            }}
            className="w-full flex items-center p-4 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-colors"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm mr-4">
              💸
            </div>
            <div className="text-left">
              <p className="font-bold text-rose-800">Ghi Chi Tiêu</p>
              <p className="text-xs text-rose-600">
                Bạn vừa mua sắm hay trả tiền gì đó?
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              onSelectTxType("INCOME");
            }}
            className="w-full flex items-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm mr-4">
              💰
            </div>
            <div className="text-left">
              <p className="font-bold text-emerald-800">Ghi Thu Nhập</p>
              <p className="text-xs text-emerald-600">
                Bạn vừa nhận lương hay được cho tiền?
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              onSelectCreateGroup();
            }}
            className="w-full flex items-center p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm mr-4">
              🧑‍🤝‍🧑
            </div>
            <div className="text-left">
              <p className="font-bold text-blue-800">Tạo Nhóm đi chơi</p>
              <p className="text-xs text-blue-600">
                Mời bạn bè và bắt đầu chia tiền
              </p>
            </div>
          </button>
        </div>
        <button
          className="w-full mt-6 py-3 font-bold text-gray-500 hover:text-gray-700"
          onClick={() => onOpenChange(false)}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
