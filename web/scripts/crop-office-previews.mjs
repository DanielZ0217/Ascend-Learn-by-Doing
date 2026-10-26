import sharp from "sharp";
import { fileURLToPath } from "node:url";

// The approved five-office concept board is used for lightweight entry stills.
// The interactive office remains the procedural scene in OfficeScene.
const source = new URL("../../docs/ui-redesign/company-presets-concept.png", import.meta.url);
const out = new URL("../public/company/", import.meta.url);
const crops = {
  software: { left: 0, top: 0, width: 990, height: 450 },
  bank: { left: 990, top: 0, width: 682, height: 470 },
  restaurant: { left: 0, top: 460, width: 540, height: 480 },
  semiconductor: { left: 550, top: 460, width: 570, height: 480 },
  custom: { left: 1120, top: 470, width: 552, height: 470 },
};

for (const [preset, crop] of Object.entries(crops)) {
  await sharp(fileURLToPath(source)).extract(crop)
    .resize(1000, 690, { fit: "contain", background: "#f6f1e9" })
    .webp({ quality: 78, effort: 5 })
    .toFile(fileURLToPath(new URL(`office-${preset}.webp`, out)));
  console.log(`Prepared ${preset} preview`);
}
