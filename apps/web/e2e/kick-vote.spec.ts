import { test, expect, type Page } from "@playwright/test";

async function clickTile(page: Page, offsetX = 0, offsetY = 0) {
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  await canvas.click({ position: { x: box.width / 2 + offsetX, y: box.height / 2 + offsetY } });
}

async function typeWord(page: Page, word: string) {
  await page.getByPlaceholder("Type a word...").fill(word);
  await page.getByRole("button", { name: "Submit" }).click();
}

async function setupThreePlayerGame(page: Page, context: import("@playwright/test").BrowserContext) {
  await page.goto("/");
  await page.getByPlaceholder("Enter your name").fill("Alice");
  await page.getByRole("button", { name: "Create New Game" }).click();
  await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

  const gamePath = new URL(page.url()).pathname;

  const page2 = await context.newPage();
  await page2.goto(gamePath);
  await page2.getByPlaceholder("Enter your name").fill("Bob");
  await page2.getByRole("button", { name: "Join Game" }).click();
  await expect(page2.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

  const page3 = await context.newPage();
  await page3.goto(gamePath);
  await page3.getByPlaceholder("Enter your name").fill("Carol");
  await page3.getByRole("button", { name: "Join Game" }).click();
  await expect(page3.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

  return { alice: page, bob: page2, carol: page3 };
}

test.describe("kick vote", () => {
  test("disconnected player shows disconnected badge", async ({ page, context }) => {
    const { alice, bob, carol } = await setupThreePlayerGame(page, context);

    // Close Bob's connection
    await bob.close();

    // Alice and Carol should see "Disconnected" badge for Bob
    await expect(alice.getByText("Disconnected")).toBeVisible({ timeout: 5000 });
    await expect(carol.getByText("Disconnected")).toBeVisible({ timeout: 5000 });
  });

  test("kick button appears for disconnected player", async ({ page, context }) => {
    const { alice, bob, carol } = await setupThreePlayerGame(page, context);

    await bob.close();

    // Kick button should appear
    await expect(alice.getByRole("button", { name: "Kick" })).toBeVisible({ timeout: 5000 });
  });

  test("initiating kick vote shows vote banner", async ({ page, context }) => {
    const { alice, bob, carol } = await setupThreePlayerGame(page, context);

    await bob.close();
    await expect(alice.getByText("Disconnected")).toBeVisible({ timeout: 5000 });

    // Alice initiates kick
    await alice.getByRole("button", { name: "Kick" }).click();

    // Vote banner should appear for Alice and Carol
    await expect(alice.getByText(/Vote to kick.*Bob/)).toBeVisible({ timeout: 3000 });
    await expect(carol.getByText(/Vote to kick.*Bob/)).toBeVisible({ timeout: 3000 });
  });

  test("unanimous vote kicks the player", async ({ page, context }) => {
    const { alice, bob, carol } = await setupThreePlayerGame(page, context);

    await bob.close();
    await expect(alice.getByText("Disconnected")).toBeVisible({ timeout: 5000 });

    // Alice initiates kick
    await alice.getByRole("button", { name: "Kick" }).click();
    await expect(carol.getByText(/Vote to kick.*Bob/)).toBeVisible({ timeout: 3000 });

    // Carol votes
    await carol.getByRole("button", { name: "Vote to kick" }).click();

    // Bob should be gone from the player list (no player card with "Bob")
    await expect(alice.getByText(/Vote to kick.*Bob/)).not.toBeVisible({ timeout: 5000 });
    await expect(alice.locator(".rounded-lg").filter({ hasText: "Bob" })).not.toBeVisible({ timeout: 5000 });
    await expect(carol.locator(".rounded-lg").filter({ hasText: "Bob" })).not.toBeVisible({ timeout: 5000 });
  });

  test("kick unblocks lock-in when remaining players are locked", async ({ page, context }) => {
    const { alice, bob, carol } = await setupThreePlayerGame(page, context);

    // Alice and Carol select tiles and words and lock in
    await clickTile(alice, 0, 0);
    await typeWord(alice, "batman");
    await clickTile(carol, 60, 0);
    await typeWord(carol, "maraca");
    await alice.getByRole("button", { name: "Lock In" }).click();
    await carol.getByRole("button", { name: "Lock In" }).click();

    // Bob hasn't locked in — game is stuck
    // Now Bob disconnects
    await bob.close();
    await expect(alice.getByText("Disconnected")).toBeVisible({ timeout: 5000 });

    // Alice kicks Bob
    await alice.getByRole("button", { name: "Kick" }).click();

    // Carol votes
    await expect(carol.getByText(/Vote to kick.*Bob/)).toBeVisible({ timeout: 3000 });
    await carol.getByRole("button", { name: "Vote to kick" }).click();

    // Game should auto-reveal since remaining players were already locked in
    await expect(alice.getByText("Results!")).toBeVisible({ timeout: 5000 });
  });
});
