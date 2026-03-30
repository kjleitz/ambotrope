import { describe, it, expect } from "vitest";
import { SimplexNoiseGenerator, seededRandom } from "../index.js";
import { createInkBlotShape, createInkBlotField } from "../inkblot.js";
import type { Point } from "../types.js";

const generator = new SimplexNoiseGenerator(seededRandom(42));

describe("createInkBlotShape", () => {
  function makeBlot(seed = 1) {
    return createInkBlotShape({ generator, radius: 50, seed });
  }

  it("returns values in [0, 1]", () => {
    const blot = makeBlot();
    for (let x = -60; x <= 60; x += 3) {
      for (let y = -60; y <= 60; y += 3) {
        const v = blot.sample(x, y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns a positive value at the center", () => {
    const blot = makeBlot();
    expect(blot.sample(0, 0)).toBeGreaterThan(0);
  });

  it("returns 0 beyond the radius", () => {
    const blot = makeBlot();
    expect(blot.sample(51, 0)).toBe(0);
    expect(blot.sample(0, 51)).toBe(0);
    expect(blot.sample(-51, 0)).toBe(0);
  });

  it("is bilaterally symmetric (mirrored across Y axis)", () => {
    const blot = makeBlot();
    for (let x = 1; x < 40; x += 5) {
      for (let y = -40; y < 40; y += 5) {
        expect(blot.sample(x, y)).toBe(blot.sample(-x, y));
      }
    }
  });

  it("different seeds produce different shapes", () => {
    const blot1 = makeBlot(1);
    const blot2 = makeBlot(2);
    let diffCount = 0;
    for (let x = -30; x <= 30; x += 5) {
      for (let y = -30; y <= 30; y += 5) {
        if (blot1.sample(x, y) !== blot2.sample(x, y)) diffCount++;
      }
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it("is not a perfect circle — values vary at equal radii", () => {
    const blot = makeBlot();
    const r = 25;
    const values: number[] = [];
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 16) {
      // Only sample positive x (mirrored, so negative x is identical)
      values.push(blot.sample(Math.cos(angle) * r, Math.sin(angle) * r));
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    expect(max - min).toBeGreaterThan(0.02);
  });
});

describe("createInkBlotField", () => {
  const singleVertex: Point[] = [{ x: 100, y: 100 }];
  const twoVertices: Point[] = [
    { x: 100, y: 100 },
    { x: 130, y: 100 },
  ];

  function makeField(vertices: Point[]) {
    return createInkBlotField({
      generator,
      vertices,
      blobRadius: 50,
    });
  }

  it("returns values in [0, 1]", () => {
    const field = makeField(singleVertex);
    for (let x = 0; x < 300; x += 5) {
      for (let y = 0; y < 300; y += 5) {
        const v = field.sample(x, y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns a positive value at a vertex center", () => {
    const field = makeField(singleVertex);
    expect(field.sample(100, 100)).toBeGreaterThan(0);
  });

  it("returns 0 far from all vertices", () => {
    const field = makeField(singleVertex);
    expect(field.sample(500, 500)).toBe(0);
  });

  it("max combination never exceeds 1.0 with overlapping blobs", () => {
    const field = makeField(twoVertices);
    for (let x = 80; x <= 150; x += 2) {
      for (let y = 80; y <= 120; y += 2) {
        expect(field.sample(x, y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("sampleGrid returns correct dimensions", () => {
    const field = makeField(singleVertex);
    const grid = field.sampleGrid(100, 100, 10);
    expect(grid.length).toBe(100);
  });

  it("sampleGrid values match individual sample calls", () => {
    const field = makeField(singleVertex);
    const resolution = 10;
    const offsetX = 50;
    const offsetY = 50;
    const grid = field.sampleGrid(50, 50, resolution, offsetX, offsetY);
    const cols = Math.ceil(50 / resolution);
    for (let row = 0; row < Math.ceil(50 / resolution); row++) {
      for (let col = 0; col < cols; col++) {
        const expected = field.sample(offsetX + col * resolution, offsetY + row * resolution);
        expect(grid[row * cols + col]).toBeCloseTo(expected, 5);
      }
    }
  });
});
