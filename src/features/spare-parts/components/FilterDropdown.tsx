"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, X, Check, Search } from "lucide-react"

interface Option { value: string; label: string; dot?: string }

interface Props {
  label: string
  options: Option[]
  value: string | null
  onChange: (v: string | null) => void
  icon?: React.ReactNode
  width?: string
  searchable?: boolean
}

export function FilterDropdown({ label, options, value, onChange, icon, width = "min-w-[160px]", searchable }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const showSearch = searchable ?? options.length > 6

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSearch("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    if (open && showSearch) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open, showSearch])

  const selected = options.find(o => o.value === value)
  const isActive = !!selected

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[13px] font-medium transition-all ${
          isActive
            ? "border-primary bg-primary/8 text-primary shadow-sm"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        {icon && <span className="text-current">{icon}</span>}
        <span>{selected?.label ?? label}</span>
        {isActive
          ? <span onClick={e => { e.stopPropagation(); onChange(null) }} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></span>
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className={`absolute top-full mt-2 left-0 z-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden ${width}`}>
          {showSearch && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-7 pl-8 pr-3 text-[12px] bg-muted/50 border border-border rounded-lg
                    placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring
                    focus:bg-background transition-colors"
                />
              </div>
            </div>
          )}
          <div className="py-1 max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-4">No match</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(value === opt.value ? null : opt.value); setOpen(false); setSearch("") }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-muted/60 ${
                    value === opt.value ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {opt.dot && <span className={`h-2 w-2 rounded-full flex-shrink-0 ${opt.dot}`} />}
                  <span className="flex-1 text-left">{opt.label}</span>
                  {value === opt.value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
