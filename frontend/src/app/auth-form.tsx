"use client";
import { API } from "@/lib/api";

import { FormEvent, useState, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  User,
  Users,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Brain,
  FileCheck,
  HelpCircle,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

// Using centralized API endpoint from @/lib/api

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoLogins, setShowDemoLogins] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNotice, setForgotNotice] = useState("");

  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const roleId = useId();

  // Password rules for registration
  const hasMinLength = password.length >= 10;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpper = /[A-Z]/.test(password);

  async function performLogin(targetEmail: string, targetPass: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message || body.error || body.detail || "Unable to sign in. Please verify your credentials.");
      }
      if (body.role === "ADMIN") {
        router.push("/admin");
      } else if (body.role === "PARENT") {
        router.push("/parent");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The API could not be reached. Ensure the backend server is running.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (!isLogin && (!hasMinLength || !hasNumberOrSymbol || !hasUpper)) {
      setError("Please ensure your password meets all security requirements.");
      setBusy(false);
      return;
    }

    const payload = isLogin
      ? { email, password }
      : { name, role, email, password };

    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || data.detail || `Authentication failed (${res.status}).`);
      }

      if (isLogin) {
        if (data.role === "ADMIN") router.push("/admin");
        else if (data.role === "PARENT") router.push("/parent");
        else router.push("/dashboard");
      } else {
        await performLogin(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotNotice("If an account matches this email, password reset instructions have been generated.");
    setTimeout(() => {
      setForgotModalOpen(false);
      setForgotNotice("");
      setForgotEmail("");
    }, 3000);
  }

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#080D1A] text-[#F1F5F9] selection:bg-[#8999FF]/25 selection:text-white">
      {/* Top Header (Stretched Wide) */}
      <header className="border-b border-[#1E2D4A]/60 bg-[#080D1A]/95 backdrop-blur-md sticky top-0 z-30 h-14 w-full">
        <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Smart Edu Home">
            <Logo size={26} textSize="text-[15px] font-bold tracking-tight text-[#F1F5F9]" />
          </Link>

          <Link
            href="/"
            className="text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-white flex items-center gap-2 transition-colors py-1.5 px-3 rounded-lg hover:bg-[#111B30]"
          >
            <span>Back to home</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Content (Stretched to Left and Right Flanks, Takes Window) */}
      <div className="flex-1 flex items-center w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 py-8 lg:py-12 my-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">

          {/* LEFT FLANK: High-Impact Editorial Story (Stretched from far left) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 lg:space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1E2D4A] bg-[#111B30] text-xs font-mono text-[#8999FF]">
              <Sparkles size={13} className="text-[#8999FF]" />
              <span>Source-Grounded Academic Workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-[#F1F5F9] tracking-tight leading-[1.08] font-heading">
              {isLogin ? (
                <>
                  Your next focused hour <br className="hidden sm:inline" />
                  <span className="text-[#8999FF]">starts here.</span>
                </>
              ) : (
                <>
                  A calm, structured way <br className="hidden sm:inline" />
                  <span className="text-[#8999FF]">to master subjects.</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg xl:text-xl text-[#94A3B8] leading-relaxed max-w-xl font-normal">
              {isLogin
                ? "Access your course documents, adaptive review schedule, and verified focus history with local AI inference."
                : "Organize course notes into adaptive flashcards, source-grounded active recall quizzes, and monitored study sessions."}
            </p>

            {/* Proof Points */}
            <div className="space-y-3.5 pt-1 max-w-xl">
              <div className="flex items-center gap-3.5 text-sm sm:text-base text-[#CBD5E1]">
                <div className="w-7 h-7 rounded-lg bg-[#8999FF]/15 border border-[#8999FF]/30 text-[#8999FF] flex items-center justify-center shrink-0">
                  <Check size={15} strokeWidth={3} />
                </div>
                <span>Adaptive study schedules balanced against your daily time</span>
              </div>
              <div className="flex items-center gap-3.5 text-sm sm:text-base text-[#CBD5E1]">
                <div className="w-7 h-7 rounded-lg bg-[#62C9D6]/15 border border-[#62C9D6]/30 text-[#62C9D6] flex items-center justify-center shrink-0">
                  <Brain size={15} />
                </div>
                <span>Active recall quizzes with verified source citations</span>
              </div>
              <div className="flex items-center gap-3.5 text-sm sm:text-base text-[#CBD5E1]">
                <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] flex items-center justify-center shrink-0">
                  <BookOpen size={15} />
                </div>
                <span>Synchronized parent and student transparency ledger</span>
              </div>
            </div>

            {/* Grounded Workspace Preview Badge */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-[#1E2D4A] bg-[#111B30]/80 backdrop-blur-md flex items-center justify-between text-xs font-mono max-w-xl">
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <FileCheck size={15} className="text-[#62C9D6]" />
                <span className="text-[#F1F5F9] font-medium">Operating Systems & DBMS</span>
                <span className="text-[#64748B]">· Local Vector Store</span>
              </div>
              <span className="text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                Isolated Tenant
              </span>
            </div>
          </div>

          {/* RIGHT FLANK: Spacious Auth Card (Stretched to far right) */}
          <div className="lg:col-span-6 xl:col-span-6 w-full flex justify-end">
            <div className="w-full max-w-xl xl:max-w-2xl p-8 sm:p-10 xl:p-12 rounded-2xl bg-[#111B30] border border-[#1E2D4A] shadow-2xl space-y-6">
              <div>
                <span className="text-xs font-mono text-[#8999FF] uppercase tracking-wider block mb-1.5 font-medium">
                  {isLogin ? "Welcome back" : "New Account"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#F1F5F9] font-heading">
                  {isLogin ? "Sign in to your account" : "Create your study account"}
                </h2>
              </div>

              {/* Demo Accounts Pill Toggle (Login Only) */}
              {isLogin && (
                <div className="p-3.5 rounded-xl bg-[#0D1527] border border-[#1E2D4A]">
                  <button
                    type="button"
                    onClick={() => setShowDemoLogins(!showDemoLogins)}
                    className="w-full flex items-center justify-between text-xs sm:text-sm text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
                    aria-expanded={showDemoLogins}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Sparkles size={14} className="text-[#8999FF]" />
                      <span>One-Click Demo Accounts</span>
                    </span>
                    {showDemoLogins ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {showDemoLogins && (
                    <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#1E2D4A]">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("student@test.com");
                          setPassword("Password123!");
                          void performLogin("student@test.com", "Password123!");
                        }}
                        disabled={busy}
                        className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-[#17243A] hover:bg-[#1E2D4A] text-[#F1F5F9] transition-all text-xs font-medium border border-[#1E2D4A] cursor-pointer"
                      >
                        <User size={15} className="text-[#8999FF] mb-1" />
                        <span>Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("parent@test.com");
                          setPassword("Password123!");
                          void performLogin("parent@test.com", "Password123!");
                        }}
                        disabled={busy}
                        className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-[#17243A] hover:bg-[#1E2D4A] text-[#F1F5F9] transition-all text-xs font-medium border border-[#1E2D4A] cursor-pointer"
                      >
                        <Users size={15} className="text-[#10B981] mb-1" />
                        <span>Parent</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("admin@test.com");
                          setPassword("Password123!");
                          void performLogin("admin@test.com", "Password123!");
                        }}
                        disabled={busy}
                        className="flex flex-col items-center justify-center py-2.5 px-2 rounded-lg bg-[#17243A] hover:bg-[#1E2D4A] text-[#F1F5F9] transition-all text-xs font-medium border border-[#1E2D4A] cursor-pointer"
                      >
                        <ShieldAlert size={15} className="text-[#FB7185] mb-1" />
                        <span>Admin</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={submit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label htmlFor={nameId} className="block text-xs sm:text-sm font-medium text-[#CBD5E1] mb-1.5 font-mono">
                        Full Name
                      </label>
                      <input
                        id={nameId}
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        className="w-full h-12 sm:h-13 px-4 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm sm:text-base text-[#F1F5F9] placeholder-[#64748B] focus:border-[#8999FF] focus:outline-none focus:ring-1 focus:ring-[#8999FF] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor={roleId} className="block text-xs sm:text-sm font-medium text-[#CBD5E1] mb-1.5 font-mono">
                        Account Type
                      </label>
                      <select
                        id={roleId}
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full h-12 sm:h-13 px-4 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm sm:text-base text-[#F1F5F9] focus:border-[#8999FF] focus:outline-none focus:ring-1 focus:ring-[#8999FF] transition-all"
                      >
                        <option value="STUDENT">Student (Study materials, quizzes & tasks)</option>
                        <option value="PARENT">Parent (Monitor student progress & ledger)</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor={emailId} className="block text-xs sm:text-sm font-medium text-[#CBD5E1] mb-1.5 font-mono">
                    Email Address
                  </label>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full h-12 sm:h-13 px-4 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm sm:text-base text-[#F1F5F9] placeholder-[#64748B] focus:border-[#8999FF] focus:outline-none focus:ring-1 focus:ring-[#8999FF] transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={passwordId} className="text-xs sm:text-sm font-medium text-[#CBD5E1] font-mono">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setForgotModalOpen(true)}
                        className="text-xs text-[#8999FF] hover:underline font-mono"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id={passwordId}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-12 sm:h-13 px-4 pr-11 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm sm:text-base text-[#F1F5F9] placeholder-[#64748B] focus:border-[#8999FF] focus:outline-none focus:ring-1 focus:ring-[#8999FF] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist for Register */}
                {!isLogin && (
                  <div className="p-3.5 rounded-xl bg-[#0D1527] border border-[#1E2D4A] space-y-1.5 text-xs font-mono">
                    <div className={`flex items-center gap-2 ${hasMinLength ? "text-[#10B981]" : "text-[#64748B]"}`}>
                      <Check size={13} className={hasMinLength ? "text-[#10B981]" : "text-[#64748B]"} />
                      <span>At least 10 characters</span>
                    </div>
                    <div className={`flex items-center gap-2 ${hasUpper ? "text-[#10B981]" : "text-[#64748B]"}`}>
                      <Check size={13} className={hasUpper ? "text-[#10B981]" : "text-[#64748B]"} />
                      <span>At least one uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 ${hasNumberOrSymbol ? "text-[#10B981]" : "text-[#64748B]"}`}>
                      <Check size={13} className={hasNumberOrSymbol ? "text-[#10B981]" : "text-[#64748B]"} />
                      <span>At least one number or symbol</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div role="alert" className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#FCA5A5] leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-12 sm:h-13 rounded-xl text-sm sm:text-base font-semibold bg-[#8999FF] text-[#080D1A] hover:bg-[#9CA8FF] active:scale-[0.98] transition-all shadow-[0_1px_16px_rgba(137,153,255,0.25)] flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
                </button>
              </form>

              {/* Bottom Toggle Link */}
              <div className="text-center pt-2 text-xs sm:text-sm text-[#94A3B8]">
                {isLogin ? (
                  <span>
                    New to Smart Study?{" "}
                    <Link href="/register" className="text-[#8999FF] font-semibold hover:underline">
                      Create account
                    </Link>
                  </span>
                ) : (
                  <span>
                    Already registered?{" "}
                    <Link href="/login" className="text-[#8999FF] font-semibold hover:underline">
                      Sign in here
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Footer Strip */}
      <footer className="border-t border-[#1E2D4A]/50 py-3.5 px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 text-xs text-[#64748B] flex items-center justify-between w-full">
        <span>&copy; 2026 Smart Study Portal. Source-Grounded Learning.</span>
        <div className="flex items-center gap-4">
          <span>Tenant Isolated</span>
          <span>Local LLM Inference</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#111B30] border border-[#1E2D4A] shadow-2xl relative space-y-4">
            <button
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-[#F1F5F9] font-heading">Reset Password</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Enter your account email address. We will verify your credentials and assist you with password recovery.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-3.5">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full h-11 px-4 rounded-xl border border-[#1E2D4A] bg-[#0D1527] text-sm text-[#F1F5F9] placeholder-[#64748B] focus:border-[#8999FF] focus:outline-none"
              />
              {forgotNotice && (
                <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981]">
                  {forgotNotice}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-[#8999FF] text-[#080D1A] rounded-lg hover:bg-[#9CA8FF]"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
