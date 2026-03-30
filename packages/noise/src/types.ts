export interface Point {
  x: number;
  y: number;
}

export interface NoiseGenerator {
  sample(x: number, y: number): number; // returns [-1, 1]
}

export interface BiasFunction {
  apply(
    x: number,
    y: number,
    noiseValue: number,
    vertices: Point[],
  ): number;
}

export interface NoiseFieldConfig {
  generator: NoiseGenerator;
  bias: BiasFunction;
  vertices: Point[];
}

export interface NoiseField {
  sample(x: number, y: number): number; // returns [0, 1]
  sampleGrid(
    width: number,
    height: number,
    resolution: number,
    offsetX?: number,
    offsetY?: number,
  ): Float32Array;
}

export type CloudStrategy = "noise-bias" | "ink-blot";
