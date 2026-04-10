"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu, User, CheckCheck } from "lucide-react";
import s from "./appHeader.module.css";
import {
  listRecentNotificationsAction,
  markAllReadAction,
  type NotificationRow,
} from "@/actions/notification-actions";

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_DOT: Record<string, string> = {
  KYC_APPROVED:       "#00A167",
  KYC_REJECTED:       "#D92D20",
  KYC_SUBMITTED:      "#6366F1",
  DRAFT_APPROVED:     "#00A167",
  DRAFT_REJECTED:     "#D92D20",
  DRAFT_NEEDS_CHANGES:"#F59E0B",
  DRAFT_SUBMITTED:    "#6366F1",
  ORDER_CONFIRMED:    "#2F3567",
  ORDER_SHIPPED:      "#0EA5E9",
  ORDER_DELIVERED:    "#00A167",
  ORDER_CANCELLED:    "#D92D20",
};

type Props = {
  userName:    string;
  role:        "ADMIN" | "SELLER";
  onMenuClick: () => void;
  unreadCount: number;
};

export default function AppHeader({ userName, role, onMenuClick, unreadCount }: Props) {
  const [dropOpen,  setDropOpen]  = useState(false);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifs,    setNotifs]    = useState<NotificationRow[]>([]);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const [loading,   setLoading]   = useState(false);
  const [isPending, startTransition] = useTransition();

  const dropRef  = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLDivElement>(null);

  // Sync prop changes (after server revalidation)
  useEffect(() => { setLocalUnread(unreadCount); }, [unreadCount]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    if (dropOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropOpen]);

  // Close bell panel on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    if (bellOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  async function openBell() {
    if (bellOpen) { setBellOpen(false); return; }
    setBellOpen(true);
    setLoading(true);
    const rows = await listRecentNotificationsAction(15);
    setNotifs(rows);
    setLoading(false);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      setLocalUnread(0);
    });
  }

  const displayCount = Math.min(localUnread, 99);

  return (
    <header className={s.header}>
      {/* Left: hamburger + brand */}
      <div className={s.left}>
        <button className={s.iconBtn} onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className={s.brand}>
          <div className={s.logoWrap}>
            <Image src="/logo.svg" alt="MobiGrade" width={16} height={16} />
          </div>
          <span className={s.brandName}>MobiGrade Portal</span>
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div className={s.right}>
        {/* ── Notification bell ── */}
        <div className={s.bellWrap} ref={bellRef}>
          <button className={s.iconBtn} aria-label="Notifications" onClick={openBell}>
            <Bell size={17} />
            {displayCount > 0 && (
              <span className={s.badge}>{displayCount}</span>
            )}
          </button>

          {bellOpen && (
            <div className={s.notifPanel}>
              {/* Panel header */}
              <div className={s.notifHeader}>
                <span className={s.notifTitle}>Notifications</span>
                {localUnread > 0 && (
                  <button
                    className={s.markAllBtn}
                    onClick={handleMarkAllRead}
                    disabled={isPending}
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className={s.notifList}>
                {loading ? (
                  <p className={s.notifEmpty}>Loading…</p>
                ) : notifs.length === 0 ? (
                  <p className={s.notifEmpty}>No notifications yet.</p>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`${s.notifItem} ${!n.read ? s["notifItem--unread"] : ""}`}
                    >
                      <span
                        className={s.notifDot}
                        style={{ background: TYPE_DOT[n.type] ?? "#94A3B8" }}
                      />
                      <div className={s.notifBody}>
                        <p className={s.notifItemTitle}>{n.title}</p>
                        <p className={s.notifMsg}>{n.message}</p>
                        <p className={s.notifTime}>{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Avatar dropdown ── */}
        <div className={s.dropdownWrap} ref={dropRef}>
          <button className={s.avatarTrigger} onClick={() => setDropOpen(v => !v)}>
            <div className={s.avatar}>{getInitials(userName)}</div>
            <span className={s.avatarName}>{userName.split(" ")[0]}</span>
          </button>

          {dropOpen && (
            <div className={s.dropdown}>
              <div className={s.dropdownProfile}>
                <p className={s.dropdownName}>{userName}</p>
                <p className={s.dropdownRole}>{role}</p>
              </div>
              <Link
                href={role === "ADMIN" ? "/admin/profile" : "/profile"}
                className={s.dropdownItem}
                onClick={() => setDropOpen(false)}
              >
                <User size={14} />
                My Profile
              </Link>
              <button
                className={`${s.dropdownItem} ${s.dropdownItemDanger}`}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
