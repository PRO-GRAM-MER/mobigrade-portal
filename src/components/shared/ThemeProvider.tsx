"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "mg-theme"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

function getResolved(t: Theme): ResolvedTheme {
  if (t === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  }
  return t
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")

  // Sync from localStorage on mount
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system"
    const resolved = getResolved(stored)
    setThemeState(stored)
    setResolvedTheme(resolved)
  }, [])

  // Listen for system preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    function onSystemChange(e: MediaQueryListEvent) {
      const r: ResolvedTheme = e.matches ? "dark" : "light"
      setResolvedTheme(r)
      document.documentElement.classList.toggle("dark", e.matches)
    }
    mq.addEventListener("change", onSystemChange)
    return () => mq.removeEventListener("change", onSystemChange)
  }, [theme])

  function setTheme(t: Theme) {
    const resolved = getResolved(t)
    setThemeState(t)
    setResolvedTheme(resolved)
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
