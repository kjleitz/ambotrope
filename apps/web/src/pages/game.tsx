import { useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useGameSocket } from "@/lib/useGameSocket.ts";
import { GameCanvas } from "@/components/GameCanvas.tsx";
import { WordSelector } from "@/components/WordSelector.tsx";
import { PlayerPanel } from "@/components/PlayerPanel.tsx";
import { MobilePlayerStrip } from "@/components/MobilePlayerStrip.tsx";
import { PhaseBar } from "@/components/PhaseBar.tsx";
import { RoundResult } from "@/components/RoundResult.tsx";
import { DEFAULT_DISABLED_WORDS } from "@ambotrope/game";
import { randomQuote } from "@/lib/quotes.ts";
import { useIsMobile } from "@/lib/useIsMobile.ts";

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
  const quote = useMemo(() => randomQuote(), []);
  const [disabledWords, setDisabledWords] = useState<ReadonlySet<string>>(DEFAULT_DISABLED_WORDS);
  const [wordDebugOpen, setWordDebugOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    gameView,
    connected,
    error,
    messages,
    selectTile,
    selectWords,
    lockIn,
    ready,
    changeSeed,
    initiateKick,
    voteKick,
    cancelKick,
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
            <h1 className="text-2xl font-bold">Ambotrope</h1>
            <blockquote className="mt-2 text-sm text-text-muted italic whitespace-pre-line">
              {quote.text}
              <footer className="mt-1 not-italic text-xs">
                — {quote.author}{quote.source ? <>, <cite>{quote.source}</cite></> : null}
              </footer>
            </blockquote>
          </div>

          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-3">
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
    if (gameView?.self.selectedTile && tileId !== gameView.self.selectedTile) {
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

  const wordSelectorEl = phase === "selecting" && (
    <WordSelector
      wordList={activeWordList}
      maxWords={gameView.config.maxWordsPerPlayer}
      selectedWords={gameView.self.selectedWords}
      onToggle={selectWords}
      disabled={!canSelectWords}
      mobile={isMobile}
    />
  );

  return (
    <div className="flex-1 flex flex-col h-dvh">
      {/* Phase bar — word selector inside on desktop only */}
      <div className="p-2 md:p-3">
        <PhaseBar
          phase={phase}
          round={gameView.round}
          onReady={phase === "reveal" && !gameView.self.readyForNext ? ready : undefined}
          othersReady={phase === "reveal" && gameView.others.some((o) => o.readyForNext)}
          onLockIn={showLockIn ? lockIn : undefined}
          canLockIn={!!gameView.self.selectedTile && gameView.self.selectedWords.length > 0}
          selectedTile={gameView.self.selectedTile}
          selectedWordCount={gameView.self.selectedWords.length}
          maxWords={gameView.config.maxWordsPerPlayer}
        >
          {!isMobile && wordSelectorEl}
        </PhaseBar>
      </div>

      {/* Mobile: compact player strip */}
      {isMobile && (
        <MobilePlayerStrip gameView={gameView} />
      )}

      {/* Error display — mobile only (desktop shows in sidebar) */}
      {isMobile && error && (
        <div className="mx-2 mb-1 p-2 rounded-lg text-sm bg-danger text-white">
          {error}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col p-2 md:p-3 pt-0 min-h-0">
          <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-border">
            <GameCanvas
              gameView={gameView}
              onTileClick={handleSelectTile}
              interactive={canSelectTile}
            />
            {phase === "selecting" && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {gameView.seedAdvances > 0 && (
                  <button
                    onClick={() => changeSeed("prev")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer bg-surface/80 text-text-muted border border-border backdrop-blur-sm"
                    title="Undo blots"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7h7a3 3 0 0 1 0 6H8" />
                      <path d="M6 4L3 7l3 3" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => changeSeed("next")}
                  className="px-3 h-8 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer bg-surface/80 text-text border border-border backdrop-blur-sm"
                >
                  New blots
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: results area below canvas during reveal */}
        {isMobile && phase === "reveal" && (
          <div className="flex flex-col gap-2 p-2 overflow-y-auto" style={{ maxHeight: "45vh" }}>
            <RoundResult gameView={gameView} messages={messages} />
            <PlayerPanel
              gameView={gameView}
              onInitiateKick={initiateKick}
              onVoteKick={voteKick}
              onCancelKick={gameView.activeKickVote?.selfHasVoted && gameView.activeKickVote.votesCast === 1 ? cancelKick : undefined}
            />
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex w-72 flex-col gap-3 p-3 pt-0 overflow-y-auto">
          {/* Game link */}
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
          <PlayerPanel
            gameView={gameView}
            onInitiateKick={initiateKick}
            onVoteKick={voteKick}
            onCancelKick={gameView.activeKickVote?.selfHasVoted && gameView.activeKickVote.votesCast === 1 ? cancelKick : undefined}
          />

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

      {/* Mobile: word selector at bottom + overflow menu */}
      {isMobile && (
        <div className="flex flex-col gap-1 p-2 pt-0">
          {wordSelectorEl}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: connected ? "var(--color-success)" : "var(--color-danger)" }}
              />
              {connected ? "Connected" : "Disconnected"}
            </div>
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="p-2 rounded-lg text-xs text-text-muted"
                style={{ background: "var(--color-surface-alt)" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
              {mobileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
                  <div className="absolute bottom-full right-0 mb-1 z-50 flex flex-col gap-2 p-3 rounded-lg bg-surface border border-border shadow-lg" style={{ minWidth: "240px" }}>
                    {/* Share link */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-text-muted">Share this link</div>
                        <CopyButton text={`${window.location.origin}/game/${gameId}`} />
                      </div>
                      <div className="text-xs px-2 py-1.5 rounded font-mono select-all break-all bg-surface-alt">
                        {window.location.origin}/game/{gameId}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
