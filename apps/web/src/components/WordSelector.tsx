import { useState } from "react";

interface WordSelectorProps {
  wordList: string[];
  maxWords: number;
  selectedWords: string[];
  onToggle: (words: string[]) => void;
  disabled: boolean;
}

const WORD_PATTERN = /[\w\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function sanitizeInput(raw: string): string {
  return (raw.match(WORD_PATTERN) ?? []).join("").toLowerCase();
}

export function WordSelector({ wordList, maxWords, selectedWords, onToggle, disabled }: WordSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showInspiration, setShowInspiration] = useState(false);

  const selected = new Set(selectedWords.map((w) => w.toLowerCase()));
  const atMax = selected.size >= maxWords;

  function submitWord() {
    const word = inputValue.trim();
    if (!word || atMax || selected.has(word.toLowerCase())) return;
    onToggle([word, ...selectedWords]);
    setInputValue("");
  }

  function removeWord(word: string) {
    onToggle(selectedWords.filter((w) => w !== word));
  }

  function toggleInspirationWord(word: string) {
    if (selected.has(word.toLowerCase())) {
      onToggle(selectedWords.filter((w) => w.toLowerCase() !== word.toLowerCase()));
    } else if (!atMax) {
      onToggle([...selectedWords, word]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <span className="text-sm font-medium text-text-muted whitespace-nowrap">
        Select up to {maxWords} words ({selected.size}/{maxWords})
      </span>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(sanitizeInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") submitWord(); }}
          placeholder="Type a word..."
          disabled={disabled || atMax}
          maxLength={50}
          autoFocus
          className="px-3 py-1.5 rounded-lg text-sm outline-none border border-border min-w-0"
          style={{ maxWidth: "20em", background: disabled || atMax ? "var(--color-surface)" : "var(--color-surface-alt)", opacity: disabled || atMax ? 0.5 : 1 }}
        />
        <button
          onClick={submitWord}
          disabled={disabled || !inputValue.trim() || atMax || selected.has(inputValue.toLowerCase())}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors whitespace-nowrap"
          style={{
            background: disabled || !inputValue.trim() || atMax || selected.has(inputValue.toLowerCase())
              ? "var(--color-text-muted)"
              : "var(--color-primary)",
            cursor: disabled || !inputValue.trim() || atMax || selected.has(inputValue.toLowerCase())
              ? "not-allowed"
              : "pointer",
          }}
        >
          Submit
        </button>
        <button
          onClick={() => setShowInspiration((o) => !o)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text)",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Inspiration
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: showInspiration ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" />
          </svg>
        </button>
      </div>

      {/* Selected words */}
      {selectedWords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedWords.map((word) => (
            <button
              key={word}
              onClick={() => removeWord(word)}
              disabled={disabled}
              className="word-btn-outer p-1 cursor-pointer"
            >
              <span
                className="word-btn word-btn-selected inline-block px-3 py-1.5 text-sm transition-all"
                style={{
                  background: "var(--color-primary)",
                  color: "white",
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {word} &times;
              </span>
            </button>
          ))}
          <button
            onClick={() => onToggle([])}
            disabled={disabled}
            className={`word-btn-outer p-1 ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            <span
              className="word-btn inline-block px-3 py-1.5 text-sm transition-all"
              style={{
                background: "var(--color-danger)",
                color: "white",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              Clear
            </span>
          </button>
        </div>
      )}

      {/* Inspiration panel */}
      {showInspiration && (
        <div className="flex flex-wrap">
          {wordList.map((word) => {
            const isSelected = selected.has(word.toLowerCase());
            return (
              <button
                key={word}
                onClick={() => toggleInspirationWord(word)}
                disabled={disabled || (!isSelected && atMax)}
                className={`word-btn-outer p-1 ${disabled || (!isSelected && atMax) ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`word-btn inline-block px-3 py-1.5 text-sm transition-all ${isSelected ? "word-btn-selected" : ""}`}
                  style={{
                    background: isSelected ? "var(--color-primary)" : "var(--color-surface)",
                    color: isSelected ? "white" : "var(--color-text)",
                    opacity: disabled || (!isSelected && atMax) ? 0.5 : 1,
                  }}
                >
                  {word}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
