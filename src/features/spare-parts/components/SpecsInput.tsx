"use client"

import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Spec {
  key: string
  value: string
}

interface SpecsInputProps {
  specs: Spec[]
  onChange: (specs: Spec[]) => void
  disabled?: boolean
}

export function SpecsInput({ specs, onChange, disabled }: SpecsInputProps) {
  function addRow() {
    onChange([...specs, { key: "", value: "" }])
  }

  function removeRow(i: number) {
    onChange(specs.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: "key" | "value", val: string) {
    const next = [...specs]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {specs.map((spec, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            placeholder="e.g. Material"
            value={spec.key}
            onChange={(e) => updateRow(i, "key", e.target.value)}
            disabled={disabled}
            className="flex-1 text-[13px]"
          />
          <Input
            placeholder="e.g. Tempered Glass"
            value={spec.value}
            onChange={(e) => updateRow(i, "value", e.target.value)}
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

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/70 transition-colors mt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Spec
        </button>
      )}
    </div>
  )
}
