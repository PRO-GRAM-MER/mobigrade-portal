"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ALL_CATEGORY_SLUGS } from "@/lib/categories";

// ─── Nav config ───────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard",  icon: "⊞" },
  { href: "/kyc",       label: "KYC",         icon: "✦" },
  { href: "/products",  label: "Products",    icon: "◫" },
  { href: "/upload",    label: "Bulk Upload", icon: "↑" },
];

const CATEGORY_LABELS: Record<string, string> = {
  "spare-parts": "Spare Parts",
  "vrp":         "VRP",
  "new-phones":  "New Phones",
  "prexo":       "PREXO",
  "open-box":    "Open Box",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerNav({
  userName,
  kycStatus,
}: {
  userName: string;
  kycStatus: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <span className="sidebar-logo">M</span>
        <span className="sidebar-brand-name">MOBIGRADE PORTAL</span>
      </div>

      {/* KYC status banner — only if not approved */}
      {kycStatus !== "KYC_APPROVED" && (
        <Link href="/kyc" className="sidebar-kyc-banner">
          <span>⚠</span>
          <span>Complete KYC</span>
        </Link>
      )}

      {/* Primary nav */}
      <nav className="sidebar-nav">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${isActive(item.href) ? "sidebar-link--active" : ""}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Categories group */}
        <div className="sidebar-group">
          <span className="sidebar-group-label">Categories</span>
          {ALL_CATEGORY_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/categories/${slug}`}
              className={`sidebar-link sidebar-link--sub ${
                pathname === `/categories/${slug}` ? "sidebar-link--active" : ""
              }`}
            >
              <span className="sidebar-link-icon">·</span>
              {CATEGORY_LABELS[slug] ?? slug}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <span className="sidebar-user">{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-signout"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
