import { test, expect, type Page } from "@playwright/test";

/**
 * Helper: click the canvas at a position relative to the center of the canvas.
 * The hex grid is centered, so center = guaranteed tile hit.
 */
async function clickTile(page: Page, offsetX = 0, offsetY = 0) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const cx = box.width / 2 + offsetX;
  const cy = box.height / 2 + offsetY;
  await canvas.click({ position: { x: cx, y: cy } });
}

/**
 * Helper: create a two-player game and return both pages.
 */
async function setupTwoPlayerGame(page: Page, context: import("@playwright/test").BrowserContext) {
  // Player 1 creates game
  await page.goto("/");
  await page.getByPlaceholder("Enter your name").fill("Alice");
  await page.getByRole("button", { name: "Create New Game" }).click();
  await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

  // Get the game path
  const gameUrl = new URL(page.url());
  const gamePath = gameUrl.pathname;

  // Player 2 joins via shared link
  const page2 = await context.newPage();
  await page2.goto(gamePath);
  await page2.getByPlaceholder("Enter your name").fill("Bob");
  await page2.getByRole("button", { name: "Join Game" }).click();

  await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });
  await expect(page2.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

  return { alice: page, bob: page2 };
}

async function bothSelectTilesAndWords(alice: Page, bob: Page) {
  await clickTile(alice, 0, 0);
  await expect(alice.locator(".rounded-lg").filter({ hasText: "You" }).getByText("Tile selected")).toBeVisible({ timeout: 3000 });
  await clickTile(bob, 60, 0);
  await expect(bob.locator(".rounded-lg").filter({ hasText: "You" }).getByText("Tile selected")).toBeVisible({ timeout: 3000 });

  await alice.getByRole("button", { name: "Batman" }).click();
  await bob.getByRole("button", { name: "Maraca" }).click();
}

async function bothLockIn(alice: Page, bob: Page) {
  await alice.getByRole("button", { name: "Lock In" }).click();
  await bob.getByRole("button", { name: "Lock In" }).click();
  await expect(alice.getByText("Results!")).toBeVisible({ timeout: 5000 });
}

test.describe("single player start", () => {
  test("shows share link when alone", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Share this link", { exact: true })).toBeVisible();
  });

  test("shows connected status indicator", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();

    await expect(page.getByText("Connected")).toBeVisible({ timeout: 5000 });
  });

  test("shows player in the player panel with 'You' badge", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();

    await expect(page.getByText("You", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Alice")).toBeVisible();
  });

  test("can select tile and words while alone", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

    await clickTile(page, 0, 0);
    await expect(page.getByText("Tile selected")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "Batman" }).click();
    const selfCard = page.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "Batman" })).toBeVisible();
  });

  test("both players in selecting when second joins", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);

    await expect(alice.getByText("Choose your tile")).toBeVisible();
    await expect(bob.getByText("Choose your tile")).toBeVisible();
  });
});

test.describe("selecting phase", () => {
  test("canvas is interactive during selecting phase", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    const canvas = alice.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("selecting a tile shows 'Tile selected' indicator", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await clickTile(alice, 0, 0);
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 3000 });
  });

  test("word selector is visible during selecting phase", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await expect(alice.getByText("Select up to", { exact: false })).toBeVisible();
    await expect(alice.getByRole("button", { name: "Batman" })).toBeVisible();
  });

  test("can select words before selecting a tile", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "Batman" }).click();

    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "Batman" })).toBeVisible();
  });

  test("can select words and they appear on player card", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "Batman" }).click();
    await alice.getByRole("button", { name: "Egg", exact: true }).click();

    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "Batman" })).toBeVisible();
    await expect(selfCard.locator("span.rounded-full", { hasText: "Egg" })).toBeVisible();
  });

  test("other player's words appear in real time", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);

    await bob.getByRole("button", { name: "Maraca" }).click();

    const bobCard = alice.locator(".rounded-lg").filter({ hasText: "Bob" });
    await expect(bobCard.locator("span.rounded-full", { hasText: "Maraca" })).toBeVisible({ timeout: 3000 });
  });
});

test.describe("lock in and reveal", () => {
  test("auto-reveals when all players lock in", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await expect(alice.getByText("Results!")).toBeVisible();
    await expect(bob.getByText("Results!")).toBeVisible();
  });

  test("shows round results with scores", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await expect(alice.getByText("(you)")).toBeVisible();
    await expect(bob.getByText("(you)")).toBeVisible();
  });

  test("shows 'Next Round' button", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await expect(alice.getByRole("button", { name: "Next Round" })).toBeVisible();
  });

  test("can start a new round", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await alice.getByRole("button", { name: "Next Round" }).click();
    await expect(alice.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });
    await expect(alice.getByText("Round 2")).toBeVisible();
  });
});
