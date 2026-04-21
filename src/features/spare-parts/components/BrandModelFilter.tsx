"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, X, Search, Check, ChevronRight } from "lucide-react"

export interface BrandOption {
  name: string
  models: { id: string; name: string }[]
}

interface Props {
  brands: BrandOption[]
  selectedBrand: string | null
  selectedModelId: string | null
  selectedModelName: string | null
  onChange: (brand: string | null, modelId: string | null, modelName: string | null) => void
}

export function BrandModelFilter({ brands, selectedBrand, selectedModelId, selectedModelName, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSearch("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const q = search.toLowerCase().trim()
  const filtered = q
    ? brands.map(b => ({
        ...b,
        models: b.models.filter(m => m.name.toLowerCase().includes(q)),
      })).filter(b => b.name.toLowerCase().includes(q) || b.models.length > 0)
    : brands

  function toggleExpand(brand: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(brand) ? next.delete(brand) : next.add(brand)
      return next
    })
  }

  const isActive = !!selectedBrand
  const label = isActive
    ? selectedModelName
      ? `${selectedBrand} · ${selectedModelName}`
      : selectedBrand
    : "Brand / Model"

  function select(brand: string, modelId: string | null, modelName: string | null) {
    onChange(brand, modelId, modelName)
    setOpen(false)
    setSearch("")
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null, null, null)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[13px] font-medium transition-all max-w-[200px] ${
          isActive
            ? "border-primary bg-primary/8 text-primary shadow-sm"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        <span className="truncate">{label}</span>
        {isActive
          ? <span onClick={clear} className="ml-0.5 opacity-60 hover:opacity-100 flex-shrink-0 transition-opacity"><X className="h-3 w-3" /></span>
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-40 bg-card border border-border rounded-2xl shadow-xl w-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search brand or model…"
                className="w-full h-7 pl-8 pr-7 text-[12px] bg-muted/50 border border-border rounded-lg
                  placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring
                  focus:bg-background transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-muted-foreground text-center py-6">No results</p>
            ) : filtered.map(brand => {
              const isBrandSel = selectedBrand === brand.name && !selectedModelId
              const isExpanded = q ? true : expanded.has(brand.name)

              return (
                <div key={brand.name}>
                  {/* Brand row */}
                  <div className="flex items-center group">
                    <button
                      onClick={() => select(brand.name, null, null)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-muted/60 ${
                        isBrandSel ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {isBrandSel && <Check className="h-3 w-3 flex-shrink-0" />}
                      <span className={isBrandSel ? "" : "ml-0"}>{brand.name}</span>
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground">{brand.models.length}</span>
                    </button>
                    {!q && (
                      <button
                        onClick={() => toggleExpand(brand.name)}
                        className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Models */}
                  {isExpanded && brand.models.map(model => {
                    const isModelSel = selectedModelId === model.id
                    return (
                      <button
                        key={model.id}
                        onClick={() => select(brand.name, model.id, model.name)}
                        className={`w-full flex items-center justify-between pl-7 pr-3 py-1.5 text-[12px] transition-colors hover:bg-muted/60 ${
                          isModelSel ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <span>{model.name}</span>
                        {isModelSel && <Check className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
