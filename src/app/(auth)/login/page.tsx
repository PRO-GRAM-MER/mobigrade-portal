import type { Metadata } from "next"
import Link from "next/link"
import { AuthCard } from "@/features/auth/components/AuthCard"
import { LoginForm } from "@/features/auth/components/LoginForm"

export const metadata: Metadata = { title: "Sign In" }

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your seller account"
      footer={
        <>
          New seller?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Seller Signup
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  )
}
