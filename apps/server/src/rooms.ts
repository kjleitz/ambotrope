import type { WebSocket as NodeWebSocket } from "ws";
import type { WSContext } from "hono/ws";
import {
  createGame,
  addPlayer,
  removePlayer,
  changeSeed,
  selectTile,
  selectWords,
  lockIn,
  allLockedIn,
  revealRound,
  markReady,
  allReady,
  startNewRound,
  getPlayerView,
  scoreRound,
  DEFAULT_GAME_CONFIG,
  DEFAULT_WORD_LIST,
} from "@ambotrope/game";
import type { GameState } from "@ambotrope/game";
import { createGameGrid } from "@ambotrope/grid";
import type { ClientMessage, ServerMessage } from "@ambotrope/protocol";

interface Connection {
  playerId: string;
  ws: WSContext;
}

interface Room {
  gameState: GameState;
  connections: Map<string, Connection>;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();

const ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const PING_INTERVAL_MS = 30_000; // 30 seconds

function generatePlayerId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sendToPlayer(conn: Connection, message: ServerMessage): void {
  if (conn.ws.readyState === 1) {
    conn.ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(room: Room, message: ServerMessage): void {
  for (const conn of room.connections.values()) {
    sendToPlayer(conn, message);
  }
}

function sendGameStateToAll(room: Room): void {
  for (const conn of room.connections.values()) {
    try {
      const view = getPlayerView(room.gameState, conn.playerId);
      sendToPlayer(conn, { type: "game_state", payload: view });
    } catch {
      // Player may have been removed
    }
  }
}

function sendError(conn: Connection, message: string): void {
  sendToPlayer(conn, { type: "error", payload: { message } });
}

function getOrCreateRoom(gameId: string): Room {
  const existing = rooms.get(gameId);
  if (existing) {
    if (existing.cleanupTimer) {
      clearTimeout(existing.cleanupTimer);
      existing.cleanupTimer = null;
    }
    return existing;
  }

  const seed = hashCode(gameId);
  const initialTileCount = 2; // N+2 with 0 players = 2
  const grid = createGameGrid({ tileCount: initialTileCount, hexSize: HEX_SIZE });

  const config = {
    ...DEFAULT_GAME_CONFIG,
    playerCount: 10,
    seed,
    wordList: DEFAULT_WORD_LIST,
  };

  const gameState = createGame(gameId, config, grid.tileIds);

  const room: Room = {
    gameState,
    connections: new Map(),
    cleanupTimer: null,
  };
  rooms.set(gameId, room);
  return room;
}

const HEX_SIZE = 30;

function growGridIfNeeded(room: Room): void {
  const playerCount = Object.keys(room.gameState.players).length;
  const targetTileCount = playerCount + 2;
  if (targetTileCount <= room.gameState.tileIds.length) return;

  const grid = createGameGrid({ tileCount: targetTileCount, hexSize: HEX_SIZE });
  room.gameState = { ...room.gameState, tileIds: grid.tileIds };
}

function scheduleRoomCleanup(gameId: string): void {
  const room = rooms.get(gameId);
  if (!room) return;
  if (room.connections.size > 0) return;

  room.cleanupTimer = setTimeout(() => {
    const current = rooms.get(gameId);
    if (current && current.connections.size === 0) {
      rooms.delete(gameId);
    }
  }, ROOM_CLEANUP_DELAY_MS);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}

export function handleConnection(gameId: string, ws: WSContext): {
  onMessage: (data: string) => void;
  onClose: () => void;
} {
  const room = getOrCreateRoom(gameId);
  let playerId: string | null = null;

  const pingInterval = setInterval(() => {
    const raw = ws.raw as NodeWebSocket | undefined;
    if (raw && raw.readyState === 1) {
      raw.ping();
    }
  }, PING_INTERVAL_MS);

  function onMessage(data: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(data);
    } catch {
      if (playerId) {
        const conn = room.connections.get(playerId);
        if (conn) sendError(conn, "Invalid JSON");
      }
      return;
    }

    try {
      handleClientMessage(room, gameId, ws, message, () => playerId, (id) => { playerId = id; });
    } catch (err) {
      if (playerId) {
        const conn = room.connections.get(playerId);
        if (conn) sendError(conn, err instanceof Error ? err.message : "Unknown error");
      }
    }
  }

  function onClose(): void {
    clearInterval(pingInterval);

    if (playerId) {
      room.connections.delete(playerId);

      broadcastToRoom(room, {
        type: "player_left",
        payload: { playerId },
      });

      if (room.connections.size === 0) {
        scheduleRoomCleanup(gameId);
      }
    }
  }

  return { onMessage, onClose };
}

function handleClientMessage(
  room: Room,
  gameId: string,
  ws: WSContext,
  message: ClientMessage,
  getPlayerId: () => string | null,
  setPlayerId: (id: string) => void,
): void {
  switch (message.type) {
    case "join": {
      if (getPlayerId()) {
        throw new Error("Already joined");
      }

      // Check for a disconnected player with the same name (reconnect on refresh)
      let playerId: string | null = null;
      for (const [pid, player] of Object.entries(room.gameState.players)) {
        if (player.name === message.payload.playerName && !room.connections.has(pid)) {
          playerId = pid;
          break;
        }
      }

      const isReconnect = playerId !== null;
      if (!playerId) {
        playerId = generatePlayerId();
      }
      setPlayerId(playerId);

      const conn: Connection = { playerId, ws };
      room.connections.set(playerId, conn);

      if (!isReconnect) {
        room.gameState = addPlayer(room.gameState, playerId, message.payload.playerName);
        growGridIfNeeded(room);

        broadcastToRoom(room, {
          type: "player_joined",
          payload: { playerId, name: message.payload.playerName },
        });
      }

      sendGameStateToAll(room);
      break;
    }

    case "select_tile": {
      const pid = getPlayerId();
      if (!pid) throw new Error("Not joined");
      room.gameState = selectTile(room.gameState, pid, message.payload.tileId);
      // Broadcast so others see "has selected tile" — which tile remains secret
      sendGameStateToAll(room);
      break;
    }

    case "select_words": {
      const pid = getPlayerId();
      if (!pid) throw new Error("Not joined");
      room.gameState = selectWords(room.gameState, pid, message.payload.words);
      // Broadcast so others see the words in real time
      sendGameStateToAll(room);
      break;
    }

    case "lock_in": {
      const pid = getPlayerId();
      if (!pid) throw new Error("Not joined");
      room.gameState = lockIn(room.gameState, pid);

      // Auto-reveal when all players are locked in
      if (allLockedIn(room.gameState)) {
        room.gameState = revealRound(room.gameState);
        broadcastToRoom(room, { type: "phase_changed", payload: { phase: "reveal" } });
        const result = scoreRound(room.gameState);
        broadcastToRoom(room, { type: "round_result", payload: result });
      }

      sendGameStateToAll(room);
      break;
    }

    case "change_seed": {
      const pid = getPlayerId();
      if (!pid) throw new Error("Not joined");
      room.gameState = changeSeed(room.gameState, message.payload.direction);
      sendGameStateToAll(room);
      break;
    }

    case "ready": {
      const pid = getPlayerId();
      if (!pid) throw new Error("Not joined");

      if (room.gameState.phase === "reveal") {
        room.gameState = markReady(room.gameState, pid);
        sendGameStateToAll(room);

        if (allReady(room.gameState)) {
          room.gameState = startNewRound(room.gameState);
          growGridIfNeeded(room);
          broadcastToRoom(room, { type: "phase_changed", payload: { phase: "selecting" } });
          sendGameStateToAll(room);
        }
      }
      break;
    }
  }
}

export function clearAllRooms(): void {
  for (const room of rooms.values()) {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  }
  rooms.clear();
}

export function getRoomCount(): number {
  return rooms.size;
}

export function getRoomInfo(gameId: string): { playerCount: number; phase: string } | null {
  const room = rooms.get(gameId);
  if (!room) return null;
  return {
    playerCount: Object.keys(room.gameState.players).length,
    phase: room.gameState.phase,
  };
}
