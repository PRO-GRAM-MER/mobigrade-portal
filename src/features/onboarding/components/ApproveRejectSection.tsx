"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  approveKYCAction,
  rejectKYCAction,
  acceptKYCChangeRequestAction,
  denyKYCChangeRequestAction,
} from "../actions"
import type { VerificationStatus, KYCChangeRequestStatus } from "@/types"

interface ApproveRejectSectionProps {
  sellerId: string
  verificationStatus: VerificationStatus
  kycChangeRequestStatus: KYCChangeRequestStatus
  kycRejectionReason?: string | null
  kycChangeRequestedAt?: Date | null
}

export function ApproveRejectSection({
  sellerId,
  verificationStatus,
  kycChangeRequestStatus,
  kycRejectionReason,
  kycChangeRequestedAt,
}: ApproveRejectSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")

  function handleApprove() {
    startTransition(async () => {
      const result = await approveKYCAction(sellerId)
      if (result.success) {
        toast.success(result.message ?? "KYC approved")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleRejectSubmit() {
    if (reason.trim().length < 10) {
      setReasonError("Reason must be at least 10 characters")
      return
    }
    setReasonError("")
    startTransition(async () => {
      const result = await rejectKYCAction(sellerId, reason)
      if (result.success) {
        toast.success(result.message ?? "KYC rejected")
        setShowRejectForm(false)
        setReason("")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleAcceptChangeRequest() {
    startTransition(async () => {
      const result = await acceptKYCChangeRequestAction(sellerId)
      if (result.success) {
        toast.success(result.message ?? "Change request accepted")
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDenyChangeRequest() {
    startTransition(async () => {
      const result = await denyKYCChangeRequestAction(sellerId)
      if (result.success) {
        toast.success(result.message ?? "Change request denied")
      } else {
        toast.error(result.error)
      }
    })
  }

  /* ── Approved: show KYC change request management ── */
  if (verificationStatus === "APPROVED") {
    if (kycChangeRequestStatus === "REQUESTED") {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                KYC Change Request Pending
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-400 mt-0.5">
                Seller requested to update their KYC information.
                {kycChangeRequestedAt && (
                  <span className="ml-1">
                    Requested on{" "}
                    {new Date(kycChangeRequestedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    .
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              onClick={handleAcceptChangeRequest}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Accept Request
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleDenyChangeRequest}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Deny Request
            </Button>
          </div>
        </div>
      )
    }

    if (kycChangeRequestStatus === "ACCEPTED") {
      return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
              Awaiting Seller Resubmission
            </p>
            <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">
              Change request accepted. Seller can now update and resubmit their KYC.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
            KYC Approved
          </p>
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            This seller is verified and can access all marketplace features.
          </p>
        </div>
      </div>
    )
  }

  /* ── Not submitted yet ── */
  if (verificationStatus === "PENDING") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-muted border border-border">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-foreground">KYC Not Submitted</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Seller has not submitted KYC documents yet. No action required.
          </p>
        </div>
      </div>
    )
  }

  /* ── Under Review or Rejected: show Approve + Reject ── */
  return (
    <div className="space-y-4">
      {verificationStatus === "REJECTED" && kycRejectionReason && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-800 dark:text-red-300">
              Previously Rejected
            </p>
            <p className="text-[12px] text-red-700 dark:text-red-400 mt-0.5">
              Reason: {kycRejectionReason}
            </p>
          </div>
        </div>
      )}

      {!showRejectForm ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="default"
            size="lg"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApprove}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve KYC
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1"
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
          >
            <XCircle className="h-4 w-4" />
            Reject KYC
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[13px] font-medium text-foreground/80 tracking-wide block mb-1.5">
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (reasonError) setReasonError("")
              }}
              placeholder="Explain why the KYC is being rejected so the seller can fix it…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors resize-none"
            />
            {reasonError && (
              <p className="flex items-center gap-1 text-[12px] text-destructive mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {reasonError}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1"
              onClick={handleRejectSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Confirm Rejection
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                setShowRejectForm(false)
                setReason("")
                setReasonError("")
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
