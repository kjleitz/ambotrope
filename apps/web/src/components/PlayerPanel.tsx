import type { PlayerView } from "@ambotrope/game";

interface PlayerPanelProps {
  gameView: PlayerView;
  onInitiateKick?: (targetId: string) => void;
  onVoteKick?: () => void;
  onCancelKick?: () => void;
}

export function PlayerPanel({ gameView, onInitiateKick, onVoteKick, onCancelKick }: PlayerPanelProps) {
  const kickVote = gameView.activeKickVote;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-text-muted">
        Players
      </div>

      {/* Kick vote banner */}
      {kickVote && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface border border-warning text-sm">
          <div>
            Vote to kick <span className="font-medium">{kickVote.targetName}</span>
            <span className="text-text-muted ml-1">
              ({kickVote.votesCast}/{kickVote.votesNeeded})
            </span>
          </div>
          <div className="flex gap-2">
            {!kickVote.selfHasVoted && (
              <button
                onClick={onVoteKick}
                className="px-3 py-1 rounded text-xs font-medium text-white cursor-pointer"
                style={{ background: "var(--color-warning)" }}
              >
                Vote to kick
              </button>
            )}
            {kickVote.selfHasVoted && kickVote.votesCast < kickVote.votesNeeded && (
              <span className="text-xs text-text-muted">Waiting for others...</span>
            )}
            {onCancelKick && (
              <button
                onClick={onCancelKick}
                className="px-3 py-1 rounded text-xs font-medium text-text-muted cursor-pointer bg-surface-alt border border-border"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Self */}
      <div
        className="flex flex-col gap-1 p-3 rounded-lg bg-surface"
        style={{ border: "var(--border-width-focus) var(--border-style) var(--color-primary)" }}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{gameView.self.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-primary text-white">
            You
          </span>
          {gameView.self.lockedIn && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-success text-white">
              Locked
            </span>
          )}
        </div>
        {gameView.self.selectedTile && (
          <div className="text-xs text-text-muted">
            Tile selected
          </div>
        )}
        {gameView.self.selectedWords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {gameView.self.selectedWords.map((w) => (
              <span key={w} className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text">
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
          className="flex flex-col gap-1 p-3 rounded-lg bg-surface border border-border"
          style={{ opacity: player.connected ? 1 : 0.6 }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {!player.connected && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-danger text-white">
                Disconnected
              </span>
            )}
            {player.lockedIn && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-success text-white">
                Locked
              </span>
            )}
            {!player.connected && !kickVote && onInitiateKick && (
              <button
                onClick={() => onInitiateKick(player.id)}
                className="ml-auto text-xs px-2 py-0.5 rounded text-text-muted cursor-pointer bg-surface-alt border border-border"
                title={`Start a vote to kick ${player.name}`}
              >
                Kick
              </button>
            )}
          </div>
          {player.hasSelectedTile && (
            <div className="text-xs text-text-muted">
              Tile selected
            </div>
          )}
          {player.selectedWords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {player.selectedWords.map((w) => (
                <span key={w} className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text">
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
