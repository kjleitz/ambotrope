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
  startNewRound,
  getPlayerView,
  scoreRound,
} from "./game.js";
export { DEFAULT_WORD_LIST } from "./words.js";
