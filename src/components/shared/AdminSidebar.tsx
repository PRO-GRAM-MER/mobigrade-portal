"use client"

import {
  Box,
  Building2,
  Globe,
  LayoutDashboard,
  Package,
  PackageOpen,
  RefreshCw,
  Smartphone,
  Store,
  UserCheck,
  Users,
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
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    kind: "parent",
    label: "Onboarding",
    icon: Users,
    children: [
      { kind: "leaf", label: "Sellers",   href: "/admin/onboarding/sellers",   icon: UserCheck },
      { kind: "leaf", label: "Retailers", href: "/admin/onboarding/retailers", icon: Building2 },
    ],
  },
  {
    kind: "parent",
    label: "Marketplace",
    icon: Store,
    children: [
      {
        kind: "parent",
        label: "Sellers Inventories",
        icon: Package,
        children: CATEGORIES.map((c) => ({ ...c, href: `/admin/marketplace/sellers${c.href}` })),
      },
      {
        kind: "parent",
        label: "Our Inventories",
        icon: Box,
        children: CATEGORIES.map((c) => ({ ...c, href: `/admin/marketplace/our${c.href}` })),
      },
      {
        kind: "parent",
        label: "Website Inventories",
        icon: Globe,
        children: CATEGORIES.map((c) => ({ ...c, href: `/admin/marketplace/website${c.href}` })),
      },
    ],
  },
]

export function AdminSidebar({ user }: { user: SidebarUser }) {
  return (
    <SidebarShell
      title="Admin Panel"
      navItems={NAV}
      user={user}
      signOutHref="/admin/login"
    />
  )
}
