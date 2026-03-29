import { Direction } from "honeycomb-grid";
import type { GameGrid, Point, TileId } from "./types.js";
import { fromTileId, toTileId } from "./types.js";

export function getTileVertices(gameGrid: GameGrid, tileId: TileId): Point[] {
  const { q, r } = fromTileId(tileId);
  const hex = gameGrid.grid.getHex({ q, r });
  if (!hex) {
    throw new Error(`Tile ${tileId} not found in grid`);
  }

  // hex.corners are already in absolute world coordinates
  return hex.corners.map((corner) => ({
    x: corner.x,
    y: corner.y,
  }));
}

export function getAllVertices(gameGrid: GameGrid): Point[] {
  const seen = new Set<string>();
  const vertices: Point[] = [];

  for (const hex of gameGrid.grid) {
    for (const corner of hex.corners) {
      const x = Math.round(corner.x * 100) / 100;
      const y = Math.round(corner.y * 100) / 100;
      const key = `${x},${y}`;
      if (!seen.has(key)) {
        seen.add(key);
        vertices.push({ x, y });
      }
    }
  }

  return vertices;
}

export function getTileCenter(gameGrid: GameGrid, tileId: TileId): Point {
  const { q, r } = fromTileId(tileId);
  const hex = gameGrid.grid.getHex({ q, r });
  if (!hex) {
    throw new Error(`Tile ${tileId} not found in grid`);
  }
  return { x: hex.x, y: hex.y };
}

const HEX_DIRECTIONS = [
  Direction.N,
  Direction.NE,
  Direction.E,
  Direction.SE,
  Direction.S,
  Direction.SW,
] as const;

export function getTileNeighbors(
  gameGrid: GameGrid,
  tileId: TileId,
): TileId[] {
  const { q, r } = fromTileId(tileId);
  const neighbors: TileId[] = [];

  for (const direction of HEX_DIRECTIONS) {
    const neighbor = gameGrid.grid.neighborOf({ q, r }, direction, {
      allowOutside: false,
    });
    if (neighbor) {
      neighbors.push(toTileId(neighbor.q, neighbor.r));
    }
  }

  return neighbors;
}

export function pointToTileId(
  gameGrid: GameGrid,
  point: Point,
): TileId | null {
  const hex = gameGrid.grid.pointToHex(point, { allowOutside: false });
  if (!hex) return null;
  return toTileId(hex.q, hex.r);
}
