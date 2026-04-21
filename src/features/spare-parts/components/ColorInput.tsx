"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { X, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ColorInputProps {
  colors: string[]
  onChange: (colors: string[]) => void
  disabled?: boolean
  error?: string
}

export function ColorInput({ colors, onChange, disabled, error }: ColorInputProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function addColor() {
    const trimmed = input.trim()
    if (!trimmed) return
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    if (colors.includes(normalized)) {
      setInput("")
      return
    }
    onChange([...colors, normalized])
    setInput("")
    inputRef.current?.focus()
  }

  function removeColor(color: string) {
    onChange(colors.filter((c) => c !== color))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addColor()
    }
    if (e.key === "Backspace" && !input && colors.length > 0) {
      onChange(colors.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      {/* Color chips */}
      {colors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {colors.map((color) => (
            <span
              key={color}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/20 text-[12px] font-medium text-foreground"
            >
              {color}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type color and press Enter (e.g. Midnight Black)"
            className="flex-1 text-[13px]"
          />
          <button
            type="button"
            onClick={addColor}
            disabled={!input.trim()}
            className="flex h-9 items-center gap-1 px-3 rounded-lg border border-border bg-muted/40 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-destructive">{error}</p>
      )}
    </div>
  )
}
