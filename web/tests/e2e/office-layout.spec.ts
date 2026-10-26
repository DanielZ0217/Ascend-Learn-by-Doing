import { expect, test } from "@playwright/test";

test("coworker expansion keeps the 3D workplace frame stable", async ({ page }, testInfo) => {
  await page.route("**/api/company", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.continue({
      postData: JSON.stringify({ ...body, mode: "fixture" }),
      headers: { ...route.request().headers(), "content-type": "application/json" },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Software studio" }).click();
  await page.getByRole("button", { name: /Enter your company/ }).click();
  await expect(page).toHaveURL(/\/company\/[^/]+$/, { timeout: 30_000 });

  const stage = page.locator(".stage-scene");
  const before = await stage.boundingBox();
  expect(before).not.toBeNull();

  const analyst = page.getByRole("button", { name: /Data analyst/ });
  await analyst.hover();
  await expect(analyst).toHaveClass(/active/);
  await page.waitForTimeout(450);

  const after = await stage.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.screenshot({ path: testInfo.outputPath("software-office-data-analyst.png"), fullPage: true });
});
