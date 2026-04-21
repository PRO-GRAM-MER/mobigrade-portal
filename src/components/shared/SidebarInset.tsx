"use client"

import { useUIStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"

export function SidebarInset({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-w-0 pt-14",
        "transition-[padding-left] duration-300 ease-in-out",
        collapsed ? "lg:pl-16" : "lg:pl-[240px]"
      )}
    >
      {children}
    </div>
  )
}
