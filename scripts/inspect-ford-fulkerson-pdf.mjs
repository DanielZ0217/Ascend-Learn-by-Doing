import { getDocument } from "../web/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "../web/node_modules/@napi-rs/canvas/index.js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pdf = fileURLToPath(new URL("../ford-fulkerson-demo.pdf", import.meta.url));
const preview = fileURLToPath(new URL("../ford-fulkerson-demo-preview.png", import.meta.url));
const bytes = new Uint8Array(await readFile(pdf));
const document = await getDocument({ data: bytes, useSystemFonts: true }).promise;
console.log(`Pages: ${document.numPages}`);
for (let number = 1; number <= document.numPages; number++) {
  const page = await document.getPage(number);
  const content = await page.getTextContent();
  const text = content.items.map((item) => "str" in item ? item.str : "").join(" ");
  console.log(`Page ${number} text characters: ${text.length}`);
  for (const required of ["Ford", "Fulkerson", "residual", "traffic spike", "B", "coach"]) {
    if (!text.toLowerCase().includes(required.toLowerCase())) throw new Error(`Missing expected text: ${required}`);
  }
  if (number === 1) {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    await writeFile(preview, canvas.toBuffer("image/png"));
  }
}
if (document.numPages !== 1) throw new Error("Expected one-page handout");
console.log(preview);
