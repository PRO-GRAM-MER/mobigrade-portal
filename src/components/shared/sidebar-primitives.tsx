"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, LogOut } from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SidebarIcon = React.ComponentType<{ className?: string }>

export interface NavLeaf {
  kind: "leaf"
  label: string
  href: string
  icon: SidebarIcon
}

export interface NavParent {
  kind: "parent"
  label: string
  icon: SidebarIcon
  children: NavItem[]
}

export type NavItem = NavLeaf | NavParent

export interface SidebarUser {
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export function hasActiveChild(pathname: string, item: NavItem): boolean {
  if (item.kind === "leaf") return isActive(pathname, item.href)
  return item.children.some((c) => hasActiveChild(pathname, c))
}

// ─── NavMenuItem (recursive) ──────────────────────────────────────────────────

export function NavMenuItem({
  item,
  depth = 0,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  depth?: number
  collapsed: boolean
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const active = hasActiveChild(pathname, item)
  const [open, setOpen] = useState(active)

  useEffect(() => { if (active) setOpen(true) }, [active])

  const pad =
    depth === 0 ? "px-3"
    : depth === 1 ? "pl-9 pr-3"
    : "pl-[52px] pr-3"

  if (item.kind === "leaf") {
    const on = isActive(pathname, item.href)
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsed && depth === 0 ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 h-9 rounded-lg text-[13px] font-medium transition-colors duration-150",
          pad,
          on
            ? "bg-sidebar-primary/15 text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {on && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-sidebar-primary" />
        )}
        <item.icon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            on
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )}
        />
        {(!collapsed || depth > 0) && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed && depth === 0 ? item.label : undefined}
        className={cn(
          "group w-full flex items-center gap-3 h-9 rounded-lg text-[13px] font-medium transition-colors duration-150",
          pad,
          active
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon
          className={cn(
            "h-4 w-4 flex-shrink-0",
            active
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )}
        />
        {(!collapsed || depth > 0) && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 flex-shrink-0 text-sidebar-foreground/30 transition-transform duration-200",
                open && "rotate-90"
              )}
            />
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (!collapsed || depth > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-0.5">
              {item.children.map((child) => (
                <NavMenuItem
                  key={child.label}
                  item={child}
                  depth={depth + 1}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SidebarFooter ────────────────────────────────────────────────────────────

export function SidebarFooter({
  user,
  signOutHref,
  collapsed,
}: {
  user: SidebarUser
  signOutHref: string
  collapsed: boolean
}) {
  const router = useRouter()
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push(signOutHref)
  }

  return (
    <div className="border-t border-sidebar-border p-2 space-y-1 flex-shrink-0">
      <div className={cn("flex items-center gap-2.5 px-2 py-2 rounded-lg", collapsed && "justify-center")}>
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden"
          style={{ background: "oklch(0.67 0.19 35 / 20%)", color: "oklch(0.9 0.05 35)" }}
        >
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5 leading-none">
              {user.email}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSignOut}
        title={collapsed ? "Sign Out" : undefined}
        className={cn(
          "flex items-center gap-2.5 w-full h-8 rounded-lg text-[12px] font-medium px-2",
          "text-sidebar-foreground/50 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150",
          collapsed && "justify-center"
        )}
      >
        <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </div>
  )
}

// ─── SidebarShell ─────────────────────────────────────────────────────────────

export function SidebarShell({
  title,
  navItems,
  user,
  signOutHref,
}: {
  title: string
  navItems: NavItem[]
  user: SidebarUser
  signOutHref: string
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)

  function onNavigate() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarCollapsed(true)
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed left-0 top-14 z-40 flex flex-col",
          "h-[calc(100dvh-3.5rem)]",
          "bg-sidebar border-r border-sidebar-border",
          "transition-[width,transform] duration-300 ease-in-out",
          "max-lg:w-[240px]",
          collapsed ? "max-lg:-translate-x-full" : "max-lg:translate-x-0 max-lg:shadow-2xl",
          collapsed ? "lg:w-16" : "lg:w-[240px]",
          "lg:translate-x-0"
        )}
      >
        {/* Logo strip */}
        <div
          className={cn(
            "flex items-center gap-2.5 h-12 border-b border-sidebar-border flex-shrink-0",
            collapsed ? "lg:justify-center lg:px-0 px-4" : "px-4"
          )}
        >
          <div
            className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FF6F3F 0%, #e85c2a 100%)" }}
          >
            <span className="text-white font-bold text-[10px]">M</span>
          </div>
          {!collapsed && (
            <span className="text-[13px] font-bold text-sidebar-foreground tracking-tight truncate">
              {title}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavMenuItem
              key={item.label}
              item={item}
              depth={0}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        {/* Footer */}
        <SidebarFooter user={user} signOutHref={signOutHref} collapsed={collapsed} />
      </aside>
    </>
  )
}
