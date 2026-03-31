import type { PlayerView } from "@ambotrope/game";

interface PlayerPanelProps {
  gameView: PlayerView;
}

export function PlayerPanel({ gameView }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
        Players
      </div>

      <div
        className="flex flex-col gap-1 p-3"
        style={{
          background: "var(--color-surface)",
          border: "var(--border-width-medium) solid var(--color-border-strong)",
          borderRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-paper)",
          padding: "var(--panel-padding-sm)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{gameView.self.name}</span>
          <span
            className="text-xs"
            style={{
              background: "var(--color-primary)",
              color: "white",
              borderRadius: "var(--radius-badge)",
              padding: "var(--badge-padding-y) var(--badge-padding-x)",
              fontSize: "var(--font-size-xs)",
            }}
          >
            You
          </span>
          {gameView.self.lockedIn && (
            <span
              className="text-xs"
              style={{
                background: "var(--color-success)",
                color: "white",
                borderRadius: "var(--radius-badge)",
                padding: "var(--badge-padding-y) var(--badge-padding-x)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              Locked
            </span>
          )}
        </div>
        {gameView.self.selectedTile && (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Tile selected
          </div>
        )}
        {gameView.self.selectedWords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {gameView.self.selectedWords.map((w) => (
              <span
                key={w}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-surface-alt)",
                  color: "var(--color-text)",
                  border: "var(--border-width-thin) solid var(--color-border)",
                  padding: "var(--chip-padding-y) var(--chip-padding-x)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {gameView.others.map((player) => (
        <div
          key={player.id}
          className="flex flex-col gap-1 p-3"
          style={{
            background: "var(--color-surface)",
            border: "var(--border-width-medium) solid var(--color-border)",
            borderRadius: "var(--radius-panel)",
            boxShadow: "var(--shadow-paper-tight)",
            padding: "var(--panel-padding-sm)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {player.lockedIn && (
              <span
                className="text-xs"
                style={{
                  background: "var(--color-success)",
                  color: "white",
                  borderRadius: "var(--radius-badge)",
                  padding: "var(--badge-padding-y) var(--badge-padding-x)",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                Locked
              </span>
            )}
          </div>
          {player.hasSelectedTile && (
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Tile selected
            </div>
          )}
          {player.selectedWords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {player.selectedWords.map((w) => (
                <span
                  key={w}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--color-surface-alt)",
                    color: "var(--color-text)",
                    border: "var(--border-width-thin) solid var(--color-border)",
                    padding: "var(--chip-padding-y) var(--chip-padding-x)",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
