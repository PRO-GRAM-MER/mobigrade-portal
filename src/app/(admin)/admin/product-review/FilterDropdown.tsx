"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Check, ChevronDown }                     from "lucide-react";

export interface DropdownOption {
  value:  string;
  label:  string;
}

interface Props {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  DropdownOption[];
  /** Show a coloured dot for the active selection */
  accent?: boolean;
}

const PANEL: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  show:   { opacity: 1, scale: 1,    y: 0,
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, scale: 0.96, y: -4,
    transition: { duration: 0.1,  ease: "easeIn" } },
};

export default function FilterDropdown({ label, value, onChange, options, accent }: Props) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const active = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const isFiltered = !!value;

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            6,
          padding:        "7px 12px",
          borderRadius:   "var(--radius-md)",
          border:         `1.5px solid ${isFiltered ? "var(--color-primary)" : "var(--color-border)"}`,
          background:     isFiltered ? "rgba(47,53,103,0.06)" : "var(--color-background)",
          fontSize:       "0.8125rem",
          fontWeight:     isFiltered ? 600 : 400,
          color:          isFiltered ? "var(--color-primary)" : "var(--color-muted-foreground)",
          cursor:         "pointer",
          whiteSpace:     "nowrap",
          transition:     "border-color 0.15s, background 0.15s, color 0.15s",
          userSelect:     "none",
        }}
      >
        {/* Dot for filtered state */}
        {accent && isFiltered && (
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--color-accent)", flexShrink: 0,
          }} />
        )}
        <span>{active ? active.label : label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          style={{ display: "flex", alignItems: "center" }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            variants={PANEL}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              position:     "absolute",
              top:          "calc(100% + 6px)",
              left:         0,
              zIndex:       50,
              minWidth:     "100%",
              background:   "var(--color-surface)",
              border:       "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow:    "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
              overflow:     "hidden",
              transformOrigin: "top left",
            }}
          >
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"space-between",
                    gap:           8,
                    width:         "100%",
                    padding:       "8px 14px",
                    background:    selected ? "rgba(47,53,103,0.07)" : "transparent",
                    border:        "none",
                    cursor:        "pointer",
                    fontSize:      "0.8125rem",
                    fontWeight:    selected ? 600 : 400,
                    color:         selected ? "var(--color-primary)" : "var(--color-muted)",
                    textAlign:     "left",
                    whiteSpace:    "nowrap",
                    transition:    "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--color-background)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = selected ? "rgba(47,53,103,0.07)" : "transparent";
                  }}
                >
                  <span>{opt.label}</span>
                  {selected && <Check size={12} style={{ color: "var(--color-accent)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
