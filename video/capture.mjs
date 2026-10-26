import { chromium } from "../web/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const base = "http://127.0.0.1:3000";
const out = fileURLToPath(new URL("./public/captures/", import.meta.url));
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const creator = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const teammate = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const errors = [];

async function snap(page, name, selectors = []) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const layout = await page.evaluate((selectors) => {
    const parts = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const box = element.getBoundingClientRect();
      parts[selector] = { x: box.x + scrollX, y: box.y + scrollY, w: box.width, h: box.height };
    }
    return { pageH: document.documentElement.scrollHeight, scrollY, viewport: { w: innerWidth, h: innerHeight }, parts };
  }, selectors);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
  await writeFile(join(out, `${name}.json`), JSON.stringify(layout, null, 2));
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.screenshot({ path: join(out, `${name}-${selector.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png`) });
    }
  }
  console.log(`captured ${name}`);
}

async function replaceCode(page, code) {
  const fallback = page.getByRole("textbox", { name: "JavaScript solution" });
  if (await fallback.isVisible().catch(() => false)) return fallback.fill(code);
  const monaco = page.locator(".monaco-editor").first();
  await monaco.waitFor({ state: "visible", timeout: 20000 });
  await monaco.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
}

async function visitRole(page, companyUrl, roleName, roleId, topic) {
  await page.goto(companyUrl);
  await page.getByRole("button", { name: new RegExp(roleName) }).click();
  await page.getByRole("button", { name: /Start with/ }).click();
  await page.waitForURL(new RegExp(`/role/${roleId}$`), { timeout: 30000 });
  await page.getByLabel("Your focus").fill(topic);
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await page.getByText("Sources behind this task").waitFor({ timeout: 35000 });
  await snap(page, `role-${roleId}`, [".code-split-grid", "main"]);
}

try {
  const pdfPage = await creator.newPage();
  await pdfPage.setContent(`<!doctype html><html><head><style>body{font-family:Arial,sans-serif;color:#213731;margin:64px}h1{color:#245846;font-size:28px}p{font-size:16px;line-height:1.7;max-width:650px}</style></head><body><h1>Study notes: request batching</h1><p>When a downstream worker has limited capacity, one exercise is to group incoming requests into consecutive batches. Keep the original arrival order and ensure that no batch exceeds the worker's capacity.</p><p>For example, five requests and a capacity of two become three batches: the first two requests, the next two requests, and the final single request. Consider an empty queue and a capacity of zero. Batching is a small programming exercise; diagnosing a real overload also requires measurements and operational safeguards.</p></body></html>`);
  const pdfPath = fileURLToPath(new URL("./study-notes.pdf", import.meta.url));
  await pdfPage.pdf({ path: pdfPath, format: "A4", printBackground: true });
  await pdfPage.close();
  console.log("created fictional study PDF");

  await creator.route("**/api/company", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    await route.continue({ postData: JSON.stringify({ ...body, mode: "fixture" }), headers: { ...route.request().headers(), "content-type": "application/json" } });
  });
  const first = await creator.newPage();
  first.on("pageerror", (error) => errors.push(error.message));
  await first.goto(base);
  await first.getByRole("heading", { name: /Build a company/ }).waitFor();
  await snap(first, "01-create", [".company-carousel", ".company-create-form"]);
  await first.getByRole("button", { name: "Software studio" }).click();
  await first.getByRole("group", { name: "Participants" }).getByRole("button", { name: "Two students" }).click();
  await first.getByRole("group", { name: "Experience" }).getByRole("button", { name: "Real world" }).click();
  await first.getByRole("group", { name: "Company stage" }).getByRole("button", { name: "Mature" }).click();
  await first.getByRole("textbox", { name: "Your name" }).fill("Alex");
  await snap(first, "02-software-selected", [".company-carousel", ".company-create-form"]);
  await first.getByRole("button", { name: /Enter your company/ }).click();
  await first.waitForURL(/\/company\/[^/]+$/, { timeout: 45000 });
  const companyUrl = first.url();
  await first.getByRole("heading", { name: "A company in motion" }).waitFor({ timeout: 30000 });
  await snap(first, "03-office", [".office-stage", ".team-panel", ".stage2-activity"]);
  await first.locator(".stage2-event").first().waitFor({ timeout: 20000 });
  await snap(first, "04-events", [".stage2-activity", ".stage2-message-list"]);

  await first.getByRole("button", { name: /Software engineer/ }).click();
  await first.getByRole("button", { name: /Start with/ }).click();
  await first.waitForURL(/\/role\/software-engineer$/, { timeout: 30000 });
  await first.getByRole("button", { name: "Add your learning material" }).click();
  await first.locator('input[type="file"]').setInputFiles(pdfPath);
  await snap(first, "05-pdf-upload", ["#material-panel"]);
  await first.getByRole("button", { name: "Add material", exact: true }).click();
  await first.getByText(/source passages.*indexed for retrieval|source passages.*saved locally/).waitFor({ timeout: 35000 });
  await snap(first, "06-pdf-added", ["main"]);
  await first.getByLabel("Your focus").fill("handle an overloaded request queue");
  await first.getByRole("button", { name: "Teach me first" }).click();
  await first.getByText("Sources behind this task").waitFor({ timeout: 35000 });
  await first.getByText("study-notes.pdf").first().waitFor({ timeout: 15000 });
  await snap(first, "07-lesson-task", [".code-split-grid", ".coach-launcher"]);
  await first.getByRole("button", { name: "Run checks" }).click();
  await first.getByText(/\d of 4 checks passed/).waitFor({ timeout: 15000 });
  await snap(first, "08-code-fail", [".code-split-grid"]);
  await first.getByRole("button", { name: /Submit for review/ }).click();
  await first.getByText("Attempt 1 feedback").waitFor({ timeout: 35000 });
  await snap(first, "09-feedback-first", [".code-split-grid"]);
  await replaceCode(first, "function batchRequests(requests, batchSize) {\n  if (batchSize <= 0) return [];\n  const batches = [];\n  for (let i = 0; i < requests.length; i += batchSize) {\n    batches.push(requests.slice(i, i + batchSize));\n  }\n  return batches;\n}");
  await first.getByRole("button", { name: "Run checks" }).click();
  await first.getByText("4 of 4 checks passed").waitFor({ timeout: 15000 });
  await snap(first, "10-code-pass", [".code-split-grid"]);
  await first.getByRole("button", { name: /Submit attempt 2/ }).click();
  await first.getByText("Attempt 2 feedback").waitFor({ timeout: 35000 });
  await snap(first, "11-feedback-revised", [".code-split-grid"]);

  for (const [roleName, roleId, topic] of [
    ["Sales & marketing", "sales-marketing", "discover customer needs for a new product"],
    ["Customer support", "customer-support", "clarify a customer issue and next step"],
    ["Product manager", "product-manager", "prioritize a feature with acceptance criteria"],
    ["Data analyst", "data-analyst", "explain the trend in customer requests"],
  ]) await visitRole(first, companyUrl, roleName, roleId, topic);

  await first.goto(companyUrl);
  const companyId = companyUrl.split("/").at(-1);
  const inviteToken = await first.evaluate((id) => localStorage.getItem(`hacktx:invite:${id}`), companyId);
  if (!inviteToken) throw new Error("Missing fixture company invite token");
  const second = await teammate.newPage();
  second.on("pageerror", (error) => errors.push(error.message));
  await second.goto(`${base}/join/${companyId}?invite=${encodeURIComponent(inviteToken)}`);
  await second.getByRole("textbox", { name: "Your name" }).fill("Sam");
  await snap(second, "16-invite", ["main"]);
  await second.getByRole("button", { name: "Enter workplace" }).click();
  await second.waitForURL(new RegExp(`/company/${companyId}$`), { timeout: 30000 });
  await second.getByText("2 / 2 here").waitFor({ timeout: 30000 });
  await snap(second, "17-teammate", [".office-stage", ".stage2-activity"]);
  await first.locator(".team-panel").getByRole("button", { name: /Customer support/ }).click();
  await first.getByRole("combobox", { name: "Message type" }).selectOption("prd");
  await first.getByRole("textbox", { name: "Shared team message" }).fill("A customer cannot see whether a request reached the workflow. We need a clear request status and a way to check it without submitting the same request twice.");
  await first.getByRole("button", { name: "Send to team" }).click();
  await second.getByText(/A customer cannot see whether a request/).waitFor({ timeout: 18000 });
  await snap(first, "18-support-brief", [".stage2-message-list", ".stage2-activity"]);
  await second.getByRole("combobox", { name: "Message type" }).selectOption("clarification");
  await second.getByRole("textbox", { name: "Shared team message" }).fill("Can support confirm whether there is a request ID or only the customer's submission time?");
  await second.getByRole("button", { name: "Send to team" }).click();
  await first.getByText(/Can support confirm whether there is a request ID/).waitFor({ timeout: 18000 });
  await snap(second, "19-engineering-question", [".stage2-message-list", ".stage2-activity"]);
  await second.getByRole("button", { name: "Pause for task" }).click();
  await second.getByText("Company paused").waitFor({ timeout: 35000 });
  await snap(second, "20-paused", [".stage2-activity", ".stage2-message-list"]);
  await writeFile(join(out, "capture-report.json"), JSON.stringify({ companyUrl, errors, files: 20 }, null, 2));
  if (errors.length) console.warn("page errors", errors);
} finally {
  await creator.close();
  await teammate.close();
  await browser.close();
}
