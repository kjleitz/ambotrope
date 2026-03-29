import type { NoiseField, NoiseFieldConfig } from "./types.js";

export function createNoiseField(config: NoiseFieldConfig): NoiseField {
  const { generator, bias, vertices } = config;

  function sample(x: number, y: number): number {
    const raw = generator.sample(x, y);
    const biased = bias.apply(x, y, raw, vertices);
    // Normalize from [-1, 1] to [0, 1]
    return (biased + 1) / 2;
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
