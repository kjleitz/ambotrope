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

  await alice.getByRole("button", { name: "batman" }).click();
  await bob.getByRole("button", { name: "maraca" }).click();
}

async function bothLockIn(alice: Page, bob: Page) {
  await alice.getByRole("button", { name: "Lock In" }).click();
  await bob.getByRole("button", { name: "Lock In" }).click();
  await expect(alice.getByText("Results!")).toBeVisible({ timeout: 5000 });
}

test.describe("UI chrome", () => {
  test("theme button is not shown", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Theme" })).not.toBeVisible();
  });

  test("hex grid renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 });

    // Trigger a render by hovering over the canvas
    await page.locator("canvas").hover();
    expect(errors).toHaveLength(0);
  });
});

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

    await page.getByRole("button", { name: "batman" }).click();
    const selfCard = page.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();
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
    await expect(alice.getByRole("button", { name: "batman" })).toBeVisible();
  });

  test("can select words before selecting a tile", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "batman" }).click();

    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();
  });

  test("shows suggest words link pointing to GitHub issues", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    const link = alice.getByRole("link", { name: "Suggest words" });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain("github.com/kjleitz/ambotrope/issues/new");
    expect(href).toContain("labels=word+suggestion");
  });

  test("can select words and they appear on player card", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "batman" }).click();
    await alice.getByRole("button", { name: "egg", exact: true }).click();

    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();
    await expect(selfCard.locator("span.rounded-full", { hasText: "egg" })).toBeVisible();
  });

  test("step 1 is highlighted before selecting a tile", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    const step1 = alice.locator("text=Step 1: Choose a tile.").locator("..");
    await expect(step1).toHaveClass(/bg-yellow/, { timeout: 3000 });

    const step2 = alice.locator("text=Step 2: Pick 3 words").locator("..");
    await expect(step2).toHaveClass(/opacity-40/);
  });

  test("step 2 is highlighted after selecting a tile", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await clickTile(alice, 0, 0);
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 3000 });

    const step2 = alice.locator("text=Step 2: Pick 3 words").locator("..");
    await expect(step2).toHaveClass(/bg-yellow/, { timeout: 3000 });

    const step1 = alice.locator("text=Step 1: Choose a tile.").locator("..");
    await expect(step1).not.toHaveClass(/bg-yellow/);
    await expect(step1).not.toHaveClass(/opacity-40/);
  });

  test("step 3 is highlighted after selecting 3 words", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await clickTile(alice, 0, 0);
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 3000 });

    // Select 3 words by clicking word buttons
    const wordButtons = alice.locator("[class*='flex flex-wrap'] button");
    const count = await wordButtons.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      await wordButtons.nth(i).click();
    }

    const step3 = alice.locator("text=Step 3: Look at the words").locator("..");
    await expect(step3).toHaveClass(/bg-yellow/, { timeout: 3000 });

    // Steps after step 3 should NOT be muted
    const step4 = alice.locator("text=Step 4: Switch your tile").locator("..");
    await expect(step4).not.toHaveClass(/opacity-40/);
  });

  test("other player's words appear in real time", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);

    await bob.getByRole("button", { name: "maraca" }).click();

    const bobCard = alice.locator(".rounded-lg").filter({ hasText: "Bob" });
    await expect(bobCard.locator("span.rounded-full", { hasText: "maraca" })).toBeVisible({ timeout: 3000 });
  });
});

test.describe("optimistic updates and clear", () => {
  test("tile selection appears immediately without waiting for server", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await clickTile(alice, 0, 0);
    // Should appear within 500ms (optimistic), not seconds (server round-trip)
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 500 });
  });

  test("word selection appears on player card immediately", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "batman" }).click();
    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    // Should appear within 500ms (optimistic)
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible({ timeout: 500 });
  });

  test("switching tiles clears word selections", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await clickTile(alice, 0, 0);
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 3000 });

    await alice.getByRole("button", { name: "batman" }).click();
    await alice.getByRole("button", { name: "egg", exact: true }).click();
    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();

    // Click a different tile (large offset to guarantee a different hex)
    await clickTile(alice, 0, -120);

    // Words should be cleared
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).not.toBeVisible({ timeout: 3000 });
    await expect(selfCard.locator("span.rounded-full", { hasText: "egg" })).not.toBeVisible({ timeout: 3000 });
  });

  test("clear button removes all selected words", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    await alice.getByRole("button", { name: "batman" }).click();
    await alice.getByRole("button", { name: "egg", exact: true }).click();
    const selfCard = alice.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();

    await alice.getByRole("button", { name: "Clear" }).click();

    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).not.toBeVisible({ timeout: 3000 });
    await expect(selfCard.locator("span.rounded-full", { hasText: "egg" })).not.toBeVisible({ timeout: 3000 });
  });

  test("clear button is disabled when no words selected", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    const clearBtn = alice.getByRole("button", { name: "Clear" });
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toBeDisabled();
  });
});

test.describe("refresh persistence", () => {
  test("refreshing preserves selected tile and words", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

    await clickTile(page, 0, 0);
    await expect(page.getByText("Tile selected")).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: "batman" }).click();
    const selfCard = page.locator(".rounded-lg").filter({ hasText: "You" });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();

    // Refresh the page (URL contains ?name=Alice)
    await page.reload();
    await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

    // Tile and word selections should be restored from server
    await expect(page.getByText("Tile selected")).toBeVisible({ timeout: 3000 });
    await expect(selfCard.locator("span.rounded-full", { hasText: "batman" })).toBeVisible();
  });
});

test.describe("lock in and reveal", () => {
  test("lock in button is disabled without a tile selected", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);

    const lockInBtn = alice.getByRole("button", { name: "Lock in" });
    await expect(lockInBtn).toBeVisible();
    await expect(lockInBtn).toBeDisabled();

    // Select a tile — button should become enabled
    await clickTile(alice, 0, 0);
    await expect(alice.getByText("Tile selected")).toBeVisible({ timeout: 3000 });
    await expect(lockInBtn).toBeEnabled();
  });

  test("auto-reveals when all players lock in", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await expect(alice.getByText("Results!")).toBeVisible();
    await expect(bob.getByText("Results!")).toBeVisible();
  });

  test("canvas renders player labels on reveal without errors", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    // Canvas should still be visible with labels rendered (no JS errors)
    await expect(alice.locator("canvas")).toBeVisible();
    await expect(bob.locator("canvas")).toBeVisible();

    // Verify no console errors occurred during reveal rendering
    const errors: string[] = [];
    alice.on("pageerror", (err) => errors.push(err.message));
    // Re-trigger a render by hovering
    await alice.locator("canvas").hover();
    expect(errors).toHaveLength(0);
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

  test("can start a new round when both ready", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    await alice.getByRole("button", { name: "Next Round" }).click();
    // Alice clicked but Bob hasn't — should show "Waiting…" for Alice
    await expect(alice.getByText("Waiting…")).toBeVisible({ timeout: 3000 });
    // Bob should see "Continue" button (animated)
    await expect(bob.getByRole("button", { name: "Continue" })).toBeVisible({ timeout: 3000 });

    await bob.getByRole("button", { name: "Continue" }).click();
    await expect(alice.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });
    await expect(alice.getByText("Round 2")).toBeVisible();
  });

  test("new blots button changes seed for all players, undo reverts", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);

    // New blots button should be visible during selecting
    const newBlotsAlice = alice.getByRole("button", { name: "New blots" });
    await expect(newBlotsAlice).toBeVisible({ timeout: 3000 });

    // Undo button should NOT be visible initially (no advances yet)
    await expect(alice.getByRole("button", { name: "Undo blots" })).not.toBeVisible();

    // Click new blots — undo should appear for both players
    await newBlotsAlice.click();
    await expect(alice.getByRole("button", { name: "Undo blots" })).toBeVisible({ timeout: 3000 });
    await expect(bob.getByRole("button", { name: "Undo blots" })).toBeVisible({ timeout: 3000 });

    // Undo — undo button should disappear again
    await alice.getByRole("button", { name: "Undo blots" }).click();
    await expect(alice.getByRole("button", { name: "Undo blots" })).not.toBeVisible({ timeout: 3000 });
    await expect(bob.getByRole("button", { name: "Undo blots" })).not.toBeVisible({ timeout: 3000 });
  });

  test("new blots and undo buttons hidden during reveal phase", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    // In reveal phase, new blots should not be visible
    await expect(alice.getByRole("button", { name: "New blots" })).not.toBeVisible();
  });

  test("share link is visible during reveal and new rounds", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    await bothSelectTilesAndWords(alice, bob);
    await bothLockIn(alice, bob);

    // Share link should be visible during reveal
    await expect(alice.getByText("Share this link")).toBeVisible();

    // Start new round — share link should still be there
    await alice.getByRole("button", { name: "Next Round" }).click();
    await bob.getByRole("button", { name: "Continue" }).click();
    await expect(alice.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });
    await expect(alice.getByText("Share this link")).toBeVisible();
  });
});
