import { useEffect, useRef, useCallback, useState } from "react";
import type { ClientMessage, ServerMessage } from "@ambotrope/protocol";
import type { PlayerView } from "@ambotrope/game";

interface GameSocketState {
  gameView: PlayerView | null;
  connected: boolean;
  error: string | null;
  messages: ServerMessage[];
}

interface OptimisticSelf {
  selectedTile: string | null;
  selectedWords: string[] | null;
}

export function useGameSocket(gameId: string, playerName: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const optimisticRef = useRef<OptimisticSelf>({ selectedTile: null, selectedWords: null });
  // Holds the latest connect function so visibility/interval handlers always use current closure values.
  const connectRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<GameSocketState>({
    gameView: null,
    connected: false,
    error: null,
    messages: [],
  });

  useEffect(() => {
    if (!playerName) return;

    const connect = () => {
      const existing = wsRef.current;
      if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${wsHost}/ws/${gameId}`;
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
            const serverView = msg.payload;
            const opt = optimisticRef.current;

            // Clear optimistic values once the server has caught up
            if (opt.selectedTile !== null && serverView.self.selectedTile === opt.selectedTile) {
              opt.selectedTile = null;
            }
            if (opt.selectedWords !== null && JSON.stringify(serverView.self.selectedWords) === JSON.stringify(opt.selectedWords)) {
              opt.selectedWords = null;
            }

            // Overlay any remaining optimistic values onto the server state
            const self = { ...serverView.self };
            if (opt.selectedTile !== null) {
              self.selectedTile = opt.selectedTile;
            }
            if (opt.selectedWords !== null) {
              self.selectedWords = opt.selectedWords;
            }

            next.gameView = { ...serverView, self };
          }
          if (msg.type === "error") {
            next.error = msg.payload.message;
          }
          return next;
        });
      });

      ws.addEventListener("close", () => {
        setState((s) => ({ ...s, connected: false }));
        if (wsRef.current === ws) wsRef.current = null;
      });

      ws.addEventListener("error", () => {
        setState((s) => ({ ...s, error: "Connection error" }));
      });
    };

    connectRef.current = connect;
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") connectRef.current?.();
    };

    // Reconnect immediately when the tab becomes visible again (e.g. after closing/opening laptop lid).
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also poll every 5 seconds so a stale connection gets recovered without user action.
    const intervalId = setInterval(() => connectRef.current?.(), 5_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
      wsRef.current?.close();
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
    (tileId: string) => {
      optimisticRef.current.selectedTile = tileId;
      setState((s) => {
        if (!s.gameView) return s;
        return {
          ...s,
          gameView: {
            ...s.gameView,
            self: { ...s.gameView.self, selectedTile: tileId },
          },
        };
      });
      send({ type: "select_tile", payload: { tileId } });
    },
    [send],
  );

  const selectWords = useCallback(
    (words: string[]) => {
      optimisticRef.current.selectedWords = words;
      setState((s) => {
        if (!s.gameView) return s;
        return {
          ...s,
          gameView: {
            ...s.gameView,
            self: { ...s.gameView.self, selectedWords: words },
          },
        };
      });
      send({ type: "select_words", payload: { words } });
    },
    [send],
  );

  const lockIn = useCallback(() => send({ type: "lock_in" }), [send]);

  const ready = useCallback(() => send({ type: "ready" }), [send]);

  const changeSeed = useCallback(
    (direction: "next" | "prev") => {
      send({ type: "change_seed", payload: { direction } });
    },
    [send],
  );

  const initiateKick = useCallback(
    (targetId: string) => {
      send({ type: "initiate_kick", payload: { targetId } });
    },
    [send],
  );

  const voteKick = useCallback(() => send({ type: "vote_kick" }), [send]);

  const cancelKick = useCallback(() => send({ type: "cancel_kick" }), [send]);

  return {
    ...state,
    selectTile,
    selectWords,
    lockIn,
    ready,
    changeSeed,
    initiateKick,
    voteKick,
    cancelKick,
  };
}
