import { createGameGrid, getTileVertices, getAllVertices } from "@ambotrope/grid";
import type { GameGrid, Point, TileId } from "@ambotrope/grid";
import {
  SimplexNoiseGenerator,
  VertexProximityBias,
  createNoiseField,
  createInkBlotField,
  seededRandom,
} from "@ambotrope/noise";
import type { NoiseField, CloudStrategy } from "@ambotrope/noise";

export type { CloudStrategy } from "@ambotrope/noise";

export interface CloudParams {
  /** Cloud generation strategy */
  strategy: CloudStrategy;
  /** Number of discrete grayscale levels (2 = black/white, 8 = smooth posterization). 0 = continuous (no posterization). */
  levels: number;
  /** Minimum edge sharpness for the seeded random range. */
  sharpnessMin: number;
  /** Maximum edge sharpness for the seeded random range. */
  sharpnessMax: number;
}

export const defaultCloudParams: CloudParams = {
  strategy: "ink-blot",
  levels: 2,
  sharpnessMin: 2.0,
  sharpnessMax: 3.5,
};

export interface RenderState {
  gameGrid: GameGrid;
  noiseField: NoiseField;
  blotCanvas: OffscreenCanvas | null;
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  seed: number;
}

export function createRenderState(
  tileIds: TileId[],
  seed: number,
  canvasWidth: number,
  canvasHeight: number,
  cloudParams: CloudParams = defaultCloudParams,
): RenderState {
  const strategy = cloudParams.strategy;
  const hexSize = 50;
  const gameGrid = createGameGrid({ tileCount: tileIds.length, hexSize });

  const vertices = getAllVertices(gameGrid);
  const generator = new SimplexNoiseGenerator(seededRandom(seed));

  const noiseField = strategy === "ink-blot"
    ? createInkBlotField({
        generator,
        vertices,
        blobRadius: hexSize * 1.5,
        sharpnessMin: cloudParams?.sharpnessMin,
        sharpnessMax: cloudParams?.sharpnessMax,
      })
    : createNoiseField({
        generator,
        bias: new VertexProximityBias(hexSize * 1.5, 0.7),
        vertices,
      });

  // Calculate bounds to center the grid
  const allPoints = tileIds.flatMap((id) => getTileVertices(gameGrid, id));

  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));

  const gridWidth = maxX - minX;
  const gridHeight = maxY - minY;

  // 0.5 hex-width margin on left/right, 0.5 hex-height margin on top/bottom
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);
  const paddingX = hexWidth * 0.5;
  const paddingY = hexHeight * 0.5;
  const scaleX = canvasWidth / (gridWidth + paddingX * 2);
  const scaleY = canvasHeight / (gridHeight + paddingY * 2);
  const scale = Math.min(scaleX, scaleY);

  const offsetX = canvasWidth / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = canvasHeight / 2 - ((minY + maxY) / 2) * scale;

  return {
    gameGrid,
    noiseField,
    blotCanvas: null,
    canvasWidth,
    canvasHeight,
    offsetX,
    offsetY,
    scale,
    seed,
  };
}

export function generateCloudTexture(state: RenderState, params: CloudParams = defaultCloudParams): RenderState {
  const { noiseField, canvasWidth, canvasHeight, offsetX, offsetY, scale } = state;
  const offscreen = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = offscreen.getContext("2d");
  if (!ctx) return state;

  const resolution = 3;
  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  const data = imageData.data;

  const { strategy, levels } = params;
  const isInkBlot = strategy === "ink-blot";

  for (let py = 0; py < canvasHeight; py += resolution) {
    for (let px = 0; px < canvasWidth; px += resolution) {
      // Convert pixel to world coordinates
      const wx = (px - offsetX) / scale;
      const wy = (py - offsetY) / scale;

      let blotAlpha: number;

      if (isInkBlot) {
        // Ink blots: sample at native coordinates — sharpness is applied per-blot inside the field
        const value = noiseField.sample(wx, wy);
        const threshold = 0.05;
        blotAlpha = value > threshold
          ? Math.min(1, (value - threshold) / (1 - threshold))
          : 0;
      } else {
        // Noise + bias: multi-octave sampling for richer clouds
        const freq1 = 0.008;
        const freq2 = 0.02;
        const freq3 = 0.05;

        const n1 = noiseField.sample(wx * freq1, wy * freq1);
        const n2 = noiseField.sample(wx * freq2, wy * freq2) * 0.4;
        const n3 = noiseField.sample(wx * freq3, wy * freq3) * 0.15;

        const combined = Math.max(0, Math.min(1, n1 + n2 + n3));

        const threshold = 0.45;
        blotAlpha = combined > threshold
          ? Math.min(1, (combined - threshold) / (1 - threshold) * 1.5)
          : 0;

        // Sharpness post-processing for noise-bias strategy
        const sharpness = params.sharpnessMin;
        if (sharpness !== 1 && blotAlpha > 0) {
          blotAlpha = Math.pow(blotAlpha, sharpness);
        }
      }

      // Posterization: quantize to discrete levels.
      // levels=2 → black/white, levels=3 → black/gray/white, etc.
      if (levels >= 2) {
        blotAlpha = Math.round(blotAlpha * (levels - 1)) / (levels - 1);
      }

      // Fill resolution x resolution block
      for (let dy = 0; dy < resolution && py + dy < canvasHeight; dy++) {
        for (let dx = 0; dx < resolution && px + dx < canvasWidth; dx++) {
          const idx = ((py + dy) * canvasWidth + (px + dx)) * 4;
          data[idx] = 24;
          data[idx + 1] = 24;
          data[idx + 2] = 22;
          data[idx + 3] = Math.round(blotAlpha * 235);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return { ...state, blotCanvas: offscreen };
}

function toScreen(point: Point, state: RenderState): { x: number; y: number } {
  return {
    x: point.x * state.scale + state.offsetX,
    y: point.y * state.scale + state.offsetY,
  };
}

export interface TileRenderInfo {
  tileId: TileId;
  selected: boolean;
  hovering: boolean;
  collision: boolean;
  otherSelected: boolean;
}

function traceHexPath(
  ctx: CanvasRenderingContext2D,
  vertices: Array<{ x: number; y: number }>,
  offsetX = 0,
  offsetY = 0,
): void {
  ctx.beginPath();
  ctx.moveTo(vertices[0].x + offsetX, vertices[0].y + offsetY);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x + offsetX, vertices[i].y + offsetY);
  }
  ctx.closePath();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  tiles: TileRenderInfo[],
): void {
  const { canvasWidth, canvasHeight, gameGrid, blotCanvas } = state;

  ctx.fillStyle = "#e7dfd0";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const pageMargin = Math.max(24, Math.min(canvasWidth, canvasHeight) * 0.045);
  ctx.fillStyle = "#f9f4e9";
  ctx.fillRect(pageMargin, pageMargin, canvasWidth - pageMargin * 2, canvasHeight - pageMargin * 2);

  if (blotCanvas) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(pageMargin, pageMargin, canvasWidth - pageMargin * 2, canvasHeight - pageMargin * 2);
    ctx.clip();
    ctx.drawImage(blotCanvas, 0, 0);
    ctx.restore();
  }

  for (const tile of tiles) {
    const vertices = getTileVertices(gameGrid, tile.tileId);
    const screenVerts = vertices.map((v) => toScreen(v, state));

    traceHexPath(ctx, screenVerts, 2, 3);
    ctx.fillStyle = "rgba(57, 53, 48, 0.14)";
    ctx.fill();

    traceHexPath(ctx, screenVerts);

    if (tile.collision) {
      ctx.fillStyle = "rgba(231, 200, 181, 0.78)";
      ctx.fill();
    } else if (tile.selected) {
      ctx.fillStyle = "rgba(248, 240, 223, 0.62)";
      ctx.fill();
    } else if (tile.otherSelected) {
      ctx.fillStyle = "rgba(236, 231, 213, 0.56)";
      ctx.fill();
    } else if (tile.hovering) {
      ctx.fillStyle = "rgba(241, 234, 219, 0.42)";
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 253, 248, 0.18)";
      ctx.fill();
    }
  }

  if (blotCanvas) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(pageMargin, pageMargin, canvasWidth - pageMargin * 2, canvasHeight - pageMargin * 2);
    ctx.clip();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(blotCanvas, 0, 0);
    ctx.restore();
  }

  for (const tile of tiles) {
    const vertices = getTileVertices(gameGrid, tile.tileId);
    const screenVerts = vertices.map((v) => toScreen(v, state));

    traceHexPath(ctx, screenVerts);
    ctx.strokeStyle = tile.selected
      ? "#181816"
      : tile.collision
        ? "#8d4528"
        : tile.otherSelected
          ? "#546144"
          : tile.hovering
            ? "#312c26"
            : "rgba(60, 55, 49, 0.78)";
    ctx.lineWidth = tile.selected ? 2.4 : 1.6;
    ctx.stroke();
  }
}

export function hitTestTile(
  state: RenderState,
  screenX: number,
  screenY: number,
): TileId | null {
  // Convert screen coordinates to world coordinates
  const wx = (screenX - state.offsetX) / state.scale;
  const wy = (screenY - state.offsetY) / state.scale;

  // Check each tile by point-in-polygon
  for (const tileId of state.gameGrid.tileIds) {
    const vertices = getTileVertices(state.gameGrid, tileId);
    if (pointInPolygon(wx, wy, vertices)) {
      return tileId;
    }
  }
  return null;
}

function pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}
