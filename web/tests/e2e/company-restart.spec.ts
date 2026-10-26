import { expect, test } from "@playwright/test";

test("restart keeps the company, clears work, and removes guests", async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "desktop") test.skip();
  test.setTimeout(180_000);
  const creator = await browser.newContext();
  const teammate = await browser.newContext();
  try {
    await creator.route("**/api/company", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }),
        headers: { ...route.request().headers(), "content-type": "application/json" } });
    });
    const first = await creator.newPage();
    await first.goto("/");
    await first.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Up to 5 students" }).click();
    await first.getByRole("textbox", { name: "Your name" }).fill("Alex");
    await first.getByRole("button", { name: /Enter your company/ }).click();
    await expect(first).toHaveURL(/\/company\/[^/]+$/, { timeout: 45_000 });
    const companyId = first.url().split("/").at(-1)!;
    const joinCode = await first.getByRole("button", { name: /Copy company join code/ }).textContent();
    await first.screenshot({ path: testInfo.outputPath("creator-company-code.png"), fullPage: true });
    const second = await teammate.newPage();
    await second.goto("/join");
    await second.screenshot({ path: testInfo.outputPath("join-by-code.png"), fullPage: true });
    await second.getByRole("textbox", { name: "Company code" }).fill(joinCode!.match(/[A-Z2-9]{8}/)![0]);
    await second.getByRole("textbox", { name: "Name for the team" }).fill("Sam");
    await second.getByRole("button", { name: "Join company" }).click();
    await expect(second.getByText("2 / 5 here")).toBeVisible({ timeout: 30_000 });

    const uploaded = await first.evaluate(async (id) => {
      const form = new FormData();
      form.set("companyId", id);
      form.set("roleId", "customer-support");
      form.set("title", "Restart check");
      form.set("text", "A fictional customer has a question about a payment status. The support team should verify the transaction ID before advising the customer and record the resolution.");
      const response = await fetch("/api/materials", { method: "POST", body: form });
      return { status: response.status, body: await response.json() };
    }, companyId);
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.passageCount).toBeGreaterThan(0);

    await first.goto(`/company/${companyId}/role/software-engineer`);
    await first.getByRole("textbox", { name: "Your question or goal" }).fill("Explain network flow with Minecraft examples");
    await first.getByRole("button", { name: /Teach me first/ }).click();
    await first.getByRole("textbox", { name: "Ask your coach" }).fill("From now on, use Minecraft analogies when teaching me.");
    await first.getByRole("button", { name: "Send question to coach" }).click();
    await expect(first.getByRole("button", { name: "Remove learning preference" }).locator("..")).toContainText("Use Minecraft analogies when explaining concepts.");
    await expect(first.getByText(/minecart rails/i)).toBeVisible();
    await first.screenshot({ path: testInfo.outputPath("saved-learning-preference.png") });
    await first.goto(`/company/${companyId}/role/sales-marketing`);
    await expect(first.getByRole("button", { name: "Remove learning preference" }).locator("..")).toContainText("Use Minecraft analogies when explaining concepts.");
    await first.goto(`/company/${companyId}`);

    await first.getByRole("button", { name: "Restart demo" }).click();
    const confirmation = first.getByRole("dialog", { name: /Start .* fresh\?/ });
    await expect(confirmation).toContainText(/learner preferences/i);
    await confirmation.getByRole("button", { name: "Restart demo" }).click();
    await expect(first).toHaveURL(new RegExp(`/company/${companyId}$`), { timeout: 30_000 });
    await expect(second).toHaveURL("/", { timeout: 15_000 });
    const state = await second.request.get(`/api/stage2?companyId=${companyId}`);
    expect(state.status()).toBe(401);
    const preference = await first.evaluate(async (id) => (await fetch(`/api/learner-preference?companyId=${id}`)).json() as Promise<{ style: string | null }>, companyId);
    expect(preference.style).toBeNull();
    await first.screenshot({ path: testInfo.outputPath("restarted-company.png"), fullPage: true });
    expect(await first.evaluate((id) => localStorage.getItem(`hacktx:company:${id}`), companyId)).not.toBeNull();
    expect(await second.evaluate((id) => localStorage.getItem(`hacktx:company:${id}`), companyId)).toBeNull();
  } finally {
    await creator.close();
    await teammate.close();
  }
});
