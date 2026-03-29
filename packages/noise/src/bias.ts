import type { BiasFunction, Point } from "./types.js";

export class UniformBias implements BiasFunction {
  apply(
    _x: number,
    _y: number,
    noiseValue: number,
    _vertices: Point[],
  ): number {
    return noiseValue;
  }
}

export class VertexProximityBias implements BiasFunction {
  private sigma: number;
  private strength: number;

  /**
   * @param sigma - Controls falloff distance. Larger = wider influence radius.
   * @param strength - How much the bias affects the final value (0-1). At 1.0,
   *   the noise is fully modulated by vertex proximity. At 0.0, no bias.
   */
  constructor(sigma = 50, strength = 0.7) {
    this.sigma = sigma;
    this.strength = strength;
  }

  apply(
    x: number,
    y: number,
    noiseValue: number,
    vertices: Point[],
  ): number {
    // Find the minimum squared distance to any vertex
    let minDistSq = Infinity;
    for (const v of vertices) {
      const dx = x - v.x;
      const dy = y - v.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
      }
    }

    // Gaussian falloff: 1.0 at vertex, approaching 0 far away
    const proximity = Math.exp(-minDistSq / (2 * this.sigma * this.sigma));

    // Blend: at strength=1, noise is fully modulated by proximity.
    // At strength=0, proximity has no effect.
    const blend = 1 - this.strength + this.strength * proximity;
    return noiseValue * blend;
  }
}
