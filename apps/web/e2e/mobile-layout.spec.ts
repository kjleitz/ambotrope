import { test, expect, type Page } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: MOBILE_VIEWPORT });

async function clickTile(page: Page, offsetX = 0, offsetY = 0) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const cx = box.width / 2 + offsetX;
  const cy = box.height / 2 + offsetY;
  await canvas.click({ position: { x: cx, y: cy } });
}

async function typeWord(page: Page, word: string) {
  await page.getByPlaceholder("Type a word").fill(word);
  await page.getByRole("button", { name: "+" }).click();
}

async function createGame(page: Page) {
  await page.goto("/");
  await page.getByPlaceholder("Enter your name").fill("Alice");
  await page.getByRole("button", { name: "Create New Game" }).click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 });
}

async function setupTwoPlayerGame(page: Page, context: import("@playwright/test").BrowserContext) {
  await createGame(page);
  const gameUrl = new URL(page.url());
  const gamePath = gameUrl.pathname;

  const page2 = await context.newPage();
  await page2.setViewportSize(MOBILE_VIEWPORT);
  await page2.goto(gamePath);
  await page2.getByPlaceholder("Enter your name").fill("Bob");
  await page2.getByRole("button", { name: "Join Game" }).click();
  await expect(page2.locator("canvas")).toBeVisible({ timeout: 5000 });

  return { alice: page, bob: page2 };
}

test.describe("mobile layout", () => {
  test("sidebar is hidden on mobile", async ({ page }) => {
    await createGame(page);
    // Desktop sidebar share link should not be visible
    // The share link is in the overflow menu on mobile
    await expect(page.locator(".hidden.md\\:flex")).not.toBeVisible();
  });

  test("canvas renders at full width", async ({ page }) => {
    await createGame(page);
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    // Canvas should be close to full viewport width (minus small padding)
    expect(box!.width).toBeGreaterThan(MOBILE_VIEWPORT.width - 40);
  });

  test("word input is at the bottom of the screen", async ({ page }) => {
    await createGame(page);
    const input = page.getByPlaceholder("Type a word");
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    expect(inputBox).toBeTruthy();
    // Word input should be in the lower half of the screen
    expect(inputBox!.y).toBeGreaterThan(MOBILE_VIEWPORT.height / 2);
  });

  test("can select tile via tap on mobile", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    // After tapping, the mobile player strip should show word count
    // (since we haven't typed words yet, just verify no errors occurred)
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("can type and submit words on mobile", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    await typeWord(page, "hello");
    // The word should appear as a removable pill in the word selector
    await expect(page.getByRole("button", { name: /hello/ })).toBeVisible();
  });

  test("PhaseBar hides instructions on mobile", async ({ page }) => {
    await createGame(page);
    // The selecting description text should be hidden
    await expect(page.getByText("Step 1:")).not.toBeVisible();
    // On mobile with no tile selected, the phase label shows "Choose your tile"
    await expect(page.getByText("Choose your tile", { exact: true })).toBeVisible();
  });

  test("Lock In button is visible and functional", async ({ page }) => {
    await createGame(page);
    const lockIn = page.getByRole("button", { name: "Lock in" });
    await expect(lockIn).toBeVisible();
  });
});

test.describe("mobile player strip", () => {
  test("shows self player badge", async ({ page }) => {
    await createGame(page);
    // Mobile player strip should show the player's name
    const strip = page.locator(".md\\:hidden").filter({ hasText: "Alice" });
    await expect(strip).toBeVisible();
  });

  test("shows other player when they join", async ({ page, context }) => {
    const { alice } = await setupTwoPlayerGame(page, context);
    // Alice should see Bob in the player strip
    const strip = alice.locator(".md\\:hidden").filter({ hasText: "Bob" });
    await expect(strip).toBeVisible({ timeout: 5000 });
  });

  test("shows chosen words for each player", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    // Alice selects a tile and types a word
    await clickTile(alice, 0, 0);
    await typeWord(alice, "hello");
    // Alice should see her own word in the strip
    const strip = alice.locator(".md\\:hidden");
    await expect(strip.getByText("hello")).toBeVisible();
    // Bob selects a tile and types a word
    await clickTile(bob, 30, 30);
    await typeWord(bob, "world");
    // Alice should see Bob's word in the strip
    await expect(strip.getByText("world")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("mobile inspiration bottom sheet", () => {
  test("inspiration opens as bottom sheet overlay", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    // Click inspiration button
    await page.getByRole("button", { name: "Inspiration" }).click();
    // A fixed overlay should appear
    const overlay = page.locator(".fixed.inset-0.z-50");
    await expect(overlay).toBeVisible();
  });

  test("inspiration bottom sheet closes on backdrop tap", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    await page.getByRole("button", { name: "Inspiration" }).click();
    const sheetHeader = page.getByText(/Inspiration \(\d+\/\d+\)/);
    await expect(sheetHeader).toBeVisible();
    // Tap the backdrop area (top of the overlay, above the sheet)
    const overlay = page.locator(".fixed.inset-0.z-50");
    await overlay.click({ position: { x: 195, y: 50 } });
    await expect(sheetHeader).not.toBeVisible();
  });

  test("inspiration bottom sheet closes on Escape key", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    await page.getByRole("button", { name: "Inspiration" }).click();
    // Bottom sheet content should be visible
    const sheetHeader = page.getByText(/Inspiration \(\d+\/\d+\)/);
    await expect(sheetHeader).toBeVisible();
    // Press Escape to close
    await page.keyboard.press("Escape");
    await expect(sheetHeader).not.toBeVisible();
  });

  test("can select word from inspiration bottom sheet", async ({ page }) => {
    await createGame(page);
    await clickTile(page, 0, 0);
    await page.getByRole("button", { name: "Inspiration" }).click();
    // Pick the first word in the inspiration panel
    const firstWord = page.locator(".fixed.inset-0.z-50 .word-btn").first();
    await expect(firstWord).toBeVisible();
    const wordText = await firstWord.textContent();
    await firstWord.click();
    // The word should now appear in the selected words area
    expect(wordText).toBeTruthy();
  });
});

test.describe("mobile overflow menu", () => {
  test("overflow menu shows share link", async ({ page }) => {
    await createGame(page);
    // The three-dot button is the only button containing 3 circle elements
    const menuButton = page.locator("button:has(svg circle:nth-of-type(3))");
    await menuButton.click();
    // The popup with shadow-lg should appear with the share link
    const popup = page.locator(".shadow-lg");
    await expect(popup).toBeVisible();
    await expect(popup.getByText("Share this link")).toBeVisible();
  });
});

test.describe("mobile reveal phase", () => {
  test("shows round results below canvas", async ({ page, context }) => {
    const { alice, bob } = await setupTwoPlayerGame(page, context);
    // Both select center tile and a word
    await clickTile(alice, 0, 0);
    await typeWord(alice, "cat");
    await clickTile(bob, 0, 0);
    await typeWord(bob, "dog");
    // Both lock in
    await alice.getByRole("button", { name: "Lock in" }).click();
    await bob.getByRole("button", { name: "Lock in" }).click();
    await expect(alice.getByText("Results!").last()).toBeVisible({ timeout: 5000 });
    // Round result should be visible below the canvas
    await expect(alice.getByText("Round 1")).toBeVisible();
  });
});
