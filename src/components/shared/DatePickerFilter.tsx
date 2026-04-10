"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";

interface Props {
  value:            string | null;
  onChange:         (date: string | null) => void;
  highlightedDates: string[];
}

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DOW    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

interface CalDay { date: string; day: number; cur: boolean; today: boolean }

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

function buildCal(year: number, month: number): CalDay[] {
  const today = toYMD(new Date());
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: CalDay[] = [];

  for (let i = first.getDay() - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: toYMD(d), day: d.getDate(), cur: false, today: false });
  }
  for (let n = 1; n <= last.getDate(); n++) {
    const d   = new Date(year, month, n);
    const ymd = toYMD(d);
    days.push({ date: ymd, day: n, cur: true, today: ymd === today });
  }
  const rem = 7 - (days.length % 7);
  if (rem < 7) {
    for (let i = 1; i <= rem; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: toYMD(d), day: i, cur: false, today: false });
    }
  }
  return days;
}

export default function DatePickerFilter({ value, onChange, highlightedDates }: Props) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<{ top: number; left: number } | null>(null);

  const init       = value ? new Date(value + "T00:00:00") : new Date();
  const [yr, setYr] = useState(init.getFullYear());
  const [mo, setMo] = useState(init.getMonth());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef     = useRef<HTMLDivElement>(null);

  // Sync month when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setYr(d.getFullYear()); setMo(d.getMonth());
    }
  }, [value]);

  function measure() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < 310 ? r.top - 310 : r.bottom + 4;
    setPos({ top, left: r.left });
  }

  function openPicker()  { measure(); setOpen(true);  }
  function closePicker() { setOpen(false); }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popRef.current?.contains(t)) closePicker();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hlSet  = useMemo(() => new Set(highlightedDates), [highlightedDates]);
  const calDays = useMemo(() => buildCal(yr, mo), [yr, mo]);

  function prevMonth() { mo === 0 ? (setMo(11), setYr((y) => y - 1)) : setMo((m) => m - 1); }
  function nextMonth() { mo === 11 ? (setMo(0), setYr((y) => y + 1)) : setMo((m) => m + 1); }

  function select(d: CalDay) {
    if (!d.cur) return;
    onChange(value === d.date ? null : d.date);
    closePicker();
  }

  const displayLabel = value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        .format(new Date(value + "T00:00:00"))
    : "All dates";

  return (
    <>
      <div className="ms-root">
        <span className="ms-label">Date</span>
        <button
          ref={triggerRef}
          type="button"
          className={`ms-trigger${value ? " ms-trigger--active" : ""}${open ? " ms-trigger--open" : ""}`}
          onClick={() => (open ? closePicker() : openPicker())}
        >
          <CalendarDays size={13} style={{ flexShrink: 0, marginRight: 2 }} />
          <span className="ms-trigger-text">{displayLabel}</span>
          {value && (
            <span
              className="ms-count"
              onMouseDown={(e) => { e.stopPropagation(); onChange(null); }}
              role="button"
              tabIndex={-1}
            >
              <X size={9} strokeWidth={3} />
            </span>
          )}
        </button>
      </div>

      {open && pos && (
        <div
          ref={popRef}
          className="dp-popup"
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          {/* Header */}
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>
              <ChevronLeft size={14} />
            </button>
            <span className="dp-month-label">{MONTHS[mo]} {yr}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Calendar */}
          <div className="dp-grid">
            {DOW.map((d) => <span key={d} className="dp-dow">{d}</span>)}
            {calDays.map((day) => {
              const sel = day.date === value;
              const hl  = hlSet.has(day.date) && day.cur;
              let cls = "dp-day";
              if (!day.cur)    cls += " dp-day--other";
              else if (sel)    cls += " dp-day--selected";
              else if (hl)     cls += " dp-day--highlighted";
              else if (day.today) cls += " dp-day--today";
              return (
                <button key={day.date} type="button" className={cls}
                  onClick={() => select(day)} disabled={!day.cur}
                  title={hl ? "Has uploads" : undefined}
                >
                  {day.day}
                  {hl && !sel && <span className="dp-dot" />}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="dp-legend">
            <span className="dp-legend-dot" />
            <span className="dp-legend-text">Has uploads</span>
          </div>
        </div>
      )}
    </>
  );
}
