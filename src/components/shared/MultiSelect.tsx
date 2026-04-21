"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

interface Opt { value: string; label: string }

function norm(o: string | { value: string; label?: string }): Opt {
  return typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value };
}

interface MultiSelectProps {
  label:       string;
  options:     (string | { value: string; label?: string })[];
  value:       string[];
  onChange:    (val: string[]) => void;
  placeholder?: string;
  searchable?:  boolean;
  /** @deprecated — ignored, kept for API compatibility */
  maxWidth?:    number;
}

export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Any",
  searchable  = false,
}: MultiSelectProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const [pos,   setPos]   = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);

  const opts       = useMemo(() => options.map(norm), [options]);
  const filtered   = query ? opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : opts;
  const active     = value.length > 0;
  const allChecked = active && value.length === opts.length;

  /* ── Measure trigger position ─────────────────────────────────────────── */
  function measure() {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    // flip above if not enough space below
    const spaceBelow = window.innerHeight - r.bottom;
    const dropHeight = Math.min(opts.length * 38 + 100, 320);
    const top = spaceBelow < dropHeight ? r.top - dropHeight - 4 : r.bottom + 4;
    setPos({ top, left: r.left, width: Math.max(r.width, 220) });
  }

  function openDrop()  { measure(); setOpen(true);  }
  function closeDrop() { setOpen(false); setQuery(""); }

  /* ── Close on outside click + reposition on scroll ───────────────────── */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) closeDrop();
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

  /* ── Actions ──────────────────────────────────────────────────────────── */
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  function toggleAll() { onChange(allChecked ? [] : opts.map((o) => o.value)); }
  function clearAll(e: React.MouseEvent) { e.stopPropagation(); onChange([]); }

  const triggerText =
    active
      ? value.length === 1
        ? (opts.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} selected`
      : placeholder;

  return (
    <>
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <div className="ms-root">
        <span className="ms-label">{label}</span>
        <button
          ref={triggerRef}
          type="button"
          className={`ms-trigger${active ? " ms-trigger--active" : ""}${open ? " ms-trigger--open" : ""}`}
          onClick={() => (open ? closeDrop() : openDrop())}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="ms-trigger-text">{triggerText}</span>
          {active ? (
            <span className="ms-count" onMouseDown={clearAll} role="button" tabIndex={-1}>
              {value.length} <X size={8} strokeWidth={3} />
            </span>
          ) : (
            <ChevronDown size={13} className={`ms-chevron${open ? " ms-chevron--open" : ""}`} />
          )}
        </button>
      </div>

      {/* ── Dropdown (fixed, never clipped) ─────────────────────────────── */}
      {open && pos && (
        <div
          ref={dropRef}
          className="ms-dropdown"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search */}
          {searchable && (
            <div className="ms-search-wrap">
              <Search size={13} className="ms-search-icon" />
              <input
                autoFocus
                className="ms-search"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="ms-search-clear" onClick={() => setQuery("")}>
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {/* Select all row */}
          {opts.length > 1 && !query && (
            <div className="ms-header">
              <button type="button" className="ms-select-all-btn" onClick={toggleAll}>
                <span className={`ms-checkbox${allChecked ? " ms-checkbox--checked" : value.length > 0 ? " ms-checkbox--indeterminate" : ""}`}>
                  {allChecked && <Check size={9} strokeWidth={3} color="#fff" />}
                  {!allChecked && value.length > 0 && <span className="ms-dash" />}
                </span>
                <span>{allChecked ? "Deselect all" : "Select all"}</span>
              </button>
              {value.length > 0 && !allChecked && (
                <span className="ms-header-count">{value.length}/{opts.length}</span>
              )}
            </div>
          )}

          {/* Options list */}
          <ul className="ms-list">
            {filtered.length === 0 ? (
              <li className="ms-empty">No results for &ldquo;{query}&rdquo;</li>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    className={`ms-option${checked ? " ms-option--checked" : ""}`}
                    onClick={() => toggle(opt.value)}
                    role="option"
                    aria-selected={checked}
                  >
                    <span className={`ms-checkbox${checked ? " ms-checkbox--checked" : ""}`}>
                      {checked && <Check size={9} strokeWidth={3} color="#fff" />}
                    </span>
                    <span className="ms-option-label">{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          {value.length > 0 && (
            <div className="ms-footer">
              <button type="button" className="ms-clear-all" onClick={() => { onChange([]); closeDrop(); }}>
                Clear selection
              </button>
              <button type="button" className="ms-done-btn" onClick={closeDrop}>
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
