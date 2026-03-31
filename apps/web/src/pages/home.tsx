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
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div
        className="flex flex-col gap-6 p-8 w-full max-w-sm"
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border-strong)",
          borderRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-paper)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Ambotrope</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            A paper-and-ink game of reading shapes together
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium uppercase tracking-[0.16em]" style={{ color: "var(--color-ink-soft)" }}>Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            className="px-3 py-2 text-sm outline-none"
            style={{
              background: "var(--color-surface-alt)",
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2.5 font-medium transition-colors"
            style={{
              background: name.trim() ? "var(--color-primary)" : "var(--color-border)",
              color: "var(--color-surface)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
          >
            Create New Game
          </button>

          <div className="flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs">or join existing</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Game code"
              className="flex-1 px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--color-surface-alt)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
              }}
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !gameId.trim()}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: name.trim() && gameId.trim() ? "var(--color-surface-pressed)" : "var(--color-surface-alt)",
                color: name.trim() && gameId.trim() ? "var(--color-text)" : "var(--color-text-muted)",
                border: "1.5px solid var(--color-border-strong)",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
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
