import type { TileId } from "@ambotrope/grid";

export interface GameConfig {
  playerCount: number;
  tileMultiplier: number;
  wordList: string[];
  seed: number;
  maxWordsPerPlayer: number;
}

export type GamePhase =
  | "selecting"
  | "reveal";

export interface PlayerState {
  id: string;
  name: string;
  selectedTile: TileId | null;
  selectedWords: string[];
  lockedIn: boolean;
  readyForNext: boolean;
}

export interface GameState {
  id: string;
  config: GameConfig;
  phase: GamePhase;
  tileIds: TileId[];
  players: Record<string, PlayerState>;
  round: number;
}

export interface PlayerView {
  id: string;
  phase: GamePhase;
  tileIds: TileId[];
  round: number;
  config: GameConfig;
  self: PlayerState;
  others: Array<{
    id: string;
    name: string;
    selectedWords: string[];
    lockedIn: boolean;
    readyForNext: boolean;
    hasSelectedTile: boolean;
    selectedTile: TileId | null; // only populated in reveal phase
  }>;
}

export interface RoundResult {
  round: number;
  selections: Record<string, TileId | null>;
  collisions: TileId[]; // tiles selected by multiple players
  scores: Record<string, number>; // +1 for unique, 0 for collision
}
