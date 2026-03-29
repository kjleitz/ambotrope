import { useRef, useEffect, useState, useCallback } from "react";
import type { PlayerView } from "@ambotrope/game";
import type { TileId } from "@ambotrope/grid";
import {
  createRenderState,
  generateCloudTexture,
  renderFrame,
  hitTestTile,
} from "@/lib/renderer.ts";
import type { RenderState, TileRenderInfo } from "@/lib/renderer.ts";

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
    );
    state = generateCloudTexture(state);
    renderStateRef.current = state;
    setInitialized(true);
  }, [gameView.tileIds, gameView.config.seed]);

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
  }, [gameView, hoveredTile, interactive, initialized]);

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

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${interactive ? "cursor-pointer" : ""}`}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={handleMouseLeave}
    />
  );
}
