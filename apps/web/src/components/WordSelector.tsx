import { useState } from "react";
import { Tooltip } from "@/components/Tooltip.tsx";

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

  const inputDisabled = disabled || atMax;
  const inputTooltip = disabled
    ? "You're locked in"
    : atMax
      ? `Already chose ${maxWords} words`
      : undefined;

  const submitDisabled = disabled || !inputValue.trim() || atMax || selected.has(inputValue.toLowerCase());
  const submitTooltip = disabled
    ? "You're locked in"
    : atMax
      ? `Already chose ${maxWords} words`
      : selected.has(inputValue.toLowerCase())
        ? "Word already chosen"
        : undefined;

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
        Choose up to {maxWords} words ({selected.size}/{maxWords})
      </span>

      {/* Input row */}
      <div className="flex items-center gap-2">
        <Tooltip text={inputTooltip}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(sanitizeInput(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") submitWord(); }}
            placeholder="Type a word..."
            disabled={inputDisabled}
            maxLength={50}
            autoFocus
            className="px-3 py-1.5 rounded-lg text-sm outline-none border border-border min-w-0"
            style={{ maxWidth: "20em", background: inputDisabled ? "var(--color-surface)" : "var(--color-surface-alt)", opacity: inputDisabled ? 0.5 : 1 }}
          />
        </Tooltip>
        <Tooltip text={submitTooltip}>
          <button
            onClick={submitWord}
            disabled={submitDisabled}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors whitespace-nowrap"
            style={{
              background: submitDisabled
                ? "var(--color-text-muted)"
                : "var(--color-primary)",
              cursor: submitDisabled
                ? undefined
                : "pointer",
            }}
          >
            Submit
          </button>
        </Tooltip>
        <button
          onClick={() => setShowInspiration((o) => !o)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text)",
            cursor: disabled ? undefined : "pointer",
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
            const wordDisabled = disabled || (!isSelected && atMax);
            const wordTooltip = disabled
              ? "You're locked in"
              : !isSelected && atMax
                ? `Already chose ${maxWords} words`
                : undefined;
            return (
              <Tooltip key={word} text={wordTooltip}>
                <button
                  onClick={() => toggleInspirationWord(word)}
                  disabled={wordDisabled}
                  className={`word-btn-outer p-1 ${wordDisabled ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span
                    className={`word-btn inline-block px-3 py-1.5 text-sm transition-all ${isSelected ? "word-btn-selected" : ""}`}
                    style={{
                      background: isSelected ? "var(--color-primary)" : "var(--color-surface)",
                      color: isSelected ? "white" : "var(--color-text)",
                      opacity: wordDisabled ? 0.5 : 1,
                    }}
                  >
                    {word}
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
