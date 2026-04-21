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
}
