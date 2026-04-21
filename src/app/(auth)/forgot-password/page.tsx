import type { Metadata } from "next"
import Link from "next/link"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

export const metadata: Metadata = { title: "Forgot Password" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
          ← Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
