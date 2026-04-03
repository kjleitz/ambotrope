import { test, expect } from "@playwright/test";

test("ink theme: buttons have thin borders, panels have thick borders", async ({ page }) => {
  await page.goto("/");

  // Set ink theme
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "ink");
  });

  // Wait for styles to apply
  await page.waitForTimeout(100);

  // Check a button's border width
  const createButton = page.locator("button", { hasText: "Create New Game" });
  const buttonBorder = await createButton.evaluate((el) =>
    getComputedStyle(el).borderWidth
  );
  console.log("Button border-width:", buttonBorder);

  // Check the main card panel's border width (the parent div with .border)
  const card = page.locator("div.border.border-border").first();
  const cardBorder = await card.evaluate((el) =>
    getComputedStyle(el).borderWidth
  );
  console.log("Card border-width:", cardBorder);

  // Check an input's border width
  const input = page.locator("input").first();
  const inputBorder = await input.evaluate((el) =>
    getComputedStyle(el).borderWidth
  );
  console.log("Input border-width:", inputBorder);

  // Buttons and inputs should be thin (2px)
  expect(buttonBorder).toBe("2px");
  expect(inputBorder).toBe("2px");

  // Card panels should be thick (16px)
  expect(cardBorder).toBe("16px");
});
