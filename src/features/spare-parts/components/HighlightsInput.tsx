"use client"

import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface HighlightsInputProps {
  highlights: string[]
  onChange: (h: string[]) => void
  disabled?: boolean
}

const MAX_HIGHLIGHTS = 8

export function HighlightsInput({ highlights, onChange, disabled }: HighlightsInputProps) {
  function addRow() {
    if (highlights.length >= MAX_HIGHLIGHTS) return
    onChange([...highlights, ""])
  }

  function removeRow(i: number) {
    onChange(highlights.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, val: string) {
    const next = [...highlights]
    next[i] = val
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {highlights.map((h, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-[12px] font-semibold text-muted-foreground w-5 flex-shrink-0 text-right">
            {i + 1}.
          </span>
          <Input
            placeholder={`Highlight ${i + 1}`}
            value={h}
            onChange={(e) => updateRow(i, e.target.value)}
            disabled={disabled}
            className="flex-1 text-[13px]"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {!disabled && highlights.length < MAX_HIGHLIGHTS && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/70 transition-colors mt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Highlight
        </button>
      )}
    </div>
  )
}
