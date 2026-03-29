import { useEffect, useRef, useCallback, useState } from "react";
import type { ClientMessage, ServerMessage } from "@ambotrope/protocol";
import type { PlayerView } from "@ambotrope/game";

interface GameSocketState {
  gameView: PlayerView | null;
  connected: boolean;
  error: string | null;
  messages: ServerMessage[];
}

export function useGameSocket(gameId: string, playerName: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameSocketState>({
    gameView: null,
    connected: false,
    error: null,
    messages: [],
  });

  useEffect(() => {
    if (!playerName) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setState((s) => ({ ...s, connected: true, error: null }));
      ws.send(
        JSON.stringify({
          type: "join",
          payload: { gameId, playerName },
        }),
      );
    });

    ws.addEventListener("message", (evt) => {
      const msg: ServerMessage = JSON.parse(evt.data);

      setState((s) => {
        const next = { ...s, messages: [...s.messages, msg] };

        if (msg.type === "game_state") {
          next.gameView = msg.payload;
        }
        if (msg.type === "error") {
          next.error = msg.payload.message;
        }
        return next;
      });
    });

    ws.addEventListener("close", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    ws.addEventListener("error", () => {
      setState((s) => ({ ...s, error: "Connection error" }));
    });

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [gameId, playerName]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const selectTile = useCallback(
    (tileId: string) => send({ type: "select_tile", payload: { tileId } }),
    [send],
  );

  const selectWords = useCallback(
    (words: string[]) => send({ type: "select_words", payload: { words } }),
    [send],
  );

  const lockIn = useCallback(() => send({ type: "lock_in" }), [send]);

  const ready = useCallback(() => send({ type: "ready" }), [send]);

  return {
    ...state,
    selectTile,
    selectWords,
    lockIn,
    ready,
  };
}
