import type {
  GameConfig,
  GameState,
  PlayerState,
  PlayerView,
  RoundResult,
} from "./types.js";
import { DEFAULT_WORD_LIST } from "./words.js";

export const DEFAULT_GAME_CONFIG: Omit<GameConfig, "playerCount" | "seed"> = {
  tileMultiplier: 2.5,
  wordList: DEFAULT_WORD_LIST,
  maxWordsPerPlayer: 3,
};

export function createGame(
  id: string,
  config: GameConfig,
  tileIds: string[],
): GameState {
  return {
    id,
    config,
    phase: "selecting",
    tileIds,
    players: {},
    round: 1,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  name: string,
): GameState {
  if (state.phase === "reveal") {
    throw new Error("Cannot join during reveal phase");
  }
  if (state.players[playerId]) {
    throw new Error(`Player ${playerId} already exists`);
  }

  const player: PlayerState = {
    id: playerId,
    name,
    selectedTile: null,
    selectedWords: [],
    lockedIn: false,
    readyForNext: false,
  };

  return {
    ...state,
    players: { ...state.players, [playerId]: player },
  };
}

export function removePlayer(
  state: GameState,
  playerId: string,
): GameState {
  if (!state.players[playerId]) {
    throw new Error(`Player ${playerId} not found`);
  }

  const { [playerId]: _, ...remaining } = state.players;
  return { ...state, players: remaining };
}

export function selectTile(
  state: GameState,
  playerId: string,
  tileId: string,
): GameState {
  if (state.phase !== "selecting") {
    throw new Error("Can only select tiles during selecting phase");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }
  if (player.lockedIn) {
    throw new Error("Cannot change tile after locking in");
  }
  if (!state.tileIds.includes(tileId)) {
    throw new Error(`Tile ${tileId} is not in the grid`);
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, selectedTile: tileId },
    },
  };
}

export function selectWords(
  state: GameState,
  playerId: string,
  words: string[],
): GameState {
  if (state.phase !== "selecting") {
    throw new Error("Can only select words during selecting phase");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }
  if (words.length > state.config.maxWordsPerPlayer) {
    throw new Error(
      `Cannot select more than ${state.config.maxWordsPerPlayer} words`,
    );
  }
  const wordListLower = state.config.wordList.map((w) => w.toLowerCase());
  for (const word of words) {
    if (!wordListLower.includes(word.toLowerCase())) {
      throw new Error(`Word "${word}" is not in the word list`);
    }
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, selectedWords: words },
    },
  };
}

export function lockIn(state: GameState, playerId: string): GameState {
  if (state.phase !== "selecting") {
    throw new Error("Can only lock in during selecting phase");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, lockedIn: true },
    },
  };
}

export function allLockedIn(state: GameState): boolean {
  const players = Object.values(state.players);
  return players.length >= 2 && players.every((p) => p.lockedIn);
}

export function revealRound(state: GameState): GameState {
  if (state.phase !== "selecting") {
    throw new Error("Can only reveal from selecting phase");
  }
  return { ...state, phase: "reveal" };
}

export function markReady(state: GameState, playerId: string): GameState {
  if (state.phase !== "reveal") {
    throw new Error("Can only mark ready during reveal phase");
  }
  const player = state.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, readyForNext: true },
    },
  };
}

export function allReady(state: GameState): boolean {
  const players = Object.values(state.players);
  return players.length >= 1 && players.every((p) => p.readyForNext);
}

export function startNewRound(state: GameState): GameState {
  if (state.phase !== "reveal") {
    throw new Error("Can only start a new round from reveal phase");
  }

  const resetPlayers: Record<string, PlayerState> = {};
  for (const [id, player] of Object.entries(state.players)) {
    resetPlayers[id] = {
      ...player,
      selectedTile: null,
      selectedWords: [],
      lockedIn: false,
      readyForNext: false,
    };
  }

  return {
    ...state,
    phase: "selecting",
    players: resetPlayers,
    round: state.round + 1,
  };
}

export function getPlayerView(
  state: GameState,
  playerId: string,
): PlayerView {
  const self = state.players[playerId];
  if (!self) {
    throw new Error(`Player ${playerId} not found`);
  }

  const isReveal = state.phase === "reveal";

  const others = Object.values(state.players)
    .filter((p) => p.id !== playerId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      selectedWords: p.selectedWords,
      lockedIn: p.lockedIn,
      readyForNext: p.readyForNext,
      hasSelectedTile: p.selectedTile !== null,
      selectedTile: isReveal ? p.selectedTile : null,
    }));

  return {
    id: state.id,
    phase: state.phase,
    tileIds: state.tileIds,
    round: state.round,
    config: state.config,
    self,
    others,
  };
}

export function scoreRound(state: GameState): RoundResult {
  if (state.phase !== "reveal") {
    throw new Error("Can only score during reveal phase");
  }

  const selections: Record<string, string | null> = {};
  const tileCounts: Record<string, number> = {};

  for (const player of Object.values(state.players)) {
    selections[player.id] = player.selectedTile;
    if (player.selectedTile) {
      tileCounts[player.selectedTile] =
        (tileCounts[player.selectedTile] ?? 0) + 1;
    }
  }

  const collisions = Object.entries(tileCounts)
    .filter(([, count]) => count > 1)
    .map(([tileId]) => tileId);

  const collisionSet = new Set(collisions);
  const scores: Record<string, number> = {};
  for (const player of Object.values(state.players)) {
    if (
      player.selectedTile &&
      !collisionSet.has(player.selectedTile)
    ) {
      scores[player.id] = 1;
    } else {
      scores[player.id] = 0;
    }
  }

  return {
    round: state.round,
    selections,
    collisions,
    scores,
  };
}
