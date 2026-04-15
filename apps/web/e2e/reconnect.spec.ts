import { test, expect, type Page } from "@playwright/test";

// Injects a WebSocket tracker before page JS runs, exposing __closeAllWebSockets on window.
async function injectWsTracker(page: Page) {
  await page.addInitScript(() => {
    const sockets: WebSocket[] = [];
    const OrigWS = window.WebSocket;

    class TrackedWS extends OrigWS {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.push(this);
      }
    }

    window.WebSocket = TrackedWS;
    (window as Window & { __closeAllWebSockets: () => void }).__closeAllWebSockets = () => {
      sockets.forEach((ws) => ws.close());
      sockets.length = 0;
    };
  });
}

async function closeAllWebSockets(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __closeAllWebSockets: () => void }).__closeAllWebSockets();
  });
}

test.describe("websocket reconnect", () => {
  test("reconnects on visibilitychange after disconnect", async ({ page }) => {
    await injectWsTracker(page);
    await page.goto("/game/reconnect-visibility-1?name=Alice");
    await expect(page.getByText("Connected").first()).toBeVisible({ timeout: 5000 });

    // Simulate the socket dropping (e.g. laptop lid closing kills the connection)
    await closeAllWebSockets(page);
    await expect(page.getByText("Disconnected").first()).toBeVisible({ timeout: 3000 });

    // Simulate opening the lid: window becomes visible again
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should reconnect promptly (no need to wait for the 5s poll interval)
    await expect(page.getByText("Connected").first()).toBeVisible({ timeout: 5000 });
  });

  test("reconnects via periodic check after disconnect", async ({ page }) => {
    await injectWsTracker(page);
    await page.goto("/game/reconnect-interval-1?name=Bob");
    await expect(page.getByText("Connected").first()).toBeVisible({ timeout: 5000 });

    await closeAllWebSockets(page);
    await expect(page.getByText("Disconnected").first()).toBeVisible({ timeout: 3000 });

    // No user action — the 5s interval should reconnect on its own
    await expect(page.getByText("Connected").first()).toBeVisible({ timeout: 10_000 });
  });
});
