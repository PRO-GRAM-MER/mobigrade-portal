import { z } from "zod"

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Need one uppercase letter")
      .regex(/[0-9]/, "Need one number")
      .regex(/[^A-Za-z0-9]/, "Need one special character"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const kycSchema = z.object({
  businessName: z.string().optional(),
  gstNumber: z
    .string()
    .min(1, "GST number is required")
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST number format"
    ),
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar number is required")
    .regex(/^\d{12}$/, "Must be 12 digits"),
  panNumber: z
    .string()
    .min(1, "PAN number is required")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. ABCDE1234F)"),
})

export type KYCInput = z.infer<typeof kycSchema>
