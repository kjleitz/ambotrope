import { test, expect } from "@playwright/test";

test.describe("blotter page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blotter");
  });

  test("renders a canvas", async ({ page }) => {
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("debug panel is open by default", async ({ page }) => {
    const panel = page.getByTestId("debug-panel");
    await expect(panel).toBeVisible();
  });

  test("debug panel can be toggled", async ({ page }) => {
    const toggle = page.getByTestId("debug-toggle");
    const panel = page.getByTestId("debug-panel");

    // Initially open
    await expect(panel).toBeVisible();

    // Close
    await toggle.click();
    await expect(panel).not.toBeVisible();

    // Reopen
    await toggle.click();
    await expect(panel).toBeVisible();
  });

  test("params box is visible with copyable text", async ({ page }) => {
    const paramsBox = page.getByTestId("params-box");
    await expect(paramsBox).toBeVisible();

    const pre = paramsBox.locator("pre");
    const text = await pre.textContent();
    expect(text).toContain("seed: 1");
    expect(text).toContain("tiles: 19");
    expect(text).toContain("strategy: ink-blot");
    expect(text).toContain("frequencyMin: 1.5");
    expect(text).toContain("frequencyMax: 4");
    expect(text).toContain("centerBias: 0.6");
  });

  test("changing tile count updates params display", async ({ page }) => {
    const slider = page.getByTestId("tile-count-slider");
    await slider.fill("7");

    const pre = page.getByTestId("params-box").locator("pre");
    await expect(pre).toContainText("tiles: 7");
  });

  test("changing seed updates params display", async ({ page }) => {
    const seedInput = page.getByTestId("seed-input");
    await seedInput.fill("42");

    const pre = page.getByTestId("params-box").locator("pre");
    await expect(pre).toContainText("seed: 42");
  });

  test("strategy dropdown changes value", async ({ page }) => {
    const select = page.getByTestId("strategy-select");
    await select.selectOption("noise-bias");

    const pre = page.getByTestId("params-box").locator("pre");
    await expect(pre).toContainText("strategy: noise-bias");
  });

  test("copy button copies params to clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const copyButton = page.getByTestId("copy-params");
    await copyButton.click();

    await expect(copyButton).toHaveText("Copied!");

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("seed: 1");
    expect(clipboardText).toContain("tiles: 19");
  });
});
