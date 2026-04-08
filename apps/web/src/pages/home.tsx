import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface Quote {
  text: string;
  author: string;
  source?: string;
}

const QUOTES: Quote[] = [
  {
    text: "The sky is now indelible ink,\nThe branches reft asunder;\nBut you and I we do not shrink;\nWe love the lovely thunder.",
    author: "Ogden Nash",
    source: "A Watched Example Never Boils",
  },
  {
    text: "Let there be gall enough in thy ink, though thou write with a goose-pen, no matter.",
    author: "William Shakespeare",
    source: "Twelfth Night",
  },
  {
    text: "This conference was worse than a Rorschach test: There\u2019s a meaningless inkblot, and the others ask you what you think you see, but when you tell them, they start arguing with you!",
    author: "Richard Feynman",
    source: "Surely You\u2019re Joking, Mr. Feynman!",
  },
  {
    text: "I very much enjoyed your delightful explanation of the formation of meanders. It just happens that my wife had asked me about the \u201cteacup phenomenon\u201d a few days earlier, but I did not know a rational explanation. She says that she will never stir her tea again without thinking of you.",
    author: "Erwin Schr\u00f6dinger to Albert Einstein",
    source: "23 April 1926",
  },
];

export function HomePage() {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("");
  const navigate = useNavigate();
  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

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
          <blockquote className="text-sm text-text-muted italic whitespace-pre-line">
            {quote.text}
            <footer className="mt-1 not-italic text-xs">
              — {quote.author}{quote.source ? <>, <cite>{quote.source}</cite></> : null}
            </footer>
          </blockquote>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
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
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
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
