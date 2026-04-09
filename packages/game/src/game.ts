import type {
  GameConfig,
  GameState,
  KickVoteView,
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
    baseSeed: config.seed,
    seedAdvances: 0,
    activeKickVote: null,
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

export function changeSeed(
  state: GameState,
  direction: "next" | "prev",
): GameState {
  if (state.phase !== "selecting") {
    throw new Error("Can only change seed during selecting phase");
  }
  const newAdvances = direction === "next"
    ? state.seedAdvances + 1
    : state.seedAdvances - 1;
  if (newAdvances < 0) {
    throw new Error("Cannot undo past the original seed");
  }
  return {
    ...state,
    seedAdvances: newAdvances,
    config: { ...state.config, seed: state.baseSeed + newAdvances },
  };
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
  const WORD_PATTERN =
    /^[\w\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  const MAX_WORD_LENGTH = 50;
  for (const word of words) {
    if (word.length === 0 || word.length > MAX_WORD_LENGTH) {
      throw new Error(
        `Word must be between 1 and ${MAX_WORD_LENGTH} characters`,
      );
    }
    if (!WORD_PATTERN.test(word)) {
      throw new Error(`Word "${word}" contains invalid characters`);
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
      connected: true, // server overrides this with actual connection state
    }));

  let activeKickVote: KickVoteView | null = null;
  if (state.activeKickVote) {
    const target = state.players[state.activeKickVote.targetId];
    const nonTargetCount = Object.keys(state.players).filter(
      (id) => id !== state.activeKickVote!.targetId,
    ).length;
    activeKickVote = {
      targetId: state.activeKickVote.targetId,
      targetName: target?.name ?? "Unknown",
      votesNeeded: nonTargetCount,
      votesCast: state.activeKickVote.votes.length,
      selfHasVoted: state.activeKickVote.votes.includes(playerId),
    };
  }

  return {
    id: state.id,
    phase: state.phase,
    tileIds: state.tileIds,
    round: state.round,
    config: state.config,
    seedAdvances: state.seedAdvances,
    self,
    others,
    activeKickVote,
  };
}

export function initiateKickVote(
  state: GameState,
  initiatorId: string,
  targetId: string,
): GameState {
  if (!state.players[initiatorId]) {
    throw new Error(`Player ${initiatorId} not found`);
  }
  if (!state.players[targetId]) {
    throw new Error(`Player ${targetId} not found`);
  }
  if (initiatorId === targetId) {
    throw new Error("Cannot kick yourself");
  }
  if (state.activeKickVote) {
    throw new Error("A kick vote is already in progress");
  }
  // Need at least 2 non-target players for a vote to make sense
  const otherPlayers = Object.keys(state.players).filter((id) => id !== targetId);
  if (otherPlayers.length < 2) {
    throw new Error("Not enough players to start a kick vote");
  }

  return {
    ...state,
    activeKickVote: {
      targetId,
      votes: [initiatorId],
    },
  };
}

export function castKickVote(
  state: GameState,
  voterId: string,
): GameState {
  if (!state.players[voterId]) {
    throw new Error(`Player ${voterId} not found`);
  }
  if (!state.activeKickVote) {
    throw new Error("No active kick vote");
  }
  if (voterId === state.activeKickVote.targetId) {
    throw new Error("Cannot vote on your own kick");
  }
  if (state.activeKickVote.votes.includes(voterId)) {
    throw new Error("Already voted");
  }

  return {
    ...state,
    activeKickVote: {
      ...state.activeKickVote,
      votes: [...state.activeKickVote.votes, voterId],
    },
  };
}

export function cancelKickVote(state: GameState): GameState {
  return { ...state, activeKickVote: null };
}

export function isKickVoteUnanimous(state: GameState): boolean {
  if (!state.activeKickVote) return false;
  const nonTargetCount = Object.keys(state.players).filter(
    (id) => id !== state.activeKickVote!.targetId,
  ).length;
  return state.activeKickVote.votes.length >= nonTargetCount;
}

export function executeKick(state: GameState): GameState {
  if (!state.activeKickVote) {
    throw new Error("No active kick vote");
  }
  const targetId = state.activeKickVote.targetId;
  const target = state.players[targetId];
  if (!target) {
    throw new Error(`Target player ${targetId} not found`);
  }

  // Lock in the kicked player with whatever they have, then remove them
  const updatedPlayers = { ...state.players };
  updatedPlayers[targetId] = { ...target, lockedIn: true };

  // Remove the kicked player
  const { [targetId]: _, ...remaining } = updatedPlayers;

  return {
    ...state,
    players: remaining,
    activeKickVote: null,
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
