import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import {
  FileText, Package, IndianRupee,
  Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle, ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { getImageUrl } from "@/lib/image";
import classes from "./sellerDetail.module.css";

/* ── Status configs ──────────────────────────────────────────────────────── */
type VerificationStatus =
  | "KYC_PENDING" | "KYC_SUBMITTED" | "KYC_UNDER_REVIEW"
  | "KYC_APPROVED" | "KYC_REJECTED" | "SUSPENDED";

const VSTATUS_CFG: Record<VerificationStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  KYC_PENDING:      { label: "Pending",      bg: "#FFF4E5", color: "#FF9500", Icon: Clock        },
  KYC_SUBMITTED:    { label: "Submitted",    bg: "#E6F0FF", color: "#1E56D9", Icon: RefreshCw    },
  KYC_UNDER_REVIEW: { label: "Under Review", bg: "#EEF2FF", color: "#6366F1", Icon: RefreshCw    },
  KYC_APPROVED:     { label: "Verified",     bg: "#E6F7EF", color: "#00A167", Icon: CheckCircle2 },
  KYC_REJECTED:     { label: "Rejected",     bg: "#FDECEA", color: "#D92D20", Icon: XCircle      },
  SUSPENDED:        { label: "Suspended",    bg: "#F5F5F5", color: "#888888", Icon: AlertCircle  },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={classes.detailRow}>
      <span className={classes.detailLabel}>{label}</span>
      <span className={classes.detailValue}>{value ?? "—"}</span>
    </div>
  );
}

function DocImageCard({ title, imageUrl: rawUrl }: { title: string; imageUrl: string | null | undefined }) {
  const imageUrl = rawUrl ? getImageUrl(rawUrl) : undefined;
  return (
    <div className={classes.docCard}>
      <div className={classes.docCardHead}>
        <span className={classes.docCardTitle}>{title}</span>
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className={classes.docViewLink}>
            View Full Size
          </a>
        )}
      </div>
      <div className={classes.docImageWrap}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className={classes.docImage} />
        ) : (
          <div className={classes.docPlaceholder}>
            <div className={classes.docPlaceholderIcon}><FileText size={22} /></div>
            No document uploaded
          </div>
        )}
      </div>
    </div>
  );
}

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/* ── Metadata ────────────────────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { fullName: true } });
  return { title: user ? `${user.fullName} — MobiGrade Portal` : "Seller Detail" };
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default async function SellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seller = await prisma.user.findFirst({
    where: { id, role: "SELLER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      verificationStatus: true,
      createdAt: true,
      sellerProfile: {
        select: {
          id: true,
          businessName: true,
          kycSubmission: {
            select: {
              gstNumber: true,
              aadhaarNumber: true,
              aadhaarImageUrl: true,
              panNumber: true,
              panImageUrl: true,
              status: true,
              rejectionReason: true,
              reviewedAt: true,
            },
          },
          _count: {
            select: {
              productDrafts: {
                where: { status: { in: ["APPROVED", "PENDING_REVIEW", "REJECTED"] } },
              },
              sellerProducts: true,
              orderItems: true,
            },
          },
        },
      },
    },
  });

  if (!seller) notFound();

  const kyc       = seller.sellerProfile?.kycSubmission;
  const profile   = seller.sellerProfile;
  const statusCfg = VSTATUS_CFG[seller.verificationStatus as VerificationStatus];
  const isActive  = seller.verificationStatus === "KYC_APPROVED";

  // Fetch earnings summary + recent order items in parallel (only for active sellers)
  const [earningsSummary, recentOrderItems] = await Promise.all([
    isActive && profile
      ? prisma.sellerEarning.aggregate({
          where: { sellerProfileId: profile.id },
          _sum: { netAmount: true, grossAmount: true },
        })
      : null,
    isActive && profile
      ? prisma.orderItem.findMany({
          where: { sellerProfileId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            productTitle: true,
            brand: true,
            condition: true,
            quantity: true,
            totalPrice: true,
            createdAt: true,
            order: { select: { orderNumber: true, id: true, status: true } },
          },
        })
      : null,
  ]);

  const netEarned   = Number(earningsSummary?._sum?.netAmount  ?? 0);
  const grossEarned = Number(earningsSummary?._sum?.grossAmount ?? 0);

  return (
    <div className={classes.page}>

      {/* ── Header ── */}
      <PageHeader
        backHref="/admin/sellers"
        title={seller.fullName}
        subtitle={seller.email}
        right={statusCfg && (
          <span className={classes.statusPill} style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            <statusCfg.Icon size={13} />{statusCfg.label}
          </span>
        )}
      />

      {/* ── Activity stats (KYC approved only) ── */}
      {isActive && (
        <div className={classes.statsRow}>
          <div className={classes.statCard}>
            <div className={classes.statIconWrap} style={{ background: "rgba(47,53,103,0.08)" }}>
              <Package size={18} style={{ color: "#2F3567" }} />
            </div>
            <div>
              <p className={classes.statLabel}>Active Listings</p>
              <p className={classes.statValue}>{profile?._count.sellerProducts ?? 0}</p>
            </div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statIconWrap} style={{ background: "rgba(0,162,103,0.08)" }}>
              <IndianRupee size={18} style={{ color: "#00A267" }} />
            </div>
            <div>
              <p className={classes.statLabel}>Net Earnings</p>
              <p className={classes.statValue}>{formatINR(netEarned)}</p>
              <p className={classes.statSub}>Gross: {formatINR(grossEarned)}</p>
            </div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statIconWrap} style={{ background: "rgba(255,111,63,0.08)" }}>
              <CheckCircle2 size={18} style={{ color: "#FF6F3F" }} />
            </div>
            <div>
              <p className={classes.statLabel}>Items Sold</p>
              <p className={classes.statValue}>{profile?._count.orderItems ?? 0}</p>
            </div>
          </div>
          <div className={classes.statCard}>
            <div className={classes.statIconWrap} style={{ background: "rgba(99,102,241,0.08)" }}>
              <FileText size={18} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <p className={classes.statLabel}>Products Submitted</p>
              <p className={classes.statValue}>{profile?._count.productDrafts ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Seller information ── */}
      <div className={classes.card}>
        <div className={classes.cardStripe} />
        <div className={classes.cardHead}><span className={classes.cardTitle}>Seller Information</span></div>
        <div className={classes.cardBody}>
          <div className={classes.detailGrid}>
            <DetailRow label="Full Name"     value={seller.fullName} />
            <DetailRow label="Email"         value={seller.email} />
            <DetailRow label="Phone"         value={seller.mobile} />
            <DetailRow label="Business Name" value={profile?.businessName} />
            <DetailRow label="KYC Status"    value={statusCfg?.label ?? seller.verificationStatus} />
            <DetailRow
              label="Joined"
              value={new Date(seller.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            />
          </div>
        </div>
      </div>

      {/* ── KYC Documents ── */}
      {kyc ? (
        <>
          <div className={classes.card}>
            <div className={classes.cardStripe} />
            <div className={classes.cardHead}><span className={classes.cardTitle}>KYC Documents</span></div>
            <div className={classes.cardBody}>
              <div className={classes.detailGrid}>
                <DetailRow label="GST Number"    value={kyc.gstNumber} />
                <DetailRow label="Aadhaar Number" value={kyc.aadhaarNumber} />
                <DetailRow label="PAN Number"    value={kyc.panNumber} />
                <DetailRow label="KYC Status"    value={kyc.status} />
                {kyc.rejectionReason && <DetailRow label="Rejection Reason" value={kyc.rejectionReason} />}
                {kyc.reviewedAt && (
                  <DetailRow
                    label="Reviewed On"
                    value={new Date(kyc.reviewedAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  />
                )}
              </div>
            </div>
          </div>

          <div className={classes.docsGrid}>
            <DocImageCard title="Aadhaar Card" imageUrl={kyc.aadhaarImageUrl} />
            <DocImageCard title="PAN Card"     imageUrl={kyc.panImageUrl} />
          </div>
        </>
      ) : (
        <div className={classes.card}>
          <div className={classes.cardStripe} />
          <div className={classes.cardHead}><span className={classes.cardTitle}>KYC Documents</span></div>
          <div className={classes.cardBody}>
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
              This seller has not submitted KYC documents yet.
            </p>
          </div>
        </div>
      )}

      {/* ── Recent sales (KYC approved only) ── */}
      {isActive && recentOrderItems && recentOrderItems.length > 0 && (
        <div className={classes.card}>
          <div className={classes.cardStripe} />
          <div className={classes.cardHead}>
            <span className={classes.cardTitle}>Recent Sales</span>
            <span className={classes.cardCount}>{profile?._count.orderItems ?? 0} total items sold</span>
          </div>
          <div className={classes.tableWrap}>
            <table className={classes.salesTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Condition</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Order #</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentOrderItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className={classes.tdName}>{item.productTitle}</p>
                      <p className={classes.tdSub}>{item.brand}</p>
                    </td>
                    <td style={{ fontSize: "0.775rem" }}>{item.condition}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                      ₹{Number(item.totalPrice).toLocaleString("en-IN")}
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--color-primary)", fontSize: "0.8rem" }}>
                      {item.order.orderNumber}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.775rem" }}>
                      {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td>
                      <Link href={`/admin/orders/${item.order.id}`} className={classes.viewOrderBtn}>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
