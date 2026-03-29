import type { PlayerView } from "@ambotrope/game";

interface PlayerPanelProps {
  gameView: PlayerView;
}

export function PlayerPanel({ gameView }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
        Players
      </div>

      {/* Self */}
      <div
        className="flex flex-col gap-1 p-3 rounded-lg"
        style={{ background: "var(--color-surface)", border: "2px solid var(--color-primary)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{gameView.self.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-primary)", color: "white" }}>
            You
          </span>
          {gameView.self.lockedIn && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-success)", color: "white" }}>
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
              <span key={w} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-alt)", color: "var(--color-text)" }}>
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Others */}
      {gameView.others.map((player) => (
        <div
          key={player.id}
          className="flex flex-col gap-1 p-3 rounded-lg"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {player.lockedIn && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-success)", color: "white" }}>
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
                <span key={w} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-alt)", color: "var(--color-text)" }}>
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
