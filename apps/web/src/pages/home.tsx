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
          border: "var(--border-width-medium) solid var(--color-border-strong)",
          borderRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-paper)",
          padding: "var(--panel-padding-lg)",
          maxWidth: "var(--size-form-max)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h1
            className="font-bold"
            style={{ fontSize: "var(--font-size-3xl)", letterSpacing: "var(--tracking-tight)" }}
          >
            Ambotrope
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            A paper-and-ink game of reading shapes together
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            className="font-medium uppercase"
            style={{
              color: "var(--color-ink-soft)",
              fontSize: "var(--font-size-sm)",
              letterSpacing: "var(--tracking-wide)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            className="outline-none"
            style={{
              background: "var(--color-surface-alt)",
              border: "var(--border-width-medium) solid var(--color-border)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              padding: "var(--control-padding-y) var(--control-padding-x)",
              fontSize: "var(--font-size-sm)",
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="font-medium transition-colors"
            style={{
              background: name.trim() ? "var(--color-primary)" : "var(--color-border)",
              color: "var(--color-surface)",
              border: "var(--border-width-medium) solid var(--color-primary)",
              borderRadius: "var(--radius-control)",
              boxShadow: "var(--shadow-paper-tight)",
              padding: "var(--control-padding-y-lg) var(--control-padding-x)",
              fontWeight: "var(--font-weight-medium)",
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
              className="flex-1 outline-none"
              style={{
                background: "var(--color-surface-alt)",
                border: "var(--border-width-medium) solid var(--color-border)",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
                padding: "var(--control-padding-y) var(--control-padding-x)",
                fontSize: "var(--font-size-sm)",
              }}
            />
            <button
              onClick={handleJoin}
              disabled={!name.trim() || !gameId.trim()}
              className="font-medium transition-colors"
              style={{
                background: name.trim() && gameId.trim() ? "var(--color-surface-pressed)" : "var(--color-surface-alt)",
                color: name.trim() && gameId.trim() ? "var(--color-text)" : "var(--color-text-muted)",
                border: "var(--border-width-medium) solid var(--color-border-strong)",
                borderRadius: "var(--radius-control)",
                boxShadow: "var(--shadow-paper-tight)",
                padding: "var(--control-padding-y) var(--control-padding-x)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
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
