import type { PlayerView } from "@ambotrope/game";

interface MobilePlayerStripProps {
  gameView: PlayerView;
}

function statusDot(
  hasSelectedTile: boolean,
  lockedIn: boolean,
  connected: boolean,
): { color: string; label: string } {
  if (!connected) return { color: "var(--color-danger)", label: "disconnected" };
  if (lockedIn) return { color: "var(--color-success)", label: "locked in" };
  if (hasSelectedTile) return { color: "var(--color-primary)", label: "tile selected" };
  return { color: "var(--color-text-muted)", label: "waiting" };
}

function truncateName(name: string, max = 8): string {
  return name.length > max ? name.slice(0, max) + "\u2026" : name;
}

export function MobilePlayerStrip({ gameView }: MobilePlayerStripProps) {
  const self = gameView.self;
  const selfDot = statusDot(!!self.selectedTile, self.lockedIn, true);

  return (
    <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto md:hidden">
      {/* Self */}
      <div
        className="flex flex-col gap-0.5 px-2 py-1 rounded-lg text-xs font-medium bg-surface shrink-0"
        style={{ border: "2px solid var(--color-primary)" }}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: selfDot.color }}
            title={selfDot.label}
          />
          <span>{truncateName(self.name)}</span>
        </div>
        {self.selectedWords.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {self.selectedWords.map((w) => (
              <span key={w} className="px-1.5 py-0.5 rounded-full bg-surface-alt text-text" style={{ fontSize: "0.65rem" }}>
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Others */}
      {gameView.others.map((player) => {
        const dot = statusDot(player.hasSelectedTile, player.lockedIn, player.connected);
        return (
          <div
            key={player.id}
            className="flex flex-col gap-0.5 px-2 py-1 rounded-lg text-xs bg-surface border border-border shrink-0"
            style={{ opacity: player.connected ? 1 : 0.6 }}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: dot.color }}
                title={dot.label}
              />
              <span>{truncateName(player.name)}</span>
            </div>
            {player.selectedWords.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {player.selectedWords.map((w) => (
                  <span key={w} className="px-1.5 py-0.5 rounded-full bg-surface-alt text-text" style={{ fontSize: "0.65rem" }}>
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
