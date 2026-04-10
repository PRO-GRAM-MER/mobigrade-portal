"use client";

import Link from "next/link";
import { motion, type Transition, type TargetAndTransition } from "motion/react";
import {
  Package, Clock, ShoppingBag, IndianRupee,
  AlertTriangle, LayoutDashboard,
} from "lucide-react";
import SellerEarningsCard from "./SellerEarningsCard";
import classes from "./dashboard.module.css";

type RecentDraft = {
  id: string;
  partName: string | null;
  brand: string;
  modelName: string;
  condition: string | null;
  price: number;
  createdAt: string;
};

type Props = {
  userName: string;
  kycStatus: string;
  activeListings: number;
  pendingReview: number;
  totalOrderItems: number;
  netEarnings: number;
  recentDrafts: RecentDraft[];
};

const fadeUp = (delay = 0): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: "easeOut", delay },
});

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const KYC_LABELS: Record<string, string> = {
  KYC_PENDING:      "Pending",
  KYC_SUBMITTED:    "Submitted — under review",
  KYC_UNDER_REVIEW: "Under review",
  KYC_REJECTED:     "Rejected",
  SUSPENDED:        "Suspended",
};

export default function DashboardClient({
  userName,
  kycStatus,
  activeListings,
  pendingReview,
  totalOrderItems,
  netEarnings,
  recentDrafts,
}: Props) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const isKycApproved = kycStatus === "KYC_APPROVED";

  const STAT_CARDS = [
    {
      label: "Active Listings",
      value: activeListings,
      icon: Package,
      bg: "#2F3567",
      href: "/categories/spare-parts",
    },
    {
      label: "Pending Review",
      value: pendingReview,
      icon: Clock,
      bg: "#FF6F3F",
      href: "/categories/spare-parts?status=PENDING_REVIEW",
    },
    {
      label: "Items Sold",
      value: totalOrderItems,
      icon: ShoppingBag,
      bg: "#00A267",
      href: "/orders",
    },
    {
      label: "Net Earnings",
      value: formatINR(netEarnings),
      icon: IndianRupee,
      bg: "#8B5CF6",
      href: "/orders",
      isText: true,
    },
  ];

  return (
    <div className={classes.page}>

      {/* ── Heading ── */}
      <motion.div className={classes.heading} {...fadeUp(0)}>
        <h1 className={classes.title}>Welcome, {userName.split(" ")[0]}</h1>
        <p className={classes.date}>{today}</p>
      </motion.div>

      {/* ── KYC nudge (non-approved only) ── */}
      {!isKycApproved && (
        <motion.div className={classes.kycNudge} {...fadeUp(0.04)}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            KYC status: <strong>{KYC_LABELS[kycStatus] ?? kycStatus}</strong>.
            {kycStatus === "KYC_PENDING" && " Complete verification to start listing products."}
            {kycStatus === "KYC_REJECTED" && " Your KYC was rejected. Please re-submit."}
          </span>
          {(kycStatus === "KYC_PENDING" || kycStatus === "KYC_REJECTED") && (
            <Link href="/kyc" className={classes.kycNudgeLink}>
              Go to KYC →
            </Link>
          )}
        </motion.div>
      )}

      {/* ══ Upper: stats (left) + earnings (right) ══ */}
      <div className={classes.upper}>

        {/* Stats 2×2 */}
        <div className={classes.statsGrid}>
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} {...fadeUp(0.05 * i)}>
                <Link href={card.href} className={classes.statCard}>
                  <div className={classes.statIconWrap} style={{ backgroundColor: `${card.bg}18` }}>
                    <Icon size={20} style={{ color: card.bg }} />
                  </div>
                  <div className={classes.statBody}>
                    <p className={classes.statCount}>
                      {card.isText
                        ? (card.value as string)
                        : (card.value as number).toLocaleString("en-IN")}
                    </p>
                    <p className={classes.statLabel}>{card.label}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Earnings card */}
        <motion.div className={classes.card} {...fadeUp(0.1)} style={{ height: "100%" }}>
          <SellerEarningsCard />
        </motion.div>
      </div>

      <div className={classes.divider} />

      {/* ── Pending submissions ── */}
      <motion.div className={`${classes.sectionHeader} ${classes.sectionRow}`} {...fadeUp(0.14)}>
        <div>
          <h2 className={classes.sectionTitle}>Pending Submissions</h2>
          <p className={classes.sectionSubtitle}>Products awaiting admin review</p>
        </div>
        <Link href="/categories/spare-parts?status=PENDING_REVIEW" className={classes.sectionLink}>
          View all →
        </Link>
      </motion.div>

      <motion.div {...fadeUp(0.16)}>
        {recentDrafts.length === 0 ? (
          <div className={classes.tableWrapper}>
            <div className={classes.empty}>
              <LayoutDashboard size={28} style={{ opacity: 0.3 }} />
              <span>No pending submissions.</span>
            </div>
          </div>
        ) : (
          <div className={classes.tableWrapper}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Condition</th>
                  <th>Price</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDrafts.map(draft => (
                  <tr key={draft.id}>
                    <td>
                      <p className={classes.tdName}>{draft.partName}</p>
                      <p className={classes.tdSub}>{draft.brand} · {draft.modelName}</p>
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{draft.condition}</td>
                    <td style={{ fontWeight: 500, color: "var(--color-primary)" }}>
                      ₹{draft.price.toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8125rem" }}>
                      {new Date(draft.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <span className={classes.statusPill}>
                        <Clock size={10} /> Pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </div>
  );
}
