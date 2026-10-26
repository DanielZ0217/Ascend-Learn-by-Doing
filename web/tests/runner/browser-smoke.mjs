// Run with a local app server already listening: node tests/runner/browser-smoke.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.RUNNER_BASE_URL ?? "http://127.0.0.1:3000";
const roleIds = ["software-engineer", "sales-marketing", "customer-support", "product-manager", "data-analyst"];
const blueprint = {
  company: { id: "runner-smoke", preset: "bank", name: "Northstar Bank", description: "A digital bank for small businesses.", products: ["Business checking"], customerContext: "Customers need dependable payment processing.", employeeCount: 50, customerCount: 5000, roleIds },
  scenario: "The payment pipeline needs a reliable deduplication step.",
  profiles: roleIds.map((roleId, index) => ({ roleId, name: ["Maya Chen", "Jordan Lee", "Avery Grant", "Quinn Patel", "Riley Brooks"][index], title: roleId, responsibility: "Coach the student through practical work.", coachingStyle: "Clear and patient.", evaluationFocus: ["Accuracy"], starterTopics: [["Prevent duplicate payments"], ["Pitch business checking"], ["Resolve a billing complaint"], ["Prioritize transfer alerts"], ["Explain customer trends"]][index] })),
};

async function replaceCode(page, code) {
  const monaco = page.locator(".monaco-editor").first();
  const fallback = page.getByRole("textbox", { name: "JavaScript solution" });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await monaco.isVisible().catch(() => false)) {
      try {
        await monaco.click({ position: { x: 160, y: 80 }, timeout: 1000 });
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.press("Backspace");
        await page.keyboard.insertText(code);
        return;
      } catch { /* Monaco can remount during development. */ }
    }
    if (await fallback.isVisible().catch(() => false)) {
      await fallback.fill(code);
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error("No code editor became available.");
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const browserIssues = [];
  page.on("pageerror", (error) => browserIssues.push(`page: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") browserIssues.push(`console: ${message.text()}`); });
  await page.addInitScript((value) => {
    if (window !== window.top) return;
    localStorage.setItem("hacktx:company:runner-smoke", JSON.stringify(value));
    localStorage.setItem("hacktx:company-mode:runner-smoke", "fixture");
  }, blueprint);
  await page.goto(`${base}/company/runner-smoke/role/software-engineer`);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `horizontal overflow at ${viewport.width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Prevent duplicate payments" }).click();
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await page.getByRole("heading", { name: /Stop duplicate/ }).waitFor({ timeout: 20000 });

  await page.getByRole("button", { name: "Run checks" }).click();
  await page.getByText("1 of 3 checks passed").waitFor({ timeout: 10000 });
  const correct = `function dedupeTransactions(records) {\n  if (typeof window !== "undefined" || typeof localStorage !== "undefined") throw new Error("app context exposed");\n  const seen = new Set();\n  const result = [];\n  for (const record of records) {\n    if (!seen.has(record.id)) { seen.add(record.id); result.push(record); }\n  }\n  return result;\n}`;
  await replaceCode(page, correct);
  await page.getByRole("button", { name: "Run checks" }).click();
  try { await page.getByText("3 of 3 checks passed").waitFor({ timeout: 10000 }); }
  catch (error) {
    console.log("runner result:", await page.locator("[role=status]").allInnerTexts());
    await page.screenshot({ path: "tests/runner/runner-debug.png", fullPage: true });
    throw error;
  }
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await page.getByText("Attempt 1 feedback").waitFor({ timeout: 20000 });

  let blockedNetworkCalls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/health")) blockedNetworkCalls++; });
  await replaceCode(page, `function dedupeTransactions(records) { fetch("${base}/api/health"); return records; }`);
  await page.getByRole("button", { name: "Run checks" }).click();
  await page.getByText("0 of 3 checks passed").waitFor({ timeout: 10000 });
  assert.equal(blockedNetworkCalls, 0, "student code made a network request");

  await replaceCode(page, "function dedupeTransactions(records) { return records;");
  await page.getByRole("button", { name: "Run checks" }).click();
  await page.getByText("Code could not run").waitFor({ timeout: 10000 });
  assert.match(await page.locator("[role=status]").last().innerText(), /SyntaxError/);

  await replaceCode(page, "function dedupeTransactions(records) { while (true) {} }");
  await page.getByRole("button", { name: "Run checks" }).click();
  await page.getByText("Code timed out").waitFor({ timeout: 10000 });
  assert.match(await page.locator("[role=status]").last().innerText(), /2.5 seconds/);
  await replaceCode(page, correct.replace("  const seen", '  console.log("x".repeat(20000));\n  const seen'));
  await page.getByRole("button", { name: "Run checks" }).click();
  await page.getByText("3 of 3 checks passed").waitFor({ timeout: 10000 });
  assert.ok((await page.locator("[role=status]").last().innerText()).length < 11000, "runner output exceeded its cap");
  await page.getByRole("button", { name: /Submit attempt 2/ }).click();
  await page.getByText("Attempt 2 feedback").waitFor({ timeout: 20000 });
  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Sales & marketing" }).click();
  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Software engineer" }).click();
  await page.getByText("Attempt 2 feedback").waitFor({ timeout: 10000 });
  await page.reload();
  await page.getByText("Attempt 2 feedback").waitFor({ timeout: 10000 });
  await mkdir("tests/runner/artifacts", { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator(".monaco-editor").first().waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "tests/runner/artifacts/engineering-1280.png", fullPage: true });

  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Sales & marketing" }).click();
  await page.getByRole("button", { name: "Pitch business checking" }).click();
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await page.getByRole("heading", { name: /Discover a customer's need/ }).waitFor({ timeout: 20000 });
  await page.getByRole("textbox", { name: "Reply to customer" }).fill("Tell me how your business handles payments today and what slows you down.");
  await page.getByRole("button", { name: "Send customer response" }).click();
  await page.getByText(/Thanks for meeting with me/).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await page.getByText("Attempt 1 feedback").waitFor({ timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "tests/runner/artifacts/sales-1280.png", fullPage: true });

  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Customer support" }).click();
  await page.getByRole("button", { name: "Resolve a billing complaint" }).click();
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await page.getByRole("heading", { name: /Resolve a Northstar Bank customer issue/ }).waitFor({ timeout: 20000 });
  await page.getByRole("textbox", { name: "Reply to customer" }).fill("I’m sorry this has been frustrating. What happened when you last tried, and did you see an error message?");
  await page.getByRole("button", { name: "Send customer response" }).click();
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await page.getByText("Attempt 1 feedback").waitFor({ timeout: 20000 });

  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Product manager" }).click();
  await page.getByRole("button", { name: "Add your learning material" }).click();
  await page.locator('textarea[placeholder^="Paste notes"]').fill("Students are learning to prioritize product requests by naming the affected user, the expected outcome, and measurable acceptance criteria. A useful brief also states a tradeoff and how the team will know the change worked.");
  await page.getByRole("button", { name: "Add material", exact: true }).click();
  await page.getByText(/passage.*saved|indexed for retrieval/i).first().waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "Prioritize transfer alerts" }).click();
  await page.getByRole("button", { name: /Teach me first/ }).click();
  await page.getByRole("heading", { name: /Prioritize a feature/ }).waitFor({ timeout: 20000 });
  await page.getByText("uploaded", { exact: true }).first().waitFor({ timeout: 10000 });
  await page.getByRole("textbox", { name: "Ask your coach" }).fill("How should I choose a success metric?");
  await page.getByRole("button", { name: "Send question to coach" }).click();
  await page.getByText(/focus on one concrete decision/i).last().waitFor({ timeout: 20000 });
  await page.getByRole("textbox", { name: "Ask your coach" }).fill("Can you give me a hint about tradeoffs?");
  await page.getByRole("button", { name: "Send question to coach" }).click();
  await page.getByText("Can you give me a hint about tradeoffs?").waitFor({ timeout: 20000 });
  await page.getByRole("textbox", { name: /Write a concise product brief/ }).fill("Our small-business customers need timely transfer alerts. Prioritize a simple notification with clear status and next action. Measure whether support contacts about delayed transfers fall over two weeks. Tradeoff: defer advanced preferences until we verify the basic alert is useful. Acceptance criteria: show pending status, send one notification per transfer, and link to support guidance.");
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await page.getByText("Attempt 1 feedback").waitFor({ timeout: 20000 });

  await page.getByRole("navigation", { name: "Choose a coworker" }).getByRole("link", { name: "Data analyst" }).click();
  await page.getByRole("button", { name: "Explain customer trends" }).click();
  await page.getByRole("button", { name: /Give me a task/ }).click();
  await page.getByRole("heading", { name: /Explain the trend/ }).waitFor({ timeout: 20000 });
  await page.getByRole("textbox", { name: /Show your calculations/ }).fill("Week 1: 11/80 = 13.75%. Week 2: 15/104 = 14.42%. Week 3: 24/130 = 18.46%. Week 4: 18/122 = 14.75%. The rate peaks in week 3, but four weeks alone do not establish a cause. I would inspect complaint categories and deployment timing before recommending a product change.");
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await page.getByText("Attempt 1 feedback").waitFor({ timeout: 20000 });
  if (browserIssues.length) console.log("browser console issues:", browserIssues.slice(0, 8));
  console.log("browser smoke passed: five roles, uploaded grounding, coaching, customer text, written reviews, code checks/revisions, persistence, responsive widths, storage isolation, network block, syntax error, timeout recovery, output cap");
} finally {
  await browser.close();
}
