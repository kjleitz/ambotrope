import { describe, it, expect } from "vitest";
import { createApp, parseAllowedOrigins } from "../app.js";

describe("parseAllowedOrigins", () => {
  it("returns null when env is undefined", () => {
    expect(parseAllowedOrigins(undefined)).toBeNull();
  });

  it("returns null when env is empty string", () => {
    expect(parseAllowedOrigins("")).toBeNull();
  });

  it("parses a single origin", () => {
    expect(parseAllowedOrigins("https://example.com")).toEqual([
      "https://example.com",
    ]);
  });

  it("parses comma-separated origins and trims whitespace", () => {
    expect(
      parseAllowedOrigins("https://www.example.com , https://example.com"),
    ).toEqual(["https://www.example.com", "https://example.com"]);
  });
});

describe("CORS headers", () => {
  it("allows any origin when no CORS_ORIGIN is configured", async () => {
    const { app } = createApp(undefined);
    const res = await app.request("/health", {
      headers: { origin: "https://evil.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("reflects allowed origin in CORS header", async () => {
    const { app } = createApp("https://www.ambotrope.com,https://ambotrope.com");
    const res = await app.request("/health", {
      headers: { origin: "https://www.ambotrope.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "https://www.ambotrope.com",
    );
  });

  it("does not reflect disallowed origin in CORS header", async () => {
    const { app } = createApp("https://www.ambotrope.com");
    const res = await app.request("/health", {
      headers: { origin: "https://evil.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("WebSocket origin guard", () => {
  it("rejects WS upgrade from disallowed origin with 403", async () => {
    const { app } = createApp("https://www.ambotrope.com");
    const res = await app.request("/ws/test-room", {
      headers: {
        origin: "https://evil.com",
        upgrade: "websocket",
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Origin not allowed");
  });

  it("rejects WS upgrade with no origin header with 403", async () => {
    const { app } = createApp("https://www.ambotrope.com");
    const res = await app.request("/ws/test-room", {
      headers: { upgrade: "websocket" },
    });
    expect(res.status).toBe(403);
  });

  it("allows WS upgrade from allowed origin", async () => {
    const { app } = createApp("https://www.ambotrope.com,https://ambotrope.com");
    const res = await app.request("/ws/test-room", {
      headers: {
        origin: "https://ambotrope.com",
        upgrade: "websocket",
      },
    });
    // The upgrade itself will fail in test (no real WS server), but it should
    // NOT be a 403 — it passed the origin check
    expect(res.status).not.toBe(403);
  });

  it("allows any origin for WS when CORS_ORIGIN is not set", async () => {
    const { app } = createApp(undefined);
    const res = await app.request("/ws/test-room", {
      headers: {
        origin: "https://anything.com",
        upgrade: "websocket",
      },
    });
    expect(res.status).not.toBe(403);
  });
});
