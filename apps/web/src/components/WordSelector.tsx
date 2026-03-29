interface WordSelectorProps {
  wordList: string[];
  maxWords: number;
  selectedWords: string[];
  onToggle: (words: string[]) => void;
  disabled: boolean;
}

export function WordSelector({ wordList, maxWords, selectedWords, onToggle, disabled }: WordSelectorProps) {
  const selected = new Set(selectedWords);

  function toggle(word: string) {
    const next = new Set(selected);
    if (next.has(word)) {
      next.delete(word);
    } else if (next.size < maxWords) {
      next.add(word);
    }
    onToggle([...next]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
        Select up to {maxWords} words ({selected.size}/{maxWords})
      </div>
      <div className="flex flex-wrap gap-2">
        {wordList.map((word) => (
          <button
            key={word}
            onClick={() => toggle(word)}
            disabled={disabled || (!selected.has(word) && selected.size >= maxWords)}
            className="px-3 py-1.5 rounded-full text-sm transition-all"
            style={{
              background: selected.has(word) ? "var(--color-primary)" : "var(--color-surface)",
              color: selected.has(word) ? "white" : "var(--color-text)",
              border: `1px solid ${selected.has(word) ? "var(--color-primary)" : "var(--color-border)"}`,
              opacity: disabled || (!selected.has(word) && selected.size >= maxWords) ? 0.5 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
