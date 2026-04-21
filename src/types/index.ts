// Shared DTOs — types that cross feature boundaries

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; message?: string }

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export type SessionUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: "ADMIN" | "SELLER"
  avatarUrl?: string
}

export type VerificationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED"
export type KYCChangeRequestStatus = "NONE" | "REQUESTED" | "ACCEPTED"
