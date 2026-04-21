import { z } from "zod"

export const rejectSchema = z.object({
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason too long (max 500 characters)"),
})

export type RejectInput = z.infer<typeof rejectSchema>
