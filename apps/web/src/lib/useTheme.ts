import { useState, useEffect } from "react";

const THEMES = ["default", "ink"] as const;
export type Theme = (typeof THEMES)[number];

const THEME_LABELS: Record<Theme, string> = {
  default: "Cloud",
  ink: "Ink & Paper",
};

export { THEMES, THEME_LABELS };

const STORAGE_KEY = "ambotrope-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && THEMES.includes(stored as Theme) ? (stored as Theme) : "default";
  });

  useEffect(() => {
    if (theme === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
  }

  return { theme, setTheme };
}
