import { useState } from "react";
import { useTheme, THEMES, THEME_LABELS } from "@/lib/useTheme.ts";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed top-2 left-2 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 rounded text-xs font-mono bg-debug-button text-debug-text border border-debug-border"
      >
        {open ? "Hide Theme" : "Theme"}
      </button>
      {open && (
        <div
          className="mt-1 p-3 rounded-lg flex flex-col gap-2 text-xs font-mono bg-debug-bg text-debug-text border border-debug-border"
          style={{ minWidth: "160px", backdropFilter: "blur(8px)" }}
        >
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="px-2 py-1 rounded text-left border border-debug-border"
              style={{
                background: theme === t ? "var(--color-debug-border)" : "var(--color-debug-button)",
              }}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
