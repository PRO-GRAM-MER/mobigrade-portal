"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useRef, useTransition } from "react"
import { Search, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS = [
  { value: "_all", label: "Select Status" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

export function SellerFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const search = searchParams.get("search") ?? ""
  const status = searchParams.get("status") ?? ""

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  function clearSearch() {
    updateParam("search", "")
    if (inputRef.current) inputRef.current.value = ""
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search with icon-button + inline clear */}
      <div className="relative w-full sm:max-w-xs group">
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="absolute left-0 inset-y-0 flex items-center justify-center w-9 text-muted-foreground hover:text-foreground transition-colors rounded-l-lg"
          tabIndex={-1}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by email or phone…"
          defaultValue={search}
          onChange={(e) => updateParam("search", e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors dark:bg-input/30 dark:hover:bg-input/50"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 inset-y-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter — always controlled with string value */}
      <Select
        value={status || "_all"}
        onValueChange={(val) => updateParam("status", val === "_all" ? "" : (val ?? ""))}
      >
        <SelectTrigger className="w-full sm:w-44 h-9">
          <SelectValue placeholder="Select Status">
            {STATUS_OPTIONS.find((o) => o.value === (status || "_all"))?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start">
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
