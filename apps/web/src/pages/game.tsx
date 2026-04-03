import { useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useGameSocket } from "@/lib/useGameSocket.ts";
import { GameCanvas } from "@/components/GameCanvas.tsx";
import { WordSelector } from "@/components/WordSelector.tsx";
import { PlayerPanel } from "@/components/PlayerPanel.tsx";
import { PhaseBar } from "@/components/PhaseBar.tsx";
import { RoundResult } from "@/components/RoundResult.tsx";
import { DEFAULT_DISABLED_WORDS } from "@ambotrope/game";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-0.5 rounded text-xs text-text-muted transition-colors cursor-pointer"
      style={{ background: "var(--color-surface-alt)" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

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
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col gap-5 p-8 rounded-2xl w-full max-w-sm bg-surface border border-border">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Join Game</h1>
            <p className="text-sm text-text-muted">
              Enter your name to join game <span className="font-mono">{gameId}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Your name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              placeholder="Enter your name"
              maxLength={30}
              autoFocus
              className="px-3 py-2 rounded-lg text-sm outline-none bg-surface-alt border border-border"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!nameInput.trim()}
            className="px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
            style={{
              background: nameInput.trim() ? "var(--color-primary)" : "var(--color-text-muted)",
              cursor: nameInput.trim() ? "pointer" : "not-allowed",
            }}
          >
            Join Game
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
              <div className="p-4 rounded-lg text-sm max-w-sm text-center bg-danger text-white">
                {error}
              </div>
              <a href="/" className="text-sm underline text-text-muted">
                Back to home
              </a>
            </>
          ) : (
            <div className="text-text-muted">
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

  function handleSelectTile(tileId: string) {
    if (gameView.self.selectedTile && tileId !== gameView.self.selectedTile) {
      selectWords([]);
    }
    selectTile(tileId);
  }

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
      {/* Phase bar + word selector */}
      <div className="p-3">
        <PhaseBar
          phase={phase}
          round={gameView.round}
          onReady={phase === "reveal" && !gameView.self.readyForNext ? ready : undefined}
          othersReady={phase === "reveal" && gameView.others.some((o) => o.readyForNext)}
          onLockIn={showLockIn ? lockIn : undefined}
          canLockIn={!!gameView.self.selectedTile}
        >
          {phase === "selecting" && (
            <WordSelector
              wordList={activeWordList}
              maxWords={gameView.config.maxWordsPerPlayer}
              selectedWords={gameView.self.selectedWords}
              onToggle={selectWords}
              disabled={!canSelectWords}
            />
          )}
        </PhaseBar>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 p-3 pt-0">
          <div className="w-full h-full rounded-xl overflow-hidden border border-border">
            <GameCanvas
              gameView={gameView}
              onTileClick={handleSelectTile}
              interactive={canSelectTile}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-3 p-3 pt-0 overflow-y-auto">
          {/* Game link — always visible so players can invite others */}
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-text-muted">
                Share this link
              </div>
              <CopyButton text={`${window.location.origin}/game/${gameId}`} />
            </div>
            <div className="text-xs px-2 py-1.5 rounded font-mono select-all break-all bg-surface-alt">
              {window.location.origin}/game/{gameId}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg text-sm bg-danger text-white">
              {error}
            </div>
          )}

          {/* Player panel */}
          <PlayerPanel gameView={gameView} />

          {/* Round result */}
          {phase === "reveal" && (
            <RoundResult gameView={gameView} messages={messages} />
          )}

          {/* Debug: word list toggle */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setWordDebugOpen((o) => !o)}
              className="text-left px-2 py-1 rounded text-xs font-mono bg-debug-button text-debug-text border border-debug-border"
            >
              {wordDebugOpen ? "Hide Words" : "Words"}
            </button>
            {wordDebugOpen && (
              <div
                className="p-2 rounded-lg flex flex-col gap-1 text-xs font-mono bg-debug-bg text-debug-text border border-debug-border"
                style={{ backdropFilter: "blur(8px)" }}
              >
                {gameView.config.wordList.map((word) => {
                  const enabled = !disabledWords.has(word);
                  return (
                    <label key={word} className="flex items-center gap-2 cursor-pointer select-none px-1 py-0.5 rounded" style={{ opacity: enabled ? 1 : 0.45 }}>
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

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
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
