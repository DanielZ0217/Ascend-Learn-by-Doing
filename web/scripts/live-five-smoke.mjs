// Explicit opt-in: each run makes paid Meta and SerpApi requests through the local app.
if (!process.argv.includes("--live")) {
  console.error("Pass --live to run the paid five-role integration smoke.");
  process.exit(2);
}

const base = "http://127.0.0.1:3000";
async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path} ${response.status}: ${payload.error?.code ?? "unknown"}`);
  return payload;
}

const { blueprint } = await post("/api/company", { preset: "bank",
  prompt: "A community bank teaching new hires payments and customer care.", mode: "fixture" });
const topics = {
  "software-engineer": "handle an overloaded request queue",
  "sales-marketing": "discover a small business owner's account needs",
  "customer-support": "help a customer with a delayed transaction",
  "product-manager": "prioritize clearer transaction status",
  "data-analyst": "analyze weekly complaint rates",
};
const rows = [];
for (const [roleId, topic] of Object.entries(topics)) {
  const created = await post("/api/learning", { action: "create-assignment", blueprint,
    goal: { roleId, topic, difficulty: "beginner", entryMode: "task-first" }, mode: "live" });
  if (created.mode !== "live" || created.assignment.sources.length < 1) throw new Error(`${roleId}: task was not live and sourced`);
  const assignment = created.assignment;
  const coached = await post("/api/learning", { action: "coach", blueprint, assignment,
    message: "Give me one short hint before I start, without completing the assignment.",
    intent: "hint", mode: "live" });
  if (coached.mode !== "live") throw new Error(`${roleId}: coach was not live`);

  let submission;
  let customerMode = "n/a";
  if (assignment.kind === "conversation") {
    const message = roleId === "sales-marketing"
      ? "Could you tell me how your business handles payments today and what is most frustrating?"
      : "I’m sorry this has been stressful. When did you first notice the delayed transaction?";
    const customer = await post("/api/learning", { action: "customer-turn", blueprint,
      assignment, message, mode: "live" });
    customerMode = customer.mode;
    submission = { id: crypto.randomUUID(), assignmentId: assignment.id, attempt: 1,
      kind: "conversation", turns: [
        { id: `customer-student-${crypto.randomUUID()}`, assignmentId: assignment.id,
          speaker: "student", text: message, origin: "text", timestamp: new Date().toISOString() },
        customer.turn,
      ] };
  } else if (assignment.kind === "written") {
    submission = { id: crypto.randomUUID(), assignmentId: assignment.id, attempt: 1,
      kind: "written", text: roleId === "product-manager"
        ? "Users need to know whether a transfer is pending, complete, or needs attention. Prioritize a status panel over cosmetic changes because support contacts about uncertainty are rising. The first release should show a timestamped status, an explanation of pending states, and a link to support. Acceptance: status appears within five seconds of opening a transfer; every state has plain language; a support link opens with the transfer reference."
        : "Weekly complaint rates are 11/80 = 13.75%, 15/104 = 14.42%, 24/130 = 18.46%, and 18/122 = 14.75%. Week three is highest, but four observations do not establish a cause. I would inspect issue categories and changes made before week three, then watch the rate with a larger sample before changing policy." };
  } else {
    submission = { id: crypto.randomUUID(), assignmentId: assignment.id, attempt: 1,
      kind: "code", code: assignment.starterCode };
  }
  const reviewed = await post("/api/review", { blueprint, assignment, submission, mode: "live" });
  if (reviewed.mode !== "live" || reviewed.review.criteria.length !== assignment.rubric.length) {
    throw new Error(`${roleId}: review incomplete`);
  }
  rows.push({ roleId, kind: assignment.kind, sources: assignment.sources.length,
    retrieval: created.retrieval, research: created.research, coach: coached.mode,
    customer: customerMode, review: reviewed.mode });
  console.log(JSON.stringify(rows.at(-1)));
}
console.log(`Passed ${rows.length} live role flows.`);
