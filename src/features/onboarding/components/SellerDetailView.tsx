import { ExternalLink } from "lucide-react"
import { ApproveRejectSection } from "./ApproveRejectSection"
import type { VerificationStatus, KYCChangeRequestStatus } from "@/types"

type SellerForAdmin = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  createdAt: Date
  sellerProfile: {
    id: string
    verificationStatus: VerificationStatus
    businessName: string | null
    gstNumber: string | null
    aadhaarNumber: string | null
    aadhaarImageUrl: string | null
    panNumber: string | null
    panImageUrl: string | null
    address: string | null
    city: string | null
    state: string | null
    pincode: string | null
    kycSubmittedAt: Date | null
    kycRejectionReason: string | null
    kycChangeRequestStatus: string
    kycChangeRequestedAt: Date | null
  } | null
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[13px] text-foreground">
        {value ?? <span className="text-muted-foreground/60 italic">—</span>}
      </p>
    </div>
  )
}

function DocImage({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          {label}
        </p>
        <div className="h-28 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
          <p className="text-[12px] text-muted-foreground/60 italic">Not uploaded</p>
        </div>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block h-28 rounded-xl border border-border overflow-hidden"
      >
        <img src={url} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
          <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    </div>
  )
}

function verificationLabel(status: VerificationStatus) {
  if (status === "PENDING") return { label: "Incomplete", cls: "bg-muted text-muted-foreground border-border" }
  if (status === "UNDER_REVIEW") return { label: "Under Review", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" }
  if (status === "APPROVED") return { label: "Approved", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" }
  if (status === "REJECTED") return { label: "Rejected", cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" }
  return { label: status, cls: "bg-muted text-muted-foreground border-border" }
}

export function SellerDetailView({ seller }: { seller: SellerForAdmin }) {
  const profile = seller.sellerProfile
  const status: VerificationStatus = profile?.verificationStatus ?? "PENDING"
  const changeRequestStatus: KYCChangeRequestStatus =
    (profile?.kycChangeRequestStatus as KYCChangeRequestStatus) ?? "NONE"
  const { label, cls } = verificationLabel(status)

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {seller.avatarUrl ? (
              <img
                src={seller.avatarUrl}
                alt={`${seller.firstName} ${seller.lastName}`}
                className="h-14 w-14 rounded-full object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-[18px] font-semibold text-muted-foreground">
                  {seller.firstName[0]}{seller.lastName[0]}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-[18px] font-bold text-foreground">
                {seller.firstName} {seller.lastName}
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">{seller.email}</p>
            </div>
          </div>
          <span
            className={`self-start sm:self-auto inline-flex items-center px-3 py-1 rounded-full text-[12px] font-medium border ${cls}`}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <h3 className="text-[15px] font-semibold text-foreground mb-5">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="First Name" value={seller.firstName} />
          <Field label="Last Name" value={seller.lastName} />
          <Field label="Email Address" value={seller.email} />
          <Field label="Phone Number" value={seller.phone} />
          <Field
            label="Joined On"
            value={new Date(seller.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </div>
      </div>

      {/* Business & KYC info */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-semibold text-foreground">Business & KYC Details</h3>
          {profile?.kycSubmittedAt && (
            <p className="text-[11px] text-muted-foreground">
              Submitted{" "}
              {new Date(profile.kycSubmittedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {!profile?.businessName && !profile?.gstNumber ? (
          <p className="text-[13px] text-muted-foreground italic">
            Seller has not submitted KYC documents yet.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Business Name" value={profile.businessName} />
              <Field label="GST Number" value={profile.gstNumber} />
              <Field label="Aadhaar Number" value={profile.aadhaarNumber} />
              <Field label="PAN Number" value={profile.panNumber} />
              {profile.address && <Field label="Address" value={profile.address} />}
              {profile.city && <Field label="City" value={profile.city} />}
              {profile.state && <Field label="State" value={profile.state} />}
              {profile.pincode && <Field label="Pincode" value={profile.pincode} />}
            </div>

            <div>
              <p className="text-[13px] font-semibold text-foreground mb-3">KYC Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DocImage label="Aadhaar Card" url={profile.aadhaarImageUrl} />
                <DocImage label="PAN Card" url={profile.panImageUrl} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve / Reject section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        <h3 className="text-[15px] font-semibold text-foreground mb-5">KYC Decision</h3>
        <ApproveRejectSection
          sellerId={seller.id}
          verificationStatus={status}
          kycChangeRequestStatus={changeRequestStatus}
          kycRejectionReason={profile?.kycRejectionReason}
          kycChangeRequestedAt={profile?.kycChangeRequestedAt}
        />
      </div>
    </div>
  )
}
