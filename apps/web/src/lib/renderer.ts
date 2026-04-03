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
  /** RGB color for clouds [r, g, b] each 0-255 */
  cloudColor: [number, number, number];
  /** CSS color string for the sky/background */
  skyColor: string;
}

export const defaultCloudParams: CloudParams = {
  strategy: "ink-blot",
  levels: 2,
  sharpnessMin: 2.0,
  sharpnessMax: 3.5,
  cloudColor: [255, 255, 255],
  skyColor: "#87CEEB",
};

export interface RenderState {
  gameGrid: GameGrid;
  noiseField: NoiseField;
  cloudCanvas: OffscreenCanvas | null;
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
    cloudCanvas: null,
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

  const { strategy, levels, cloudColor } = params;
  const [cr, cg, cb] = cloudColor;
  const isInkBlot = strategy === "ink-blot";

  for (let py = 0; py < canvasHeight; py += resolution) {
    for (let px = 0; px < canvasWidth; px += resolution) {
      // Convert pixel to world coordinates
      const wx = (px - offsetX) / scale;
      const wy = (py - offsetY) / scale;

      let cloudAlpha: number;

      if (isInkBlot) {
        // Ink blots: sample at native coordinates — sharpness is applied per-blot inside the field
        const value = noiseField.sample(wx, wy);
        const threshold = 0.05;
        cloudAlpha = value > threshold
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
        cloudAlpha = combined > threshold
          ? Math.min(1, (combined - threshold) / (1 - threshold) * 1.5)
          : 0;

        // Sharpness post-processing for noise-bias strategy
        const sharpness = params.sharpnessMin;
        if (sharpness !== 1 && cloudAlpha > 0) {
          cloudAlpha = Math.pow(cloudAlpha, sharpness);
        }
      }

      // Posterization: quantize to discrete levels.
      // levels=2 → black/white, levels=3 → black/gray/white, etc.
      if (levels >= 2) {
        cloudAlpha = Math.round(cloudAlpha * (levels - 1)) / (levels - 1);
      }

      // Fill resolution x resolution block
      for (let dy = 0; dy < resolution && py + dy < canvasHeight; dy++) {
        for (let dx = 0; dx < resolution && px + dx < canvasWidth; dx++) {
          const idx = ((py + dy) * canvasWidth + (px + dx)) * 4;
          data[idx] = cr;
          data[idx + 1] = cg;
          data[idx + 2] = cb;
          data[idx + 3] = Math.round(cloudAlpha * 200);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return { ...state, cloudCanvas: offscreen };
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
  pressing: boolean;
  collision: boolean;
  otherSelected: boolean;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  tiles: TileRenderInfo[],
  params: CloudParams = defaultCloudParams,
  pulseTime: number = 0,
): void {
  const { canvasWidth, canvasHeight, gameGrid, cloudCanvas } = state;

  // Sky background
  ctx.fillStyle = params.skyColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw cloud texture
  if (cloudCanvas) {
    ctx.drawImage(cloudCanvas, 0, 0);
  }

  // Build a combined silhouette path for all tiles (for outer shadow)
  const allScreenVerts = tiles.map((tile) => {
    const vertices = getTileVertices(gameGrid, tile.tileId);
    return vertices.map((v) => toScreen(v, state));
  });

  const hoveredIndex = tiles.findIndex((t) => t.hovering);
  const excludeFromGroup = (t: number) =>
    t === hoveredIndex || tiles[t].selected || tiles[t].pressing;

  // --- Group shadow (excludes hovered/selected/pressed tiles) ---
  const groupShadow = new OffscreenCanvas(canvasWidth, canvasHeight);
  const gsctx = groupShadow.getContext("2d");
  if (gsctx) {
    for (let t = 0; t < allScreenVerts.length; t++) {
      if (excludeFromGroup(t)) continue;
      const screenVerts = allScreenVerts[t];
      gsctx.beginPath();
      gsctx.moveTo(screenVerts[0].x, screenVerts[0].y);
      for (let i = 1; i < screenVerts.length; i++) {
        gsctx.lineTo(screenVerts[i].x, screenVerts[i].y);
      }
      gsctx.closePath();
      gsctx.fill();
    }

    ctx.save();
    ctx.shadowColor = "oklch(0.2 0 0 / 0.4)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(groupShadow, 0, 0);
    ctx.restore();

    // Repaint sky + clouds over the solid fill (keep only the shadow)
    ctx.save();
    ctx.beginPath();
    for (let t = 0; t < allScreenVerts.length; t++) {
      if (excludeFromGroup(t)) continue;
      const screenVerts = allScreenVerts[t];
      ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
      for (let i = 1; i < screenVerts.length; i++) {
        ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
      }
      ctx.closePath();
    }
    ctx.clip();
    ctx.fillStyle = params.skyColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    if (cloudCanvas) {
      ctx.drawImage(cloudCanvas, 0, 0);
    }
    ctx.restore();
  }

  // --- Hovered tile shadow (drawn on top, stronger shadow for "raised" effect) ---
  // Skip the raise effect if hovering over the selected tile (it uses inset shadow instead)
  if (hoveredIndex >= 0 && !tiles[hoveredIndex].selected) {
    const hoverVerts = allScreenVerts[hoveredIndex];
    const hoverShadow = new OffscreenCanvas(canvasWidth, canvasHeight);
    const hsctx = hoverShadow.getContext("2d");
    if (hsctx) {
      hsctx.beginPath();
      hsctx.moveTo(hoverVerts[0].x, hoverVerts[0].y);
      for (let i = 1; i < hoverVerts.length; i++) {
        hsctx.lineTo(hoverVerts[i].x, hoverVerts[i].y);
      }
      hsctx.closePath();
      hsctx.fill();

      ctx.save();
      ctx.shadowColor = "oklch(0.1 0 0 / 0.5)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(hoverShadow, 0, 0);
      ctx.restore();

      // Repaint sky + clouds over the solid fill
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(hoverVerts[0].x, hoverVerts[0].y);
      for (let i = 1; i < hoverVerts.length; i++) {
        ctx.lineTo(hoverVerts[i].x, hoverVerts[i].y);
      }
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = params.skyColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      if (cloudCanvas) {
        ctx.drawImage(cloudCanvas, 0, 0);
      }
      ctx.restore();
    }
  }

  // --- Draw hex tiles (state fills + borders) ---
  for (let t = 0; t < tiles.length; t++) {
    const tile = tiles[t];
    const screenVerts = allScreenVerts[t];

    ctx.beginPath();
    ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
    for (let i = 1; i < screenVerts.length; i++) {
      ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
    }
    ctx.closePath();

    // Fill based on state
    if (tile.collision) {
      ctx.fillStyle = "oklch(0.65 0.2 25 / 0.45)";
      ctx.fill();
    } else if (tile.otherSelected) {
      ctx.fillStyle = "oklch(0.7 0.1 140 / 0.35)";
      ctx.fill();
    }

    // Inset shadow for selected or pressed tile
    if (tile.selected || tile.pressing) {
      // deep: pressing always deep; hovering selected tile pulses
      let depth: number; // 0 = normal, 1 = fully deep
      if (tile.pressing) {
        depth = 1;
      } else if (tile.selected && tile.hovering) {
        // Pulse between normal and deep using a sine wave
        depth = 0.5 + 0.5 * Math.sin(pulseTime * 3.5);
      } else {
        depth = 0;
      }

      const opacity = 0.6 + 0.2 * depth;
      const blur = 15 + 10 * depth;
      const offsetY = 3 + 3 * depth;
      
      ctx.save();
      // Clip to the hex shape
      ctx.clip();
      // Draw a large rect with the hex cut out — shadow bleeds inward
      ctx.beginPath();
      ctx.rect(-canvasWidth, -canvasHeight, canvasWidth * 3, canvasHeight * 3);
      ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
      // Wind the hex path in reverse so it cuts a hole
      for (let i = screenVerts.length - 1; i >= 0; i--) {
        ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
      }
      ctx.closePath();
      ctx.shadowColor = `rgba(0, 0, 0, ${opacity})`;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = offsetY;
      ctx.fill();
      ctx.restore();
    }

    // Hex border
    ctx.beginPath();
    ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
    for (let i = 1; i < screenVerts.length; i++) {
      ctx.lineTo(screenVerts[i].x, screenVerts[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "oklch(0.6 0.05 230 / 0.5)";
    ctx.lineWidth = 1.5;
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
