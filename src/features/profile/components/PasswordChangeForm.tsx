"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { changePasswordSchema, type ChangePasswordInput } from "../schemas"
import { changePasswordAction } from "../actions"

export function PasswordChangeForm() {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  function onSubmit(data: ChangePasswordInput) {
    const fd = new FormData()
    fd.append("currentPassword", data.currentPassword)
    fd.append("newPassword", data.newPassword)
    fd.append("confirmPassword", data.confirmPassword)

    startTransition(async () => {
      const result = await changePasswordAction({ success: false, error: "" }, fd)
      if (result.success) {
        toast.success(result.message ?? "Password changed")
        form.reset()
      } else {
        toast.error(result.error ?? "Failed to change password")
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput
          control={form.control}
          name="currentPassword"
          label="Current Password"
          placeholder="Enter current password"
          disabled={isPending}
        />
        <PasswordInput
          control={form.control}
          name="newPassword"
          label="New Password"
          placeholder="Min 8 chars, uppercase, number, symbol"
          disabled={isPending}
        />
        <PasswordInput
          control={form.control}
          name="confirmPassword"
          label="Confirm New Password"
          placeholder="Repeat new password"
          disabled={isPending}
        />

        <Button type="submit" size="lg" className="w-full mt-1" disabled={isPending}>
          {isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
            : "Change Password"
          }
        </Button>
      </form>
    </Form>
  )
}
