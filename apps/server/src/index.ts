import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const { app, injectWebSocket } = createApp();

const port = parseInt(process.env.PORT ?? "3000", 10);

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Ambotrope server running on http://localhost:${port}`);
});

injectWebSocket(server);
