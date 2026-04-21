"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { PasswordStrength } from "@/features/auth/components/PasswordStrength"
import { resetPasswordAction } from "@/features/auth/actions"
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas"

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  })

  const { isSubmitting } = form.formState
  const password = useWatch({ control: form.control, name: "password" })

  async function onSubmit(data: ResetPasswordInput) {
    const result = await resetPasswordAction(data)

    if ("error" in result) {
      toast.error(result.error)
      return
    }

    toast.success("Password updated! Please sign in.")
    router.push("/login")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...form.register("token")} />

        <div>
          <PasswordInput
            control={form.control}
            name="password"
            label="New password"
            placeholder="Min. 8 characters"
            disabled={isSubmitting}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Repeat password"
          disabled={isSubmitting}
        />

        <Button type="submit" size="xl" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
            : "Set New Password"
          }
        </Button>
      </form>
    </Form>
  )
}
