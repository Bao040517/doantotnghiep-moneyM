import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";

interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

interface WalletManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const BANKS = [
  { id: "vcb", bin: "970436", name: "Vietcombank", fullName: "Ngân hàng Ngoại thương Việt Nam", shortName: "VCB", color: "bg-[#74b142]", text: "text-white" },
  { id: "ctg", bin: "970415", name: "VietinBank", fullName: "Ngân hàng Công thương Việt Nam", shortName: "CTG", color: "bg-[#005a9e]", text: "text-white" },
  { id: "bidv", bin: "970418", name: "BIDV", fullName: "Ngân hàng Đầu tư và Phát triển VN", shortName: "BIDV", color: "bg-[#005a9e]", text: "text-white" },
  { id: "agr", bin: "970405", name: "Agribank", fullName: "Ngân hàng NN&PTNT Việt Nam", shortName: "AGR", color: "bg-[#b12822]", text: "text-white" },
  { id: "mb", bin: "970422", name: "MBBank", fullName: "Ngân hàng Quân đội", shortName: "MB", color: "bg-[#002f6c]", text: "text-white" },
  { id: "tcb", bin: "970407", name: "Techcombank", fullName: "Ngân hàng Kỹ thương Việt Nam", shortName: "TCB", color: "bg-[#e50019]", text: "text-white" },
  { id: "vpb", bin: "970432", name: "VPBank", fullName: "Ngân hàng Việt Nam Thịnh Vượng", shortName: "VPB", color: "bg-[#009e60]", text: "text-white" },
  { id: "acb", bin: "970416", name: "ACB", fullName: "Ngân hàng Á Châu", shortName: "ACB", color: "bg-[#005a9e]", text: "text-white" },
  { id: "tpb", bin: "970423", name: "TPBank", fullName: "Ngân hàng Tiên Phong", shortName: "TPB", color: "bg-[#6d2077]", text: "text-white" }
];

export function WalletManagerDrawer({ open, onOpenChange, onSaved }: WalletManagerDrawerProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [bankBin, setBankBin] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wallets");
      setWallets(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách ví");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWallets();
      setIsFormOpen(false);
    }
  }, [open]);

  const handleOpenForm = (wallet?: Wallet) => {
    if (wallet) {
      setEditingWallet(wallet);
      setName(wallet.name);
      setBalance(wallet.balance.toString());
      setBankBin(wallet.bankBin || "");
      setBankAccountNo(wallet.bankAccountNo || "");
      setBankAccountName(wallet.bankAccountName || "");
    } else {
      setEditingWallet(null);
      setName("");
      setBalance("");
      setBankBin("");
      setBankAccountNo("");
      setBankAccountName("");
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên ví");
      return;
    }
    const rawBalance = balance ? parseInt(balance.replace(/\D/g, ""), 10) : 0;
    
    try {
      const payload = {
        name,
        balance: rawBalance,
        bankBin: bankBin || null,
        bankAccountNo: bankAccountNo || null,
        bankAccountName: bankAccountName || null
      };

      if (editingWallet) {
        await api.put(`/wallets/${editingWallet.id}`, payload);
        toast.success("Đã cập nhật thông tin ví");
      } else {
        await api.post("/wallets", payload);
        toast.success("Đã tạo ví mới");
      }
      
      setIsFormOpen(false);
      fetchWallets();
      if (onSaved) onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi lưu ví");
    }
  };

  const handleDelete = async (id: string, wName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ví "${wName}"? Các giao dịch liên quan có thể bị ảnh hưởng.`)) return;
    try {
      await api.delete(`/wallets/${id}`);
      toast.success("Đã xóa ví");
      fetchWallets();
      if (onSaved) onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Không thể xóa ví này");
    }
  };

  if (!open) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm transition-opacity" 
        onClick={() => !isFormOpen && onOpenChange(false)} 
      />
      <div 
        className={`fixed inset-x-0 bottom-0 z-[201] bg-slate-50 rounded-t-[32px] transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '90vh' }}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-5 shrink-0" />

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!isFormOpen ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-[22px] font-black text-slate-800">Quản lý Nguồn tiền</h2>
                  <p className="text-[13px] text-slate-500 font-medium">Quản lý các tài khoản & ví của bạn</p>
                </div>
                <button 
                  onClick={() => handleOpenForm()}
                  className="bg-[#2BA76F] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-[0_4px_12px_rgba(43,167,111,0.3)] active:scale-95 transition-transform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-4 border-slate-200 border-t-[#2BA76F] animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {wallets.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-medium text-[13px]">
                      Bạn chưa có ví nào. Hãy thêm ví mới nhé!
                    </div>
                  )}
                  {wallets.map(w => {
                    const linkedBank = w.bankBin ? BANKS.find(b => b.bin === w.bankBin) : null;
                    return (
                      <div key={w.id} className="bg-white rounded-2xl p-4 shadow-[0_4px_15px_-5px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center gap-4 group">
                        {/* Logo */}
                        {linkedBank ? (
                          <div className={`w-12 h-12 rounded-[14px] flex flex-col items-center justify-center shadow-sm shrink-0 ${linkedBank.color} ${linkedBank.text}`}>
                            <span className="text-[14px] font-black tracking-tight">{linkedBank.shortName}</span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-emerald-100 text-[#2BA76F] shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[16px] font-bold text-slate-800 leading-tight">{w.name}</h3>
                          {linkedBank ? (
                            <p className="text-[12px] font-medium text-slate-400 mt-0.5 truncate">{w.bankAccountNo ? `STK: ${w.bankAccountNo}` : linkedBank.name}</p>
                          ) : (
                            <p className="text-[12px] font-medium text-slate-400 mt-0.5">Tiền mặt / Ví thường</p>
                          )}
                          <p className="text-[14px] font-black text-[#2BA76F] mt-1">{new Intl.NumberFormat("vi-VN").format(w.balance)}đ</p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => handleOpenForm(w)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-[#2BA76F] hover:bg-emerald-50 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(w.id, w.name)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 active:scale-95 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-[20px] font-black text-slate-800">{editingWallet ? "Sửa thông tin Ví" : "Thêm Ví mới"}</h2>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Tên ví / Nguồn tiền *</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ví dụ: MBBank cá nhân, Tiền mặt..."
                    className="w-full text-[15px] font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300"
                  />
                </div>

                {!editingWallet && (
                  <div className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Số dư ban đầu</label>
                    <div className="flex items-center">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={balance} 
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setBalance(raw ? new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)) : "");
                        }} 
                        placeholder="0"
                        className="w-full text-[20px] font-black text-[#2BA76F] bg-transparent border-none p-0 focus:ring-0 placeholder-slate-200"
                      />
                      <span className="text-[16px] font-bold text-[#2BA76F] ml-1">đ</span>
                    </div>
                  </div>
                )}

                {/* Bank Linking Section */}
                <div className="bg-slate-100 p-4 rounded-[20px] border border-slate-200/60 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700">Liên kết Ngân hàng (Tùy chọn)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mb-4 leading-relaxed">Nếu liên kết, hệ thống sẽ tự động gợi ý Ví này khi bạn thực hiện các giao dịch chuyển khoản phù hợp.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Ngân hàng</label>
                      <select 
                        value={bankBin} 
                        onChange={e => setBankBin(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 text-[13px] font-bold text-slate-700 shadow-sm"
                      >
                        <option value="">Không liên kết</option>
                        {BANKS.map(b => (
                          <option key={b.bin} value={b.bin}>{b.name} - {b.fullName}</option>
                        ))}
                      </select>
                    </div>

                    {bankBin && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 ml-1">Số tài khoản</label>
                        <input 
                          type="text" 
                          value={bankAccountNo} 
                          onChange={e => setBankAccountNo(e.target.value)} 
                          placeholder="VD: 0123456789"
                          className="w-full h-11 px-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500/20 text-[14px] font-bold text-slate-800 shadow-sm placeholder-slate-300"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full mt-6 bg-slate-800 text-white font-bold text-[15px] py-4 rounded-[20px] shadow-[0_8px_20px_rgba(30,41,59,0.2)] active:scale-[0.98] transition-transform"
                >
                  Lưu Nguồn Tiền
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
