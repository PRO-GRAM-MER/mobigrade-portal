"use client";

import { useState } from "react";
import SellerSidebar from "@/components/nav/SellerSidebar";
import AppHeader from "@/components/nav/AppHeader";

type Props = {
  userName:    string;
  unreadCount: number;
  children:    React.ReactNode;
};

export default function SellerShell({ userName, unreadCount, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-background)" }}>
      <SellerSidebar isOpen={open} onClose={() => setOpen(false)} userName={userName} />
      <AppHeader userName={userName} role="SELLER" onMenuClick={() => setOpen(true)} unreadCount={unreadCount} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
