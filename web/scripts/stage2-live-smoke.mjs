// Opt-in paid model rehearsal. Prints provider labels only.
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
if (!process.argv.includes("--live")) throw new Error("Pass --live to authorize paid Stage 2 model calls.");
const base = process.env.STAGE2_BASE_URL ?? "http://127.0.0.1:3000";
async function post(path, body, cookie = "") {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: {
    "content-type": "application/json", origin: base, ...(cookie ? { cookie } : {}),
  }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${data.error?.code ?? "unknown"}`);
  return { data, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

const company = await post("/api/company", { stage2: true, preset: "bank", companyName: "Stage Two Live Rehearsal Bank",
  prompt: "A fictional community bank needs to explain duplicate payment notifications and make payment retries reliable.",
  participantMode: "collaborative", experienceMode: "real-world", companyStage: "mature", creatorName: "Rehearsal Student" });
const id = company.data.blueprint?.company?.id;
if (!id || !company.cookie) throw new Error("Supervisor did not create a company.");
if (company.data.mode !== "live") {
  // This test company can still isolate the new handoff path when the
  // supervisor's structured answer fails. No real company row is changed.
  const db = new DatabaseSync(process.env.HACKTX_DB_PATH ?? join(process.cwd(), "data", "hacktx.sqlite"));
  try {
    const row = db.prepare("SELECT settings FROM stage2_companies WHERE id = ?").get(id);
    if (!row) throw new Error("Rehearsal company row is missing.");
    const settings = { ...JSON.parse(row.settings), generationMode: "live" };
    db.prepare("UPDATE stage2_companies SET settings = ? WHERE id = ?").run(JSON.stringify(settings), id);
  } finally { db.close(); }
}
const handoff = await post("/api/stage2", { action: "ai-draft", companyId: id, roleId: "software-engineer",
  request: "Ask customer support for the evidence needed before designing a safe payment-retry fix." }, company.cookie);
if (handoff.data.message?.source === "fixture") throw new Error("Engineering handoff used the fixture fallback.");
const state = await fetch(`${base}/api/stage2?companyId=${id}`, { headers: { cookie: company.cookie } });
if (!state.ok || !(await state.json()).events?.length) throw new Error("Live company event was not available.");
const paused = await post("/api/stage2", { action: "pause", companyId: id, roleId: "software-engineer" }, company.cookie);
if (paused.data.run?.assignmentProvider === "fixture" || paused.data.run?.assignment?.kind !== "code") throw new Error("Contextual engineering assignment used the fixture fallback.");
console.log(JSON.stringify({ status: "passed", supervisor: company.data.mode === "live" ? company.data.provider : "fixture-fallback",
  engineerHandoff: handoff.data.message.source, pauseTask: paused.data.run.assignmentProvider }));
