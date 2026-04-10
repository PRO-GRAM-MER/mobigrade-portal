"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ALL_CATEGORY_SLUGS } from "@/lib/categories";
import {
  LayoutDashboard, UserCheck, ClipboardList, Package,
  Wrench, Smartphone, RefreshCcw, PackageOpen, LogOut,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard",       icon: LayoutDashboard },
    ],
  },
  {
    label: "Onboarding",
    items: [
      { href: "/admin/kyc-review",     label: "KYC Review",     icon: UserCheck },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/product-review", label: "Product Review", icon: ClipboardList },
      { href: "/admin/inventory",      label: "Inventory",       icon: Package },
    ],
  },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  "spare-parts": { label: "Spare Parts", icon: Wrench },
  "vrp":         { label: "VRP",         icon: RefreshCcw },
  "new-phones":  { label: "New Phones",  icon: Smartphone },
  "prexo":       { label: "PREXO",       icon: Package },
  "open-box":    { label: "Open Box",    icon: PackageOpen },
};

export default function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      backgroundColor: "#ffffff",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "auto",

    }}>

      {/* Brand */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 16px",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          backgroundColor: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          <Image src="/logo.svg" alt="MobiGrade" width={22} height={22} />
        </div>
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2, letterSpacing: "0.02em" }}>
            MOBIGRADE PORTAL
          </p>
          <p style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--color-accent)", letterSpacing: "0.1em", marginTop: 1 }}>
            ADMIN
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginTop: 8 }}>
            <span style={{
              display: "block",
              padding: "4px 8px",
              fontSize: "0.625rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-muted-foreground)",
              marginBottom: 2,
            }}>
              {group.label}
            </span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--color-primary)" : "var(--color-muted)",
                    backgroundColor: active ? "rgba(47,53,103,0.08)" : "transparent",
                    transition: "background 0.12s, color 0.12s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--color-background)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-primary)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-muted)";
                    }
                  }}
                >
                  <Icon
                    size={15}
                    style={{ color: active ? "var(--color-primary)" : "var(--color-muted-foreground)", flexShrink: 0 }}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Catalog */}
        <div style={{ marginTop: 8 }}>
          <span style={{
            display: "block",
            padding: "4px 8px",
            fontSize: "0.625rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-muted-foreground)",
            marginBottom: 2,
          }}>
            Catalog
          </span>
          {ALL_CATEGORY_SLUGS.map((slug) => {
            const meta = CATEGORY_META[slug];
            const Icon = meta?.icon ?? Package;
            const active = pathname === `/admin/categories/${slug}`;
            return (
              <Link
                key={slug}
                href={`/admin/categories/${slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px 6px 18px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--color-primary)" : "var(--color-muted)",
                  backgroundColor: active ? "rgba(47,53,103,0.08)" : "transparent",
                  transition: "background 0.12s, color 0.12s",
                  textDecoration: "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--color-background)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon size={13} style={{ color: "var(--color-muted-foreground)", flexShrink: 0 }} />
                {meta?.label ?? slug}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>Administrator</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 6,
            cursor: "pointer",
            color: "var(--color-muted-foreground)",
            transition: "color 0.12s, background 0.12s",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "#dc2626";
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fee2e2";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted-foreground)";
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
