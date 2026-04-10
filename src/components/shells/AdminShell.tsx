"use client";

import { useState } from "react";
import AdminSidebar from "@/components/nav/AdminSidebar";
import AppHeader from "@/components/nav/AppHeader";

type Props = {
  userName:    string;
  unreadCount: number;
  children:    React.ReactNode;
};

export default function AdminShell({ userName, unreadCount, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>
      <AdminSidebar isOpen={open} onClose={() => setOpen(false)} userName={userName} />
      <AppHeader userName={userName} role="ADMIN" onMenuClick={() => setOpen(true)} unreadCount={unreadCount} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
