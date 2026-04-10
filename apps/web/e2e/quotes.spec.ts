import { test, expect } from "@playwright/test";

test.describe("quotes", () => {
  test("home page shows a quote", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("blockquote")).toBeVisible();
    await expect(page.locator("blockquote footer")).toBeVisible();
  });

  test("join page shows a quote", async ({ page, context }) => {
    // Create a game first
    await page.goto("/");
    await page.getByPlaceholder("Enter your name").fill("Alice");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page.getByText("Choose your tile")).toBeVisible({ timeout: 5000 });

    const gameUrl = new URL(page.url());
    const gamePath = gameUrl.pathname;

    // Open the join page
    const page2 = await context.newPage();
    await page2.goto(gamePath);
    await expect(page2.getByRole("heading", { name: "Ambotrope" })).toBeVisible();
    await expect(page2.locator("blockquote")).toBeVisible();
    await expect(page2.locator("blockquote footer")).toBeVisible();
  });
});
