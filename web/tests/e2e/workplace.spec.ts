import { test, expect } from "@playwright/test";

test("company to role to sourced task works at demo sizes", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/company", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.continue({
      postData: JSON.stringify({ ...body, mode: "fixture" }),
      headers: { ...route.request().headers(), "content-type": "application/json" },
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build a company/ })).toBeVisible();
  await page.getByRole("button", { name: /Enter your company/ }).click();
  await expect(page).toHaveURL(/\/company\/[^/]+$/, { timeout: 30000 });
  const companyUrl = page.url();
  await expect(page.getByText("DEMO COMPANY")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Choose a coworker" }).getByRole("button")).toHaveCount(5);

  const engineer = page.getByRole("button", { name: /Software engineer/ });
  const sales = page.getByRole("button", { name: /Sales & marketing/ });
  const cursorBefore = await page.locator(".team-selection-cursor").boundingBox();
  await sales.hover();
  await expect(sales).toHaveClass(/active/);
  await expect.poll(async () => {
    const cursorAfter = await page.locator(".team-selection-cursor").boundingBox();
    return cursorBefore && cursorAfter ? cursorAfter.y - cursorBefore.y : 0;
  }).toBeGreaterThan(20);
  await engineer.focus();
  await page.keyboard.press("ArrowDown");
  await expect(sales).toHaveClass(/active/);
  await page.keyboard.press("ArrowUp");
  await expect(engineer).toHaveClass(/active/);
  await page.getByRole("button", { name: /Software engineer/ }).click();
  await expect(engineer).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("office.png"), fullPage: true });
  await page.locator(".stage-scene canvas").scrollIntoViewIfNeeded();
  const stage = await page.locator(".stage-scene canvas").boundingBox();
  expect(stage).not.toBeNull();
  if (stage) {
    const view = page.locator(".stage-bottom span").first();
    await page.mouse.move(stage.x + stage.width * .42, stage.y + 70);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * .76, stage.y + 70, { steps: 14 });
    await page.mouse.up();
    await expect(view).not.toContainText("VIEW 43°");
    await page.screenshot({ path: testInfo.outputPath("office-orbit.png"), fullPage: true });
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(view).toContainText("VIEW 43°", { timeout: 5000 });
  }
  await page.getByRole("button", { name: /Start with/ }).click();
  await expect(page).toHaveURL(/\/role\/software-engineer$/, { timeout: 30000 });
  await page.getByLabel("Your focus").fill("Deduplicate payment events efficiently");
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await expect(page.getByText("Stop duplicate transactions")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Sources behind this task")).toBeVisible();
  await expect(page.getByText("Demo fixture:")).toBeVisible();
  const passageButton = page.getByRole("button", { name: "View passage" }).first();
  await passageButton.click();
  await expect(page.getByRole("dialog", { name: /.+/ })).toContainText(/SOURCE/);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(passageButton).toBeFocused();
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Run checks" }).click();
  await expect(page.getByText(/\d of 3 checks passed/)).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("workplace.png"), fullPage: true });

  const health = await page.request.get("/api/health");
  expect(health.status()).toBe(200);
  const status = await health.json();
  expect(status.status).toBe("ok");
  expect(JSON.stringify(status)).not.toMatch(/META_API_KEY|SERPAPI_API_KEY|NEO4J_PASSWORD/);
  await page.getByRole("link", { name: "Office", exact: true }).click();
  await expect(page).toHaveURL(companyUrl, { timeout: 30000 });
  await page.getByRole("button", { name: /Sales & marketing/ }).click();
  await expect(page.getByText("Your customer has arrived in the meeting room.")).toBeVisible({ timeout: 6000 });
  await page.screenshot({ path: testInfo.outputPath("office-meeting.png"), fullPage: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(companyUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".stage2-mobile-thread-trigger")).toBeVisible({ timeout: 15000 });
  await page.locator(".stage2-mobile-thread-trigger").click();
  await expect(page.getByRole("dialog", { name: "Team conversation" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".stage2-mobile-thread-trigger")).toBeFocused();
  const support = page.getByRole("button", { name: /Customer support/ });
  await support.focus();
  await page.keyboard.press("Enter");
  await expect(support).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("office-mobile.png"), fullPage: true });
  expect(await support.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThan(.001);
  await page.getByRole("button", { name: /Start with/ }).click();
  await expect(page).toHaveURL(/\/role\/customer-support$/, { timeout: 30000 });
  const roleHeading = page.getByRole("heading", { level: 1 });
  await expect(roleHeading).toBeVisible();
  expect((await roleHeading.boundingBox())?.width ?? 0).toBeGreaterThan(180);
  await expect(page.getByText("Ask Amira")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("workspace-mobile.png") });
  for (const [name, path] of [["Product manager", "product-manager"], ["Data analyst", "data-analyst"]] as const) {
    await page.goto(companyUrl);
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.getByRole("button", { name: /Start with/ }).click();
    await expect(page).toHaveURL(new RegExp(`/role/${path}$`), { timeout: 30000 });
  }
  expect(pageErrors).toEqual([]);
});

test("touch selection works when WebGL is unavailable", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  try {
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: function (type: string, options?: unknown) {
        if (type === "webgl" || type === "webgl2") return null;
        return getContext.call(this, type as "2d", options as CanvasRenderingContext2DSettings);
      } });
    });
    await context.route("**/api/company", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }), headers: { ...route.request().headers(), "content-type": "application/json" } });
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /Enter your company/ }).tap();
    await expect(page).toHaveURL(/\/company\/[^/]+$/, { timeout: 30000 });
    await expect(page.getByRole("img", { name: /Illustration of a connected workplace/ })).toBeVisible();
    const sales = page.getByRole("button", { name: /Sales & marketing/ });
    await sales.tap();
    await expect(sales).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Start with/ }).tap();
    await expect(page).toHaveURL(/\/role\/sales-marketing$/, { timeout: 30000 });
  } finally {
    await context.close();
  }
});

test("touch drag rotates the live office", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    await context.route("**/api/company", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }), headers: { ...route.request().headers(), "content-type": "application/json" } });
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /Enter your company/ }).tap();
    await expect(page).toHaveURL(/\/company\/[^/]+$/, { timeout: 30000 });
    const stage = await page.locator(".stage-scene canvas").boundingBox();
    expect(stage).not.toBeNull();
    if (!stage) return;
    await expect.poll(() => page.locator(".stage-scene canvas").evaluate((canvas) => getComputedStyle(canvas).touchAction)).toBe("none");
    await page.waitForTimeout(350);
    const client = await context.newCDPSession(page);
    const y = Math.round(stage.y + 65);
    const x = Math.round(stage.x + 70);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, radiusX: 1, radiusY: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + step * 24, y, radiusX: 1, radiusY: 1 }] });
      await page.waitForTimeout(20);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.screenshot({ path: testInfo.outputPath("touch-orbit.png"), fullPage: true });
    await expect(page.locator(".stage-bottom span").first()).not.toContainText("VIEW 43°");
    await page.getByRole("button", { name: "Reset view" }).tap();
    await expect(page.locator(".stage-bottom span").first()).toContainText("VIEW 43°", { timeout: 5000 });
  } finally {
    await context.close();
  }
});
