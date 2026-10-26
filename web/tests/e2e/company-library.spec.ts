import { expect, test } from "@playwright/test";

test("saved companies can be reopened and one can be restarted without deleting the other", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  test.setTimeout(120_000);
  await page.route("**/api/company", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    await route.continue({
      postData: JSON.stringify({ ...body, mode: "fixture" }),
      headers: { ...route.request().headers(), "content-type": "application/json" },
    });
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Build a company/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("company-creation-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("company-creation-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Next company type" }).click();
  await expect(page.getByRole("button", { name: "Modern restaurant" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Previous company type" }).click();
  await expect(page.getByRole("button", { name: "Neighborhood bank" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Neighborhood bank" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: "Modern restaurant" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(7600);
  await expect(page.getByRole("button", { name: "Neighborhood bank" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("textbox", { name: "Company name" }).fill("Northstar Draft");
  await page.getByRole("button", { name: "Next company type" }).click();
  await page.getByRole("button", { name: "Previous company type" }).click();
  await expect(page.getByRole("textbox", { name: "Company name" })).toHaveValue("Northstar Draft");
  await page.getByRole("textbox", { name: "Company name" }).fill("Northstar Bank");
  await page.getByRole("button", { name: /Enter your company/ }).click();
  await expect(page).toHaveURL(/\/company\/[^/]+$/);
  const firstCompany = page.url();

  await page.getByRole("button", { name: /Software engineer/ }).click();
  await page.getByRole("button", { name: /Start with/ }).click();
  await expect(page).toHaveURL(/\/role\/software-engineer$/);
  await page.getByRole("textbox", { name: "Your question or goal" }).fill("Why is Ford–Fulkerson useful for network flow?");
  await page.getByRole("button", { name: /Teach me first/ }).click();
  const lesson = page.getByRole("dialog", { name: "Learn with Maya" });
  await expect(lesson).toBeVisible();
  await expect(lesson.getByText(/source.*payments begin/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("guided-lesson-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("guided-lesson-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await lesson.getByRole("button", { name: "Close coach conversation" }).click();
  await expect(page.getByRole("button", { name: "Resume lesson" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Expand coach conversation" })).toBeFocused();
  await page.getByRole("button", { name: "Resume lesson" }).click();
  await lesson.getByRole("button", { name: /Try the challenge/ }).click();
  await expect(page.getByRole("heading", { name: /safest payment throughput/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "JavaScript solution" })).toHaveValue(/maxFlow\(capacity, source, sink\)/);
  await page.route("**/api/learning", async (route) => {
    const request = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
    if (request.action !== "coach" || request.message !== "Show a Python example") return route.continue();
    const response = await route.fetch();
    const body = await response.json() as { reply: string; turn: { text: string } };
    body.reply = "A small example:\n\n```python\ndef capacity(left, right):\n    return left + right\n```";
    body.turn.text = body.reply;
    await route.fulfill({ response, json: body });
  });
  await page.getByRole("button", { name: "Ask Maya", exact: true }).click();
  await page.getByRole("textbox", { name: "Ask your coach" }).fill("Show a Python example");
  await page.getByRole("button", { name: "Send question to coach" }).click();
  await expect(page.getByRole("button", { name: "Copy python code" })).toBeVisible();
  await page.locator(".coach-code-block").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("coach-code-desktop.png") });
  await page.getByRole("button", { name: "Close coach conversation" }).click();
  await expect(page.getByRole("button", { name: "Back to practice" })).toBeVisible();
  await page.getByRole("link", { name: "My companies" }).first().click();
  await expect(page.getByRole("heading", { name: "Your companies." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Northstar Bank" })).toBeVisible();
  await page.getByRole("link", { name: /Create a company/ }).first().click();
  await page.getByRole("button", { name: "Next company type" }).click();
  await page.getByRole("button", { name: "Next company type" }).click();
  await page.getByRole("button", { name: "Software studio" }).click();
  await page.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Up to 5 students" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Aperture Owner");
  await page.getByRole("button", { name: /Enter your company/ }).click();
  await expect(page).toHaveURL(/\/company\/[^/]+$/);

  await page.getByRole("link", { name: "My companies" }).first().click();
  await expect(page.getByRole("heading", { name: "Northstar Bank" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aperture" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("my-companies-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("my-companies-mobile-menu.png"), fullPage: true });
  await page.getByRole("button", { name: "Close menu" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Northstar Bank" }) }).getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(firstCompany);
  await page.getByRole("button", { name: "Restart demo" }).click();
  await expect(page.getByRole("dialog", { name: "Start Northstar Bank fresh?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep this run" }).click();
  await expect(page.getByRole("dialog", { name: "Start Northstar Bank fresh?" })).not.toBeVisible();
  await page.getByRole("button", { name: "Restart demo" }).click();
  await page.getByRole("dialog", { name: "Start Northstar Bank fresh?" }).getByRole("button", { name: "Restart demo" }).click();
  await expect(page).toHaveURL(firstCompany);
  await page.getByRole("link", { name: "My companies" }).first().click();
  await expect(page.getByRole("heading", { name: "Aperture" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Northstar Bank" })).toBeVisible();
  await page.getByRole("button", { name: "Delete Northstar Bank" }).click();
  await page.getByRole("dialog", { name: "Delete Northstar Bank?" }).getByRole("button", { name: "Delete this company" }).click();
  await expect(page.getByRole("heading", { name: "Northstar Bank" })).toHaveCount(0);
  let expiredOnce = false;
  await page.route("**/api/company/restart", async (route) => {
    if (!expiredOnce) {
      expiredOnce = true;
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "session_expired", message: "Your shared session expired. Rejoin with the invitation." } }) });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Delete Aperture" }).click();
  await expect(page.getByRole("dialog", { name: "Delete Aperture?" })).toBeVisible();
  await page.getByRole("dialog", { name: "Delete Aperture?" }).getByRole("button", { name: "Delete this company" }).click();
  await expect(page.getByRole("heading", { name: /Build a company/ })).toBeVisible();
  expect(expiredOnce).toBe(true);
});
