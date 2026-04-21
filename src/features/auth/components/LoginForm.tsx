"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/features/auth/components/FormField"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { loginSchema, type LoginInput } from "@/features/auth/schemas"

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  AccountSuspended: "Your account has been suspended. Contact support.",
}

export function LoginForm() {
  const router = useRouter()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: LoginInput) {
    const result = await signIn("credentials", { ...data, redirect: false })

    if (result?.error) {
      toast.error(AUTH_ERRORS[result.error] ?? "Something went wrong. Try again.")
      return
    }

    toast.success("Welcome back!")
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          disabled={isSubmitting}
        />

        <div className="space-y-2">
          <PasswordInput
            control={form.control}
            name="password"
            placeholder="Enter your password"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[13px] text-primary/80 hover:text-primary font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="xl" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
            : "Sign In"
          }
        </Button>
      </form>
    </Form>
  )
}
