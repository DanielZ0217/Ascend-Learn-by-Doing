import { test, expect } from "@playwright/test";

test("two students share a company event, PRD, pause task, and reviewed implementation", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  test.setTimeout(240000);
  const creator = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const teammate = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageErrors: string[] = [];
  try {
    await creator.route("**/api/company", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }),
        headers: { ...route.request().headers(), "content-type": "application/json" } });
    });
    const first = await creator.newPage();
    first.on("pageerror", (error) => pageErrors.push(error.message));
    await first.goto("/");
    await first.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Up to 5 students" }).click();
    await first.getByRole("group", { name: "Experience" }).getByRole("button", { name: "Real world" }).click();
    await first.getByRole("group", { name: "Company stage" }).getByRole("button", { name: "Mature" }).click();
    await first.getByRole("textbox", { name: "Your name" }).fill("Alex");
    await first.getByRole("button", { name: /Enter your company/ }).click();
    await expect(first).toHaveURL(/\/company\/[^/]+$/, { timeout: 45000 });
    await expect(first.getByRole("heading", { name: "A company in motion" })).toBeVisible({ timeout: 30000 });
    await expect(first.getByRole("combobox", { name: "AI coworker" }).locator("option")).toHaveCount(5);
    await expect(first.locator(".stage2-event")).toHaveCount(1);
    const eventButton = first.getByRole("button", { name: "View event" }).first();
    await eventButton.click();
    await expect(first.getByRole("dialog")).toContainText(/Simulated outcome/i);
    await first.getByRole("button", { name: "Close details" }).click();
    await expect(eventButton).toBeFocused();
    const companyId = first.url().split("/").at(-1)!;
    const inviteToken = await first.evaluate((id) => localStorage.getItem(`hacktx:invite:${id}`), companyId);
    expect(inviteToken).toBeTruthy();

    const second = await teammate.newPage();
    second.on("pageerror", (error) => pageErrors.push(error.message));
    await second.goto(`/join/${companyId}?invite=${encodeURIComponent(inviteToken!)}`);
    await second.getByRole("textbox", { name: "Your name" }).fill("Sam");
    await second.getByRole("button", { name: "Enter workplace" }).click();
    await expect(second).toHaveURL(new RegExp(`/company/${companyId}$`), { timeout: 30000 });
    await expect(second.getByText("2 / 5 here")).toBeVisible({ timeout: 30000 });
    await expect(first.getByText("2 / 5 here")).toBeVisible({ timeout: 15000 });

    await first.locator(".team-panel").getByRole("button", { name: /Customer support/ }).click();
    await first.getByRole("combobox", { name: "Message type" }).selectOption("prd");
    await first.getByRole("textbox", { name: "Shared team message" }).fill("A customer saw two payment notices for one transfer. We need to determine whether the transfer itself was duplicated. Please make retries safe and show a clear status.");
    await first.getByRole("button", { name: "Send to team" }).click();
    await expect(first.locator(".stage2-challenge li").first()).toHaveAttribute("data-complete", "true");
    await expect(second.getByText(/A customer saw two payment notices/)).toBeVisible({ timeout: 12000 });
    await second.getByRole("button", { name: "Open PRD" }).click();
    await expect(second.getByRole("dialog", { name: "Customer problem brief" })).toContainText("make retries safe");
    await second.keyboard.press("Escape");
    await expect(second.getByRole("dialog", { name: "Customer problem brief" })).not.toBeVisible();
    await second.getByRole("button", { name: "Open PRD" }).click();
    await second.getByRole("button", { name: "Close artifact" }).click();
    await second.getByRole("combobox", { name: "Message type" }).selectOption("clarification");
    await second.getByRole("textbox", { name: "Shared team message" }).fill("Can support confirm whether one transaction ID or two were recorded?");
    await second.getByRole("button", { name: "Send to team" }).click();
    await expect(first.getByText(/Can support confirm whether one transaction ID/)).toBeVisible({ timeout: 12000 });
    await first.getByRole("combobox", { name: "Message type" }).selectOption("clarification");
    await first.getByRole("textbox", { name: "Shared team message" }).fill("Only one transaction ID is confirmed so far; the second notice still needs investigation.");
    await first.getByRole("button", { name: "Send to team" }).click();
    await expect(second.getByText(/Only one transaction ID is confirmed/)).toBeVisible({ timeout: 12000 });

    await second.getByRole("button", { name: "Pause for task" }).click();
    await expect(first.getByText("Company paused")).toBeVisible({ timeout: 30000 });
    await expect(second.getByText("task ready", { exact: false })).toBeVisible({ timeout: 30000 });
    await second.getByRole("button", { name: "Take task" }).click();
    await expect(second).toHaveURL(/\/role\/software-engineer$/, { timeout: 90000 });
    await expect(second.getByRole("button", { name: "Open team workspace" })).toBeVisible();
    await expect(second.locator(".code-split-grid")).toBeVisible();
    await expect(second.getByText("Stop duplicate transactions")).toBeVisible();
    const panels = second.locator(".code-split-grid > section");
    const issue = await panels.nth(0).boundingBox();
    const code = await panels.nth(1).boundingBox();
    expect(issue && code && code.x > issue.x + issue.width * .75).toBe(true);
    expect(code && issue && code.width > issue.width).toBe(true);
    expect(issue && issue.y < 900).toBe(true);
    await expect(second.getByText("One example")).toBeVisible();
    await expect(second.getByText("Starter code · edit below")).toBeVisible();
    const askCoach = second.getByRole("button", { name: "Ask Maya" });
    await askCoach.click();
    await expect(second.getByRole("dialog", { name: "Ask Maya" })).toBeVisible();
    await second.keyboard.press("Escape");
    await expect(second.getByRole("dialog", { name: "Ask Maya" })).not.toBeVisible();
    await expect(askCoach).toBeFocused();
    await second.getByRole("button", { name: "Run checks" }).click();
    await expect(second.getByText(/\d of 3 checks passed/)).toBeVisible();
    await second.getByRole("button", { name: /Submit for review/ }).click();
    await expect(second.getByText("Attempt 1 feedback")).toBeVisible({ timeout: 30000 });
    await expect(first.getByText(/Submitted attempt 1 for review/)).toBeVisible({ timeout: 15000 });
    const solution = "function dedupeTransactions(records) { const seen = new Set(); return records.filter((record) => { if (seen.has(record.id)) return false; seen.add(record.id); return true; }); }";
    const fallbackEditor = second.getByRole("textbox", { name: "JavaScript solution" });
    if (await fallbackEditor.isVisible()) await fallbackEditor.fill(solution);
    else {
      await second.locator(".monaco-editor").first().click();
      await second.keyboard.press("ControlOrMeta+A");
      await second.keyboard.insertText(solution);
    }
    await second.getByRole("button", { name: "Run checks" }).click();
    await expect(second.getByText("3 of 3 checks passed")).toBeVisible();
    await second.getByRole("button", { name: /Submit attempt 2/ }).click();
    await expect(second.getByText("Attempt 2 feedback")).toBeVisible({ timeout: 30000 });
    await expect(first.getByText(/Completed a reviewed code task/)).toBeVisible({ timeout: 15000 });
    await expect(first.locator(".stage2-challenge li").nth(1)).toHaveAttribute("data-complete", "true");
    await expect.poll(() => first.locator(".stage2-message-list").evaluate((list) => list.scrollHeight - list.scrollTop - list.clientHeight)).toBeLessThan(5);
    await first.getByRole("button", { name: "Resume" }).click();
    await expect(first.getByText("Running", { exact: true })).toBeVisible();
    await first.screenshot({ path: testInfo.outputPath("stage2-company.png"), fullPage: true });
    await second.screenshot({ path: testInfo.outputPath("stage2-engineering.png"), fullPage: true });
    await second.setViewportSize({ width: 390, height: 844 });
    const mobileIssue = await panels.nth(0).boundingBox();
    const mobileCode = await panels.nth(1).boundingBox();
    expect(mobileIssue && mobileCode && mobileCode.y > mobileIssue.y + mobileIssue.height * .75).toBe(true);
    await second.screenshot({ path: testInfo.outputPath("stage2-engineering-mobile.png"), fullPage: true });
    const overflow = await second.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth,
      offenders: [...document.querySelectorAll("*")].filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 8).map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 100), right: Math.round(element.getBoundingClientRect().right) })) }));
    expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(pageErrors).toEqual([]);
  } finally {
    await creator.close();
    await teammate.close();
  }
});
