<<<<<<< HEAD
import type { Metadata } from "next"
import Link from "next/link"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { SignupForm } from "@/features/auth/components/SignupForm"

export const metadata: Metadata = { title: "Create Account" }

export default function SignupPage() {
  return (
    <AuthCard
      title="Create seller account"
      subtitle="Join thousands of sellers on MobiGrade"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  )
=======
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, Leaf, Recycle, User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { signupAction } from "@/actions/auth-actions";
import type { SignupInput } from "@/lib/validations/auth";
import s from "./signup.module.css";

type FieldErrors = Partial<Record<keyof SignupInput, string[]>>;

const INITIAL: SignupInput = {
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

type FormProps = {
  form: SignupInput;
  errors: FieldErrors;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

/* ═══════════════════════════════════════════════
   MOBILE  ·  full-screen dark experience
═══════════════════════════════════════════════ */
function MobileSignup({ form, errors, loading, onChange, onSubmit }: FormProps) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "24rem", paddingTop: 48, paddingBottom: 28 }}
      >
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 160 }}
          style={{ position: "relative", marginBottom: 16 }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: 9999, filter: "blur(24px)", backgroundColor: "rgba(255,111,63,0.25)", transform: "scale(1.7)" }} />
          <Image src="/logo.svg" alt="MobiGrade" width={52} height={52} loading="eager" style={{ position: "relative", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff" }}>
          MobiGrade
        </motion.p>
      </motion.div>

      {/* form */}
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, width: "100%", maxWidth: "24rem", paddingBottom: 24 }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fff", marginBottom: 24 }}>Create seller account</h2>

        <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Full Name */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-fullName" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 7, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Full Name
            </label>
            <input id="mob-fullName" name="fullName" type="text" autoComplete="name" required placeholder="Jane Doe"
              value={form.fullName} onChange={onChange}
              className="glass-input"
              style={{ backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${errors.fullName ? "#f87171" : "rgba(255,255,255,0.14)"}`, color: "#fff", borderRadius: 14, width: "100%", padding: "14px 16px", fontSize: 15 }} />
            {errors.fullName?.[0] && <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 5 }}>{errors.fullName[0]}</p>}
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-email" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 7, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Email Address
            </label>
            <input id="mob-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"
              value={form.email} onChange={onChange}
              className="glass-input"
              style={{ backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${errors.email ? "#f87171" : "rgba(255,255,255,0.14)"}`, color: "#fff", borderRadius: 14, width: "100%", padding: "14px 16px", fontSize: 15 }} />
            {errors.email?.[0] && <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 5 }}>{errors.email[0]}</p>}
          </div>

          {/* Mobile */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-mobile" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 7, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Mobile Number
            </label>
            <input id="mob-mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="9876543210"
              value={form.mobile} onChange={onChange}
              className="glass-input"
              style={{ backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${errors.mobile ? "#f87171" : "rgba(255,255,255,0.14)"}`, color: "#fff", borderRadius: 14, width: "100%", padding: "14px 16px", fontSize: 15 }} />
            {errors.mobile?.[0] && <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 5 }}>{errors.mobile[0]}</p>}
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-password" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 7, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input id="mob-password" name="password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                value={form.password} onChange={onChange}
                className="glass-input"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${errors.password ? "#f87171" : "rgba(255,255,255,0.14)"}`, color: "#fff", borderRadius: 14, width: "100%", padding: "14px 48px 14px 16px", fontSize: 15 }} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex", alignItems: "center" }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password?.[0] && <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 5 }}>{errors.password[0]}</p>}
          </div>

          {/* Confirm Password */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="mob-confirmPassword" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 7, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <input id="mob-confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                value={form.confirmPassword} onChange={onChange}
                className="glass-input"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: `1.5px solid ${errors.confirmPassword ? "#f87171" : "rgba(255,255,255,0.14)"}`, color: "#fff", borderRadius: 14, width: "100%", padding: "14px 48px 14px 16px", fontSize: 15 }} />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex", alignItems: "center" }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword?.[0] && <p style={{ fontSize: "0.75rem", color: "#f87171", marginTop: 5 }}>{errors.confirmPassword[0]}</p>}
          </div>

          <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", borderRadius: 14, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "15px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 8px 24px rgba(255,111,63,0.32)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none", marginTop: 4 }}>
            {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Creating account…</>) : (<>Create Account <ArrowRight size={17} strokeWidth={2.5} /></>)}
          </motion.button>

          <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "rgba(255,255,255,0.40)", marginTop: 4 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#FF6F3F", fontWeight: 600 }}>Sign in</Link>
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
function DesktopSignup({ form, errors, loading, onChange, onSubmit }: FormProps) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const inputStyle = (hasError: boolean) => ({
    border: `1.5px solid ${hasError ? "#dc2626" : "#E6E6E6"}`,
    backgroundColor: "#F8F9FB",
    color: "#2F3567",
    borderRadius: 12,
    width: "100%",
    padding: "13px 16px",
    fontSize: 15,
    transition: "border-color 0.15s, background-color 0.15s",
  });

  function focusStyle(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
    e.target.style.borderColor = hasError ? "#dc2626" : "#2F3567";
    e.target.style.backgroundColor = "#fff";
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement>, hasError: boolean) {
    e.target.style.borderColor = hasError ? "#dc2626" : "#E6E6E6";
    e.target.style.backgroundColor = "#F8F9FB";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F5F6FA" }}>

      {/* left: dark brand panel */}
      <motion.div
        initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", width: "45%", padding: 56, backgroundColor: "#2F3567" }}
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
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4ade80" }}>Seller Network</span>
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
              Join 10,000+<br /><span style={{ color: "#FF6F3F" }}>active sellers.</span>
            </h1>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.7, maxWidth: 280, color: "rgba(255,255,255,0.50)" }}>
              List spare parts, refurbished phones, and bulk deals. Reach thousands of repair shops and retailers across India.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.45 }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              [User, "Create your seller account"],
              [Mail, "Complete KYC verification"],
              [Phone, "Start listing products"],
            ] as [React.ElementType, string][]).map(([Icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color="rgba(255,255,255,0.55)" />
                </div>
                <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.55)" }}>{text}</span>
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
        style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 40px", backgroundColor: "#ffffff", overflowY: "auto" }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* brand */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <Image src="/logo.svg" alt="MobiGrade" width={40} height={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#2F3567", lineHeight: 1 }}>MobiGrade Portal</p>
          </motion.div>

          {/* heading */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
            style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2F3567" }}>Create seller account</h2>
            <p style={{ fontSize: "0.8125rem", color: "#9B9B9B", marginTop: 4 }}>Fill in your details to get started</p>
          </motion.div>

          {/* form */}
          <motion.form
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.4 }}
            onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Full Name */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-fullName" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 7, color: "#2F3567" }}>Full Name</label>
              <input id="desk-fullName" name="fullName" type="text" autoComplete="name" required placeholder="Jane Doe"
                value={form.fullName} onChange={onChange}
                style={inputStyle(!!errors.fullName)}
                onFocus={e => focusStyle(e, !!errors.fullName)}
                onBlur={e => blurStyle(e, !!errors.fullName)} />
              {errors.fullName?.[0] && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.fullName[0]}</p>}
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-email" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 7, color: "#2F3567" }}>Email Address</label>
              <input id="desk-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"
                value={form.email} onChange={onChange}
                style={inputStyle(!!errors.email)}
                onFocus={e => focusStyle(e, !!errors.email)}
                onBlur={e => blurStyle(e, !!errors.email)} />
              {errors.email?.[0] && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.email[0]}</p>}
            </div>

            {/* Mobile */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-mobile" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 7, color: "#2F3567" }}>Mobile Number</label>
              <input id="desk-mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="9876543210"
                value={form.mobile} onChange={onChange}
                style={inputStyle(!!errors.mobile)}
                onFocus={e => focusStyle(e, !!errors.mobile)}
                onBlur={e => blurStyle(e, !!errors.mobile)} />
              {errors.mobile?.[0] && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.mobile[0]}</p>}
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-password" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 7, color: "#2F3567" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input id="desk-password" name="password" type={showPw ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                  value={form.password} onChange={onChange}
                  style={{ ...inputStyle(!!errors.password), paddingRight: 48 }}
                  onFocus={e => focusStyle(e, !!errors.password)}
                  onBlur={e => blurStyle(e, !!errors.password)} />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9B9B9B", display: "flex", alignItems: "center" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password?.[0] && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.password[0]}</p>}
            </div>

            {/* Confirm Password */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="desk-confirmPassword" style={{ fontSize: "0.8125rem", fontWeight: 500, marginBottom: 7, color: "#2F3567" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input id="desk-confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} autoComplete="new-password" required placeholder="••••••••"
                  value={form.confirmPassword} onChange={onChange}
                  style={{ ...inputStyle(!!errors.confirmPassword), paddingRight: 48 }}
                  onFocus={e => focusStyle(e, !!errors.confirmPassword)}
                  onBlur={e => blurStyle(e, !!errors.confirmPassword)} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9B9B9B", display: "flex", alignItems: "center" }}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword?.[0] && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.confirmPassword[0]}</p>}
            </div>

            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", borderRadius: 12, fontSize: "0.9375rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", backgroundColor: "#FF6F3F", boxShadow: "0 6px 20px rgba(255,111,63,0.28)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: "none", marginTop: 4 }}>
              {loading ? (<><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "transparent" }} />Creating account…</>) : (<>Create Account <ArrowRight size={16} strokeWidth={2.5} /></>)}
            </motion.button>

            <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "#9B9B9B", marginTop: 4 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#FF6F3F", fontWeight: 600 }}>Sign in</Link>
            </p>
          </motion.form>

          <p style={{ textAlign: "center", fontSize: "0.72rem", marginTop: 36, color: "#C5C5C5" }}>
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
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupInput>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const result = await signupAction(form);

    if (!result.success) {
      setErrors(result.fieldErrors ?? {});
      if (result.error) toast.error(result.error);
      else toast.error("Please fix the errors below.");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  }

  const props = { form, errors, loading, onChange: handleChange, onSubmit: handleSubmit };

  return (
    <>
      <div className={s.mobileOnly}>
        <MobileSignup {...props} />
      </div>
      <div className={s.desktopOnly}>
        <DesktopSignup {...props} />
      </div>
    </>
  );
>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
}
