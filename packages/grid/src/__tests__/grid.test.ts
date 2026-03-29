import { describe, it, expect } from "vitest";
import { createGameGrid } from "../grid.js";
import {
  getTileVertices,
  getAllVertices,
  getTileCenter,
  getTileNeighbors,
  pointToTileId,
} from "../queries.js";
import { fromTileId } from "../types.js";

describe("createGameGrid", () => {
  it("creates a grid with the requested tile count", () => {
    const grid = createGameGrid({ tileCount: 7, hexSize: 30 });
    expect(grid.tileIds).toHaveLength(7);
  });

  it("creates a single-tile grid", () => {
    const grid = createGameGrid({ tileCount: 1, hexSize: 30 });
    expect(grid.tileIds).toHaveLength(1);
  });

  it("creates a grid that fills an exact ring", () => {
    // radius 1 spiral = 1 + 3*1*2 = 7 hexes
    const grid = createGameGrid({ tileCount: 7, hexSize: 30 });
    expect(grid.tileIds).toHaveLength(7);
  });

  it("creates a grid with count between ring sizes", () => {
    // radius 1 = 7, radius 2 = 19
    const grid = createGameGrid({ tileCount: 10, hexSize: 30 });
    expect(grid.tileIds).toHaveLength(10);
  });

  it("throws for tileCount < 1", () => {
    expect(() => createGameGrid({ tileCount: 0, hexSize: 30 })).toThrow(
      "tileCount must be at least 1",
    );
  });

  it("stores the config", () => {
    const config = { tileCount: 7, hexSize: 30 };
    const grid = createGameGrid(config);
    expect(grid.config).toEqual(config);
  });
});

describe("getTileVertices", () => {
  it("returns 6 vertices for any tile", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const vertices = getTileVertices(gameGrid, gameGrid.tileIds[0]);
    expect(vertices).toHaveLength(6);
  });

  it("returns vertices with x and y coordinates", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const vertices = getTileVertices(gameGrid, gameGrid.tileIds[0]);
    for (const v of vertices) {
      expect(typeof v.x).toBe("number");
      expect(typeof v.y).toBe("number");
      expect(Number.isFinite(v.x)).toBe(true);
      expect(Number.isFinite(v.y)).toBe(true);
    }
  });

  it("throws for a tile not in the grid", () => {
    const gameGrid = createGameGrid({ tileCount: 1, hexSize: 30 });
    expect(() => getTileVertices(gameGrid, "99,99")).toThrow("not found");
  });
});

describe("getAllVertices", () => {
  it("returns deduplicated vertices", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const allVertices = getAllVertices(gameGrid);

    // 7 hexes sharing edges: total unique vertices should be less than 7*6
    expect(allVertices.length).toBeLessThan(42);
    expect(allVertices.length).toBeGreaterThan(0);
  });

  it("returns a single set of 6 vertices for one tile", () => {
    const gameGrid = createGameGrid({ tileCount: 1, hexSize: 30 });
    const allVertices = getAllVertices(gameGrid);
    expect(allVertices).toHaveLength(6);
  });
});

describe("getTileCenter", () => {
  it("returns a point for a valid tile", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const center = getTileCenter(gameGrid, gameGrid.tileIds[0]);
    expect(typeof center.x).toBe("number");
    expect(typeof center.y).toBe("number");
  });

  it("center tile is at or near the origin", () => {
    const gameGrid = createGameGrid({ tileCount: 1, hexSize: 30 });
    const center = getTileCenter(gameGrid, gameGrid.tileIds[0]);
    // The first tile in a spiral is the center at (0,0)
    expect(Math.abs(center.x)).toBeLessThan(1);
    expect(Math.abs(center.y)).toBeLessThan(1);
  });

  it("throws for a tile not in the grid", () => {
    const gameGrid = createGameGrid({ tileCount: 1, hexSize: 30 });
    expect(() => getTileCenter(gameGrid, "99,99")).toThrow("not found");
  });
});

describe("getTileNeighbors", () => {
  it("center tile of a radius-1 grid has 6 neighbors", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const center = gameGrid.tileIds[0];
    const neighbors = getTileNeighbors(gameGrid, center);
    expect(neighbors).toHaveLength(6);
  });

  it("returns only tiles that exist in the grid", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    for (const tileId of gameGrid.tileIds) {
      const neighbors = getTileNeighbors(gameGrid, tileId);
      for (const n of neighbors) {
        expect(gameGrid.tileIds).toContain(n);
      }
    }
  });

  it("edge tile has fewer than 6 neighbors", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    // Pick a non-center tile (any tile after the first)
    const edgeTile = gameGrid.tileIds[1];
    const neighbors = getTileNeighbors(gameGrid, edgeTile);
    expect(neighbors.length).toBeLessThan(6);
  });
});

describe("pointToTileId", () => {
  it("returns the center tile for origin point", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    const result = pointToTileId(gameGrid, { x: 0, y: 0 });
    expect(result).toBe(gameGrid.tileIds[0]);
  });

  it("returns null for a point outside the grid", () => {
    const gameGrid = createGameGrid({ tileCount: 1, hexSize: 30 });
    const result = pointToTileId(gameGrid, { x: 9999, y: 9999 });
    expect(result).toBeNull();
  });

  it("maps tile centers back to their tile IDs", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    for (const tileId of gameGrid.tileIds) {
      const center = getTileCenter(gameGrid, tileId);
      const result = pointToTileId(gameGrid, center);
      expect(result).toBe(tileId);
    }
  });
});

describe("fromTileId", () => {
  it("parses axial coordinates", () => {
    expect(fromTileId("3,-1")).toEqual({ q: 3, r: -1 });
  });

  it("round-trips with tile IDs from grid", () => {
    const gameGrid = createGameGrid({ tileCount: 7, hexSize: 30 });
    for (const tileId of gameGrid.tileIds) {
      const { q, r } = fromTileId(tileId);
      expect(`${q},${r}`).toBe(tileId);
    }
  });
});
