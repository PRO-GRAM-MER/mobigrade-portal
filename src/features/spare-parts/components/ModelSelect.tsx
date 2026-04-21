"use client"

import { useState, useMemo } from "react"
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ModelOption {
  id: string
  name: string
}

interface BrandOption {
  id: string
  name: string
  type: string
  models: ModelOption[]
}

interface ModelSelectProps {
  brands: BrandOption[]
  selected: string[] // model IDs
  onChange: (ids: string[]) => void
  error?: string
}

const TIER_ORDER = ["PREMIUM", "ACTIVE", "LEGACY"]
const TIER_LABELS: Record<string, string> = {
  PREMIUM: "Premium",
  ACTIVE: "Popular",
  LEGACY: "Legacy",
}

export function ModelSelect({ brands, selected, onChange, error }: ModelSelectProps) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const q = search.trim().toLowerCase()

  const filteredBrands = useMemo(() => {
    const sorted = [...brands].sort(
      (a, b) => TIER_ORDER.indexOf(a.type) - TIER_ORDER.indexOf(b.type)
    )
    if (!q) return sorted.map((b) => ({ ...b, filteredModels: b.models }))
    return sorted
      .map((b) => ({
        ...b,
        filteredModels: b.models.filter(
          (m) => m.name.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
        ),
      }))
      .filter((b) => b.filteredModels.length > 0)
  }, [brands, q])

  // Auto-expand brands that match search
  const visibleExpanded = useMemo(() => {
    if (q) {
      const autoExpand = new Set(filteredBrands.map((b) => b.id))
      return autoExpand
    }
    return expanded
  }, [q, filteredBrands, expanded])

  function toggleBrand(brandId: string) {
    if (q) return // auto-expanded during search
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(brandId)) next.delete(brandId)
      else next.add(brandId)
      return next
    })
  }

  function toggleModel(modelId: string) {
    if (selected.includes(modelId)) {
      onChange(selected.filter((id) => id !== modelId))
    } else {
      onChange([...selected, modelId])
    }
  }

  function toggleBrandAll(brand: BrandOption) {
    const brandModelIds = brand.models.map((m) => m.id)
    const allSelected = brandModelIds.every((id) => selected.includes(id))
    if (allSelected) {
      onChange(selected.filter((id) => !brandModelIds.includes(id)))
    } else {
      const next = new Set([...selected, ...brandModelIds])
      onChange(Array.from(next))
    }
  }

  // Selected models with their brand info for chips
  const selectedModels = useMemo(() => {
    const result: { id: string; name: string; brandName: string }[] = []
    for (const brand of brands) {
      for (const model of brand.models) {
        if (selected.includes(model.id)) {
          result.push({ id: model.id, name: model.name, brandName: brand.name })
        }
      }
    }
    return result
  }, [brands, selected])

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedModels.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-foreground"
            >
              <span className="text-muted-foreground">{m.brandName}</span>
              <span className="text-muted-foreground/50">·</span>
              {m.name}
              <button
                type="button"
                onClick={() => toggleModel(m.id)}
                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brand or model…"
          className="pl-8 h-8 text-[13px]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Brand tree */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-80 overflow-y-auto">
        {filteredBrands.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center py-6">No brands or models match</p>
        ) : (
          filteredBrands.map((brand) => {
            const isOpen = visibleExpanded.has(brand.id)
            const brandSelected = brand.models.filter((m) => selected.includes(m.id)).length
            const allBrandSelected = brand.models.length > 0 && brandSelected === brand.models.length

            return (
              <div key={brand.id}>
                {/* Brand header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleBrand(brand.id)}
                  onKeyDown={(e) => e.key === "Enter" && toggleBrand(brand.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer select-none"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-foreground flex-1">{brand.name}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {TIER_LABELS[brand.type]}
                  </span>
                  {brandSelected > 0 && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {brandSelected}/{brand.models.length}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleBrandAll(brand) }}
                    className={`text-[11px] font-medium transition-colors px-2 py-0.5 rounded ${
                      allBrandSelected
                        ? "text-destructive hover:text-destructive/70"
                        : "text-primary hover:text-primary/70"
                    }`}
                  >
                    {allBrandSelected ? "Clear" : "All"}
                  </button>
                </div>

                {/* Models grid */}
                {isOpen && (
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-background">
                    {brand.filteredModels.map((model) => {
                      const isSelected = selected.includes(model.id)
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => toggleModel(model.id)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-[12px] font-medium transition-all duration-100
                            ${isSelected
                              ? "border-primary/40 bg-primary/8 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/30 hover:text-foreground"
                            }`}
                        >
                          <span
                            className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors
                              ${isSelected ? "border-primary bg-primary" : "border-border bg-background"}`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </span>
                          <span className="truncate">{model.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {selected.length > 0 && (
        <p className="text-[12px] text-muted-foreground">{selected.length} model{selected.length !== 1 ? "s" : ""} selected</p>
      )}

      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  )
}
