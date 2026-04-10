"use client";

import { useEffect, useRef, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Check, ChevronDown, IndianRupee } from "lucide-react";
import classes from "./dashboard.module.css";

ChartJS.register(ArcElement, Tooltip, Legend);

type CategoryEntry = { name: string; total: number; color: string };

type EarningsData = {
  totalTransactions: number;
  totalSales: number;
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
export default function EarningsCard() {
  const [period, setPeriod] = useState<Period>("Monthly");
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/earnings?period=${period.toLowerCase()}`)
      .then(r => r.json())
      .then((d: EarningsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const categories = data?.categoryBreakdown ?? [];
  const totalSales = data?.totalSales ?? 0;
  const totalTxns  = data?.totalTransactions ?? 0;

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

  const EARNING_META = [
    { label: "Total Transactions", value: loading ? "—" : totalTxns.toLocaleString("en-IN"), icon: ArrowUpDown, bg: "#FF6F3F" },
    { label: "Total Sales",        value: loading ? "—" : formatINR(totalSales),              icon: IndianRupee, bg: "#00A267" },
  ];

  return (
    <div className={classes.earningCard}>

      {/* Left: Earning Report metrics */}
      <div className={classes.earningLeft}>
        <div>
          <p className={classes.earningTitle}>Earning Report</p>
          <p className={classes.earningSubtitle}>Income summary for selected period</p>
        </div>

        <div className={classes.earningItems}>
          {EARNING_META.map(({ label, value, icon: Icon, bg }) => (
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
        </div>
      </div>

      <div className={classes.earningDivider} />

      {/* Right: Donut chart + period dropdown */}
      <div className={classes.earningRight}>
        <div className={classes.donutHeader}>
          <p className={classes.donutTitle}>Sales Breakdown</p>
          <PeriodDropdown value={period} onChange={setPeriod} />
        </div>

        {loading ? (
          <div className={classes.donutEmpty}>Loading…</div>
        ) : categories.length === 0 ? (
          <div className={classes.donutEmpty}>No sales data yet.</div>
        ) : (
          <>
            <div className={classes.donutWrap}>
              <Doughnut data={donutData} options={donutOptions as Parameters<typeof Doughnut>[0]["options"]} />
              <div className={classes.donutCenter}>
                <span className={classes.donutCenterLabel}>Total Sales</span>
                <span className={classes.donutCenterValue}>{formatINR(totalSales)}</span>
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
