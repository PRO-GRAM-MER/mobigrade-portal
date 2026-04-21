"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/features/auth/components/FormField"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { loginSchema, type LoginInput } from "@/features/auth/schemas"

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Invalid credentials.",
  AccountSuspended: "Account suspended. Contact support.",
}

export function AdminLoginForm() {
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

    toast.success("Admin access granted.")
    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          label="Admin email"
          type="email"
          placeholder="admin@mobigrade.in"
          disabled={isSubmitting}
        />

        <PasswordInput
          control={form.control}
          name="password"
          placeholder="Enter admin password"
          disabled={isSubmitting}
        />

        <Button type="submit" size="xl" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
            : "Sign In to Admin"
          }
        </Button>
      </form>
    </Form>
  )
}
