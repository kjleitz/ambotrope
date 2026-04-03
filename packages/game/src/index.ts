export type {
  GameConfig,
  GamePhase,
  GameState,
  PlayerState,
  PlayerView,
  RoundResult,
} from "./types.js";
export {
  DEFAULT_GAME_CONFIG,
  createGame,
  addPlayer,
  removePlayer,
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
} from "./game.js";
export { DEFAULT_WORD_LIST, DEFAULT_DISABLED_WORDS } from "./words.js";
