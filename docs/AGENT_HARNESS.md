# Coding-Agent Harness

This is a repository workflow and checked work queue for coding agents. It does
not install an agent runtime, launch models, or implement the five product
mentors. Use the existing coding-agent tools with these instructions.

## Startup and ownership

1. Read the root `AGENTS.md`, then its canonical map (`README.md`), current
   status (`docs/STATUS.md`), and recent relevant history
   (`docs/DESIGN_DECISIONS.md`). Read the PRD, build plan, and provider guide
   for the assigned feature. Verify claims against current code and checks.
2. Run `node scripts/check-harness.mjs` at the workspace root.
   If the manifest records an open user-requested decision round, read its
   document and settle that round before assigning implementation work. The
   approved baseline remains recorded separately from these new choices.
3. Select a task in `harness/tasks.json` whose prerequisites are done. The
   coordinator records its owner and changes its status to `in_progress`
   before assigning it. Do not silently claim another agent's task.
4. Give the worker its task ID, goal, allowed files, shared interfaces, relevant
   acceptance criteria, expected checks, and dependencies.
5. Keep one coordinator and at most three workers. File boundaries apply to
   source edits; all workers may read shared contracts and product documents.

The coordinator owns `AGENTS.md`, the work queue, shared contracts, package
manifests/lockfiles, root app layout, and status documentation. A worker needing
a shared change proposes the exact edit to the coordinator. Serialize it before
continuing. Do not have separate agents install dependencies concurrently.

Paths in each task are file or directory ownership boundaries, not a license
to modify unrelated files. Never edit `everything-claude-code/`. Do not delete,
reset, or overwrite another worker's changes. If a collision occurs, inspect
and reconcile with its owner. This workspace initially has no root Git repo;
do not assume worktrees or Git-based isolation exist.

## Assignment template

```text
Task: <ID and title>
Goal: <observable outcome>
Read: docs/PRD.md, docs/BUILD_PLAN.md, relevant contracts
Allowed edits: <task paths>
Acceptance: <AC IDs plus task-specific completion conditions>
Dependencies: <completed tasks / known external inputs>
Checks: <exact commands or browser scenarios>
Return: status, summary, evidence, artifacts, next_actions
Do not expand scope or change shared contracts without coordination.
```

## Work loop

Read the narrow relevant code; implement the smallest complete behavior;
verify it in proportion to its risk; report concrete evidence. Prefer a working
student flow over multiple disconnected screens. Make loading, empty, retry,
and error states part of the feature, not an afterthought.

Use fixtures to work independently when a provider or another task is pending.
Label fixtures and retain the same interface as the live adapter. Report the
integration as pending until it has been exercised with real credentials.
Never fabricate research citations, executed test results, or a working voice
integration. Provider keys belong in local server configuration, not chat,
source code, browser bundles, logs, screenshots, or handoff reports.

For errors, report a root-cause hint, a bounded safe retry, and a stop condition.
Examples: retry a transient provider timeout once; stop retrying an invalid
key and expose configuration status; after a repeated architecture failure,
return evidence and a smaller proposed approach. Continue independent tasks.
Do not remove approved requirements to make a check green.

## Handoff contract

Every worker report uses these fields (plain text or JSON):

```json
{
  "status": "success | warning | error",
  "summary": "One-line outcome, including what is incomplete.",
  "evidence": ["Exact command/scenario and its observed result."],
  "artifacts": ["Paths changed or screenshots produced."],
  "next_actions": ["Concrete integration work or unresolved dependency."]
}
```

The coordinator reviews the evidence, integrates the change, and updates the
task record. Queue statuses are `todo`, `ready`, `in_progress`, `blocked`, and
`done`. A blocked task names the concrete external or technical dependency;
dependency ordering alone leaves an unstarted task `todo`. A done task requires
completed prerequisites and nonempty evidence. Update `docs/STATUS.md` at
milestones so a new agent can resume without replaying the conversation.

## Completion gates

- Planning gate: the harness checker validates files, IDs, AC coverage, task
  dependencies, ownership data, and evidence for done tasks. It is not an app
  build, browser test, or proof that a task's claims are true.
- Feature gate: relevant tests and actual interaction evidence meet the task's
  requirements. Cite what was fixture-backed and what was live.
- Integration gate: lint, typecheck, focused tests, browser flows, and build
  pass. Verify the five roles, real research/retrieval, code execution, feedback,
  persistence, customer roleplay, and voice against the PRD.
- Demo gate: rehearse a bank scenario from reset through engineering revision,
  a spoken sales pitch, and a support interaction. Smoke-check the restaurant,
  product manager, and data analyst. Inspect visuals at both target sizes.

Only mark the whole prototype ready when the integration and demo gates have
evidence. If a provider remains unavailable, report the exact missing feature;
do not equate a polished fixture demonstration with the approved live product.

## Scope control

The confirmed Stage 2 scope has a separate queue in
`harness/stage2-tasks.json`, requirements in `docs/STAGE2_PRD.md`, and build
sequence in `docs/STAGE2_BUILD_PLAN.md`. Validate it with
`node scripts/check-stage2-harness.mjs`. All Stage 2 feature tasks begin as
`todo`; this is planning evidence only. Keep the baseline queue and its
completion claims separate. Do not assign Stage 2 application tasks during
the single-student presentation freeze.

The user has already approved the baseline. Proceed on normal implementation
choices; ask only when an unresolved decision materially changes the product
or requires new authority. Visual references and credits remain pending inputs,
not reasons to stop all work. Use the documented provisional visual direction
and adapter boundaries in the meantime.

Keep multiplayer and cross-student handoffs in phase two. Do not add a queueing
platform, orchestration service, paid cloud infrastructure, deployment, or
authentication merely to make the architecture look production-ready. The
expanded supervisor, uploaded-material, and conversational-coach decisions are
recorded in the PRD and history; the manifest's open decision round pauses new
feature assignments until the user confirms the remaining plan details.

Update only the canonical documentation role affected by a change: README for
structure/navigation, STATUS for current health and blockers, DESIGN_DECISIONS
for durable choices or corrections, PRD for product requirements, and BUILD_PLAN
for implementation sequencing. Never put secrets or raw sensitive logs in docs.
