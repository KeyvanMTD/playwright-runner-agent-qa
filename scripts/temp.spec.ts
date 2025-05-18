import { test, expect } from "@playwright/test";

const site = "example.com";

test("basic test", async ({ page }) => {
  await page.goto(`https://${site}`);
  const title = await page.title();
  expect(title).toContain("Example");
});
