import { describe, it, expect } from "vitest";
import {
  SimplexNoiseGenerator,
  UniformBias,
  VertexProximityBias,
  createNoiseField,
  seededRandom,
} from "../index.js";

describe("seededRandom", () => {
  it("produces deterministic output for the same seed", () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(42);
    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());
    expect(values1).toEqual(values2);
  });

  it("produces different output for different seeds", () => {
    const rng1 = seededRandom(42);
    const rng2 = seededRandom(99);
    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());
    expect(values1).not.toEqual(values2);
  });

  it("returns values in [0, 1)", () => {
    const rng = seededRandom(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("SimplexNoiseGenerator", () => {
  it("returns values in [-1, 1]", () => {
    const gen = new SimplexNoiseGenerator(seededRandom(42));
    for (let i = 0; i < 100; i++) {
      const v = gen.sample(i * 0.1, i * 0.13);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic with the same seed", () => {
    const gen1 = new SimplexNoiseGenerator(seededRandom(42));
    const gen2 = new SimplexNoiseGenerator(seededRandom(42));
    for (let i = 0; i < 50; i++) {
      expect(gen1.sample(i * 0.1, i * 0.2)).toBe(
        gen2.sample(i * 0.1, i * 0.2),
      );
    }
  });

  it("produces different results for different seeds", () => {
    const gen1 = new SimplexNoiseGenerator(seededRandom(42));
    const gen2 = new SimplexNoiseGenerator(seededRandom(99));
    let allSame = true;
    for (let i = 0; i < 20; i++) {
      if (gen1.sample(i * 0.1, i * 0.2) !== gen2.sample(i * 0.1, i * 0.2)) {
        allSame = false;
        break;
      }
    }
    expect(allSame).toBe(false);
  });
});

describe("UniformBias", () => {
  it("returns noise value unchanged", () => {
    const bias = new UniformBias();
    const vertices = [{ x: 0, y: 0 }];
    expect(bias.apply(10, 20, 0.5, vertices)).toBe(0.5);
    expect(bias.apply(10, 20, -0.8, vertices)).toBe(-0.8);
  });
});

describe("VertexProximityBias", () => {
  it("returns higher values near vertices", () => {
    const bias = new VertexProximityBias(50, 0.9);
    const vertices = [{ x: 100, y: 100 }];
    const noiseValue = 0.8;

    const nearVertex = bias.apply(100, 100, noiseValue, vertices);
    const farFromVertex = bias.apply(500, 500, noiseValue, vertices);

    expect(Math.abs(nearVertex)).toBeGreaterThan(Math.abs(farFromVertex));
  });

  it("at strength 0, behaves like uniform bias", () => {
    const bias = new VertexProximityBias(50, 0);
    const vertices = [{ x: 0, y: 0 }];
    expect(bias.apply(1000, 1000, 0.5, vertices)).toBeCloseTo(0.5, 5);
  });

  it("respects multiple vertices", () => {
    const bias = new VertexProximityBias(30, 0.9);
    const vertices = [
      { x: 0, y: 0 },
      { x: 200, y: 200 },
    ];
    const noiseValue = 0.8;

    const nearFirst = bias.apply(0, 0, noiseValue, vertices);
    const nearSecond = bias.apply(200, 200, noiseValue, vertices);
    const betweenBoth = bias.apply(100, 100, noiseValue, vertices);

    // Near either vertex should be higher than midpoint
    expect(Math.abs(nearFirst)).toBeGreaterThan(Math.abs(betweenBoth));
    expect(Math.abs(nearSecond)).toBeGreaterThan(Math.abs(betweenBoth));
  });
});

describe("createNoiseField", () => {
  it("sample returns values in [0, 1]", () => {
    const field = createNoiseField({
      generator: new SimplexNoiseGenerator(seededRandom(42)),
      bias: new UniformBias(),
      vertices: [],
    });

    for (let i = 0; i < 100; i++) {
      const v = field.sample(i * 0.1, i * 0.13);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("sampleGrid returns correct dimensions", () => {
    const field = createNoiseField({
      generator: new SimplexNoiseGenerator(seededRandom(42)),
      bias: new UniformBias(),
      vertices: [],
    });

    const data = field.sampleGrid(100, 80, 10);
    expect(data).toBeInstanceOf(Float32Array);
    // 100/10 = 10 cols, 80/10 = 8 rows
    expect(data.length).toBe(80);
  });

  it("sampleGrid values are all in [0, 1]", () => {
    const field = createNoiseField({
      generator: new SimplexNoiseGenerator(seededRandom(42)),
      bias: new UniformBias(),
      vertices: [],
    });

    const data = field.sampleGrid(200, 200, 5);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(0);
      expect(data[i]).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic: same config produces same output", () => {
    const makeField = () =>
      createNoiseField({
        generator: new SimplexNoiseGenerator(seededRandom(42)),
        bias: new VertexProximityBias(50, 0.7),
        vertices: [
          { x: 50, y: 50 },
          { x: 150, y: 150 },
        ],
      });

    const data1 = makeField().sampleGrid(200, 200, 10);
    const data2 = makeField().sampleGrid(200, 200, 10);
    expect(data1).toEqual(data2);
  });

  it("sampleGrid supports offset", () => {
    const field = createNoiseField({
      generator: new SimplexNoiseGenerator(seededRandom(42)),
      bias: new UniformBias(),
      vertices: [],
    });

    const withOffset = field.sampleGrid(100, 100, 10, 50, 50);
    const withoutOffset = field.sampleGrid(100, 100, 10);

    // Should be different because we're sampling different coordinates
    expect(withOffset).not.toEqual(withoutOffset);
  });
});
