"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/features/auth/components/FormField"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { PasswordStrength } from "@/features/auth/components/PasswordStrength"
import { signupAction } from "@/features/auth/actions"
import { signupSchema, type SignupInput } from "@/features/auth/schemas"

export function SignupForm() {
  const router = useRouter()

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  })

  const { isSubmitting } = form.formState
  const password = useWatch({ control: form.control, name: "password" })

  async function onSubmit(data: SignupInput) {
    const result = await signupAction(data)

    if ("error" in result) {
      toast.error(result.error)
      return
    }

    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (signInResult?.error) {
      toast.success("Account created! Please sign in.")
      router.push("/login")
      return
    }

    toast.success("Welcome to MobiGrade!")
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            label="First name"
            placeholder="Ankit"
            disabled={isSubmitting}
          />
          <FormField
            control={form.control}
            name="lastName"
            label="Last name"
            placeholder="Baage"
            disabled={isSubmitting}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          label="Email address"
          type="email"
          placeholder="you@company.com"
          disabled={isSubmitting}
        />

        <FormField
          control={form.control}
          name="phone"
          label="Mobile number"
          type="tel"
          placeholder="9876543210"
          prefix="+91"
          disabled={isSubmitting}
        />

        <div className="space-y-0">
          <PasswordInput
            control={form.control}
            name="password"
            label="Password"
            placeholder="Min. 8 characters"
            disabled={isSubmitting}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordInput
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          placeholder="Repeat password"
          disabled={isSubmitting}
        />

        {/* Terms note */}
        <p className="text-[12px] text-muted-foreground leading-[1.6]">
          By creating an account, you agree to our{" "}
          <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span>
          {" "}and{" "}
          <span className="text-primary font-medium cursor-pointer hover:underline">Privacy Policy</span>.
        </p>

        <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
            : "Create Seller Account"
          }
        </Button>
      </form>
    </Form>
  )
}
