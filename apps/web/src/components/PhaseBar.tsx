import type { GamePhase } from "@ambotrope/game";

const PHASE_LABELS: Record<GamePhase, string> = {
  selecting: "Choose your tile & words",
  reveal: "Results!",
};

type PlayerStep = "choose-tile" | "pick-words" | "review";

function SelectingDescription({ step }: { step: PlayerStep }) {
  const highlight = "bg-yellow-200/80 dark:bg-yellow-400/30 rounded px-0.5";
  const muted = "opacity-40";

  return (
    <>
      <strong>Objective:</strong> NO TWO PLAYERS CHOOSE THE SAME TILE.{" "}
      <span className={step === "choose-tile" ? highlight : undefined}>
        <strong>Step 1:</strong> Choose a tile.
      </span>{" "}
      <span className={step === "pick-words" ? highlight : step === "choose-tile" ? muted : undefined}>
        <strong>Step 2:</strong> Pick 3 words for blots around your tile.
      </span>{" "}
      <span className={step === "review" ? highlight : muted}>
        <strong>Step 3:</strong> Look at the words your teammates chose.
      </span>{" "}
      <span className={step !== "review" ? muted : undefined}>
        <strong>Step 4:</strong> Switch your tile if someone has already chosen it.{" "}
        <strong>Done?</strong> Use the "Lock&nbsp;in" button.
      </span>
    </>
  );
}

interface PhaseBarProps {
  phase: GamePhase;
  round: number;
  onReady?: () => void;
  othersReady?: boolean;
  onLockIn?: () => void;
  canLockIn?: boolean;
  selectedTile?: string | null;
  selectedWordCount?: number;
  maxWords?: number;
  children?: React.ReactNode;
}

export function PhaseBar({ phase, round, onReady, othersReady, onLockIn, canLockIn = true, selectedTile, selectedWordCount = 0, maxWords = 3, children }: PhaseBarProps) {
  const step: PlayerStep =
    !selectedTile ? "choose-tile" :
    selectedWordCount < maxWords ? "pick-words" :
    "review";
  return (
    <div
      className="flex flex-col gap-3 px-4 py-3 rounded-xl bg-surface border border-border"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{PHASE_LABELS[phase]}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted">
              Round {round}
            </span>
          </div>
          <span className="text-sm text-text-muted">
            {phase === "selecting" ? (
              <SelectingDescription step={step} />
            ) : (
              "See where everyone landed!"
            )}
          </span>
        </div>
        <div className="flex gap-2">
          {onLockIn && (
            <button
              onClick={onLockIn}
              disabled={!canLockIn}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-success"
              style={{ opacity: canLockIn ? 1 : 0.5, cursor: canLockIn ? "pointer" : "default" }}
            >
              Lock&nbsp;in
            </button>
          )}
          {onReady && (
            <button
              onClick={onReady}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${othersReady ? "bg-success animate-nudge" : "bg-primary"}`}
            >
              {othersReady ? "Continue" : "Next Round"}
            </button>
          )}
          {phase === "reveal" && !onReady && (
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary opacity-50">
              Waiting…
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
