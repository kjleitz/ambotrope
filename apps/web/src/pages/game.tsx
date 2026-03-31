import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useGameSocket } from "@/lib/useGameSocket.ts";
import { GameCanvas } from "@/components/GameCanvas.tsx";
import { WordSelector } from "@/components/WordSelector.tsx";
import { PlayerPanel } from "@/components/PlayerPanel.tsx";
import { PhaseBar } from "@/components/PhaseBar.tsx";
import { RoundResult } from "@/components/RoundResult.tsx";
import { DEFAULT_DISABLED_WORDS } from "@ambotrope/game";

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const playerName = searchParams.get("name");
  const [nameInput, setNameInput] = useState("");
  const [disabledWords, setDisabledWords] = useState<ReadonlySet<string>>(DEFAULT_DISABLED_WORDS);
  const [wordDebugOpen, setWordDebugOpen] = useState(false);

  const {
    gameView,
    connected,
    error,
    messages,
    selectTile,
    selectWords,
    lockIn,
    ready,
  } = useGameSocket(gameId!, playerName);

  if (!playerName) {
    function handleJoin() {
      if (!nameInput.trim()) return;
      setSearchParams({ name: nameInput.trim() });
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div
          className="flex flex-col gap-5 p-8 w-full max-w-sm"
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border-strong)",
            borderRadius: "var(--radius-panel)",
            boxShadow: "var(--shadow-paper)",
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight">Join Reading</h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Enter your name to join sheet <span className="font-mono">{gameId}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium uppercase tracking-[0.16em]" style={{ color: "var(--color-ink-soft)" }}>Your name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              placeholder="Enter your name"
              maxLength={30}
              autoFocus
              className="px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--color-surface-alt)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
              }}
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!nameInput.trim()}
            className="px-4 py-2.5 font-medium transition-colors"
            style={{
              background: nameInput.trim() ? "var(--color-primary)" : "var(--color-border)",
              color: "var(--color-surface)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              cursor: nameInput.trim() ? "pointer" : "not-allowed",
            }}
          >
            Join Reading
          </button>
        </div>
      </div>
    );
  }

  if (!gameView) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          {error ? (
            <>
              <div
                className="p-4 text-sm max-w-sm text-center"
                style={{
                  background: "var(--color-danger)",
                  color: "white",
                  borderRadius: "var(--radius-control)",
                  boxShadow: "var(--shadow-paper-tight)",
                }}
              >
                {error}
              </div>
              <a
                href="/"
                className="text-sm underline"
                style={{ color: "var(--color-text-muted)" }}
              >
                Back to home
              </a>
            </>
          ) : (
            <div style={{ color: "var(--color-text-muted)" }}>
              {connected ? "Waiting for game state..." : "Connecting..."}
            </div>
          )}
        </div>
      </div>
    );
  }

  const phase = gameView.phase;
  const canSelectTile = phase === "selecting" && !gameView.self.lockedIn;
  const canSelectWords = phase === "selecting" && !gameView.self.lockedIn;
  const showLockIn = phase === "selecting" && !gameView.self.lockedIn;

  const activeWordList = gameView.config.wordList.filter((w) => !disabledWords.has(w));

  function toggleWord(word: string) {
    setDisabledWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  }

  return (
    <div className="flex-1 flex flex-col h-dvh">
      <div className="p-3 md:p-4">
        <PhaseBar
          phase={phase}
          round={gameView.round}
          onReady={phase === "reveal" ? ready : undefined}
          onLockIn={showLockIn ? lockIn : undefined}
        />
      </div>

      <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
        <div className="flex-1 p-3 pt-0 md:px-4">
          <div
            className="w-full h-full overflow-hidden"
            style={{
              border: "1.5px solid var(--color-border-strong)",
              borderRadius: "var(--radius-panel)",
              boxShadow: "var(--shadow-paper)",
              background: "var(--color-page-alt)",
            }}
          >
            <GameCanvas
              gameView={gameView}
              onTileClick={selectTile}
              interactive={canSelectTile}
            />
          </div>
        </div>

        <div
          className="w-full lg:w-80 flex flex-col gap-3 p-3 pt-0 md:px-4 overflow-y-auto"
        >
          {phase === "selecting" && gameView.others.length === 0 && (
            <div
              className="flex flex-col gap-1 p-3"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-panel)",
                boxShadow: "var(--shadow-paper-tight)",
              }}
            >
              <div className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                Share this sheet
              </div>
              <div
                className="text-xs px-2 py-1.5 font-mono select-all break-all"
                style={{
                  background: "var(--color-surface-alt)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-control)",
                }}
              >
                {window.location.origin}/game/{gameId}
              </div>
            </div>
          )}

          {error && (
            <div
              className="p-3 text-sm"
              style={{
                background: "var(--color-danger)",
                color: "white",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
              }}
            >
              {error}
            </div>
          )}

          <PlayerPanel gameView={gameView} />

          {phase === "reveal" && (
            <RoundResult gameView={gameView} messages={messages} />
          )}

          {phase === "selecting" && (
            <div
              className="p-3"
              style={{
                background: "var(--color-surface)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-panel)",
                boxShadow: "var(--shadow-paper-tight)",
              }}
            >
              <WordSelector
                wordList={activeWordList}
                maxWords={gameView.config.maxWordsPerPlayer}
                selectedWords={gameView.self.selectedWords}
                onToggle={selectWords}
                disabled={!canSelectWords}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setWordDebugOpen((o) => !o)}
              className="text-left px-2 py-1 text-xs font-mono"
              style={{
                background: "var(--color-surface-alt)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-control)",
              }}
            >
              {wordDebugOpen ? "Hide Words" : "Words"}
            </button>
            {wordDebugOpen && (
              <div
                className="p-2 flex flex-col gap-1 text-xs font-mono"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-panel)",
                  boxShadow: "var(--shadow-paper-tight)",
                }}
              >
                {gameView.config.wordList.map((word) => {
                  const enabled = !disabledWords.has(word);
                  return (
                    <label
                      key={word}
                      className="flex items-center gap-2 cursor-pointer select-none px-1 py-0.5"
                      style={{ opacity: enabled ? 1 : 0.45, borderRadius: "8px" }}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleWord(word)}
                        className="accent-current"
                      />
                      {word}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? "var(--color-success)" : "var(--color-danger)" }}
            />
            {connected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </div>
    </div>
  );
}
