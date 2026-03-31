import { test, expect } from "@playwright/test";

const SELECTING_HEADING = "Mark your tile and descriptors";
const JOIN_HEADING = "Join Reading";
const JOIN_BUTTON = "Join Reading";
const REVEAL_HEADING = "Read the sheet";

test.describe("game join flow", () => {
  test("shared link shows name prompt, then joins game", async ({ page }) => {
    // Open a shared game link (no ?name= param)
    await page.goto("/game/test-join-1");

    // Should see the join form, not an error
    await expect(page.getByRole("heading", { name: JOIN_HEADING })).toBeVisible();
    await expect(page.getByText("test-join-1")).toBeVisible();

    // Enter name and join
    const nameInput = page.getByPlaceholder("Enter your name");
    await expect(nameInput).toBeFocused();
    await nameInput.fill("Alice");
    await page.getByRole("button", { name: JOIN_BUTTON }).click();

    // Should now be in the game — phase bar visible
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
  });

  test("shared link join via Enter key", async ({ page }) => {
    await page.goto("/game/test-join-2");

    const nameInput = page.getByPlaceholder("Enter your name");
    await nameInput.fill("Bob");
    await nameInput.press("Enter");

    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
  });

  test("join button is disabled with empty name", async ({ page }) => {
    await page.goto("/game/test-join-3");

    const joinButton = page.getByRole("button", { name: JOIN_BUTTON });
    await expect(joinButton).toBeDisabled();

    // Type a name — button should enable
    await page.getByPlaceholder("Enter your name").fill("Carol");
    await expect(joinButton).toBeEnabled();
  });

  test("creating a game from home page works", async ({ page }) => {
    await page.goto("/");

    // Enter name and create
    await page.getByPlaceholder("Enter your name").fill("Dave");
    await page.getByRole("button", { name: "Create New Game" }).click();

    // Should land in selecting phase
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
  });

  test("navigating directly to a game URL with name param works", async ({ page }) => {
    await page.goto("/game/direct-join-1?name=Alice");
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Alice")).toBeVisible();
  });

  test("second player joining via address bar URL with name param works", async ({ page, context }) => {
    // Player 1 creates game
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    // Player 2 navigates using the FULL URL from Player 1's address bar (includes ?name=)
    const fullUrl = page.url();
    const page2 = await context.newPage();
    await page2.goto(fullUrl);

    // Player 2 should be in the game
    await expect(page2.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
  });

  test("player can join a game that is in selecting phase", async ({ page, context }) => {
    // Player 1 creates game
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    const gameUrl = new URL(page.url());
    const gamePath = gameUrl.pathname;

    // Player 2 joins
    const page2 = await context.newPage();
    await page2.goto(gamePath);
    await page2.getByPlaceholder("Enter your name").fill("Bob");
    await page2.getByRole("button", { name: JOIN_BUTTON }).click();
    await expect(page2.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    // Player 3 joins — should see the game, not an error
    const page3 = await context.newPage();
    await page3.goto(gamePath);
    await page3.getByPlaceholder("Enter your name").fill("Charlie");
    await page3.getByRole("button", { name: JOIN_BUTTON }).click();
    await expect(page3.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });
    await expect(page3.getByText("Charlie")).toBeVisible();
  });

  test("shows error when joining a game in reveal phase", async ({ page, context }) => {
    // Player 1 creates game
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    const gameUrl = new URL(page.url());
    const gamePath = gameUrl.pathname;

    // Player 2 joins
    const page2 = await context.newPage();
    await page2.goto(gamePath);
    await page2.getByPlaceholder("Enter your name").fill("Bob");
    await page2.getByRole("button", { name: JOIN_BUTTON }).click();
    await expect(page2.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    // Select tiles
    const canvas1 = page.locator("canvas");
    const box1 = await canvas1.boundingBox();
    if (!box1) throw new Error("Canvas not found");
    await canvas1.click({ position: { x: box1.width / 2, y: box1.height / 2 } });
    const canvas2 = page2.locator("canvas");
    const box2 = await canvas2.boundingBox();
    if (!box2) throw new Error("Canvas not found");
    await canvas2.click({ position: { x: box2.width / 2 + 60, y: box2.height / 2 } });

    // Both lock in — auto-reveals
    await page.getByRole("button", { name: "Lock In" }).click();
    await page2.getByRole("button", { name: "Lock In" }).click();
    await expect(page.getByText(REVEAL_HEADING)).toBeVisible({ timeout: 5000 });

    // Player 3 tries to join during reveal — should see error
    const page3 = await context.newPage();
    await page3.goto(gamePath);
    await page3.getByPlaceholder("Enter your name").fill("Charlie");
    await page3.getByRole("button", { name: JOIN_BUTTON }).click();
    await expect(page3.getByText("Cannot join during reveal phase")).toBeVisible({ timeout: 5000 });
    await expect(page3.getByText("Back to home")).toBeVisible();
  });

  test("two players can join the same game", async ({ page, context }) => {
    // Player 1 creates the game from home
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText(SELECTING_HEADING)).toBeVisible({ timeout: 5000 });

    // Grab the game URL (without the ?name= param)
    const gameUrl = new URL(page.url());
    const gamePath = gameUrl.pathname;

    // Player 2 opens the shared link
    const page2 = await context.newPage();
    await page2.goto(gamePath);
    await expect(page2.getByRole("heading", { name: JOIN_HEADING })).toBeVisible();
    await page2.getByPlaceholder("Enter your name").fill("Bob");
    await page2.getByRole("button", { name: JOIN_BUTTON }).click();

    // Both players should see each other
    await expect(page.getByText("Bob")).toBeVisible({ timeout: 5000 });
    await expect(page2.getByText("Alice")).toBeVisible({ timeout: 5000 });
  });
});
