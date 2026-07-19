"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8080/api`;
  }
  return "http://localhost:8080/api";
};

const API = getBaseUrl();

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"welcome" | "login" | "register">("welcome");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const payload =
        tab === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      router.push("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Đã có lỗi xảy ra. Thử lại nhé!",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ─── WELCOME SCREEN ─── */
  if (tab === "welcome") {
    return (
      <div
        className="min-h-dvh w-full flex flex-col items-center justify-center py-8"
        style={{
          background: "linear-gradient(to bottom, #e2f8f4 0%, #cff1e9 100%)",
        }}
      >
        {/* Content */}
        <div className="flex flex-col items-center px-8 text-center w-full max-w-md">
          <p className="text-lg font-medium opacity-90 text-[#437d6e]">
            Welcome to ShareMoney
          </p>
          <h1 className="text-[32px] sm:text-[38px] font-extrabold leading-tight mt-1 mb-2 text-[#437d6e]">
            Làm chủ tài chính,
            <br />
            Chia tiền dễ dàng
          </h1>

          {/* Illustration */}
          <div
            className="w-full aspect-square max-h-[300px] bg-no-repeat bg-center bg-contain mb-6 mt-4 drop-shadow-xl"
            style={{ backgroundImage: "url('/welcome-bg.png')" }}
          ></div>
        </div>

        {/* Footer buttons */}
        <footer className="w-full max-w-md px-8 flex flex-col gap-3">
          <button
            onClick={() => setTab("login")}
            className="w-full py-4 rounded-full text-xl font-bold text-white shadow-lg transition-all active:scale-95"
            style={{ backgroundColor: "#6ebda9" }}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setTab("register")}
            className="w-full py-3 text-xl font-bold transition-opacity hover:opacity-70"
            style={{ color: "#437d6e" }}
          >
            Đăng ký
          </button>
        </footer>
      </div>
    );
  }

  /* ─── LOGIN / REGISTER FORM ─── */
  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center justify-between"
      style={{
        background: "linear-gradient(to bottom, #e2f8f4 0%, #cff1e9 100%)",
      }}
    >
      {/* Back */}
      <div className="w-full max-w-md px-6 pt-5 relative z-10">
        <button
          onClick={() => {
            setTab("welcome");
            setError("");
          }}
          className="text-[#437d6e] font-semibold flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Quay lại
        </button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 -mt-8">
        {/* Logo */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-md"
          style={{ backgroundColor: "#6ebda9" }}
        >
          <svg
            className="w-9 h-9 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-[#437d6e] mb-1">
          ShareMoney
        </h1>
        <p className="text-sm text-[#437d6e]/70 mb-8">
          Quản lý chi tiêu thông minh & Chia tiền nhóm dễ dàng.
        </p>

        {/* Tab toggle */}
        <div className="w-full flex bg-white/60 rounded-full p-1 mb-6">
          <button
            onClick={() => {
              setTab("login");
              setError("");
              setForm({ name: "", email: "", password: "" });
            }}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === "login" ? "bg-white shadow text-[#437d6e]" : "text-gray-500"}`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setTab("register");
              setError("");
              setForm({ name: "", email: "", password: "" });
            }}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === "register" ? "bg-white shadow text-[#437d6e]" : "text-gray-500"}`}
          >
            Đăng ký
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {tab === "register" && (
            <div>
              <label className="text-xs font-semibold text-[#437d6e] block mb-1">
                Tên của bạn
              </label>
              <input
                type="text"
                placeholder="VD: Quốc Bảo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full bg-white/80 border border-[#b3e5d1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6ebda9] transition"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-[#437d6e] block mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="hello@example.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              className="w-full bg-white/80 border border-[#b3e5d1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6ebda9] transition"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#437d6e] block mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
              className="w-full bg-white/80 border border-[#b3e5d1] rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6ebda9] transition"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-full text-white text-lg font-bold mt-2 shadow-lg active:scale-95 transition-all disabled:opacity-60"
            style={{ backgroundColor: "#6ebda9" }}
          >
            {loading
              ? "Đang xử lý..."
              : tab === "login"
                ? "Vào trong nào →"
                : "Tiếp tục →"}
          </button>
        </form>
      </main>

      <div className="pb-12" />
    </div>
  );
}
