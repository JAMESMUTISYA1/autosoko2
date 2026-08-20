"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Initialized from the class the inline head script (see layout.js)
  // already applied before hydration, so there's no flash/mismatch.
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("autosoko-theme", theme);
    } catch {
      // Storage can fail in private-browsing modes — theme just
      // won't persist across reloads, which is a harmless fallback.
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
