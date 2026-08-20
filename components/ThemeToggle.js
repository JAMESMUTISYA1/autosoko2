"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({ className = "", showLabel = false }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex items-center gap-1.5 rounded-full hover:bg-invert-soft transition-colors ${
        showLabel ? "px-3 py-1.5" : "w-8 h-8 justify-center"
      } ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {showLabel && (
        <span className="text-xs font-medium">
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}
