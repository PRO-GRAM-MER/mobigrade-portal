import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { AdminLoginForm } from "@/features/auth/components/AdminLoginForm"

export const metadata: Metadata = { title: "Admin Sign In" }

export default function AdminLoginPage() {
  return (
    <AuthCard
      title="Admin Portal"
      subtitle="Restricted access — authorised personnel only"
      footer={
        <Link href="/login" className="text-primary/80 hover:text-primary font-medium transition-colors">
          ← Back to seller login
        </Link>
      }
    >
      <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <p className="text-[13px] text-amber-800 leading-snug">
          Admin accounts are pre-created. No self-registration available.
        </p>
      </div>
      <AdminLoginForm />
    </AuthCard>
  )
}
