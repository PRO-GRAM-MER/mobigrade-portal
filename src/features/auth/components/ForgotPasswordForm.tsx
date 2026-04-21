"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/features/auth/components/FormField"
import { forgotPasswordAction } from "@/features/auth/actions"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas"

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState("")

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: ForgotPasswordInput) {
    await forgotPasswordAction(data)
    setSentTo(data.email)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-2 space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="font-semibold text-[16px] text-foreground">Check your inbox</h3>
          <p className="text-[13px] text-muted-foreground leading-[1.6]">
            We sent a reset link to{" "}
            <span className="font-medium text-foreground">{sentTo}</span>.
            {" "}It expires in 1 hour.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-muted rounded-xl px-4 py-3">
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Can't find it? Check your spam folder.</span>
        </div>
        <Button variant="outline" size="xl" className="w-full" onClick={() => { setSent(false); setSentTo("") }}>
          Try a different email
        </Button>
      </div>
    )
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

        <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
            : "Send Reset Link"
          }
        </Button>
      </form>
    </Form>
  )
}
