import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function HomePage() {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("");
  const navigate = useNavigate();

  function handleCreate() {
    if (!name.trim()) return;
    const id = Math.random().toString(36).slice(2, 8);
    navigate(`/game/${id}?name=${encodeURIComponent(name.trim())}`);
  }

  function handleJoin() {
    if (!name.trim() || !gameId.trim()) return;
    navigate(`/game/${gameId.trim()}?name=${encodeURIComponent(name.trim())}`);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="flex flex-col gap-6 p-8 rounded-2xl w-full max-w-sm bg-surface border border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Ambotrope</h1>
          <p className="text-sm text-text-muted">
            A cloud-gazing game of triangulation
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            className="px-3 py-2 rounded-lg text-sm outline-none bg-surface-alt border border-border"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2.5 rounded-lg font-medium text-white transition-colors"
            style={{
              background: name.trim() ? "var(--color-primary)" : "var(--color-text-muted)",
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
          >
            Create New Game
          </button>

          <div className="flex items-center gap-2 text-text-muted">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs">or join existing</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Game code"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none bg-surface-alt border border-border"
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !gameId.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-alt border border-border"
              style={{
                color: name.trim() && gameId.trim() ? "var(--color-text)" : "var(--color-text-muted)",
                cursor: name.trim() && gameId.trim() ? "pointer" : "not-allowed",
              }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
