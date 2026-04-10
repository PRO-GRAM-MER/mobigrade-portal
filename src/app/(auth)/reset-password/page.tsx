"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, Leaf, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordAction } from "@/actions/auth-actions";
import s from "./reset.module.css";

type PageState = "form" | "done" | "invalid";

type FormProps = {
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

const BrandLeft = () => (
  <>
    <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 50% at 85% 8%, rgba(255,111,63,0.20) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 5% 92%, rgba(0,162,103,0.15) 0%, transparent 50%)" }} />
    <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
      style={{ position: "relative", zIndex: 10, display: "inline-flex", alignItems: "center", gap: 12 }}>
      <div style={{ padding: "10px 14px", borderRadius: 12, display: "inline-flex", alignItems: "center", backgroundColor: "rgba(255,255,255,0.96)", boxShadow: "0 4px 18px rgba(0,0,0,0.14)" }}>
        <Image src="/logo.svg" alt="MobiGrade" width={28} height={28} />
      </div>
      <div>
        <p style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>MobiGrade</p>
        <p style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>PORTAL</p>
      </div>
    </motion.div>
    <div style={{ position: "relative", zIndex: 10 }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", lineHeight: 1.18 }}>
        Set a new<br /><span style={{ color: "#FF6F3F" }}>password.</span>
      </h1>
      <p style={{ fontSize: "0.875rem", lineHeight: 1.7, maxWidth: 280, color: "rgba(255,255,255,0.50)", marginTop: 12 }}>
        Choose a strong password to keep your account secure.
      </p>
    </div>
    <div style={{ position: "relative", zIndex: 10, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 16px", alignSelf: "flex-start", backgroundColor: "rgba(0,162,103,0.13)", border: "1px solid rgba(0,162,103,0.28)" }}>
      <Leaf size={13} color="#4ade80" />
      <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#4ade80" }}>Committed to Zero E-Waste</span>
    </div>
  </>
);

/* ═══════════════════════════════════════════════
   MOBILE
═══════════════════════════════════════════════ */
function MobileReset({ loading, onSubmit }: FormProps) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "16px", minHeight: "100svh", backgroundColor: "#2F3567",
    }}>
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 55% at 90% 0%, rgba(255,111,63,0.22) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 5% 95%, rgba(0,162,103,0.16) 0%, transparent 55%)" }} />
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "24rem", paddingTop: 64, paddingBottom: 40 }}>
        <Image src="/logo.svg" alt="MobiGrade" width={56} height={56} loading="eager" />
        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginTop: 16 }}>MobiGrade</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, width: "100%", maxWidth: "24rem", paddingBottom: 32 }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: 32 }}>Set new password</h2>

        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-rp-pw" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 8, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>New Password</label>
            <div style={{ position: "relative" }}>
              <input id="mob-rp-pw" name="password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                className="glass-input"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 14, width: "100%", padding: "15px 48px 15px 16px", fontSize: 15 }} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex" }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-rp-confirm" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 8, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input id="mob-rp-confirm" name="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                className="glass-input"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 14, width: "100%", padding: "15px 48px 15px 16px", fontSize: 15 }} />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex" }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", borderRadius: 14, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 8px 24px rgba(255,111,63,0.32)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none", marginTop: 4 }}>
            {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Updating…</>) : (<>Update Password <ArrowRight size={17} strokeWidth={2.5} /></>)}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DESKTOP
═══════════════════════════════════════════════ */
function DesktopReset({ loading, onSubmit }: FormProps) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F5F6FA" }}>
      <motion.div initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", width: "50%", padding: 56, backgroundColor: "#2F3567" }}>
        <BrandLeft />
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
            <Image src="/logo.svg" alt="MobiGrade" width={44} height={44} style={{ marginBottom: 14 }} />
            <p style={{ fontSize: "1.375rem", fontWeight: 700, color: "#2F3567", lineHeight: 1 }}>MobiGrade Portal</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
            style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#2F3567" }}>Set new password</h2>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.4 }}
            onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-rp-pw" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 8, color: "#2F3567" }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input id="desk-rp-pw" name="password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                  style={{ border: "1.5px solid #E6E6E6", backgroundColor: "#F8F9FB", color: "#2F3567", borderRadius: 12, width: "100%", padding: "14px 48px 14px 16px", fontSize: 15, transition: "border-color 0.15s, background-color 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "#2F3567"; e.target.style.backgroundColor = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#E6E6E6"; e.target.style.backgroundColor = "#F8F9FB"; }} />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9B9B9B", display: "flex" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-rp-confirm" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 8, color: "#2F3567" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input id="desk-rp-confirm" name="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                  style={{ border: "1.5px solid #E6E6E6", backgroundColor: "#F8F9FB", color: "#2F3567", borderRadius: 12, width: "100%", padding: "14px 48px 14px 16px", fontSize: 15, transition: "border-color 0.15s, background-color 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "#2F3567"; e.target.style.backgroundColor = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#E6E6E6"; e.target.style.backgroundColor = "#F8F9FB"; }} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9B9B9B", display: "flex" }}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", borderRadius: 12, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 6px 20px rgba(255,111,63,0.28)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none" }}>
              {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Updating…</>) : (<>Update Password <ArrowRight size={16} strokeWidth={2.5} /></>)}
            </motion.button>
          </motion.form>

          <p style={{ textAlign: "center", fontSize: "0.72rem", marginTop: 40, color: "#C5C5C5" }}>
            © {new Date().getFullYear()} MobiGrade · All rights reserved
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUCCESS / INVALID states (shared layout)
═══════════════════════════════════════════════ */
function StatusScreen({ icon, title, message, cta }: { icon: React.ReactNode; title: string; message: string; cta: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F5F6FA" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", maxWidth: 380, padding: 32 }}>
        {icon}
        <div>
          <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#2F3567", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: "0.875rem", color: "#4A4C5F", lineHeight: 1.65 }}>{message}</p>
        </div>
        {cta}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════ */
function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>("form");

  useEffect(() => {
    if (!token) setPageState("invalid");
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const els = e.currentTarget.elements;
    const password = (els.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (els.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await resetPasswordAction(token, password);
    setLoading(false);

    if (!result.success) {
      if (result.error === "INVALID_TOKEN") {
        setPageState("invalid");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
      return;
    }

    setPageState("done");
    setTimeout(() => router.push("/login"), 3000);
  }

  if (pageState === "invalid") {
    return (
      <StatusScreen
        icon={<div style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangle size={32} color="#dc2626" /></div>}
        title="Link expired or invalid"
        message="This password reset link is no longer valid. Please request a new one."
        cta={<Link href="/forgot-password" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, backgroundColor: "#FF6F3F", color: "#fff", fontWeight: 600, fontSize: "0.9375rem" }}>Request new link</Link>}
      />
    );
  }

  if (pageState === "done") {
    return (
      <StatusScreen
        icon={<div style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldCheck size={32} color="#15803d" /></div>}
        title="Password updated!"
        message="Your password has been changed successfully. Redirecting you to sign in…"
        cta={<Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, backgroundColor: "#2F3567", color: "#fff", fontWeight: 600, fontSize: "0.9375rem" }}>Go to sign in</Link>}
      />
    );
  }

  return (
    <>
      <div className={s.mobileOnly}><MobileReset loading={loading} onSubmit={handleSubmit} /></div>
      <div className={s.desktopOnly}><DesktopReset loading={loading} onSubmit={handleSubmit} /></div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA" }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
