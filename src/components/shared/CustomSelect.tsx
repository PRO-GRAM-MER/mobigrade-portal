"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import classes from "./filterControls.module.css";

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  value: string;
  defaultId?: string;
  onChange: (id: string) => void;
  className?: string;
};

export function CustomSelect({ options, value, defaultId, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const resolvedDefaultId = defaultId ?? options[0]?.id;
  const isFiltered = value !== resolvedDefaultId && value !== undefined;
  const selected = options.find(o => o.id === value) ?? options[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const triggerClass = [
    classes.selectTrigger,
    open ? classes.selectTriggerOpen : "",
    isFiltered && !open ? classes.selectTriggerActive : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={wrapRef} className={`${classes.selectWrap} ${className}`}>
      <button type="button" className={triggerClass} onClick={() => setOpen(v => !v)}>
        {isFiltered && <span className={classes.selectDot} />}
        <span className={classes.selectTriggerText}>{selected?.label}</span>
        <motion.span
          className={classes.selectChevron}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ display: "flex" }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className={classes.selectMenu}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {options.map((opt, i) => {
              const isActive = opt.id === value;
              return (
                <motion.li
                  key={opt.id}
                  className={`${classes.selectItem} ${isActive ? classes.selectItemActive : ""}`}
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.14 }}
                >
                  <span className={classes.selectItemCheck}>
                    {isActive && <Check size={12} strokeWidth={3} />}
                  </span>
                  {opt.label}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
