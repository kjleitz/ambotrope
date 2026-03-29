import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { handleConnection, getRoomCount, getRoomInfo } from "./rooms.js";

const app = new Hono();

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use("*", cors());

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

const port = parseInt(process.env.PORT ?? "3000", 10);

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Ambotrope server running on http://localhost:${port}`);
});

injectWebSocket(server);
