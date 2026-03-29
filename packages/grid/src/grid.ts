import { defineHex, Grid, spiral } from "honeycomb-grid";
import type { GameGrid, GridConfig } from "./types.js";
import { toTileId } from "./types.js";

/**
 * Compute the spiral radius needed to contain at least `tileCount` hexes.
 * A spiral of radius r contains 1 + 3*r*(r+1) hexes.
 */
function radiusForTileCount(tileCount: number): number {
  let r = 0;
  while (1 + 3 * r * (r + 1) < tileCount) {
    r++;
  }
  return r;
}

export function createGameGrid(config: GridConfig): GameGrid {
  const { tileCount, hexSize } = config;

  if (tileCount < 1) {
    throw new Error("tileCount must be at least 1");
  }

  const Tile = defineHex({ dimensions: hexSize });
  const radius = radiusForTileCount(tileCount);

  const grid = new Grid(Tile, spiral({ radius }));

  // Collect tile IDs, trimming to the requested count.
  // The spiral generates 1 + 3*r*(r+1) hexes which may exceed tileCount.
  const tileIds: string[] = [];
  for (const hex of grid) {
    tileIds.push(toTileId(hex.q, hex.r));
    if (tileIds.length >= tileCount) break;
  }

  // If we trimmed, rebuild the grid with only the tiles we want
  if (1 + 3 * radius * (radius + 1) > tileCount) {
    const trimmedGrid = new Grid(Tile, grid.toArray().slice(0, tileCount));
    return { grid: trimmedGrid, tileIds, config };
  }

  return { grid, tileIds, config };
}
