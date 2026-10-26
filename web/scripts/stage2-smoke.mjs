// Local fixture integration smoke. No paid AI request is made.
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
const base = process.env.STAGE2_BASE_URL ?? "http://127.0.0.1:3000";

async function request(path, body, cookie = "") {
  const response = await fetch(`${base}${path}`, { method: body ? "POST" : "GET",
    headers: { ...(body ? { "content-type": "application/json", origin: base } : {}), ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json();
  return { response, payload, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

const created = await request("/api/company", {
  stage2: true, mode: "fixture", preset: "bank", prompt: "A mature community bank handling customer payment questions.",
  companyName: "Stage Two Rehearsal Bank", participantMode: "collaborative", experienceMode: "real-world",
  companyStage: "mature", creatorName: "Alex",
});
assert(created.response.ok && created.cookie && created.payload.stage2?.inviteToken, "Company creation or owner session failed");
const companyId = created.payload.blueprint.company.id;
const ownerCookie = created.cookie;
const forged = await fetch(`${base}/api/stage2`, { method: "POST", headers: {
  "content-type": "application/json", origin: "https://unrelated.example", cookie: ownerCookie,
}, body: JSON.stringify({ action: "approval-mode", companyId, enabled: true }) });
assert(forged.status === 403, "Cross-origin state change was not rejected");
const joined = await request("/api/stage2/join", { companyId, inviteToken: created.payload.stage2.inviteToken, displayName: "Sam" });
assert(joined.response.ok && joined.cookie, "Second student could not join");
const peerCookie = joined.cookie;
const third = await request("/api/stage2/join", { companyId, inviteToken: created.payload.stage2.inviteToken, displayName: "Third" });
assert(third.response.status === 409 && third.payload.error?.code === "company_full", "Third student was not refused");

const first = await request(`/api/stage2?companyId=${companyId}`, null, ownerCookie);
const peer = await request(`/api/stage2?companyId=${companyId}`, null, peerCookie);
assert(first.response.ok && peer.response.ok && first.payload.events.length === 1 && peer.payload.events.length === 1, "Shared event stream did not start once");
assert(first.payload.participants.length === 2 && peer.payload.participants.length === 2, "Participants are not shared");
await new Promise((resolve) => setTimeout(resolve, 5_200));
const [simultaneousOwner, simultaneousPeer] = await Promise.all([
  request(`/api/stage2?companyId=${companyId}`, null, ownerCookie),
  request(`/api/stage2?companyId=${companyId}`, null, peerCookie),
]);
assert(simultaneousOwner.payload.events.length === 2 && simultaneousPeer.payload.events.length === 2
  && simultaneousOwner.payload.events[1].id === simultaneousPeer.payload.events[1].id,
  "Concurrent polls produced duplicate or divergent event ticks");

const prd = await request("/api/stage2", { action: "message", companyId, roleId: "customer-support", kind: "prd",
  text: "The customer saw two payment notices. Confirm whether this is a duplicate notification or transaction before engineering changes the retry path." }, ownerCookie);
assert(prd.response.ok && prd.payload.message.artifactId, "Support PRD was not recorded");
const read = await request(`/api/stage2/artifact?companyId=${companyId}&artifactId=${prd.payload.message.artifactId}`, null, peerCookie);
assert(read.response.ok && read.payload.artifact.body.includes("duplicate notification"), "Engineer could not read the PRD");

await request("/api/stage2", { action: "approval-mode", companyId, enabled: true }, ownerCookie);
const draft = await request("/api/stage2", { action: "ai-draft", companyId, roleId: "software-engineer",
  request: "Ask support to clarify the payment evidence." }, peerCookie);
assert(draft.response.ok && draft.payload.message.status === "pending" && draft.payload.message.source === "fixture", "AI handoff was not gated and labeled");
const rejected = await request("/api/stage2", { action: "approve", companyId, messageId: draft.payload.message.id, approved: false }, ownerCookie);
assert(rejected.response.ok, "Approval rejection failed");
const secondDraft = await request("/api/stage2", { action: "ai-draft", companyId, roleId: "customer-support",
  request: "Summarize the customer evidence without claiming a confirmed cause." }, ownerCookie);
assert(secondDraft.response.ok && secondDraft.payload.message.status === "pending", "Second AI handoff was not queued");
const approved = await request("/api/stage2", { action: "approve", companyId, messageId: secondDraft.payload.message.id, approved: true }, peerCookie);
const duplicateApproval = await request("/api/stage2", { action: "approve", companyId, messageId: secondDraft.payload.message.id, approved: true }, peerCookie);
const afterDecision = await request(`/api/stage2?companyId=${companyId}`, null, ownerCookie);
assert(approved.response.ok && duplicateApproval.response.status === 409, "Approval was not released exactly once");
assert(afterDecision.payload.messages.find((item) => item.id === draft.payload.message.id)?.status === "rejected", "Rejected handoff changed state");
assert(afterDecision.payload.messages.find((item) => item.id === secondDraft.payload.message.id)?.status === "delivered", "Approved handoff was not delivered");
for (const roleId of ["product-manager", "data-analyst", "sales-marketing"]) {
  const coworker = await request("/api/stage2", { action: "ai-draft", companyId, roleId,
    request: "Draft one internal next step for this company issue." }, ownerCookie);
  assert(coworker.response.ok && coworker.payload.message.roleId === roleId && coworker.payload.message.status === "pending",
    `${roleId} did not make a gated, attributed draft`);
}
for (let index = 0; index < 7; index++) {
  const bounded = await request("/api/stage2", { action: "ai-draft", companyId, roleId: "software-engineer",
    request: `Draft internal clarification ${index + 1}.` }, ownerCookie);
  assert(bounded.response.ok, "A handoff failed before the configured turn limit");
}
const capped = await request("/api/stage2", { action: "ai-draft", companyId, roleId: "software-engineer",
  request: "One more internal draft." }, ownerCookie);
assert(capped.response.status === 429 && capped.payload.error?.code === "agent_limit", "AI handoff limit was not enforced");

const paused = await request("/api/stage2", { action: "pause", companyId, roleId: "software-engineer" }, peerCookie);
assert(paused.response.ok && paused.payload.run.status === "paused" && paused.payload.run.assignment?.kind === "code", "Contextual engineering task was not created");
const claimed = await request("/api/stage2", { action: "claim", companyId }, peerCookie);
assert(claimed.response.ok && claimed.payload.assignment.id === paused.payload.run.assignment.id, "Task claim failed");
const blockedClaim = await request("/api/stage2", { action: "claim", companyId }, ownerCookie);
assert(blockedClaim.response.status === 409, "Another student claimed an owned task");
const resumed = await request("/api/stage2", { action: "resume", companyId }, ownerCookie);
assert(resumed.response.ok && resumed.payload.run.status === "running", "Shared resume failed");
if (process.argv.includes("--cleanup")) {
  await request("/api/stage2", { action: "leave", companyId }, ownerCookie);
  await request("/api/stage2", { action: "leave", companyId }, peerCookie);
  await new Promise((resolve) => setTimeout(resolve, 18_000));
  const db = new DatabaseSync(process.env.HACKTX_DB_PATH ?? join(process.cwd(), "data", "hacktx.sqlite"));
  try {
    assert(!db.prepare("SELECT 1 FROM stage2_runs WHERE company_id = ?").get(companyId), "Temporary run survived the last participant leaving");
    assert(!db.prepare("SELECT 1 FROM stage2_events WHERE company_id = ?").get(companyId), "Temporary event feed survived the last participant leaving");
    assert(db.prepare("SELECT 1 FROM stage2_messages WHERE company_id = ?").get(companyId), "Practice thread was erased with the run");
  } finally { db.close(); }
}
console.log(JSON.stringify({ status: "passed", participants: 2, events: first.payload.events.length,
  handoff: "reject and single approve", contextualTask: claimed.payload.assignment.kind, provider: paused.payload.run.assignmentProvider,
  cleanup: process.argv.includes("--cleanup") ? "verified" : "not requested" }));
