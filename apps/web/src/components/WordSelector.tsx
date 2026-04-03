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
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-text-muted whitespace-nowrap">
        Select up to {maxWords} words ({selected.size}/{maxWords})
      </span>
      <div className="flex flex-wrap">
        {wordList.map((word) => (
          <button
            key={word}
            onClick={() => toggle(word)}
            disabled={disabled || (!selected.has(word) && selected.size >= maxWords)}
            className={`word-btn-outer p-1 ${disabled || (!selected.has(word) && selected.size >= maxWords) ? "cursor-default" : "cursor-pointer"}`}
          >
            <span
              className={`word-btn inline-block px-3 py-1.5 text-sm transition-all ${selected.has(word) ? "word-btn-selected" : ""}`}
              style={{
                background: selected.has(word) ? "var(--color-primary)" : "var(--color-surface)",
                color: selected.has(word) ? "white" : "var(--color-text)",
                opacity: disabled || (!selected.has(word) && selected.size >= maxWords) ? 0.5 : 1,
              }}
            >
              {word}
            </span>
          </button>
        ))}
        <button
          onClick={() => onToggle([])}
          disabled={disabled || selected.size === 0}
          className={`word-btn-outer p-1 ${disabled || selected.size === 0 ? "cursor-default" : "cursor-pointer"}`}
        >
          <span
            className="word-btn inline-block px-3 py-1.5 text-sm transition-all"
            style={{
              background: "var(--color-danger)",
              color: "white",
              opacity: disabled || selected.size === 0 ? 0.5 : 1,
            }}
          >
            Clear
          </span>
        </button>
      </div>
    </div>
  );
}
