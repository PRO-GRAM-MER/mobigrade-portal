"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import classes from "./filterControls.module.css";

type Props = {
  value?: string;
  onSearch: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value = "",
  onSearch,
  placeholder = "Search…",
  className = "",
}: Props) {
  const [input, setInput] = useState(value);

  useEffect(() => { setInput(value); }, [value]);

  function commit() { onSearch(input.trim()); }
  function clear()  { setInput(""); onSearch(""); }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter")  commit();
    if (e.key === "Escape") clear();
  }

  return (
    <div className={`${classes.searchWrap} ${className}`}>
      <input
        type="text"
        className={`${classes.searchInput} ${input ? classes.searchInputWithClear : ""}`}
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {input && (
        <button type="button" className={classes.clearBtn} onClick={clear} aria-label="Clear">
          <X size={13} strokeWidth={2.5} />
        </button>
      )}
      <button type="button" className={classes.searchBtn} onClick={commit} aria-label="Search">
        <Search size={15} />
      </button>
    </div>
  );
}
