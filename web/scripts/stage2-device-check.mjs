// Keeps one browser participant active while a second physical device joins.
import { chromium } from "@playwright/test";

const base = process.env.STAGE2_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
const context = await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on("pageerror", (error) => console.log(`PAGE_ERROR=${error.message}`));
await context.route("**/api/company", async (route) => {
  const body = JSON.parse(route.request().postData() ?? "{}");
  await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }),
    headers: { ...route.request().headers(), "content-type": "application/json" } });
});

try {
  await page.goto(base);
  await page.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Two students" }).click();
  await page.getByRole("group", { name: "Experience" }).getByRole("button", { name: "Real world" }).click();
  await page.getByRole("group", { name: "Company stage" }).getByRole("button", { name: "Mature" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Host Student");
  await page.getByRole("button", { name: "Enter your company" }).click();
  await page.waitForURL(/\/company\/[^/]+$/, { timeout: 60000 });
  await page.getByRole("heading", { name: "A company in motion" }).waitFor({ timeout: 30000 });
  const companyId = page.url().split("/").at(-1);
  await page.locator(".team-panel").getByRole("button", { name: /Customer support/ }).click();
  await page.getByRole("combobox", { name: "Message type" }).selectOption("prd");
  await page.getByRole("textbox", { name: "Shared team message" }).fill("A customer received two payment notices for one transfer. One transaction ID is confirmed; we need to check whether the second notice reflects a duplicate transaction or only a notification retry. Engineering should make retries safe and keep the first valid record.");
  await page.getByRole("button", { name: "Send to team" }).click();
  await page.getByRole("button", { name: "Open PRD" }).waitFor({ timeout: 15000 });
  const token = await page.evaluate((id) => localStorage.getItem(`hacktx:invite:${id}`), companyId);
  if (!token) throw new Error("The invitation token was not saved in the host browser.");
  console.log(`INVITE_URL=${base}/join/${companyId}?invite=${encodeURIComponent(token)}`);
  console.log("HOST_READY=PRD sent; waiting for the second physical device");
  let previous = "";
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(async (id) => {
      const response = await fetch(`/api/stage2?companyId=${id}`, { cache: "no-store" });
      if (!response.ok) return { error: response.status };
      const data = await response.json();
      return { participants: data.participants.map((item) => item.displayName),
        messages: data.messages.map((item) => ({ author: item.authorName, kind: item.kind, status: item.status })),
        run: data.run?.status, events: data.events.length };
    }, companyId);
    const snapshot = JSON.stringify(state);
    if (snapshot !== previous) { console.log(`STATE=${snapshot}`); previous = snapshot; }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
} finally {
  await browser.close();
}
