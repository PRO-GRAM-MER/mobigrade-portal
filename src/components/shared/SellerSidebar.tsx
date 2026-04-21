"use client"

import {
  LayoutDashboard,
  Package,
  PackageOpen,
  RefreshCw,
  Smartphone,
  Store,
  Wrench,
} from "lucide-react"
import { SidebarShell, type NavItem, type NavLeaf, type SidebarUser } from "./sidebar-primitives"

const CATEGORIES: NavLeaf[] = [
  { kind: "leaf", label: "VRP",         href: "/vrp",         icon: Smartphone },
  { kind: "leaf", label: "Spare Parts", href: "/spare-parts", icon: Wrench     },
  { kind: "leaf", label: "New Phones",  href: "/new-phones",  icon: Package    },
  { kind: "leaf", label: "Prexo",       href: "/prexo",       icon: RefreshCw  },
  { kind: "leaf", label: "Open Box",    href: "/open-box",    icon: PackageOpen },
]

const NAV: NavItem[] = [
  {
    kind: "leaf",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    kind: "parent",
    label: "Marketplace",
    icon: Store,
    children: CATEGORIES.map((c) => ({ ...c, href: `/marketplace${c.href}` })),
  },
]

export function SellerSidebar({ user }: { user: SidebarUser }) {
  return (
    <SidebarShell
      title="Seller Portal"
      navItems={NAV}
      user={user}
      signOutHref="/login"
    />
  )
}
