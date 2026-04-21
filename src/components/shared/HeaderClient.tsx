"use client"

import { useEffect, useRef, useState, useMemo, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useTheme } from "@/components/shared/ThemeProvider"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  User,
  Package,
  FileCheck,
} from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import type { SessionUser } from "@/types"
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/features/notifications/actions"

interface NotifItem {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}

interface HeaderClientProps {
  user: SessionUser
  role: "ADMIN" | "SELLER"
  notifications?: NotifItem[]
  unreadCount?: number
}

const PAGE_NAMES: Record<string, string> = {
  dashboard:      "Dashboard",
  categories:     "Catalog",
  vrp:            "VRP",
  "spare-parts":  "Spare Parts",
  "new-phones":   "New Phones",
  prexo:          "Prexo",
  "open-box":     "Open Box",
  products:       "Products",
  orders:         "Orders",
  earnings:       "Earnings",
  profile:        "Profile",
  settings:       "Settings",
  sellers:        "Sellers",
  retailers:      "Retailers",
  kyc:            "KYC Review",
  payouts:        "Payouts",
  notifications:  "Notifications",
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter((s) => s && s !== "admin")
  const last = segments[segments.length - 1] ?? "dashboard"
  return PAGE_NAMES[last] ?? last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ type }: { type: string }) {
  if (type === "SPARE_PARTS_UPLOADED") return <Package className="h-4 w-4 text-primary" />
  if (type === "SPARE_PART_CREATED") return <Package className="h-4 w-4 text-primary" />
  if (type === "KYC_SUBMITTED") return <FileCheck className="h-4 w-4 text-accent" />
  return <Bell className="h-4 w-4 text-muted-foreground" />
}

export function HeaderClient({ user, role, notifications = [], unreadCount = 0 }: HeaderClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [, startTransition] = useTransition()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [localNotifs, setLocalNotifs] = useState(notifications)
  const [localUnread, setLocalUnread] = useState(unreadCount)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])
  const initials = useMemo(() => getInitials(user.firstName, user.lastName), [user])

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") { setDropdownOpen(false); setNotifOpen(false) }
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut({ redirect: false })
    router.push(role === "ADMIN" ? "/admin/login" : "/login")
  }

  const THEMES = [
    { value: "light",  icon: Sun,     label: "Light"  },
    { value: "dark",   icon: Moon,    label: "Dark"   },
    { value: "system", icon: Monitor, label: "System" },
  ] as const

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center
      border-b border-border/60 bg-background/95 backdrop-blur-md
      supports-[padding-top:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]
      transition-colors duration-200">

      <div className="flex items-center justify-between w-full px-3 sm:px-4 h-14">

        {/* ── Left ── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

          {/* Hamburger */}
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl
              text-muted-foreground hover:text-foreground hover:bg-muted
              transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>

          {/* App name */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FF6F3F 0%, #e85c2a 100%)" }}>
              <span className="text-white font-bold text-[11px]">M</span>
            </div>
            <span className="font-bold text-[15px] text-foreground tracking-tight hidden xs:block">
              MobiGrade
            </span>
            {role === "ADMIN" && (
              <span className="hidden sm:flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold
                bg-accent/15 text-accent tracking-wide uppercase">
                Admin
              </span>
            )}
          </div>

          {/* Divider + page title */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-px h-4 bg-border" />
            <span className="text-[14px] text-muted-foreground font-medium truncate max-w-[180px]">
              {pageTitle}
            </span>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-1.5">

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false) }}
              aria-label="Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl
                text-muted-foreground hover:text-foreground hover:bg-muted
                transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="h-[18px] w-[18px]" />
              {localUnread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-accent
                  flex items-center justify-center text-[9px] font-bold text-white leading-none">
                  {localUnread > 9 ? "9+" : localUnread}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-[calc(100%+8px)] w-[300px] sm:w-[340px]
                    bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-foreground">
                      Notifications
                      {localUnread > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                          bg-accent/15 text-accent">
                          {localUnread}
                        </span>
                      )}
                    </span>
                    {localUnread > 0 && (
                      <button
                        onClick={() => {
                          startTransition(async () => {
                            await markAllNotificationsReadAction()
                            setLocalNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })))
                            setLocalUnread(0)
                          })
                        }}
                        className="text-[12px] text-primary hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {localNotifs.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-[13px] text-muted-foreground">No new notifications</p>
                    </div>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
                      {localNotifs.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 transition-colors
                            ${n.isRead ? "opacity-60" : "bg-primary/3 hover:bg-muted/50"}
                          `}
                          onClick={() => {
                            if (!n.isRead) {
                              startTransition(async () => {
                                await markNotificationReadAction(n.id)
                                setLocalNotifs((prev) =>
                                  prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x)
                                )
                                setLocalUnread((c) => Math.max(0, c - 1))
                              })
                            }
                            if (n.link) router.push(n.link)
                            setNotifOpen(false)
                          }}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                            ${n.isRead ? "bg-muted" : "bg-primary/10"}`}>
                            <NotifIcon type={n.type} />
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer">
                            <p className="text-[13px] font-semibold text-foreground leading-snug">{n.title}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                            <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar + dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false) }}
              aria-label="Account menu"
              aria-expanded={dropdownOpen}
              className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-xl
                hover:bg-muted transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Avatar circle */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{ background: "oklch(0.28 0.12 265 / 12%)", color: "oklch(0.28 0.12 265)" }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
                  : initials
                }
              </div>

              {/* Name (desktop only) */}
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-[13px] font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[11px] text-muted-foreground capitalize mt-0.5">
                  {role === "ADMIN" ? "Administrator" : "Seller"}
                </span>
              </div>

              <ChevronDown
                className={`hidden md:block h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-[calc(100%+8px)] w-[240px]
                    bg-background border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  {/* User info */}
                  <div className="px-4 py-3.5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                        style={{ background: "oklch(0.28 0.12 265 / 12%)", color: "oklch(0.28 0.12 265)" }}>
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
                          : initials
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5">
                    <Link
                      href={role === "ADMIN" ? "/admin/profile" : "/profile"}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-foreground
                        hover:bg-muted transition-colors duration-100"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      My Profile
                    </Link>
                  </div>

                  {/* Theme toggle */}
                  <div className="px-4 py-3 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Appearance
                    </p>
                    <div className="grid grid-cols-3 gap-1 bg-muted rounded-xl p-1">
                      {THEMES.map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium
                            transition-all duration-150
                            ${mounted && theme === value
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="py-1.5 border-t border-border">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium
                        text-destructive hover:bg-destructive/8 transition-colors duration-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
