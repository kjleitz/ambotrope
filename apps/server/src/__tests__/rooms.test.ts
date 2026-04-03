import { describe, it, expect, beforeEach } from "vitest";
import type { WSContext } from "hono/ws";
import type { ServerMessage } from "@ambotrope/protocol";
import {
  handleConnection,
  clearAllRooms,
  getRoomCount,
  getRoomInfo,
} from "../rooms.js";

function createMockWs(): { ws: WSContext; messages: ServerMessage[] } {
  const messages: ServerMessage[] = [];
  const ws = {
    readyState: 1,
    send(data: string | ArrayBuffer | Uint8Array) {
      messages.push(JSON.parse(data as string));
    },
    close() {
      (ws as { readyState: number }).readyState = 3;
    },
    raw: undefined,
    binaryType: "arraybuffer" as const,
    url: null,
    protocol: null,
  } satisfies WSContext;
  return { ws, messages };
}

function send(handler: { onMessage: (data: string) => void }, msg: unknown) {
  handler.onMessage(JSON.stringify(msg));
}

function gameStateMessages(messages: ServerMessage[]) {
  return messages.filter((m) => m.type === "game_state");
}

function getPhase(messages: ServerMessage[]): string | undefined {
  const states = gameStateMessages(messages);
  const last = states[states.length - 1];
  if (last?.type === "game_state") return last.payload.phase;
  return undefined;
}

function getTileIds(messages: ServerMessage[]): string[] {
  const state = messages.find((m) => m.type === "game_state");
  if (state?.type === "game_state") return state.payload.tileIds;
  return [];
}

function getPlayerId(messages: ServerMessage[]): string | undefined {
  const state = messages.find((m) => m.type === "game_state");
  if (state?.type === "game_state") return state.payload.self.id;
  return undefined;
}

describe("rooms", () => {
  beforeEach(() => {
    clearAllRooms();
  });

  describe("room lifecycle", () => {
    it("creates a room on first connection", () => {
      const { ws } = createMockWs();
      const handler = handleConnection("room-1", ws);
      send(handler, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });

      expect(getRoomCount()).toBe(1);
      expect(getRoomInfo("room-1")).toEqual({ playerCount: 1, phase: "selecting" });
    });

    it("reuses existing room for same gameId", () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();
      const h1 = handleConnection("room-1", ws1);
      const h2 = handleConnection("room-1", ws2);

      send(h1, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "room-1", playerName: "Bob" } });

      expect(getRoomCount()).toBe(1);
      expect(getRoomInfo("room-1")).toEqual({ playerCount: 2, phase: "selecting" });
    });

    it("creates separate rooms for different gameIds", () => {
      const { ws: ws1 } = createMockWs();
      const { ws: ws2 } = createMockWs();
      const h1 = handleConnection("room-1", ws1);
      const h2 = handleConnection("room-2", ws2);

      send(h1, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "room-2", playerName: "Bob" } });

      expect(getRoomCount()).toBe(2);
    });

    it("keeps player in game on disconnect for reconnect", () => {
      const { ws } = createMockWs();
      const handler = handleConnection("room-1", ws);
      send(handler, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });

      handler.onClose();

      // Player stays in game state so they can reconnect
      expect(getRoomInfo("room-1")?.playerCount).toBe(1);
    });
  });

  describe("dynamic grid", () => {
    it("grows tile count as players join (N+2)", () => {
      const mock1 = createMockWs();
      const mock2 = createMockWs();
      const mock3 = createMockWs();
      const h1 = handleConnection("room-g", mock1.ws);
      const h2 = handleConnection("room-g", mock2.ws);
      const h3 = handleConnection("room-g", mock3.ws);

      function latestTileIds(messages: ServerMessage[]): string[] {
        const state = messages.findLast((m) => m.type === "game_state");
        if (state?.type === "game_state") return state.payload.tileIds;
        return [];
      }

      send(h1, { type: "join", payload: { gameId: "room-g", playerName: "Alice" } });
      const tiles1 = latestTileIds(mock1.messages);
      expect(tiles1).toHaveLength(3); // 1+2

      send(h2, { type: "join", payload: { gameId: "room-g", playerName: "Bob" } });
      const tiles2 = latestTileIds(mock1.messages);
      expect(tiles2).toHaveLength(4); // 2+2

      send(h3, { type: "join", payload: { gameId: "room-g", playerName: "Carol" } });
      const tiles3 = latestTileIds(mock1.messages);
      expect(tiles3).toHaveLength(5); // 3+2

      // New tiles are appended — existing tiles preserved
      expect(tiles3.slice(0, 3)).toEqual(tiles1);
      expect(tiles3.slice(0, 4)).toEqual(tiles2);
    });
  });

  describe("join", () => {
    it("sends game_state after joining", () => {
      const { ws, messages } = createMockWs();
      const handler = handleConnection("room-1", ws);
      send(handler, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });

      const states = gameStateMessages(messages);
      expect(states.length).toBeGreaterThanOrEqual(1);
      const state = states[states.length - 1];
      expect(state.type).toBe("game_state");
      if (state.type === "game_state") {
        expect(state.payload.phase).toBe("selecting");
        expect(state.payload.self.name).toBe("Alice");
      }
    });

    it("starts in selecting phase immediately", () => {
      const mock1 = createMockWs();
      const h1 = handleConnection("room-1", mock1.ws);

      send(h1, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });
      expect(getPhase(mock1.messages)).toBe("selecting");
    });

    it("broadcasts player_joined to existing players", () => {
      const { ws: ws1, messages: m1 } = createMockWs();
      const { ws: ws2 } = createMockWs();
      const h1 = handleConnection("room-1", ws1);
      const h2 = handleConnection("room-1", ws2);

      send(h1, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "room-1", playerName: "Bob" } });

      const joinMsgs = m1.filter((m) => m.type === "player_joined");
      expect(joinMsgs).toHaveLength(2);
      const bobJoin = joinMsgs[1];
      if (bobJoin.type === "player_joined") {
        expect(bobJoin.payload.name).toBe("Bob");
      }
    });

    it("rejects double join", () => {
      const { ws, messages } = createMockWs();
      const handler = handleConnection("room-1", ws);
      send(handler, { type: "join", payload: { gameId: "room-1", playerName: "Alice" } });
      send(handler, { type: "join", payload: { gameId: "room-1", playerName: "Alice2" } });

      const errors = messages.filter((m) => m.type === "error");
      expect(errors).toHaveLength(1);
    });

    it("reconnects a disconnected player with the same name during reveal", () => {
      const mock1 = createMockWs();
      const mock2 = createMockWs();
      const h1 = handleConnection("room-r", mock1.ws);
      const h2 = handleConnection("room-r", mock2.ws);

      send(h1, { type: "join", payload: { gameId: "room-r", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "room-r", playerName: "Bob" } });

      const tiles = getTileIds(mock1.messages);
      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[1] } });

      // Both lock in -> auto-reveals
      send(h1, { type: "lock_in" });
      send(h2, { type: "lock_in" });
      expect(getPhase(mock1.messages)).toBe("reveal");

      // Alice disconnects during reveal — player stays in game state
      h1.onClose();
      expect(getRoomInfo("room-r")?.playerCount).toBe(2);

      // Alice reconnects with new WS
      const mock3 = createMockWs();
      const h3 = handleConnection("room-r", mock3.ws);
      send(h3, { type: "join", payload: { gameId: "room-r", playerName: "Alice" } });

      // Should still be 2 players, not 3
      expect(getRoomInfo("room-r")?.playerCount).toBe(2);
    });
  });

  describe("full game flow", () => {
    function setupTwoPlayers() {
      const mock1 = createMockWs();
      const mock2 = createMockWs();
      const h1 = handleConnection("game-1", mock1.ws);
      const h2 = handleConnection("game-1", mock2.ws);

      send(h1, { type: "join", payload: { gameId: "game-1", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "game-1", playerName: "Bob" } });

      return { h1, h2, m1: mock1.messages, m2: mock2.messages };
    }

    it("starts in selecting phase after two players join", () => {
      const { m1 } = setupTwoPlayers();
      expect(getPhase(m1)).toBe("selecting");
    });

    it("auto-reveals when all players lock in", () => {
      const { h1, h2, m1 } = setupTwoPlayers();
      const tiles = getTileIds(m1);

      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[1] } });
      send(h1, { type: "select_words", payload: { words: ["batman"] } });
      send(h2, { type: "select_words", payload: { words: ["maraca"] } });

      send(h1, { type: "lock_in" });
      expect(getPhase(m1)).toBe("selecting"); // not yet

      send(h2, { type: "lock_in" });
      expect(getPhase(m1)).toBe("reveal"); // now!
    });

    it("keeps tile selection secret until reveal", () => {
      const { h1, h2, m1 } = setupTwoPlayers();
      const tiles = getTileIds(m1);

      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[1] } });

      // Alice's view should not reveal Bob's tile during selecting
      const selectingStates = gameStateMessages(m1).filter(
        (m) => m.type === "game_state" && m.payload.phase !== "reveal",
      );
      for (const state of selectingStates) {
        if (state.type === "game_state") {
          for (const other of state.payload.others) {
            expect(other.selectedTile).toBeNull();
          }
        }
      }

      // Lock in to reveal
      send(h1, { type: "lock_in" });
      send(h2, { type: "lock_in" });

      const revealState = gameStateMessages(m1).findLast(
        (m) => m.type === "game_state" && m.payload.phase === "reveal",
      );
      if (revealState?.type === "game_state") {
        const bob = revealState.payload.others.find((o) => o.name === "Bob");
        expect(bob?.selectedTile).toBe(tiles[1]);
      }
    });

    it("shows words in real time during selecting", () => {
      const { h2, m1 } = setupTwoPlayers();

      send(h2, { type: "select_words", payload: { words: ["maraca"] } });

      const selectingStates = gameStateMessages(m1).filter(
        (m) => m.type === "game_state" && m.payload.phase === "selecting",
      );
      const lastState = selectingStates[selectingStates.length - 1];
      if (lastState.type === "game_state") {
        const bob = lastState.payload.others[0];
        expect(bob.selectedWords).toEqual(["maraca"]);
      }
    });

    it("sends round_result on reveal", () => {
      const { h1, h2, m1 } = setupTwoPlayers();
      const tiles = getTileIds(m1);

      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[1] } });
      send(h1, { type: "lock_in" });
      send(h2, { type: "lock_in" });

      const result = m1.find((m) => m.type === "round_result");
      expect(result).toBeDefined();
      if (result?.type === "round_result") {
        expect(result.payload.collisions).toEqual([]);
        const scores = Object.values(result.payload.scores);
        expect(scores).toEqual([1, 1]);
      }
    });

    it("detects collisions in round result", () => {
      const { h1, h2, m1 } = setupTwoPlayers();
      const tiles = getTileIds(m1);

      // Both pick the same tile
      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h1, { type: "lock_in" });
      send(h2, { type: "lock_in" });

      const result = m1.find((m) => m.type === "round_result");
      expect(result).toBeDefined();
      if (result?.type === "round_result") {
        expect(result.payload.collisions).toContain(tiles[0]);
        const scores = Object.values(result.payload.scores);
        expect(scores).toEqual([0, 0]);
      }
    });

    it("supports starting a new round", () => {
      const { h1, h2, m1 } = setupTwoPlayers();
      const tiles = getTileIds(m1);

      send(h1, { type: "select_tile", payload: { tileId: tiles[0] } });
      send(h2, { type: "select_tile", payload: { tileId: tiles[1] } });
      send(h1, { type: "lock_in" });
      send(h2, { type: "lock_in" });

      // Both players ready up to start new round
      send(h1, { type: "ready" });
      expect(getPhase(m1)).toBe("reveal"); // still reveal — waiting for h2
      send(h2, { type: "ready" });
      expect(getPhase(m1)).toBe("selecting");

      const latestState = gameStateMessages(m1).findLast(
        (m) => m.type === "game_state",
      );
      if (latestState?.type === "game_state") {
        expect(latestState.payload.round).toBe(2);
        expect(latestState.payload.self.selectedTile).toBeNull();
        expect(latestState.payload.self.selectedWords).toEqual([]);
      }
    });
  });

  describe("error handling", () => {
    it("sends error for invalid JSON", () => {
      const { ws, messages } = createMockWs();
      const handler = handleConnection("room-e", ws);
      send(handler, { type: "join", payload: { gameId: "room-e", playerName: "Alice" } });

      handler.onMessage("not json{{{");

      const errors = messages.filter((m) => m.type === "error");
      expect(errors).toHaveLength(1);
    });

    it("sends error when acting before joining", () => {
      const { ws, messages } = createMockWs();
      const handler = handleConnection("room-e2", ws);

      send(handler, { type: "select_tile", payload: { tileId: "0,0" } });

      expect(messages).toHaveLength(0);
    });

    it("sends error for invalid tile ID", () => {
      const { ws, messages } = createMockWs();
      const handler = handleConnection("room-e3", ws);
      send(handler, { type: "join", payload: { gameId: "room-e3", playerName: "Alice" } });

      send(handler, { type: "select_tile", payload: { tileId: "99,99" } });

      const errors = messages.filter((m) => m.type === "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("disconnect", () => {
    it("broadcasts player_left on disconnect", () => {
      const mock1 = createMockWs();
      const mock2 = createMockWs();
      const h1 = handleConnection("room-d", mock1.ws);
      const h2 = handleConnection("room-d", mock2.ws);

      send(h1, { type: "join", payload: { gameId: "room-d", playerName: "Alice" } });
      send(h2, { type: "join", payload: { gameId: "room-d", playerName: "Bob" } });

      const aliceId = getPlayerId(mock1.messages);
      h1.onClose();

      const leftMsgs = mock2.messages.filter((m) => m.type === "player_left");
      expect(leftMsgs).toHaveLength(1);
      if (leftMsgs[0].type === "player_left") {
        expect(leftMsgs[0].payload.playerId).toBe(aliceId);
      }
    });
  });
});
