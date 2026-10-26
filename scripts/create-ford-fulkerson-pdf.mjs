import { chromium } from "../web/node_modules/playwright/index.mjs";
import { fileURLToPath } from "node:url";

const html = fileURLToPath(new URL("../docs/ford-fulkerson-demo.html", import.meta.url));
const pdf = fileURLToPath(new URL("../ford-fulkerson-demo.pdf", import.meta.url));
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("file:///" + html.replaceAll("\\", "/"));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdf, format: "Letter", printBackground: true, preferCSSPageSize: true });
  console.log(pdf);
} finally {
  await browser.close();
}
