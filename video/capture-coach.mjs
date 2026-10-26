import { chromium } from "../web/node_modules/playwright/index.mjs";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("./public/captures/", import.meta.url));
const pdf = fileURLToPath(new URL("./study-notes.pdf", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await context.route("**/api/company", async (route) => {
  const body = JSON.parse(route.request().postData() ?? "{}");
  await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }), headers: { ...route.request().headers(), "content-type": "application/json" } });
});
try {
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await page.getByRole("heading", { name: /Build a company/ }).waitFor();
  await page.getByRole("button", { name: "Software studio" }).click();
  await page.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Up to 5 students" }).click();
  await page.getByRole("group", { name: "Experience" }).getByRole("button", { name: "Real world" }).click();
  await page.getByRole("group", { name: "Company stage" }).getByRole("button", { name: "Mature" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("Alex");
  await page.getByRole("button", { name: /Enter your company/ }).click();
  await page.getByRole("button", { name: /Software engineer/ }).click();
  await page.getByRole("button", { name: /Start with/ }).click();
  await page.getByRole("button", { name: "Add your learning material" }).click();
  await page.locator('input[type="file"]').setInputFiles(pdf);
  await page.getByRole("button", { name: "Add material", exact: true }).click();
  await page.getByText(/source passages.*indexed for retrieval|source passages.*saved locally/).waitFor({ timeout: 35000 });
  await page.getByLabel("Your question or goal").fill("How does request batching help when a worker cannot keep up with incoming traffic?");
  await page.getByRole("button", { name: "Teach me first" }).screenshot({ path: out + "21-teach-option.png" });
  await page.getByRole("button", { name: "Teach me first" }).click();
  await page.locator("#coach-panel").getByText("Coach", { exact: true }).waitFor({ timeout: 45000 });
  await page.locator("#coach-panel").screenshot({ path: out + "22-coach-panel.png" });
  await page.screenshot({ path: out + "22-coach-full.png", fullPage: true });
  console.log("Captured Teach me first and coach response");
} finally {
  await context.close();
  await browser.close();
}
