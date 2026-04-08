import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { createGameGrid } from "@ambotrope/grid";
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

function formatParams(params: CloudParams, seed: number, tileCount: number): string {
  return [
    `seed: ${seed}`,
    `tiles: ${tileCount}`,
    `strategy: ${params.strategy}`,
    `levels: ${params.levels}`,
    `sharpnessMin: ${params.sharpnessMin}`,
    `sharpnessMax: ${params.sharpnessMax}`,
    `frequencyMin: ${params.frequencyMin}`,
    `frequencyMax: ${params.frequencyMax}`,
    `centerBias: ${params.centerBias}`,
  ].join("\n");
}

export function BlotterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderStateRef = useRef<RenderState | null>(null);
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);
  const [tileCount, setTileCount] = useState(() => {
    const stored = localStorage.getItem("blotter-tileCount");
    return stored ? parseInt(stored, 10) : 19;
  });
  const [seed, setSeed] = useState(() => {
    const stored = localStorage.getItem("blotter-seed");
    return stored ? parseInt(stored, 10) : 1;
  });
  const [cloudParams, setCloudParams] = useState<CloudParams>(() => {
    const themeColors = getThemeColors();
    const storedStrategy = localStorage.getItem("blotter-strategy");
    return {
      ...defaultCloudParams,
      ...themeColors,
      ...(storedStrategy ? { strategy: storedStrategy as CloudStrategy } : {}),
    };
  });
  const [debugOpen, setDebugOpen] = useState(true);
  const [sharpnessLocked, setSharpnessLocked] = useState(false);
  const [frequencyLocked, setFrequencyLocked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("blotter-tileCount", String(tileCount)); }, [tileCount]);
  useEffect(() => { localStorage.setItem("blotter-seed", String(seed)); }, [seed]);
  useEffect(() => { localStorage.setItem("blotter-strategy", cloudParams.strategy); }, [cloudParams.strategy]);

  const tileIds = useMemo(() => {
    const grid = createGameGrid({ tileCount, hexSize: 50 });
    return grid.tileIds;
  }, [tileCount]);

  // Initialize render state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    let state = createRenderState(tileIds, seed, canvas.width, canvas.height, cloudParams);
    state = generateCloudTexture(state, cloudParams);
    renderStateRef.current = state;
    setRenderVersion((v) => v + 1);
  }, [tileIds, seed, cloudParams]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const state = renderStateRef.current;
    if (!canvas || !state || renderVersion === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tiles: TileRenderInfo[] = tileIds.map((tileId) => ({
      tileId,
      selected: false,
      hovering: hoveredTile === tileId,
      pressing: false,
      collision: false,
      otherSelected: false,
      labels: [],
    }));

    renderFrame(ctx, state, tiles, cloudParams, 0);
  }, [tileIds, hoveredTile, renderVersion, cloudParams]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = renderStateRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    setHoveredTile(hitTestTile(state, x, y));
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredTile(null), []);

  const handleCopy = useCallback(() => {
    const text = formatParams(cloudParams, seed, tileCount);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [cloudParams, seed, tileCount]);

  const levelsLabel = cloudParams.levels < 2 ? "Continuous" : `${cloudParams.levels}`;

  return (
    <div className="w-screen h-screen flex flex-col bg-bg">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Debug panel — top left */}
        <div className="absolute top-2 left-2">
          <button
            onClick={() => setDebugOpen((o) => !o)}
            className="px-2 py-1 rounded text-xs font-mono bg-debug-button text-debug-text border border-debug-border"
            data-testid="debug-toggle"
          >
            {debugOpen ? "Hide Debug" : "Debug"}
          </button>
          {debugOpen && (
            <div
              className="mt-1 p-3 rounded-lg flex flex-col gap-3 text-xs font-mono bg-debug-bg text-debug-text border border-debug-border"
              style={{ minWidth: "220px", backdropFilter: "blur(8px)" }}
              data-testid="debug-panel"
            >
              {/* Tile Count */}
              <div className="flex flex-col gap-1">
                <label className="flex justify-between">
                  <span>Tiles</span>
                  <span>{tileCount}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="61"
                  step="1"
                  value={tileCount}
                  onChange={(e) => setTileCount(parseInt(e.target.value, 10))}
                  className="w-full"
                  data-testid="tile-count-slider"
                />
              </div>

              {/* Strategy */}
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
                  data-testid="strategy-select"
                >
                  <option value="noise-bias">Noise + Bias</option>
                  <option value="ink-blot">Ink Blot</option>
                </select>
              </div>

              {/* Sharpness */}
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

              {/* Frequency */}
              <div className="flex flex-col gap-1">
                <label className="flex justify-between items-center">
                  <span>Frequency</span>
                  <button
                    onClick={() => setFrequencyLocked((l) => !l)}
                    className="px-1.5 py-0.5 rounded text-xs bg-debug-button border border-debug-border"
                    style={{ opacity: frequencyLocked ? 1 : 0.5 }}
                  >
                    {frequencyLocked ? "Locked" : "Lock"}
                  </button>
                </label>
                <div className="flex items-center gap-1 text-xs text-debug-muted">
                  <span>Min</span>
                  <span className="ml-auto">{cloudParams.frequencyMin.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={cloudParams.frequencyMin}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCloudParams((p) => {
                      if (frequencyLocked) {
                        const delta = val - p.frequencyMin;
                        return { ...p, frequencyMin: val, frequencyMax: Math.min(10, Math.max(0.1, p.frequencyMax + delta)) };
                      }
                      return { ...p, frequencyMin: val };
                    });
                  }}
                  className="w-full"
                  data-testid="frequency-min-slider"
                />
                <div className="flex items-center gap-1 text-xs text-debug-muted">
                  <span>Max</span>
                  <span className="ml-auto">{cloudParams.frequencyMax.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={cloudParams.frequencyMax}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCloudParams((p) => {
                      if (frequencyLocked) {
                        const delta = val - p.frequencyMax;
                        return { ...p, frequencyMax: val, frequencyMin: Math.min(10, Math.max(0.1, p.frequencyMin + delta)) };
                      }
                      return { ...p, frequencyMax: val };
                    });
                  }}
                  className="w-full"
                  data-testid="frequency-max-slider"
                />
              </div>

              {/* Center Bias */}
              <div className="flex flex-col gap-1">
                <label className="flex justify-between">
                  <span>Center Bias</span>
                  <span>{cloudParams.centerBias.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={cloudParams.centerBias}
                  onChange={(e) =>
                    setCloudParams((p) => ({ ...p, centerBias: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                  data-testid="center-bias-slider"
                />
              </div>

              {/* Grayscale Levels */}
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

              {/* Reset */}
              <button
                onClick={() => {
                  setCloudParams({ ...defaultCloudParams, ...getThemeColors() });
                  setSeed(1);
                  setTileCount(19);
                }}
                className="px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
              >
                Reset
              </button>

              {/* Seed */}
              <div className="border-t border-debug-border pt-2 mt-1 flex flex-col gap-1">
                <label className="flex justify-between">
                  <span>Seed</span>
                  <span className="select-all">{seed}</span>
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSeed((s) => s - 1)}
                    className="flex-1 px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setSeed((s) => s + 1)}
                    className="flex-1 px-2 py-1 rounded text-xs bg-debug-button border border-debug-border"
                  >
                    Next
                  </button>
                </div>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) setSeed(val);
                  }}
                  className="w-full px-1 py-0.5 rounded text-xs bg-debug-input text-debug-text border border-debug-border"
                  data-testid="seed-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Copyable params — top right */}
        <div className="absolute top-2 right-2" data-testid="params-box">
          <div
            className="p-3 rounded-lg text-xs font-mono bg-debug-bg text-debug-text border border-debug-border"
            style={{ minWidth: "200px", backdropFilter: "blur(8px)" }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">Parameters</span>
              <button
                onClick={handleCopy}
                className="px-2 py-0.5 rounded text-xs bg-debug-button border border-debug-border"
                data-testid="copy-params"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre select-all text-debug-muted leading-relaxed">
              {formatParams(cloudParams, seed, tileCount)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
