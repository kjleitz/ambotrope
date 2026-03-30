import type { NoiseField, NoiseGenerator, Point } from "./types.js";

// --- Single ink blot ---

export interface InkBlotShape {
  /** Sample the blot at local coordinates relative to its center. Returns [0, 1]. */
  sample(localX: number, localY: number): number;
  /** The radius beyond which sample() always returns 0. */
  radius: number;
}

export interface InkBlotShapeConfig {
  generator: NoiseGenerator;
  /** Radius of the blot in world units */
  radius: number;
  /** Seed offset so each blot is unique */
  seed: number;
  /** Noise frequency relative to the blot radius. Lower = blobber, higher = more tendrils. Default 1.5. */
  frequency?: number;
  /** How much the radial falloff biases toward the center (0–1). Higher = rounder, lower = more sprawl. Default 0.6. */
  centerBias?: number;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function createInkBlotShape(config: InkBlotShapeConfig): InkBlotShape {
  const {
    generator,
    radius,
    seed,
    frequency = 1.5,
    centerBias = 0.6,
  } = config;

  // Noise frequency scaled to the blot size so the features are proportional
  const freq = frequency / radius;

  // Large offsets derived from seed to place each blot in a unique region of noise space
  const seedOffX = seed * 173.7;
  const seedOffY = seed * 291.3;

  function sample(localX: number, localY: number): number {
    const dist = Math.sqrt(localX * localX + localY * localY);
    if (dist >= radius) return 0;

    // Mirror across Y axis for bilateral symmetry (like folding paper)
    const mx = Math.abs(localX);

    // Radial falloff — dense at center, fading at edges
    const radialT = dist / radius;
    const falloff = 1 - smoothstep(radialT);

    // Low-frequency noise for the main blob shape.
    // The noise determines whether ink "landed" at this point.
    const n1 = generator.sample(seedOffX + mx * freq, seedOffY + localY * freq);

    // A second octave at higher frequency for finer edge detail
    const n2 = generator.sample(
      seedOffX + mx * freq * 2.5 + 50,
      seedOffY + localY * freq * 2.5 + 50,
    );

    // Combined noise: primary shape + fine detail
    const noise = n1 * 0.7 + n2 * 0.3; // range [-1, 1]

    // Blend noise with radial falloff:
    // - centerBias controls how much "free ink" exists at the center vs requiring noise
    // - At the center (falloff=1): value is high even with middling noise
    // - At the edges (falloff→0): only strong noise peaks create ink tendrils
    const inkDensity = falloff * centerBias + falloff * (1 - centerBias) * ((noise + 1) / 2);

    return Math.max(0, Math.min(1, inkDensity));
  }

  return { sample, radius };
}

// --- Field of ink blots placed at vertices ---

export interface InkBlotFieldConfig {
  generator: NoiseGenerator;
  vertices: Point[];
  /** Radius of each blot in world units */
  blobRadius: number;
  /** Noise frequency for each blot shape. Default 1.5. */
  frequency?: number;
  /** Center bias for each blot shape (0–1). Default 0.6. */
  centerBias?: number;
}

export function createInkBlotField(config: InkBlotFieldConfig): NoiseField {
  const { generator, vertices, blobRadius, frequency, centerBias } = config;

  // Pre-create an ink blot shape for each vertex
  const blots: Array<{ blot: InkBlotShape; center: Point }> = vertices.map((v, i) => ({
    blot: createInkBlotShape({
      generator,
      radius: blobRadius,
      // Derive a unique seed per vertex from its position
      seed: (v.x * 7.31 + v.y * 13.97 + i * 0.01),
      frequency,
      centerBias,
    }),
    center: v,
  }));

  const cullRadiusSq = blobRadius * blobRadius;

  function sample(x: number, y: number): number {
    let maxVal = 0;

    for (const { blot, center } of blots) {
      const dx = x - center.x;
      const dy = y - center.y;

      if (dx * dx + dy * dy > cullRadiusSq) continue;

      const val = blot.sample(dx, dy);
      if (val > maxVal) maxVal = val;
    }

    return maxVal;
  }

  function sampleGrid(
    width: number,
    height: number,
    resolution: number,
    offsetX = 0,
    offsetY = 0,
  ): Float32Array {
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(height / resolution);
    const data = new Float32Array(cols * rows);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * resolution;
        const y = offsetY + row * resolution;
        data[row * cols + col] = sample(x, y);
      }
    }

    return data;
  }

  return { sample, sampleGrid };
}
