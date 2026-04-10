"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard, ShoppingBag,
  Package, Wrench, Smartphone, RefreshCcw, PackageOpen,
  ChevronDown, LogOut, X,
} from "lucide-react";
import { ALL_CATEGORY_SLUGS } from "@/lib/categories";
import s from "./sidebar.module.css";
import { useState, useEffect } from "react";

/* ── Category meta ───────────────────────────────────────────────────────── */
const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  "spare-parts": { label: "Spare Parts", icon: Wrench      },
  "vrp":         { label: "VRP",         icon: RefreshCcw  },
  "new-phones":  { label: "New Phones",  icon: Smartphone  },
  "prexo":       { label: "PREXO",       icon: Package     },
  "open-box":    { label: "Open Box",    icon: PackageOpen },
};

type Props = { isOpen: boolean; onClose: () => void; userName: string };

export default function SellerSidebar({ isOpen, onClose, userName }: Props) {
  const pathname = usePathname();

  const inventoryOpen = ALL_CATEGORY_SLUGS.some(
    slug => pathname.startsWith(`/categories/${slug}`) || pathname.startsWith(`/inventory/${slug}`)
  );
  const [expanded, setExpanded] = useState(inventoryOpen);

  useEffect(() => {
    if (inventoryOpen) setExpanded(true);
  }, [pathname, inventoryOpen]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="seller-backdrop"
            className={s.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            key="seller-drawer"
            className={s.drawer}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.26, ease: "easeInOut" }}
          >
            {/* Header */}
            <div className={s.drawerHeader}>
              <div className={s.brand}>
                <div className={s.logoWrap}>
                  <Image src="/logo.svg" alt="MobiGrade" width={16} height={16} />
                </div>
                <div>
                  <p className={s.brandName}>MobiGrade</p>
                  <p className={s.brandSub}>SELLER</p>
                </div>
              </div>
              <button className={s.closeBtn} onClick={onClose} aria-label="Close menu">
                <X size={15} />
              </button>
            </div>

            {/* Scrollable nav */}
            <div className={s.scrollable}>
              <nav className={s.nav}>

                {/* Overview */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Overview</p>
                  <div className={s.groupItems}>
                    <Link
                      href="/dashboard"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/dashboard") ? s.navItemActive : ""}`}
                    >
                      <LayoutDashboard size={15} style={{ flexShrink: 0 }} />
                      Dashboard
                    </Link>
                  </div>
                </div>

                {/* Orders */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Sales</p>
                  <div className={s.groupItems}>
                    <Link
                      href="/orders"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/orders") ? s.navItemActive : ""}`}
                    >
                      <ShoppingBag size={15} style={{ flexShrink: 0 }} />
                      My Orders
                    </Link>
                  </div>
                </div>

                {/* Inventory accordion */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Inventory</p>

                  <button
                    className={`${s.accordionTrigger} ${expanded || inventoryOpen ? s.accordionTriggerActive : ""}`}
                    onClick={() => setExpanded(v => !v)}
                    type="button"
                  >
                    <span className={s.accordionLeft}>
                      <Package size={15} style={{ flexShrink: 0 }} />
                      My Inventory
                    </span>
                    <ChevronDown
                      size={13}
                      className={`${s.accordionChevron} ${expanded ? s.accordionChevronOpen : ""}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        key="inventory-items"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className={s.accordionItems}>
                          {ALL_CATEGORY_SLUGS.map(slug => {
                            const meta = CATEGORY_META[slug];
                            const Icon = meta?.icon ?? Package;
                            const href = `/categories/${slug}`;
                            const active =
                              pathname.startsWith(`/categories/${slug}`) ||
                              pathname.startsWith(`/inventory/${slug}`);
                            return (
                              <Link
                                key={slug}
                                href={href}
                                onClick={onClose}
                                className={`${s.subNavItem} ${active ? s.subNavItemActive : ""}`}
                              >
                                <Icon size={13} style={{ flexShrink: 0, color: "var(--color-muted-foreground)" }} />
                                {meta?.label ?? slug}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </nav>
            </div>

            {/* Footer */}
            <div className={s.footer}>
              <div className={s.footerUser}>
                <p className={s.footerName}>{userName}</p>
                <p className={s.footerRole}>Seller</p>
              </div>
              <button
                className={s.logoutBtn}
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
