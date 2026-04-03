import type { GamePhase } from "@ambotrope/game";

const PHASE_LABELS: Record<GamePhase, string> = {
  selecting: "Choose your tile & words",
  reveal: "Results!",
};

const PHASE_DESCRIPTIONS: Record<GamePhase, React.ReactNode> = {
  selecting: <><strong>Objective:</strong> EVERY PLAYER SELECTS A DIFFERENT TILE. <strong>Rule:</strong> Don't talk about where your tile is. <strong>Step 1:</strong> Choose a tile. <strong>Step 2:</strong> Pick 3 words for blots around your tile. <strong>Step 3:</strong> Look at the words your teammates chose. <strong>Step 4:</strong> Switch your tile if someone has already chosen it. <strong>Done?</strong> Use the "Lock&nbsp;in" button.</>,
  reveal: "See where everyone landed!",
};

interface PhaseBarProps {
  phase: GamePhase;
  round: number;
  onReady?: () => void;
  onLockIn?: () => void;
  canLockIn?: boolean;
  children?: React.ReactNode;
}

export function PhaseBar({ phase, round, onReady, onLockIn, canLockIn = true, children }: PhaseBarProps) {
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
            {PHASE_DESCRIPTIONS[phase]}
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-primary cursor-pointer"
            >
              Next Round
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
