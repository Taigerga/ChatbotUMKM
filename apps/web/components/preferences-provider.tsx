"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type TextSize = "sm" | "md" | "lg";
export type Density = "comfortable" | "compact";

type Prefs = {
  textSize: TextSize;
  density: Density;
};

const DEFAULTS: Prefs = { textSize: "md", density: "comfortable" };
const KEY = "dashboard:prefs";

type Ctx = Prefs & {
  setTextSize: (v: TextSize) => void;
  setDensity: (v: Density) => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setMounted(true);
  }, []);

  const persist = useCallback((next: Prefs) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const value: Ctx = {
    ...prefs,
    setTextSize: (textSize) => persist({ ...prefs, textSize }),
    setDensity: (density) => persist({ ...prefs, density }),
  };

  const classes = [
    "dash",
    mounted && prefs.textSize === "sm" ? "text-sm-root" : "",
    mounted && prefs.textSize === "lg" ? "text-lg-root" : "",
    mounted && prefs.density === "compact" ? "density-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PreferencesContext.Provider value={value}>
      <div className={classes}>{children}</div>
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}