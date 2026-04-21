import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import {
  MapPin, ShoppingBag,
  Clock, CheckCircle2, XCircle, AlertCircle, Star,
  Package, Truck, CircleCheck, Ban, RotateCcw, ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import classes from "./retailerDetail.module.css";

/* ── Verification status config ─────────────────────────────────────────── */
type VerificationStatus = "KYC_PENDING"|"KYC_SUBMITTED"|"KYC_UNDER_REVIEW"|"KYC_APPROVED"|"KYC_REJECTED"|"SUSPENDED";

const VSTATUS_CFG: Record<VerificationStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  KYC_PENDING:      { label: "Pending",      bg: "#FFF4E5", color: "#FF9500", Icon: Clock        },
  KYC_SUBMITTED:    { label: "Submitted",    bg: "#E6F0FF", color: "#1E56D9", Icon: Clock        },
  KYC_UNDER_REVIEW: { label: "Under Review", bg: "#EEF2FF", color: "#6366F1", Icon: Clock        },
  KYC_APPROVED:     { label: "Verified",     bg: "#E6F7EF", color: "#00A167", Icon: CheckCircle2 },
  KYC_REJECTED:     { label: "Rejected",     bg: "#FDECEA", color: "#D92D20", Icon: XCircle      },
  SUSPENDED:        { label: "Suspended",    bg: "#F5F5F5", color: "#888888", Icon: AlertCircle  },
};

/* ── Order status config ─────────────────────────────────────────────────── */
type OrderStatus =
  | "PAYMENT_PENDING" | "PAYMENT_FAILED" | "PAYMENT_CAPTURED"
  | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "OUT_FOR_DELIVERY"
  | "DELIVERED" | "CANCELLED" | "RETURN_IN_PROGRESS" | "COMPLETED";

const ORDER_STATUS_CFG: Record<OrderStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  PAYMENT_PENDING:    { label: "Awaiting Payment", bg: "#FFF4E5", color: "#FF9500", Icon: Clock        },
  PAYMENT_FAILED:     { label: "Payment Failed",   bg: "#FDECEA", color: "#D92D20", Icon: XCircle      },
  PAYMENT_CAPTURED:   { label: "Payment Received", bg: "#E6F0FF", color: "#1E56D9", Icon: CheckCircle2 },
  CONFIRMED:          { label: "Confirmed",        bg: "#EEF2FF", color: "#6366F1", Icon: CheckCircle2 },
  PROCESSING:         { label: "Processing",       bg: "#FFF4E5", color: "#FF9500", Icon: Package      },
  SHIPPED:            { label: "Shipped",          bg: "#E6F0FF", color: "#1E56D9", Icon: Truck        },
  OUT_FOR_DELIVERY:   { label: "Out for Delivery", bg: "#FFF0E5", color: "#FF6F3F", Icon: Truck        },
  DELIVERED:          { label: "Delivered",        bg: "#E6F7EF", color: "#00A167", Icon: CircleCheck  },
  CANCELLED:          { label: "Cancelled",        bg: "#FDECEA", color: "#D92D20", Icon: Ban          },
  RETURN_IN_PROGRESS: { label: "Return Requested", bg: "#FFF4E5", color: "#FF9500", Icon: RotateCcw    },
  COMPLETED:          { label: "Completed",        bg: "#E6F7EF", color: "#00A267", Icon: CircleCheck  },
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

/* ── Metadata ────────────────────────────────────────────────────────────── */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { fullName: true } });
  return { title: user ? `${user.fullName} — MobiGrade Portal` : "Retailer Detail" };
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default async function RetailerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const retailer = await prisma.user.findFirst({
    where: { id, role: "RETAILER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      verificationStatus: true,
      createdAt: true,
      retailerProfile: {
        select: {
          id: true,
          businessName: true,
          gstNumber: true,
          addresses: {
            orderBy: { isDefault: "desc" },
          },
          orders: {
            orderBy: { createdAt: "desc" },
            take: 25,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          },
          _count: { select: { orders: true } },
        },
      },
    },
  });

  if (!retailer) notFound();

  const profile   = retailer.retailerProfile;
  const orders    = profile?.orders ?? [];
  const addresses = profile?.addresses ?? [];

  const totalOrders = profile?._count.orders ?? 0;
  const totalSpent  = orders.reduce((sum: number, o) => sum + Number(o.total), 0);
  const defaultAddr = addresses.find(a => a.isDefault);

  const vCfg = VSTATUS_CFG[retailer.verificationStatus as VerificationStatus];

  return (
    <div className={classes.page}>

      {/* ── Header ── */}
      <PageHeader
        backHref="/admin/retailers"
        title={retailer.fullName}
        subtitle={retailer.email}
        right={vCfg && (
          <span className={classes.statusPill} style={{ backgroundColor: vCfg.bg, color: vCfg.color }}>
            <vCfg.Icon size={13} />{vCfg.label}
          </span>
        )}
      />

      {/* ── Quick stats ── */}
      <div className={classes.statsRow}>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Total Orders</span>
          <span className={classes.statValue}>{totalOrders.toLocaleString("en-IN")}</span>
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Total Spent</span>
          <span className={classes.statValue}>
            {totalSpent >= 1_00_000
              ? `₹${(totalSpent / 1_00_000).toFixed(1)}L`
              : totalSpent >= 1_000
              ? `₹${(totalSpent / 1_000).toFixed(1)}K`
              : `₹${totalSpent.toLocaleString("en-IN")}`}
          </span>
          <span className={classes.statSub}>across last {orders.length} orders shown</span>
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>Saved Addresses</span>
          <span className={classes.statValue}>{addresses.length}</span>
          {defaultAddr && <span className={classes.statSub}>Default: {defaultAddr.label}</span>}
        </div>
        <div className={classes.statCard}>
          <span className={classes.statLabel}>GST Number</span>
          <span className={classes.statValue} style={{ fontSize: "0.875rem" }}>
            {profile?.gstNumber ?? "—"}
          </span>
        </div>
      </div>

      {/* ── Account info ── */}
      <div className={classes.card}>
        <div className={classes.cardStripe} />
        <div className={classes.cardHead}>
          <span className={classes.cardTitle}>Account Information</span>
        </div>
        <div className={classes.cardBody}>
          <div className={classes.detailGrid}>
            <DetailRow label="Full Name"     value={retailer.fullName} />
            <DetailRow label="Email"         value={retailer.email} />
            <DetailRow label="Phone"         value={retailer.mobile} />
            <DetailRow label="Business Name" value={profile?.businessName} />
            <DetailRow label="GST Number"    value={profile?.gstNumber} />
          </div>
        </div>
      </div>

      {/* ── Saved addresses ── */}
      <div className={classes.card}>
        <div className={classes.cardStripe} />
        <div className={classes.cardHead}>
          <span className={classes.cardTitle}>
            <MapPin size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            Saved Addresses
          </span>
          <span className={classes.cardCount}>{addresses.length} address{addresses.length !== 1 ? "es" : ""}</span>
        </div>

        {addresses.length === 0 ? (
          <p className={classes.noAddresses}>No addresses saved yet.</p>
        ) : (
          <div className={classes.addressGrid}>
            {addresses.map(addr => (
              <div
                key={addr.id}
                className={`${classes.addressCard} ${addr.isDefault ? classes.addressCardDefault : ""}`}
              >
                <div className={classes.addressTop}>
                  <span className={classes.addressLabel}>{addr.label}</span>
                  {addr.isDefault && (
                    <span className={classes.defaultBadge}>
                      <Star size={10} />Default
                    </span>
                  )}
                </div>
                <p className={classes.addressRecipient}>{addr.recipientName}</p>
                <div className={classes.addressLines}>
                  <span className={classes.addressLine}>{addr.line1}</span>
                  {addr.line2 && <span className={classes.addressLine}>{addr.line2}</span>}
                  <span className={classes.addressLine}>
                    {addr.city}, {addr.state} – {addr.pincode}
                  </span>
                </div>
                <p className={classes.addressPhone}>📞 {addr.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Order history ── */}
      <div className={classes.card}>
        <div className={classes.cardStripe} />
        <div className={classes.cardHead}>
          <span className={classes.cardTitle}>
            <ShoppingBag size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            Order History
          </span>
          <span className={classes.cardCount}>{totalOrders} total order{totalOrders !== 1 ? "s" : ""}</span>
        </div>

        {orders.length === 0 ? (
          <p className={classes.noOrders}>No orders placed yet.</p>
        ) : (
          <div className={classes.tableWrap}>
            <table className={classes.ordersTable}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const oCfg = ORDER_STATUS_CFG[order.status as OrderStatus];
                  return (
                    <tr key={order.id}>
                      <td><span className={classes.orderNumber}>{order.orderNumber}</span></td>
                      <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {order._count.items}
                      </td>
                      <td>
                        <span className={classes.orderTotal}>
                          ₹{Number(order.total).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        {oCfg ? (
                          <span
                            className={classes.orderStatusPill}
                            style={{ backgroundColor: oCfg.bg, color: oCfg.color }}
                          >
                            <oCfg.Icon size={11} />{oCfg.label}
                          </span>
                        ) : (
                          <span>{order.status}</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/admin/orders/${order.id}`} className={classes.viewOrderBtn}>
                          View <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
