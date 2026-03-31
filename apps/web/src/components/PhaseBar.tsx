import type { GamePhase } from "@ambotrope/game";

const PHASE_LABELS: Record<GamePhase, string> = {
  selecting: "Mark your tile and descriptors",
  reveal: "Read the sheet",
};

const PHASE_DESCRIPTIONS: Record<GamePhase, string> = {
  selecting: "Choose a paper tile and words that describe the ink blot shapes around it. Lock in when ready.",
  reveal: "See where everyone landed and where the readings collided.",
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
      className="flex items-center justify-between px-4 py-3"
      style={{
        background: "var(--color-surface)",
        border: "var(--border-width-medium) solid var(--color-border-strong)",
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-paper)",
        padding: "var(--panel-padding-sm) var(--panel-padding-md)",
      }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight">{PHASE_LABELS[phase]}</span>
          <span
            className="px-2 py-0.5"
            style={{
              background: "var(--color-surface-alt)",
              color: "var(--color-text-muted)",
              border: "var(--border-width-thin) solid var(--color-border)",
              borderRadius: "var(--radius-chip)",
              fontSize: "var(--font-size-xs)",
              padding: "var(--badge-padding-y) var(--badge-padding-x)",
            }}
          >
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
            className="transition-colors"
            style={{
              background: "var(--color-success)",
              color: "var(--color-surface)",
              border: "var(--border-width-medium) solid var(--color-border-strong)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              padding: "var(--control-padding-y) var(--control-padding-x)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
            }}
          >
            Lock In
          </button>
        )}
        {onReady && (
          <button
            onClick={onReady}
            className="transition-colors"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-surface)",
              border: "var(--border-width-medium) solid var(--color-border-strong)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              padding: "var(--control-padding-y) var(--control-padding-x)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
            }}
          >
            Next Round
          </button>
        )}
      </div>
    </div>
  );
}
