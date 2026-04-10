"use client";

import { useState, useRef }   from "react";
import { useRouter }          from "next/navigation";
import { Search, X }          from "lucide-react";
import FilterDropdown         from "./FilterDropdown";
import r                      from "./review.module.css";

// ─── Constants (duplicated from page.tsx for client use) ──────────────────────

const CATEGORY_OPTIONS = [
  { value: "",            label: "All categories" },
  { value: "SPARE_PARTS", label: "Spare Parts"    },
  { value: "VRP",         label: "VRP"            },
  { value: "NEW_PHONES",  label: "New Phones"     },
  { value: "PREXO",       label: "PREXO"          },
  { value: "OPEN_BOX",    label: "Open Box"       },
];

const SOURCE_OPTIONS = [
  { value: "",       label: "All sources"  },
  { value: "csv",    label: "CSV Upload"   },
  { value: "manual", label: "Manual Entry" },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialQ:      string;
  initialCat:    string;
  initialSource: string;
  initialFrom:   string;
  initialTo:     string;
  currentStatus: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReviewFilterBar({
  initialQ,
  initialCat,
  initialSource,
  initialFrom,
  initialTo,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [q,      setQ]      = useState(initialQ);
  const [cat,    setCat]    = useState(initialCat);
  const [source, setSource] = useState(initialSource);
  const [from,   setFrom]   = useState(initialFrom);
  const [to,     setTo]     = useState(initialTo);

  const searchRef = useRef<HTMLInputElement>(null);

  function buildUrl(overrides: Record<string, string | undefined> = {}) {
    const vals: Record<string, string | undefined> = {
      q:      q.trim()  || undefined,
      status: currentStatus !== "ALL" ? currentStatus : undefined,
      cat:    cat        || undefined,
      source: source     || undefined,
      from:   from       || undefined,
      to:     to         || undefined,
      page:   "1",
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(vals)) if (v) params.set(k, v);
    const str = params.toString();
    return `/admin/product-review${str ? `?${str}` : ""}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl());
  }

  function handleClear() {
    setQ(""); setCat(""); setSource(""); setFrom(""); setTo("");
    router.push(currentStatus !== "ALL"
      ? `/admin/product-review?status=${currentStatus}`
      : "/admin/product-review"
    );
  }

  // Push immediately when a dropdown changes (no submit needed)
  function handleCatChange(v: string) {
    setCat(v);
    router.push(buildUrl({ cat: v || undefined }));
  }

  function handleSourceChange(v: string) {
    setSource(v);
    router.push(buildUrl({ source: v || undefined }));
  }

  const hasFilters = q.trim() || cat || source || from || to;

  return (
    <form onSubmit={handleSearch} className={r.filterBar}>

      {/* Search */}
      <div className={r.searchWrap}>
        <Search size={14} className={r.searchIcon} />
        <input
          ref={searchRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search seller, brand, model…"
          className={r.searchInput}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); router.push(buildUrl({ q: undefined })); }}
            style={{
              position: "absolute", right: 8, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-muted-foreground)", padding: 2,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0 }} />

      {/* Category dropdown */}
      <FilterDropdown
        label="Category"
        value={cat}
        onChange={handleCatChange}
        options={CATEGORY_OPTIONS}
        accent
      />

      {/* Source dropdown */}
      <FilterDropdown
        label="Source"
        value={source}
        onChange={handleSourceChange}
        options={SOURCE_OPTIONS}
        accent
      />

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0 }} />

      {/* Date range */}
      <div className={r.dateRange}>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={r.filterDate}
          title="From date"
        />
        <span className={r.dateSep}>–</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={r.filterDate}
          title="To date"
        />
      </div>

      {/* Search submit */}
      <button type="submit" className={r.searchBtn}>Search</button>

      {/* Clear */}
      {hasFilters && (
        <button type="button" onClick={handleClear} className={r.clearBtn}>
          <X size={12} /> Clear
        </button>
      )}

    </form>
  );
}
