import { test, expect } from "@playwright/test";

test("two students preview roles, start a shared Practice task, and hand off a reviewed brief", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  test.setTimeout(150000);
  const creator = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const teammate = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  try {
    await creator.route("**/api/company", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }),
        headers: { ...route.request().headers(), "content-type": "application/json" } });
    });
    const first = await creator.newPage();
    first.on("pageerror", (error) => errors.push(error.message));
    await first.goto("/");
    await first.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Up to 5 students" }).click();
    await first.getByRole("textbox", { name: "Your name" }).fill("Alex");
    await first.getByRole("button", { name: /Enter your company/ }).click();
    await expect(first).toHaveURL(/\/company\/[^/]+$/, { timeout: 45000 });
    await expect(first.getByRole("heading", { name: "Take a team task" })).toBeVisible({ timeout: 30000 });
    const companyId = first.url().split("/").at(-1)!;
    const state = await (await creator.request.get(`/api/stage2?companyId=${companyId}`)).json() as { joinCode: string };

    const second = await teammate.newPage();
    second.on("pageerror", (error) => errors.push(error.message));
    await second.goto("/join");
    await second.getByRole("textbox", { name: "Company code" }).fill(state.joinCode);
    await second.getByRole("textbox", { name: "Name for the team" }).fill("Sam");
    await second.getByRole("button", { name: "Join company" }).click();
    await expect(second).toHaveURL(new RegExp(`/company/${companyId}$`), { timeout: 30000 });
    await expect(first.getByText("2 / 5 here")).toBeVisible({ timeout: 15000 });

    await first.getByRole("button", { name: "Take team task" }).click();
    await expect(first.getByText("PREVIEW · 2 STUDENTS")).toBeVisible();
    await first.getByLabel("Your role for this team task").selectOption("customer-support");
    await second.getByLabel("Your role for this team task").selectOption("software-engineer");
    await expect(first.getByRole("button", { name: "Start team task" })).toBeEnabled({ timeout: 15000 });
    await first.getByRole("button", { name: "Start team task" }).click();
    await expect(first.locator(".stage2-practice-part")).toHaveCount(2);
    await expect(second.locator(".stage2-practice-part")).toHaveCount(2, { timeout: 15000 });
    await first.screenshot({ path: testInfo.outputPath("team-practice-board.png"), fullPage: true });

    await first.locator(".stage2-practice-part").first().getByRole("button", { name: "Open my part" }).click();
    await expect(first).toHaveURL(/\/role\/customer-support$/);
    await expect(first.getByRole("heading", { name: "Write the customer problem brief" })).toBeVisible();
    await first.locator("#written-response").fill("A customer reported two confirmations after retrying one bank transfer. We have observed duplicate notices, but have not yet confirmed duplicate transfers. The feature should show one trustworthy status per transfer ID. Engineering should preserve the first event in arrival order, check empty input and retries, and keep the original records unchanged. Support will tell the customer what we know and what still needs investigation.");
    await first.getByRole("button", { name: /Submit for review/ }).click();
    await expect(first.getByText(/Review ready/)).toBeVisible({ timeout: 30000 });
    await first.getByRole("button", { name: "Open team workspace" }).click();
    await expect(first.locator(".stage2-practice-part").first()).toContainText("REVIEWED", { timeout: 15000 });
    await expect(second.locator(".stage2-practice-part").first()).toContainText("REVIEWED", { timeout: 15000 });
    await second.locator(".stage2-practice-part").first().getByText("Read reviewed handoff").click();
    await expect(second.locator(".stage2-practice-part").first()).toContainText("one trustworthy status per transfer ID");
    await first.goto(`/company/${companyId}`);
    await first.getByRole("button", { name: "Restart demo" }).click();
    const confirm = first.getByRole("dialog", { name: /Start .* fresh\?/ });
    await expect(confirm).toContainText("team assignment and every part");
    await confirm.getByRole("button", { name: "Restart demo" }).click();
    await expect(first.getByRole("heading", { name: "Take a team task" })).toBeVisible({ timeout: 30000 });
    const resetState = await first.evaluate(async (id) => (await fetch(`/api/stage2?companyId=${id}`)).json() as Promise<{ practiceTask: unknown; joinCode: string }>, companyId);
    expect(resetState.practiceTask).toBeNull();
    expect(resetState.joinCode).not.toBe(state.joinCode);
    expect(await first.evaluate((id) => localStorage.getItem(`hacktx:session:${id}`), companyId)).toBeNull();
    await expect(second).toHaveURL("/", { timeout: 20000 });
    expect(errors).toEqual([]);
  } finally {
    await creator.close();
    await teammate.close();
  }
});
