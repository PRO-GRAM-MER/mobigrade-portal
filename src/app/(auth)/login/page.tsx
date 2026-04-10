"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, Leaf, Recycle } from "lucide-react";
import { toast } from "sonner";
import s from "./login.module.css";

type LoginProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
};

/* ═══════════════════════════════════════════════
   MOBILE  ·  full-screen dark experience
═══════════════════════════════════════════════ */
function MobileLogin({ onSubmit, loading }: LoginProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "16px", minHeight: "100svh", backgroundColor: "#2F3567",
    }}>
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 55% at 90% 0%, rgba(255,111,63,0.22) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 5% 95%, rgba(0,162,103,0.16) 0%, transparent 55%)" }} />
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />

      {/* brand */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "24rem", paddingTop: 64, paddingBottom: 40 }}
      >
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 160 }}
          style={{ position: "relative", marginBottom: 20 }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: 9999, filter: "blur(24px)", backgroundColor: "rgba(255,111,63,0.25)", transform: "scale(1.7)" }} />
          <Image src="/logo.svg" alt="MobiGrade" width={56} height={56} loading="eager" style={{ position: "relative", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff" }}>
          MobiGrade
        </motion.p>
      </motion.div>

      {/* form */}
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, width: "100%", maxWidth: "24rem", paddingBottom: 32 }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: 32 }}>Sign in</h2>

        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-email" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 8, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Email address
            </label>
            <input id="mob-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"
              className="glass-input"
              style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 14, width: "100%", padding: "15px 16px", fontSize: 15 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label htmlFor="mob-password" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
                Password
              </label>
              <Link href="/forgot-password" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Forgot?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <input id="mob-password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••"
                className="glass-input"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.14)", color: "#fff", borderRadius: 14, width: "100%", padding: "15px 48px 15px 16px", fontSize: 15 }} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex", alignItems: "center" }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", borderRadius: 14, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 8px 24px rgba(255,111,63,0.32)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none", marginTop: 4 }}>
            {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Signing in…</>) : (<>Sign In <ArrowRight size={17} strokeWidth={2.5} /></>)}
          </motion.button>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "rgba(255,255,255,0.40)", marginTop: 4 }}>
            New seller?{" "}
            <Link href="/signup" style={{ color: "#FF6F3F", fontWeight: 600 }}>Create an account</Link>
          </p>
        </form>
      </motion.div>

      {/* footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Leaf size={11} color="#4ade80" />
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>Committed to Zero E-Waste</span>
        </div>
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.15)" }}>© {new Date().getFullYear()} MobiGrade</span>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DESKTOP  ·  split panel
═══════════════════════════════════════════════ */
function DesktopLogin({ onSubmit, loading }: LoginProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F5F6FA" }}>

      {/* left: dark brand panel */}
      <motion.div
        initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", width: "50%", padding: 56, backgroundColor: "#2F3567" }}
      >
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 50% at 85% 8%, rgba(255,111,63,0.20) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 5% 92%, rgba(0,162,103,0.15) 0%, transparent 50%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* logo pill */}
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

        {/* hero */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: 24 }}>
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.55 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 9999, padding: "4px 12px", backgroundColor: "rgba(0,162,103,0.18)", border: "1px solid rgba(0,162,103,0.28)" }}>
              <Recycle size={11} color="#4ade80" />
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4ade80" }}>Circular Economy</span>
            </div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", lineHeight: 1.18 }}>
              Sell smarter.<br /><span style={{ color: "#FF6F3F" }}>Waste nothing.</span>
            </h1>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.7, maxWidth: 280, color: "rgba(255,255,255,0.50)" }}>
              List spare parts, refurbished phones, and bulk deals. Reach thousands of repair shops and retailers.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65, duration: 0.45 }}
            style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {([["10K+", "Active Sellers", false], ["500+", "Retailers", true], ["6", "Verticals", false]] as [string, string, boolean][]).map(([v, l, hi]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: hi ? "#FF6F3F" : "#fff" }}>{v}</span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.38)" }}>{l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* eco */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ position: "relative", zIndex: 10, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999, padding: "8px 16px", alignSelf: "flex-start", backgroundColor: "rgba(0,162,103,0.13)", border: "1px solid rgba(0,162,103,0.28)" }}>
          <Leaf size={13} color="#4ade80" />
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#4ade80" }}>Committed to Zero E-Waste</span>
        </motion.div>
      </motion.div>

      {/* right: white form panel */}
      <motion.div
        initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: "#ffffff" }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>

          {/* brand */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
            <Image src="/logo.svg" alt="MobiGrade" width={44} height={44} style={{ marginBottom: 14 }} />
            <p style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#2F3567", lineHeight: 1 }}>MobiGrade Portal</p>
          </motion.div>

          {/* heading */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
            style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#2F3567" }}>Sign in</h2>
          </motion.div>

          {/* form */}
          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.4 }}
            onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-email" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 8, color: "#2F3567" }}>
                Email address
              </label>
              <input id="desk-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"
                style={{ border: "1.5px solid #E6E6E6", backgroundColor: "#F8F9FB", color: "#2F3567", borderRadius: 12, width: "100%", padding: "14px 16px", fontSize: 15, transition: "border-color 0.15s, background-color 0.15s" }}
                onFocus={e => { e.target.style.borderColor = "#2F3567"; e.target.style.backgroundColor = "#fff"; }}
                onBlur={e => { e.target.style.borderColor = "#E6E6E6"; e.target.style.backgroundColor = "#F8F9FB"; }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label htmlFor="desk-password" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#2F3567" }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: "0.75rem", color: "#FF6F3F", fontWeight: 500 }}>Forgot password?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <input id="desk-password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••"
                  style={{ border: "1.5px solid #E6E6E6", backgroundColor: "#F8F9FB", color: "#2F3567", borderRadius: 12, width: "100%", padding: "14px 48px 14px 16px", fontSize: 15, transition: "border-color 0.15s, background-color 0.15s" }}
                  onFocus={e => { e.target.style.borderColor = "#2F3567"; e.target.style.backgroundColor = "#fff"; }}
                  onBlur={e => { e.target.style.borderColor = "#E6E6E6"; e.target.style.backgroundColor = "#F8F9FB"; }} />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9B9B9B", display: "flex", alignItems: "center" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", borderRadius: 12, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 6px 20px rgba(255,111,63,0.28)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none", marginTop: 4 }}>
              {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Signing in…</>) : (<>Sign In <ArrowRight size={16} strokeWidth={2.5} /></>)}
            </motion.button>

            <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#9B9B9B", marginTop: 8 }}>
              New seller?{" "}
              <Link href="/signup" style={{ color: "#FF6F3F", fontWeight: 600 }}>Create an account</Link>
            </p>
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
   ROOT
═══════════════════════════════════════════════ */
function LoginInner() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const registered  = params.get("registered") === "1";

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registered) toast.success("Account created — please sign in.");
  }, [registered]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form     = e.currentTarget;
    const email    = (form.elements.namedItem("email")    as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password.");
      return;
    }

    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh();
  }

  const props = { onSubmit: handleSubmit, loading };

  return (
    <>
      <div className={s.mobileOnly}>
        <MobileLogin {...props} />
      </div>
      <div className={s.desktopOnly}>
        <DesktopLogin {...props} />
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
