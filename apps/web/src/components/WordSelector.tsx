import { useState, useEffect } from "react";
import { Tooltip } from "@/components/Tooltip.tsx";

interface WordSelectorProps {
  wordList: string[];
  maxWords: number;
  selectedWords: string[];
  onToggle: (words: string[]) => void;
  disabled: boolean;
  mobile?: boolean;
}

const WORD_PATTERN = /[\w\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

function sanitizeInput(raw: string): string {
  return (raw.match(WORD_PATTERN) ?? []).join("").toLowerCase();
}

export function WordSelector({ wordList, maxWords, selectedWords, onToggle, disabled, mobile = false }: WordSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showInspiration, setShowInspiration] = useState(false);

  // Close bottom sheet on Escape
  useEffect(() => {
    if (!mobile || !showInspiration) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInspiration(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobile, showInspiration]);

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
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") submitWord(); }}
            placeholder="Type a word..."
            disabled={inputDisabled}
            maxLength={50}
            autoFocus={!mobile}
            className={`rounded-lg outline-none border border-border min-w-0 ${mobile ? "px-3 py-2.5 text-base flex-1" : "px-3 py-1.5 text-sm"}`}
            style={{ maxWidth: mobile ? undefined : "20em", background: inputDisabled ? "var(--color-surface)" : "var(--color-surface-alt)", opacity: inputDisabled ? 0.5 : 1 }}
          />
        </Tooltip>
        <Tooltip text={submitTooltip}>
          <button
            onClick={submitWord}
            disabled={submitDisabled}
            className={`rounded-lg font-medium text-white transition-colors whitespace-nowrap ${mobile ? "px-4 py-2.5 text-base" : "px-3 py-1.5 text-sm"}`}
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
          className={`rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${mobile ? "px-3 py-2.5 text-base" : "px-3 py-1.5 text-sm"}`}
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

      {/* Inspiration panel — inline on desktop, bottom sheet on mobile */}
      {showInspiration && !mobile && (
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
      {mobile && showInspiration && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setShowInspiration(false)}
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Inspiration word list"
            className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-2xl"
            style={{ maxHeight: "60vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-text-muted opacity-40" />
            </div>
            <div className="px-3 pb-2 text-sm font-medium text-text-muted">
              Inspiration ({selected.size}/{maxWords})
            </div>
            <div className="flex flex-wrap gap-1 px-3 pb-4 overflow-y-auto" style={{ maxHeight: "calc(60vh - 60px)" }}>
              {wordList.map((word) => {
                const isSelected = selected.has(word.toLowerCase());
                const wordDisabled = disabled || (!isSelected && atMax);
                return (
                  <button
                    key={word}
                    onClick={() => toggleInspirationWord(word)}
                    disabled={wordDisabled}
                    className={`word-btn-outer p-1 ${wordDisabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span
                      className={`word-btn inline-block px-4 py-2.5 text-base transition-all ${isSelected ? "word-btn-selected" : ""}`}
                      style={{
                        background: isSelected ? "var(--color-primary)" : "var(--color-surface-alt)",
                        color: isSelected ? "white" : "var(--color-text)",
                        opacity: wordDisabled ? 0.5 : 1,
                      }}
                    >
                      {word}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
