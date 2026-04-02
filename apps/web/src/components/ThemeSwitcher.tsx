import { useTheme, THEMES, THEME_LABELS } from "@/lib/useTheme.ts";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as typeof theme)}
      className="px-2 py-1 rounded text-xs bg-surface-alt border border-border text-text cursor-pointer outline-none"
    >
      {THEMES.map((t) => (
        <option key={t} value={t}>
          {THEME_LABELS[t]}
        </option>
      ))}
    </select>
  );
}
