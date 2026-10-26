import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const output = "../docs/screenshots";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const profiles = [
  ["software-engineer", "Maya Chen", "Software engineer"],
  ["sales-marketing", "Jordan Lee", "Sales & marketing"],
  ["customer-support", "Amira Patel", "Customer support"],
  ["product-manager", "Elliot Brooks", "Product manager"],
  ["data-analyst", "Priya Shah", "Data analyst"],
].map(([roleId, name, title]) => ({ roleId, name, title, responsibility: "Helps the company serve its customers.", coachingStyle: "Gives practical feedback.", evaluationFocus: ["Accuracy"], starterTopics: ["A workplace task"] }));
const presets = [
  ["software", "Aperture Studio"],
  ["bank", "Northstar Bank"],
  ["restaurant", "Sora Table"],
  ["semiconductor", "Mesa Micro"],
  ["custom", "Lumen Works"],
];
const results = [];
for (const [preset, name] of presets) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(({ preset, name, profiles }) => {
    const id = `office-preview-${preset}`;
    localStorage.setItem(`hacktx:company:${id}`, JSON.stringify({
      company: { id, preset, name, industry: name, description: `A miniature workplace for ${name}.`, products: ["A useful product"], customerContext: "Customers need clear support.", employeeCount: 28, customerCount: 1200, roleIds: profiles.map((person) => person.roleId) },
      scenario: "The team is preparing for a busy day.", profiles,
    }));
    localStorage.setItem(`hacktx:company-mode:${id}`, "fixture");
  }, { preset, name, profiles });
  await page.goto(`${base}/company/office-preview-${preset}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator(".stage-scene canvas").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator(".team-panel button").count() >= 5, true);
  assert.deepEqual(errors, [], `${preset} page errors`);
  await page.screenshot({ path: `${output}/office-integrated-${preset}.png`, fullPage: true });
  results.push({ preset, canvas: await page.locator(".stage-scene canvas").boundingBox(), errors });
  if (preset === "software") {
    await page.mouse.click(325, 525);
    assert.equal(await page.getByRole("button", { name: /Software engineer/ }).getAttribute("aria-pressed"), "true", "clicking the 3D coworker did not select the role");
    const stage = await page.locator(".stage-scene").boundingBox();
    await page.getByRole("button", { name: /Data analyst/ }).hover();
    await page.waitForTimeout(400);
    const after = await page.locator(".stage-scene").boundingBox();
    assert(Math.abs(after.height - stage.height) < 1, "team expansion resized 3D stage");
    await page.getByRole("button", { name: /Sales & marketing/ }).click();
    await page.getByText("Your customer has arrived in the meeting room.").waitFor({ timeout: 6000 });
    await page.screenshot({ path: `${output}/office-integrated-meeting.png`, fullPage: true });
    const canvas = await page.locator(".stage-scene canvas").boundingBox();
    await page.mouse.move(canvas.x + canvas.width * .4, canvas.y + 80);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .7, canvas.y + 80, { steps: 12 });
    await page.mouse.up();
    await page.screenshot({ path: `${output}/office-integrated-orbit.png`, fullPage: true });
    await page.mouse.move(canvas.x + canvas.width * .38, canvas.y + 80);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * .82, canvas.y + 80, { steps: 12 });
    await page.mouse.up();
    await page.screenshot({ path: `${output}/office-integrated-back-orbit.png`, fullPage: true });
    await page.getByRole("button", { name: "Reset view" }).click();
    assert.match(await page.locator(".stage-bottom span").first().innerText(), /VIEW 43°/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "mobile page overflows");
    await page.screenshot({ path: `${output}/office-integrated-mobile.png`, fullPage: true });
  }
  await page.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
