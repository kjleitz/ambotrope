import type { GamePhase } from "@ambotrope/game";

const PHASE_LABELS: Record<GamePhase, string> = {
  selecting: "Choose your tile & words",
  reveal: "Results!",
};

const PHASE_DESCRIPTIONS: Record<GamePhase, string> = {
  selecting: "Click a hex tile and pick words that describe the clouds near it. Lock in when ready.",
  reveal: "See where everyone landed!",
};

interface PhaseBarProps {
  phase: GamePhase;
  round: number;
  onReady?: () => void;
  onLockIn?: () => void;
}

export function PhaseBar({ phase, round, onReady, onLockIn }: PhaseBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{PHASE_LABELS[phase]}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-alt)", color: "var(--color-text-muted)" }}>
            Round {round}
          </span>
        </div>
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {PHASE_DESCRIPTIONS[phase]}
        </span>
      </div>
      <div className="flex gap-2">
        {onLockIn && (
          <button
            onClick={onLockIn}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--color-success)", cursor: "pointer" }}
          >
            Lock In
          </button>
        )}
        {onReady && (
          <button
            onClick={onReady}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--color-primary)", cursor: "pointer" }}
          >
            Next Round
          </button>
        )}
      </div>
    </div>
  );
}
