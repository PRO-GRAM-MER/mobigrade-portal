"use client";

import { useEffect, useRef, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { AnimatePresence, motion } from "framer-motion";
import { IndianRupee, ShoppingBag, Check, ChevronDown, Wallet } from "lucide-react";
import classes from "./dashboard.module.css";

ChartJS.register(ArcElement, Tooltip, Legend);

type CategoryEntry = { name: string; total: number; color: string };

type EarningsData = {
  totalOrderItems: number;
  grossSales: number;
  netEarnings: number;
  onHold: number;
  cleared: number;
  categoryBreakdown: CategoryEntry[];
};

const PERIODS = ["Weekly", "Monthly", "Yearly"] as const;
type Period = (typeof PERIODS)[number];

function formatINR(n: number): string {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

/* ── Period Dropdown ─────────────────────────────────────────────────────── */
function PeriodDropdown({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={classes.dropdown}>
      <button className={classes.dropdownTrigger} onClick={() => setOpen(v => !v)}>
        <span>{value}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ display: "flex" }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            key="dropdown"
            className={classes.dropdownMenu}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {PERIODS.map((opt, i) => (
              <motion.li
                key={opt}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`${classes.dropdownItem} ${opt === value ? classes.dropdownItemActive : ""}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                <span className={classes.dropdownItemCheck}>
                  {opt === value && <Check size={11} />}
                </span>
                {opt}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Card ───────────────────────────────────────────────────────────── */
export default function SellerEarningsCard() {
  const [period, setPeriod] = useState<Period>("Monthly");
  const [data, setData]     = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/seller/earnings?period=${period.toLowerCase()}`)
      .then(r => r.json())
      .then((d: EarningsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const categories  = data?.categoryBreakdown ?? [];
  const netEarnings = data?.netEarnings ?? 0;
  const onHold      = data?.onHold ?? 0;
  const cleared     = data?.cleared ?? 0;
  const totalItems  = data?.totalOrderItems ?? 0;

  const donutData = {
    labels: categories.map(c => c.name),
    datasets: [{
      data: categories.map(c => c.total),
      backgroundColor: categories.map(c => c.color),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    layout: { padding: 8 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${formatINR(ctx.parsed)}`,
        },
      },
    },
  };

  const METRICS = [
    { label: "Items Sold",   value: loading ? "—" : totalItems.toLocaleString("en-IN"), icon: ShoppingBag,  bg: "#2F3567" },
    { label: "Net Earnings", value: loading ? "—" : formatINR(netEarnings),              icon: IndianRupee,  bg: "#00A267" },
    { label: "Cleared",      value: loading ? "—" : formatINR(cleared),                  icon: Wallet,       bg: "#8B5CF6" },
  ];

  return (
    <div className={classes.earningCard}>

      {/* Left: metrics */}
      <div className={classes.earningLeft}>
        <div>
          <p className={classes.earningTitle}>Earnings Report</p>
          <p className={classes.earningSubtitle}>Your income for the selected period</p>
        </div>

        <div className={classes.earningItems}>
          {METRICS.map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className={classes.earningItem}>
              <div className={classes.earningItemIcon} style={{ backgroundColor: `${bg}18` }}>
                <Icon size={18} style={{ color: bg }} />
              </div>
              <div className={classes.earningItemBody}>
                <p className={classes.earningItemLabel}>{label}</p>
                <p className={classes.earningItemValue}>{value}</p>
              </div>
            </div>
          ))}

          {/* On-hold indicator */}
          {!loading && onHold > 0 && (
            <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
              {formatINR(onHold)} on hold (T+7 clearing)
            </p>
          )}
        </div>
      </div>

      <div className={classes.earningDivider} />

      {/* Right: donut */}
      <div className={classes.earningRight}>
        <div className={classes.donutHeader}>
          <p className={classes.donutTitle}>By Category</p>
          <PeriodDropdown value={period} onChange={setPeriod} />
        </div>

        {loading ? (
          <div className={classes.donutEmpty}>Loading…</div>
        ) : categories.length === 0 ? (
          <div className={classes.donutEmpty}>No earnings data yet.</div>
        ) : (
          <>
            <div className={classes.donutWrap}>
              <Doughnut data={donutData} options={donutOptions as Parameters<typeof Doughnut>[0]["options"]} />
              <div className={classes.donutCenter}>
                <span className={classes.donutCenterLabel}>Net</span>
                <span className={classes.donutCenterValue}>{formatINR(netEarnings)}</span>
              </div>
            </div>

            <div className={classes.legend}>
              {categories.map(cat => (
                <div key={cat.name} className={classes.legendItem}>
                  <span className={classes.legendDot} style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                  <span className={classes.legendValue}>{formatINR(cat.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
