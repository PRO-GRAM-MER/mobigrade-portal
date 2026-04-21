"use client"

import { useState, useRef, useEffect } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 } // Mon=0
function toKey(d: Date) { return d.toISOString().split("T")[0] }
function todayKey() { return toKey(new Date()) }
function fmtKey(k: string) {
  const [y, m, d] = k.split("-").map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`
}

interface Props {
  dateCounts: Map<string, number>
  selected: string | null
  onChange: (d: string | null) => void
}

export function CalendarFilter({ dateCounts, selected, onChange }: Props) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [viewY, setViewY] = useState(now.getFullYear())
  const [viewM, setViewM] = useState(now.getMonth())
  const [hovered, setHovered] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  function prevM() { viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1) }
  function nextM() { viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1) }

  const dim = daysInMonth(viewY, viewM)
  const fwd = firstWeekday(viewY, viewM)
  const tk = todayKey()
  const focusKey = hovered ?? selected
  const focusCount = focusKey ? (dateCounts.get(focusKey) ?? 0) : null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[13px] font-medium transition-all ${
          selected
            ? "border-primary bg-primary/8 text-primary shadow-sm"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{selected ? fmtKey(selected) : "Date"}</span>
        {selected && (
          <span
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-40 bg-card border border-border rounded-2xl shadow-xl p-4 w-[280px]">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevM} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-[13px] font-semibold text-foreground">{MONTHS[viewM]} {viewY}</span>
            <button onClick={nextM} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 py-1 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: fwd }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: dim }).map((_, i) => {
              const day = i + 1
              const key = `${viewY}-${String(viewM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const count = dateCounts.get(key) ?? 0
              const isSel = selected === key
              const isToday = key === tk
              const hasData = count > 0

              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-0.5"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <button
                    onClick={() => { if (!hasData) return; onChange(isSel ? null : key); setOpen(false) }}
                    className={`h-7 w-7 rounded-full text-[12px] font-medium transition-all flex items-center justify-center ${
                      isSel
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isToday && hasData
                        ? "ring-1 ring-primary text-primary hover:bg-primary/10"
                        : isToday
                        ? "ring-1 ring-border text-muted-foreground"
                        : hasData
                        ? "hover:bg-muted text-foreground"
                        : "text-muted-foreground/30 cursor-default"
                    }`}
                  >
                    {day}
                  </button>
                  {/* upload dot */}
                  <div className="h-1 flex items-center justify-center gap-0.5">
                    {hasData && (
                      count >= 3
                        ? <><span className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground/80" : "bg-primary"}`} /><span className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground/80" : "bg-primary"}`} /><span className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground/80" : "bg-primary/40"}`} /></>
                        : Array.from({ length: count }).map((_, di) => (
                            <span key={di} className={`h-1 w-1 rounded-full ${isSel ? "bg-primary-foreground/80" : "bg-primary"}`} />
                          ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Status bar */}
          <div className="mt-4 pt-3 border-t border-border min-h-[36px] flex items-center justify-center">
            {focusKey && focusCount !== null ? (
              <div className="text-center">
                <span className="text-[12px] font-medium text-foreground">{fmtKey(focusKey)}</span>
                <span className="text-[12px] text-muted-foreground ml-1.5">
                  — {focusCount > 0 ? `${focusCount} part${focusCount !== 1 ? "s" : ""} uploaded` : "no uploads"}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60">Highlighted dates have uploads</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
