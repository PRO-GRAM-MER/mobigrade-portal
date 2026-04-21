import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"

export const metadata: Metadata = { title: "Reset Password" }

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams

  if (!token) redirect("/forgot-password")

  return (
    <AuthCard
      title="Set new password"
      subtitle="Choose a strong password for your account"
      footer={
        <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
          ← Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  )
}
