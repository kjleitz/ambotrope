import type { PlayerView } from "@ambotrope/game";
import type { ServerMessage } from "@ambotrope/protocol";

interface RoundResultProps {
  gameView: PlayerView;
  messages: ServerMessage[];
}

export function RoundResult({ gameView, messages }: RoundResultProps) {
  const resultMsg = [...messages].reverse().find((m) => m.type === "round_result");
  if (!resultMsg || resultMsg.type !== "round_result") return null;

  const { collisions, scores } = resultMsg.payload;
  const hasCollisions = collisions.length > 0;

  const allPlayers = [
    { id: gameView.self.id, name: gameView.self.name },
    ...gameView.others.map((o) => ({ id: o.id, name: o.name })),
  ];

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border-strong)",
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-paper)",
      }}
    >
      <div className="font-semibold">
        {hasCollisions ? "Overlapping readings detected" : "Clean read. Everyone scores."}
      </div>
      <div className="flex flex-col gap-1">
        {allPlayers.map((player) => {
          const score = scores[player.id] ?? 0;
          return (
            <div key={player.id} className="flex items-center gap-2 text-sm">
              <span
                className="w-5 h-5 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: score > 0 ? "var(--color-success)" : "var(--color-danger)" }}
              >
                {score}
              </span>
              <span>{player.name}</span>
              {player.id === gameView.self.id && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>(you)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
