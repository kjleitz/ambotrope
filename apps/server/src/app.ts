import { Hono } from "hono";
import { cors } from "hono/cors";
import { createNodeWebSocket } from "@hono/node-ws";
import { handleConnection, getRoomCount, getRoomInfo } from "./rooms.js";

export function parseAllowedOrigins(
  corsOriginEnv: string | undefined,
): string[] | null {
  return corsOriginEnv
    ? corsOriginEnv.split(",").map((o) => o.trim())
    : null;
}

export function createApp(corsOriginEnv?: string) {
  const app = new Hono();
  const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

  const allowedOrigins = parseAllowedOrigins(
    corsOriginEnv ?? process.env.CORS_ORIGIN,
  );

  // CORS middleware
  app.use("*", cors({ origin: allowedOrigins ?? "*" }));

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Room info
  app.get("/rooms/:gameId", (c) => {
    const gameId = c.req.param("gameId");
    const info = getRoomInfo(gameId);
    if (!info) {
      return c.json({ exists: false });
    }
    return c.json({ exists: true, ...info });
  });

  // Stats
  app.get("/stats", (c) => {
    return c.json({ rooms: getRoomCount() });
  });

  // Reject WebSocket upgrades from disallowed origins
  app.use("/ws/:gameId", async (c, next) => {
    if (allowedOrigins !== null) {
      const requestOrigin = c.req.header("origin");
      if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
        return c.json({ error: "Origin not allowed" }, 403);
      }
    }
    return next();
  });

  // WebSocket endpoint
  app.get(
    "/ws/:gameId",
    upgradeWebSocket((c) => {
      const gameId = c.req.param("gameId") ?? "";
      let handler: ReturnType<typeof handleConnection> | null = null;

      return {
        onOpen(_evt, ws) {
          handler = handleConnection(gameId, ws);
        },
        onMessage(evt, _ws) {
          if (handler && typeof evt.data === "string") {
            handler.onMessage(evt.data);
          }
        },
        onClose(_evt, _ws) {
          if (handler) {
            handler.onClose();
          }
        },
      };
    }),
  );

  return { app, injectWebSocket };
}
