"use client";

import Link from "next/link";
import { motion, type Transition, type TargetAndTransition } from "motion/react";
import {
  Users, Store, ShoppingCart, RotateCcw,
  UserCheck, ClipboardList, Package, ArrowRight, LayoutDashboard,
} from "lucide-react";
import EarningsCard from "./EarningsCard";
import classes from "./dashboard.module.css";

type Draft = {
  id: string;
  partName: string | null;
  brand: string;
  modelName: string;
  condition: string | null;
  price: number;
  createdAt: string;
  sellerName: string;
};

type Props = {
  sellersOnboard: number;
  retailers: number;
  totalOrders: number;
  totalReturns: number;
  pendingKyc: number;
  pendingReview: number;
  recentDrafts: Draft[];
};

const fadeUp = (delay = 0): { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: "easeOut", delay },
});

export default function DashboardClient({
  sellersOnboard, retailers, totalOrders, totalReturns,
  pendingKyc, pendingReview, recentDrafts,
}: Props) {

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const STAT_CARDS = [
    { label: "Sellers Onboard",    value: sellersOnboard, icon: Users,        bg: "#2F3567", href: "/admin/kyc-review" },
    { label: "Retailers",          value: retailers,      icon: Store,        bg: "#FF6F3F", href: "/admin/inventory" },
    { label: "Total Orders",       value: totalOrders,    icon: ShoppingCart, bg: "#00A267", href: "/admin/inventory" },
    { label: "Total Return Orders",value: totalReturns,   icon: RotateCcw,    bg: "#8B5CF6", href: "/admin/inventory" },
  ];

  const PENDING_CARDS = [
    { label: "KYC Awaiting Review",     count: pendingKyc,     href: "/admin/kyc-review",     icon: UserCheck,     bg: "#2F3567" },
    { label: "Products Pending Review", count: pendingReview,  href: "/admin/product-review", icon: ClipboardList, bg: "#FF6F3F" },
  ];

  return (
    <div className={classes.page}>

      {/* ── Heading ── */}
      <motion.div className={classes.heading} {...fadeUp(0)}>
        <h1 className={classes.title}>Dashboard</h1>
        <p className={classes.date}>{today}</p>
      </motion.div>

      {/* ══ Upper section: stat cards (left) + earning report (right) ══ */}
      <div className={classes.upper}>

        {/* Left: 2×2 stat cards */}
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
                    <p className={classes.statCount}>{card.value.toLocaleString("en-IN")}</p>
                    <p className={classes.statLabel}>{card.label}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Earning report card */}
        <motion.div className={classes.card} {...fadeUp(0.1)} style={{ height: "100%" }}>
          <EarningsCard />
        </motion.div>
      </div>

      <div className={classes.divider} />

      {/* ── Pending Actions ── */}
      <motion.div className={classes.sectionHeader} {...fadeUp(0.12)}>
        <h2 className={classes.sectionTitle}>Pending Actions</h2>
        <p className={classes.sectionSubtitle}>Items requiring your attention</p>
      </motion.div>

      <motion.div className={classes.actionGrid} {...fadeUp(0.14)}>
        {PENDING_CARDS.map(({ label, count, href, icon: Icon, bg }) => (
          <Link key={label} href={href} className={classes.actionCard}>
            <div className={classes.actionIconWrap} style={{ backgroundColor: `${bg}18` }}>
              <Icon size={20} style={{ color: bg }} />
            </div>
            <div className={classes.actionBody}>
              <p className={classes.actionLabel}>{label}</p>
              <p className={classes.actionCount}>{count.toLocaleString("en-IN")}</p>
            </div>
            {count > 0 && (
              <span className={classes.urgentBadge}>Pending</span>
            )}
          </Link>
        ))}
      </motion.div>

      <div className={classes.divider} />

      {/* ── Recent Drafts table ── */}
      <motion.div className={`${classes.sectionHeader} ${classes.sectionRow}`} {...fadeUp(0.16)}>
        <div>
          <h2 className={classes.sectionTitle}>Awaiting Review</h2>
          <p className={classes.sectionSubtitle}>Most recent product submissions</p>
        </div>
        <Link href="/admin/product-review" className={classes.sectionLink}>View all →</Link>
      </motion.div>

      <motion.div {...fadeUp(0.18)}>
        {recentDrafts.length === 0 ? (
          <div className={classes.tableWrapper}>
            <div className={classes.empty}>
              <LayoutDashboard size={28} style={{ opacity: 0.3 }} />
              <span>No pending submissions right now.</span>
            </div>
          </div>
        ) : (
          <div className={classes.tableWrapper}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Condition</th>
                  <th>Price</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentDrafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <p className={classes.tdName}>{draft.partName}</p>
                      <p className={classes.tdSub}>{draft.brand} · {draft.modelName}</p>
                    </td>
                    <td>{draft.sellerName}</td>
                    <td>{draft.condition}</td>
                    <td style={{ fontWeight: 500, color: "var(--color-primary)" }}>
                      ₹{draft.price.toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8125rem" }}>
                      {new Date(draft.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <Link href={`/admin/product-review/${draft.id}`} className={classes.reviewBtn}>
                        Review <ArrowRight size={13} />
                      </Link>
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
