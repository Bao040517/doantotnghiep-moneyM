"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Sparkles } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

interface RemindDebtDialogProps {
  groupId: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  children: React.ReactNode;
}

export function RemindDebtDialog({
  groupId,
  debtorId,
  debtorName,
  amount,
  children,
}: RemindDebtDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState("FUNNY");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN").format(val) + "đ";
  };

  const handleGenerateAI = async () => {
    try {
      setIsGenerating(true);
      const res = await api.post("/ai/generate-message", {
        debtorName,
        amount,
        mood,
      });
      setMessage(res.data.message || res.data);
      toast.success("AI đã tạo xong tin nhắn!");
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tạo tin nhắn AI lúc này.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReminder = async () => {
    if (!message.trim()) {
      toast.error("Vui lòng nhập lời nhắn!");
      return;
    }

    try {
      setIsSending(true);
      await api.post(`/groups/${groupId}/debts/remind`, {
        debtorId,
        amount,
        message,
      });
      toast.success("Đã gửi thông báo nhắc nợ thành công!");
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Có lỗi xảy ra khi gửi nhắc nợ.",
      );
    } finally {
      setIsSending(false);
    }
  };

  // Reset message when opened
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMessage(
        `Ê ${debtorName}, mầy còn nợ tao ${formatCurrency(amount)} đó nha! Trả lẹ đi mậy!`,
      );
    }
    setOpen(newOpen);
  };

  return (
    <>
      <div
        onClick={() => handleOpenChange(true)}
        className="inline-block cursor-pointer"
      >
        {children}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <Send className="w-5 h-5 mr-2 text-emerald-600" />
              Nhắc nợ {debtorName}
            </DialogTitle>
            <DialogDescription>
              Gửi một lời nhắc nhẹ nhàng (hoặc mạnh mẽ) kèm mã QR thanh toán đến
              hòm thư của {debtorName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* AI Generator */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-slate-500 flex items-center">
                  <Bot className="w-3 h-3 mr-1" /> Trợ lý AI (Gemini)
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-white px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="FUNNY">Hài hước, Gen Z 😂</option>
                  <option value="POLITE">Lịch sự, nhẹ nhàng ☕</option>
                  <option value="AGGRESSIVE">Gắt gỏng, đòi ngay 😡</option>
                  <option value="POETIC">Thơ ca lãng mạn 🌸</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="h-8 bg-indigo-500 hover:bg-indigo-600 text-xs px-3"
              >
                {isGenerating ? (
                  "Đang nghĩ..."
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" /> Soạn văn
                  </>
                )}
              </Button>
            </div>

            <Textarea
              placeholder="Nhập lời nhắc nợ của bạn..."
              className="min-h-[120px] resize-none text-sm p-3 focus-visible:ring-emerald-500"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSendReminder}
              disabled={isSending || !message.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              {isSending ? "Đang gửi..." : "Gửi ngay"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
