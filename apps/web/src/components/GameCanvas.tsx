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

interface GameCanvasProps {
  gameView: PlayerView;
  onTileClick: (tileId: TileId) => void;
  interactive: boolean;
}

export function GameCanvas({ gameView, onTileClick, interactive }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderStateRef = useRef<RenderState | null>(null);
  const [hoveredTile, setHoveredTile] = useState<TileId | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [cloudParams, setCloudParams] = useState<CloudParams>(defaultCloudParams);
  const [debugOpen, setDebugOpen] = useState(false);

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
      gameView.config.seed,
      canvas.width,
      canvas.height,
      cloudParams.strategy,
    );
    state = generateCloudTexture(state, cloudParams);
    renderStateRef.current = state;
    setInitialized(true);
  }, [gameView.tileIds, gameView.config.seed, cloudParams]);

  // Render on every relevant change
  useEffect(() => {
    const canvas = canvasRef.current;
    const state = renderStateRef.current;
    if (!canvas || !state || !initialized) return;

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
      collision: collisionTiles.has(tileId),
      otherSelected: isReveal && otherSelectedTiles.has(tileId) && !collisionTiles.has(tileId),
    }));

    renderFrame(ctx, state, tiles);
  }, [gameView, hoveredTile, interactive, initialized, cloudParams]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const state = renderStateRef.current;
      if (!state) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;

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
      const dpr = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;

      const tile = hitTestTile(state, x, y);
      if (tile) onTileClick(tile);
    },
    [interactive, onTileClick],
  );

  const handleMouseLeave = useCallback(() => setHoveredTile(null), []);

  const levelsLabel = cloudParams.levels < 2 ? "Continuous" : `${cloudParams.levels}`;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${interactive ? "cursor-pointer" : ""}`}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />
      <div className="absolute top-2 left-2">
        <button
          onClick={() => setDebugOpen((o) => !o)}
          className="px-2 py-1 rounded text-xs font-mono"
          style={{
            background: "oklch(0.2 0 0 / 0.7)",
            color: "oklch(0.9 0 0)",
            border: "1px solid oklch(0.4 0 0 / 0.5)",
          }}
        >
          {debugOpen ? "Hide Debug" : "Debug"}
        </button>
        {debugOpen && (
          <div
            className="mt-1 p-3 rounded-lg flex flex-col gap-3 text-xs font-mono"
            style={{
              background: "oklch(0.15 0 0 / 0.85)",
              color: "oklch(0.9 0 0)",
              border: "1px solid oklch(0.4 0 0 / 0.5)",
              minWidth: "200px",
              backdropFilter: "blur(8px)",
            }}
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
                className="w-full px-1 py-0.5 rounded text-xs"
                style={{
                  background: "oklch(0.25 0 0)",
                  color: "oklch(0.9 0 0)",
                  border: "1px solid oklch(0.4 0 0 / 0.5)",
                }}
              >
                <option value="noise-bias">Noise + Bias</option>
                <option value="ink-blot">Ink Blot</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex justify-between">
                <span>Sharpness</span>
                <span>{cloudParams.sharpness.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={cloudParams.sharpness}
                onChange={(e) =>
                  setCloudParams((p) => ({ ...p, sharpness: parseFloat(e.target.value) }))
                }
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
              onClick={() => setCloudParams(defaultCloudParams)}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: "oklch(0.3 0 0 / 0.6)",
                border: "1px solid oklch(0.4 0 0 / 0.5)",
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
