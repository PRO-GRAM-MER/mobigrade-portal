"use client"

import { useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Clock, ImagePlus, Lock, Loader2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KYCConfirmDialog } from "./KYCConfirmDialog"
import { kycSchema, type KYCInput } from "../schemas"
import { submitKYCAction, requestKYCChangeAction } from "../actions"
import type { VerificationStatus, KYCChangeRequestStatus } from "@/types"

interface BusinessDetailsFormProps {
  profile: {
    verificationStatus: VerificationStatus
    businessName?: string | null
    gstNumber?: string | null
    aadhaarNumber?: string | null
    aadhaarImageUrl?: string | null
    panNumber?: string | null
    panImageUrl?: string | null
    kycRejectionReason?: string | null
    kycChangeRequestStatus?: KYCChangeRequestStatus | string | null
    kycChangeRequestedAt?: Date | null
  } | null
}

function StatusBanner({
  status,
  reason,
  changeRequestStatus,
}: {
  status: VerificationStatus
  reason?: string | null
  changeRequestStatus?: KYCChangeRequestStatus
}) {
  if (status === "UNDER_REVIEW") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">Under Review</p>
          <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">
            Your KYC has been submitted and is being reviewed. You cannot make changes during this time.
          </p>
        </div>
      </div>
    )
  }
  if (status === "APPROVED") {
    if (changeRequestStatus === "REQUESTED") {
      return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-5">
          <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">Change Request Pending</p>
            <p className="text-[12px] text-blue-700 dark:text-blue-400 mt-0.5">
              Your request to update KYC is awaiting admin approval.
            </p>
          </div>
        </div>
      )
    }
    if (changeRequestStatus === "ACCEPTED") {
      return (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-5">
          <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">Change Request Accepted</p>
            <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">
              Admin approved your request. Update your KYC details below and resubmit.
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">KYC Approved</p>
          <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Your business has been verified. You can now access all seller features.
          </p>
        </div>
      </div>
    )
  }
  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-5">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-red-800 dark:text-red-300">KYC Rejected</p>
          {reason && (
            <p className="text-[12px] text-red-700 dark:text-red-400 mt-0.5">
              Reason: {reason}
            </p>
          )}
          <p className="text-[12px] text-red-700 dark:text-red-400 mt-1">
            Please correct the details below and resubmit.
          </p>
        </div>
      </div>
    )
  }
  return null
}

function ImageUploadField({
  label,
  name,
  existingUrl,
  locked,
  onFileChange,
  preview,
}: {
  label: string
  name: string
  existingUrl?: string | null
  locked: boolean
  onFileChange: (file: File | null) => void
  preview: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const display = preview ?? existingUrl

  return (
    <div>
      <p className="text-[13px] font-medium text-foreground/80 tracking-wide mb-1.5">{label}</p>
      <div
        className={`relative h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors
          ${locked
            ? "border-border bg-muted/30 cursor-not-allowed"
            : "border-border hover:border-primary/40 bg-muted/20 cursor-pointer hover:bg-muted/40"
          }`}
        onClick={() => !locked && inputRef.current?.click()}
      >
        {display ? (
          <>
            <img src={display} alt={label} className="w-full h-full object-cover" />
            {locked && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Lock className="h-5 w-5 text-white" />
              </div>
            )}
            {!locked && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-colors group">
                <ImagePlus className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </>
        ) : (
          <>
            <ImagePlus className="h-6 w-6 text-muted-foreground mb-1.5" />
            <p className="text-[12px] text-muted-foreground">Click to upload</p>
            <p className="text-[11px] text-muted-foreground/60">JPG, PNG up to 5MB</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        disabled={locked}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}

export function BusinessDetailsForm({ profile }: BusinessDetailsFormProps) {
  const status = profile?.verificationStatus ?? "PENDING"
  const changeRequestStatus = (profile?.kycChangeRequestStatus ?? "NONE") as KYCChangeRequestStatus
  const locked =
    status === "UNDER_REVIEW" ||
    (status === "APPROVED" && changeRequestStatus !== "ACCEPTED")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isRequestPending, startRequestTransition] = useTransition()
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null)
  const [panPreview, setPanPreview] = useState<string | null>(null)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [aadhaarSizeError, setAadhaarSizeError] = useState<string | null>(null)
  const [panSizeError, setPanSizeError] = useState<string | null>(null)

  const aadhaarFileRef = useRef<File | null>(null)
  const panFileRef = useRef<File | null>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024

  const form = useForm<KYCInput>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      businessName: profile?.businessName ?? "",
      gstNumber: profile?.gstNumber ?? "",
      aadhaarNumber: profile?.aadhaarNumber ?? "",
      panNumber: profile?.panNumber ?? "",
    },
  })

  function handleAadhaarFile(file: File | null) {
    if (file && file.size > MAX_FILE_SIZE) {
      setAadhaarSizeError("File too large (max 5MB)")
      return
    }
    setAadhaarSizeError(null)
    aadhaarFileRef.current = file
    if (file) setAadhaarPreview(URL.createObjectURL(file))
  }

  function handlePanFile(file: File | null) {
    if (file && file.size > MAX_FILE_SIZE) {
      setPanSizeError("File too large (max 5MB)")
      return
    }
    setPanSizeError(null)
    panFileRef.current = file
    if (file) setPanPreview(URL.createObjectURL(file))
  }

  function onSubmitClick(data: KYCInput) {
    if (aadhaarSizeError || panSizeError) return

    if (!aadhaarFileRef.current && !profile?.aadhaarImageUrl) {
      form.setError("aadhaarNumber", { message: "Aadhaar image is required" })
      return
    }
    if (!panFileRef.current && !profile?.panImageUrl) {
      form.setError("panNumber", { message: "PAN image is required" })
      return
    }

    const fd = new FormData()
    if (data.businessName) fd.append("businessName", data.businessName)
    fd.append("gstNumber", data.gstNumber)
    fd.append("aadhaarNumber", data.aadhaarNumber)
    fd.append("panNumber", data.panNumber)
    if (aadhaarFileRef.current) fd.append("aadhaarImage", aadhaarFileRef.current)
    if (panFileRef.current) fd.append("panImage", panFileRef.current)

    setPendingFormData(fd)
    setConfirmOpen(true)
  }

  function handleRequestChange() {
    startRequestTransition(async () => {
      const result = await requestKYCChangeAction()
      if (result.success) {
        toast.success(result.message ?? "Change request submitted")
      } else {
        toast.error(result.error ?? "Request failed")
      }
    })
  }

  function handleConfirm() {
    if (!pendingFormData) return
    startTransition(async () => {
      try {
        const result = await submitKYCAction({ success: false, error: "" }, pendingFormData)
        setConfirmOpen(false)
        if (result.success) {
          toast.success("KYC submitted successfully!")
        } else {
          toast.error(result.error ?? "Submission failed")
        }
      } catch {
        setConfirmOpen(false)
        toast.error("Submission failed. Please try again.")
      }
    })
  }

  return (
    <>
      <StatusBanner
        status={status}
        reason={profile?.kycRejectionReason}
        changeRequestStatus={changeRequestStatus}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitClick)} className="space-y-5">

          {/* Row 1: Business Name + GST — side by side on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
                    Business Name <span className="text-muted-foreground font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sharma Mobile Traders"
                      disabled={locked}
                      {...field}
                      className={locked ? "opacity-60 cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
                    GST Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="22ABCDE1234F1Z5"
                      disabled={locked}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className={locked ? "opacity-60 cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormMessage className="text-[12px]" />
                </FormItem>
              )}
            />
          </div>

          {/* Row 2: Aadhaar column | PAN column — each has number + image stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Aadhaar */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="aadhaarNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
                      Aadhaar Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12-digit number"
                        maxLength={12}
                        disabled={locked}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                        className={locked ? "opacity-60 cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
              <ImageUploadField
                label="Aadhaar Card Image"
                name="aadhaarImage"
                existingUrl={profile?.aadhaarImageUrl}
                locked={locked}
                onFileChange={handleAadhaarFile}
                preview={aadhaarPreview}
              />
              {aadhaarSizeError && (
                <p className="flex items-center gap-1 text-[12px] text-destructive mt-1">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />{aadhaarSizeError}
                </p>
              )}
            </div>

            {/* PAN */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[13px] font-medium text-foreground/80 tracking-wide">
                      PAN Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        disabled={locked}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className={locked ? "opacity-60 cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    <FormMessage className="text-[12px]" />
                  </FormItem>
                )}
              />
              <ImageUploadField
                label="PAN Card Image"
                name="panImage"
                existingUrl={profile?.panImageUrl}
                locked={locked}
                onFileChange={handlePanFile}
                preview={panPreview}
              />
              {panSizeError && (
                <p className="flex items-center gap-1 text-[12px] text-destructive mt-1">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />{panSizeError}
                </p>
              )}
            </div>
          </div>

          {!locked && (
            <Button type="submit" size="xl" className="w-full mt-2" disabled={isPending}>
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                : status === "APPROVED" && changeRequestStatus === "ACCEPTED"
                  ? "Resubmit KYC"
                  : "Submit KYC"
              }
            </Button>
          )}

          {status === "APPROVED" && changeRequestStatus === "NONE" && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="default"
                className="w-full"
                onClick={handleRequestChange}
                disabled={isRequestPending}
              >
                {isRequestPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending Request…</>
                  : <><RefreshCw className="h-4 w-4" /> Request KYC Change</>
                }
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Admin approval required before you can update KYC details
              </p>
            </div>
          )}
        </form>
      </Form>

      <KYCConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        isSubmitting={isPending}
      />
    </>
  )
}
