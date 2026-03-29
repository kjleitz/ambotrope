import type { Grid, Hex } from "honeycomb-grid";

export interface Point {
  x: number;
  y: number;
}

export type TileId = string; // "q,r" axial coordinates

export interface GridConfig {
  tileCount: number;
  hexSize: number;
}

export interface GameGrid {
  grid: Grid<Hex>;
  tileIds: TileId[];
  config: GridConfig;
}

export function toTileId(q: number, r: number): TileId {
  return `${q},${r}`;
}

export function fromTileId(id: TileId): { q: number; r: number } {
  const [q, r] = id.split(",").map(Number);
  return { q, r };
}
