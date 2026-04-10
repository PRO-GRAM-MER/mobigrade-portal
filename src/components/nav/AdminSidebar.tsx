"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Users, Store,
  ClipboardList, Package, Wrench, Smartphone,
  RefreshCcw, PackageOpen, Megaphone, ShoppingCart,
  Tag, BookOpen, ChevronDown, LogOut, X,
} from "lucide-react";
import { ALL_CATEGORY_SLUGS } from "@/lib/categories";
import s from "./sidebar.module.css";
import { useState, useEffect } from "react";

/* ── Category meta ──────────────────────────────────────────── */
const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  "spare-parts": { label: "Spare Parts", icon: Wrench },
  "vrp":         { label: "VRP",         icon: RefreshCcw },
  "new-phones":  { label: "New Phones",  icon: Smartphone },
  "prexo":       { label: "PREXO",       icon: Package },
  "open-box":    { label: "Open Box",    icon: PackageOpen },
};

/* ── Accordion section config ───────────────────────────────── */
type AccordionId = "seller-inventory" | "our-inventory" | "website";

const ACCORDIONS: { id: AccordionId; label: string; baseHref: string }[] = [
  { id: "seller-inventory", label: "Seller Inventories", baseHref: "/admin/seller-inventory" },
  { id: "our-inventory",    label: "Our Inventory",      baseHref: "/admin/our-inventory"    },
  { id: "website",          label: "Website Products",   baseHref: "/admin/website"          },
];

/* ── Props ──────────────────────────────────────────────────── */
type Props = { isOpen: boolean; onClose: () => void; userName: string };

/* ── Accordion item ─────────────────────────────────────────── */
function AccordionGroup({
  accordion, isExpanded, onToggle, pathname, onClose,
}: {
  accordion: typeof ACCORDIONS[number];
  isExpanded: boolean;
  onToggle: () => void;
  pathname: string;
  onClose: () => void;
}) {
  const anyActive = ALL_CATEGORY_SLUGS.some(
    slug => pathname === `${accordion.baseHref}/${slug}`
  );

  return (
    <div>
      <button
        className={`${s.accordionTrigger} ${anyActive || isExpanded ? s.accordionTriggerActive : ""}`}
        onClick={onToggle}
        type="button"
      >
        <span className={s.accordionLeft}>
          <Package size={15} style={{ flexShrink: 0 }} />
          {accordion.label}
        </span>
        <ChevronDown
          size={13}
          className={`${s.accordionChevron} ${isExpanded ? s.accordionChevronOpen : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`${accordion.id}-items`}
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
                const href = `${accordion.baseHref}/${slug}`;
                const active = pathname === href;
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
  );
}

/* ── Main sidebar ───────────────────────────────────────────── */
export default function AdminSidebar({ isOpen, onClose, userName }: Props) {
  const pathname = usePathname();

  // Auto-open the accordion whose base path matches current route
  const defaultOpen = ACCORDIONS.find(a =>
    ALL_CATEGORY_SLUGS.some(slug => pathname === `${a.baseHref}/${slug}`)
  )?.id ?? null;

  const [expanded, setExpanded] = useState<AccordionId | null>(defaultOpen);

  // Update expanded when pathname changes (e.g. deep-link navigation)
  useEffect(() => {
    const match = ACCORDIONS.find(a =>
      ALL_CATEGORY_SLUGS.some(slug => pathname === `${a.baseHref}/${slug}`)
    );
    if (match) setExpanded(match.id);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  function toggle(id: AccordionId) {
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="admin-backdrop"
            className={s.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="admin-drawer"
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
                  <p className={s.brandSub}>ADMIN</p>
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
                      href="/admin/dashboard"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/dashboard") ? s.navItemActive : ""}`}
                    >
                      <LayoutDashboard size={15} style={{ flexShrink: 0 }} />
                      Dashboard
                    </Link>
                  </div>
                </div>

                {/* Onboarding */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Onboarding</p>
                  <div className={s.groupItems}>
                    <Link
                      href="/admin/sellers"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/sellers") ? s.navItemActive : ""}`}
                    >
                      <Users size={15} style={{ flexShrink: 0 }} />
                      Sellers
                    </Link>
                    <Link
                      href="/admin/retailers"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/retailers") ? s.navItemActive : ""}`}
                    >
                      <Store size={15} style={{ flexShrink: 0 }} />
                      Retailers
                    </Link>
                  </div>
                </div>

                {/* Inventory accordions */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Inventory</p>
                  {ACCORDIONS.map(accordion => (
                    <AccordionGroup
                      key={accordion.id}
                      accordion={accordion}
                      isExpanded={expanded === accordion.id}
                      onToggle={() => toggle(accordion.id)}
                      pathname={pathname}
                      onClose={onClose}
                    />
                  ))}
                </div>

                {/* Marketplace */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Marketplace</p>
                  <div className={s.groupItems}>
                    <Link
                      href="/admin/product-review"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/product-review") ? s.navItemActive : ""}`}
                    >
                      <ClipboardList size={15} style={{ flexShrink: 0 }} />
                      Product Review
                    </Link>
                  </div>
                </div>

                {/* Marketing */}
                <div className={s.group}>
                  <p className={s.groupLabel}>Marketing</p>
                  <div className={s.groupItems}>
                    <Link
                      href="/admin/advertisements"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/advertisements") ? s.navItemActive : ""}`}
                    >
                      <Megaphone size={15} style={{ flexShrink: 0 }} />
                      Advertisements
                    </Link>
                    <Link
                      href="/admin/orders"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/orders") ? s.navItemActive : ""}`}
                    >
                      <ShoppingCart size={15} style={{ flexShrink: 0 }} />
                      Orders
                    </Link>
                    <Link
                      href="/admin/coupons"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/coupons") ? s.navItemActive : ""}`}
                    >
                      <Tag size={15} style={{ flexShrink: 0 }} />
                      Coupons
                    </Link>
                    <Link
                      href="/admin/blogs"
                      onClick={onClose}
                      className={`${s.navItem} ${isActive("/admin/blogs") ? s.navItemActive : ""}`}
                    >
                      <BookOpen size={15} style={{ flexShrink: 0 }} />
                      Blogs
                    </Link>
                  </div>
                </div>

              </nav>
            </div>

            {/* Footer */}
            <div className={s.footer}>
              <div className={s.footerUser}>
                <p className={s.footerName}>{userName}</p>
                <p className={s.footerRole}>Administrator</p>
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
