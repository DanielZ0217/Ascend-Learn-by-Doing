import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const base = process.env.SHOWCASE_URL ?? "http://127.0.0.1:4188/";
const output = new URL("../artifacts/visual-review/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 1 });
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(base);
await page.locator("#scene canvas").waitFor();
await page.waitForTimeout(700);
const states = ["software", "bank", "restaurant", "semiconductor", "creative"];
const scenes = [];
for (const state of states) {
  await page.evaluate((name) => window.__THREE_GAME_TEST_HOOKS__.setState(name), state);
  await page.waitForTimeout(220);
  assert.equal(await page.locator(`#app`).getAttribute("data-office"), state);
  const metrics = await page.evaluate(() => ({
    drawCalls: window.__THREE_GAME_DIAGNOSTICS__.renderer.render.calls,
    triangles: window.__THREE_GAME_DIAGNOSTICS__.renderer.render.triangles,
  }));
  assert(metrics.drawCalls > 0 && metrics.triangles > 0, `${state} did not render`);
  await page.screenshot({ path: fileURLToPath(new URL(`${state}-final.png`, output)) });
  scenes.push({ state, ...metrics, screenshot: `artifacts/visual-review/${state}-final.png` });
}

await page.locator('button[data-office="software"]').click();
await page.locator('button[data-office="software"]').focus();
await page.keyboard.press("ArrowRight");
assert.equal(await page.locator("#app").getAttribute("data-office"), "bank");
await page.locator("#orbit-button").click();
assert.equal(await page.locator("#orbit-button").getAttribute("aria-pressed"), "true");
assert.equal(await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.camera.autoRotate), true);
await page.locator("#orbit-button").click();
const original = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.camera);
await page.locator("#scene canvas").hover({ position: { x: 850, y: 520 } });
await page.mouse.down();
await page.mouse.move(1100, 570, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(500);
const dragged = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.camera);
assert.notDeepEqual(dragged.position, original.position, "drag did not rotate camera");
await page.mouse.wheel(0, -320);
await page.waitForTimeout(350);
const zoomed = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.camera.zoom);
assert(zoomed > original.zoom, "wheel did not zoom camera");
await page.locator("#reset-button").click();
await page.waitForTimeout(500);
const reset = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.camera);
assert(Math.abs(reset.zoom - 1) < .01, "reset did not restore zoom");
assert(reset.position.every((value, index) => Math.abs(value - [17.5, 15.2, 19.5][index]) < .05), "reset did not restore angle");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
mobile.on("pageerror", (error) => errors.push(error.message));
await mobile.goto(base);
await mobile.locator("#scene canvas").waitFor();
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: fileURLToPath(new URL("mobile-final.png", output)) });
const mobileDimensions = await mobile.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  viewportWidth: innerWidth,
  canvasWidth: document.querySelector("#scene canvas").getBoundingClientRect().width,
}));
assert(mobileDimensions.scrollWidth <= mobileDimensions.viewportWidth + 1, "mobile page overflows horizontally");
await mobile.locator('button[data-office="restaurant"]').click();
assert.equal(await mobile.locator("#app").getAttribute("data-office"), "restaurant");
assert.deepEqual(errors, [], "browser page errors occurred");
const result = { base, scenes, mobileDimensions, errors, interactions: ["selection", "keyboard", "orbit", "drag", "zoom", "reset", "mobile selection"] };
await writeFile(new URL("../artifacts/qa-results.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
