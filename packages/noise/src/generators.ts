import { createNoise2D } from "simplex-noise";
import type { NoiseGenerator } from "./types.js";

export class SimplexNoiseGenerator implements NoiseGenerator {
  private noise2D: ReturnType<typeof createNoise2D>;

  constructor(randomFn?: () => number) {
    this.noise2D = createNoise2D(randomFn);
  }

  sample(x: number, y: number): number {
    return this.noise2D(x, y);
  }
}
