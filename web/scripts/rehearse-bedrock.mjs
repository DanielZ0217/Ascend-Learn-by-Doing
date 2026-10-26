// Explicit opt-in: this makes paid Bedrock, Meta, and research requests through the local app.
if (!process.argv.includes("--live")) {
  console.error("Pass --live to rehearse paid Bedrock calls.");
  process.exit(2);
}

const base = "http://127.0.0.1:3000";
async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status}: ${payload.error?.code ?? "unknown"}`);
  return payload;
}

function requireBedrock(label, payload) {
  const result = { step: label, mode: payload.mode, provider: payload.provider };
  console.log(JSON.stringify(result));
  if (payload.mode !== "live" || payload.provider !== "bedrock") throw new Error(`${label} did not use Bedrock`);
}

const healthResponse = await fetch(`${base}/api/health`);
const health = await healthResponse.json();
if (!healthResponse.ok || !health.providers?.text?.bedrockConfigured) throw new Error("Bedrock key is not configured in the app server");

const created = await post("/api/company", {
  preset: "bank", companyName: "Harbor Demo Bank",
  prompt: "A community bank helping students practice reliable payments and empathetic customer care.", mode: "live",
});
requireBedrock("supervisor", created);
const blueprint = created.blueprint;
if (blueprint.profiles.length !== 5) throw new Error("Supervisor returned an incomplete team");

const assigned = await post("/api/learning", {
  action: "create-assignment", blueprint,
  goal: { roleId: "software-engineer", topic: "deduplicate payment retries", difficulty: "beginner", entryMode: "task-first" }, mode: "live",
});
requireBedrock("engineering task", assigned);
if (assigned.assignment.kind !== "code" || assigned.assignment.sources.length < 1) throw new Error("Engineering task was not coded and sourced");

const coached = await post("/api/learning", {
  action: "coach", blueprint, assignment: assigned.assignment,
  message: "Give me one short hint without writing my solution.", intent: "hint", mode: "live",
});
requireBedrock("engineering coach", coached);

const reviewed = await post("/api/review", {
  blueprint, assignment: assigned.assignment,
  submission: { id: crypto.randomUUID(), assignmentId: assigned.assignment.id, attempt: 1, kind: "code", code: assigned.assignment.starterCode },
  mode: "live",
});
requireBedrock("engineering review", reviewed);
if (reviewed.review.criteria.length !== assigned.assignment.rubric.length) throw new Error("Engineering review missed a rubric criterion");
console.log("Bedrock supervisor and engineering rehearsal passed.");
