import { useRef, useEffect, useState, useCallback } from "react";
import type { PlayerView } from "@ambotrope/game";
import type { TileId } from "@ambotrope/grid";
import {
  createRenderState,
  generateCloudTexture,
  renderFrame,
  hitTestTile,
  defaultCloudParams,
} from "@/lib/renderer.ts";
import type { RenderState, TileRenderInfo, CloudParams, CloudStrategy } from "@/lib/renderer.ts";

function parseRgb(cssColor: string): [number, number, number] {
  const el = document.createElement("div");
  el.style.color = cssColor;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const match = computed.match(/(\d+)/g);
  if (match && match.length >= 3) {
    return [Number(match[0]), Number(match[1]), Number(match[2])];
  }
  return [255, 255, 255];
}

function getThemeColors(): { cloudColor: [number, number, number]; skyColor: string } {
  const styles = getComputedStyle(document.documentElement);
  const sky = styles.getPropertyValue("--color-sky").trim();
  const cloud = styles.getPropertyValue("--color-cloud").trim();
  return {
    skyColor: sky || "#87CEEB",
    cloudColor: cloud ? parseRgb(cloud) : [255, 255, 255],
  };
}

interface GameCanvasProps {
  gameView: PlayerView;
  onTileClick: (tileId: TileId) => void;
  interactive: boolean;
}

export function GameCanvas({ gameView, onTileClick, interactive }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderStateRef = useRef<RenderState | null>(null);
  const [hoveredTile, setHoveredTile] = useState<TileId | null>(null);
  const [pressedTile, setPressedTile] = useState<TileId | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);
  const [cloudParams, setCloudParams] = useState<CloudParams>(() => {
    const themeColors = getThemeColors();
    return { ...defaultCloudParams, ...themeColors };
  });
  const [debugOpen, setDebugOpen] = useState(false);
  const [seedOverride, setSeedOverride] = useState<number | null>(null);
  const [sharpnessLocked, setSharpnessLocked] = useState(false);

  const activeSeed = seedOverride ?? gameView.config.seed;

  // Initialize render state when tile IDs or seed change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    let state = createRenderState(
      gameView.tileIds,
      activeSeed,
      canvas.width,
      canvas.height,
      cloudParams,
    );
    state = generateCloudTexture(state, cloudParams);
    renderStateRef.current = state;
    setRenderVersion((v) => v + 1);
  }, [gameView.tileIds, activeSeed, cloudParams]);

  // Render on every relevant change
  useEffect(() => {
    const canvas = canvasRef.current;
    const state = renderStateRef.current;
    if (!canvas || !state || renderVersion === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isReveal = gameView.phase === "reveal";
    const collisionTiles = new Set<TileId>();
    const otherSelectedTiles = new Set<TileId>();

    if (isReveal) {
      // Find collisions and other selections
      const tileCounts: Record<string, number> = {};
      if (gameView.self.selectedTile) {
        tileCounts[gameView.self.selectedTile] = (tileCounts[gameView.self.selectedTile] ?? 0) + 1;
      }
      for (const other of gameView.others) {
        if (other.selectedTile) {
          tileCounts[other.selectedTile] = (tileCounts[other.selectedTile] ?? 0) + 1;
          otherSelectedTiles.add(other.selectedTile);
        }
      }
      for (const [tileId, count] of Object.entries(tileCounts)) {
        if (count > 1) collisionTiles.add(tileId);
      }
    }

    const tiles: TileRenderInfo[] = gameView.tileIds.map((tileId) => ({
      tileId,
      selected: gameView.self.selectedTile === tileId,
      hovering: hoveredTile === tileId && interactive,
      pressing: pressedTile === tileId && interactive,
      collision: collisionTiles.has(tileId),
      otherSelected: isReveal && otherSelectedTiles.has(tileId) && !collisionTiles.has(tileId),
    }));

    // Check if we need to animate (hovering over selected tile)
    const needsPulse = tiles.some((t) => t.selected && t.hovering && !t.pressing);

    if (!needsPulse) {
      renderFrame(ctx, state, tiles, cloudParams, 0);
      return;
    }

    let animId: number;
    const animate = (time: number) => {
      const pulseTime = time / 1000;
      renderFrame(ctx, state, tiles, cloudParams, pulseTime);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [gameView, hoveredTile, pressedTile, interactive, renderVersion, cloudParams]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const state = renderStateRef.current;
      if (!state) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      const tile = hitTestTile(state, x, y);
      setHoveredTile(tile);
    },
    [interactive],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const state = renderStateRef.current;
      if (!state) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);

      const tile = hitTestTile(state, x, y);
      if (tile) onTileClick(tile);
    },
    [interactive, onTileClick],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const state = renderStateRef.current;
      if (!state) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      setPressedTile(hitTestTile(state, x, y));
    },
    [interactive],
  );

  const handleMouseUp = useCallback(() => setPressedTile(null), []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTile(null);
    setPressedTile(null);
  }, []);

  const levelsLabel = cloudParams.levels < 2 ? "Continuous" : `${cloudParams.levels}`;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${interactive ? "cursor-pointer" : ""}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute top-2 left-2">
        <button
          onClick={() => setDebugOpen((o) => !o)}
          className="px-2 py-1 rounded text-xs font-mono bg-debug-button text-debug-text border border-debug-border"
        >
          {debugOpen ? "Hide Debug" : "Debug"}
        </button>
        {debugOpen && (
          <div
            className="mt-1 p-3 rounded-lg flex flex-col gap-3 text-xs font-mono bg-debug-bg text-debug-text border border-debug-border"
            style={{ minWidth: "200px", backdropFilter: "blur(8px)" }}
          >
            <div className="flex flex-col gap-1">
              <label className="flex justify-between">
                <span>Strategy</span>
              </label>
              <select
                value={cloudParams.strategy}
                onChange={(e) =>
                  setCloudParams((p) => ({ ...p, strategy: e.target.value as CloudStrategy }))
                }
                className="w-full px-1 py-0.5 rounded text-xs bg-debug-input text-debug-text border border-debug-border"
              >
                <option value="noise-bias">Noise + Bias</option>
                <option value="ink-blot">Ink Blot</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex justify-between items-center">
                <span>Sharpness</span>
                <button
                  onClick={() => setSharpnessLocked((l) => !l)}
                  className="px-1.5 py-0.5 rounded text-xs bg-debug-button border border-debug-border"
                  style={{ opacity: sharpnessLocked ? 1 : 0.5 }}
                >
                  {sharpnessLocked ? "Locked" : "Lock"}
                </button>
              </label>
              <div className="flex items-center gap-1 text-xs text-debug-muted">
                <span>Min</span>
                <span className="ml-auto">{cloudParams.sharpnessMin.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={cloudParams.sharpnessMin}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCloudParams((p) => {
                    if (sharpnessLocked) {
                      const delta = val - p.sharpnessMin;
                      return { ...p, sharpnessMin: val, sharpnessMax: Math.min(20, Math.max(0.1, p.sharpnessMax + delta)) };
                    }
                    return { ...p, sharpnessMin: val };
                  });
                }}
                className="w-full"
              />
              <div className="flex items-center gap-1 text-xs text-debug-muted">
                <span>Max</span>
                <span className="ml-auto">{cloudParams.sharpnessMax.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={cloudParams.sharpnessMax}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCloudParams((p) => {
                    if (sharpnessLocked) {
                      const delta = val - p.sharpnessMax;
                      return { ...p, sharpnessMax: val, sharpnessMin: Math.min(20, Math.max(0.1, p.sharpnessMin + delta)) };
                    }
                    return { ...p, sharpnessMax: val };
                  });
                }}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex justify-between">
                <span>Grayscale Levels</span>
                <span>{levelsLabel}</span>
              </label>
              <input
                type="range"
                min="0"
                max="16"
                step="1"
                value={cloudParams.levels}
                onChange={(e) =>
                  setCloudParams((p) => ({ ...p, levels: parseInt(e.target.value, 10) }))
                }
                className="w-full"
              />
            </div>
            <button
              onClick={() => { setCloudParams({ ...defaultCloudParams, ...getThemeColors() }); setSeedOverride(null); }}
              className="px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
            >
              Reset
            </button>
            <div
              className="border-t border-debug-border pt-2 mt-1 flex flex-col gap-1"
            >
              <label className="flex justify-between">
                <span>Seed</span>
                <span className="select-all">{activeSeed}</span>
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => setSeedOverride(activeSeed - 1)}
                  className="flex-1 px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
                >
                  Prev
                </button>
                <button
                  onClick={() => setSeedOverride(activeSeed + 1)}
                  className="flex-1 px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
