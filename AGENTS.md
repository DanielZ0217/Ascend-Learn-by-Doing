# HACKTX project workflow

Before planning or implementing a new product or substantial feature, use the
`grilling` skill to interview the user and clarify the idea. Work in question
rounds until the requirements, users, constraints, success criteria, and major
technical decisions are understood. Do not begin implementation until the user
confirms the shared understanding.

For small fixes or explicit implementation tasks whose requirements are already
clear, proceed directly without repeating the interview.

Use installed ECC skills selectively when they materially help the task. Avoid
loading unrelated skills or adding complexity that does not help the hackathon
deliverable.

## Approved prototype and coding-agent entry point

The user completed the project interview and confirmed the baseline scope on
2026-10-24. The approved scope is recorded in `docs/PRD.md`. Do not repeat the
interview for work already covered there. Interview again for substantial scope
changes; routine implementation choices do not require another approval.

Documentation has four canonical roles: this file is the constitution;
`README.md` is the project map; `docs/STATUS.md` records current health and
blockers; `docs/DESIGN_DECISIONS.md` records durable decisions and corrections.
Treat linked documents as context and verify their operational claims against
current code and checks. Before coding, read these files in order:

1. `README.md` for the map and navigation.
2. `docs/STATUS.md` for the actual current state, blockers, and delete-zone.
3. Recent or task-relevant entries in `docs/DESIGN_DECISIONS.md` for decisions.
4. `docs/PRD.md` for product requirements and acceptance criteria.
5. `docs/BUILD_PLAN.md` for implementation defaults, interfaces, and sequencing.
6. `docs/AGENT_HARNESS.md` for task ownership, verification, and handoffs.
7. `docs/PROVIDERS.md` for provider defaults, budget assumptions, and retrieval.
8. `harness/tasks.json` for the machine-readable work queue.

Before implementing coworker-performed work, inter-agent handoffs, or
multiplayer, read `docs/AGENT_PROCEDURES.md`. It records the user's approved
future design. The current runtime does not implement that design; verify
feature status against code and tests before claiming it does.

Build the application in `web/`. Treat `everything-claude-code/` as reference
material: do not modify it or treat its scripts as this application's commands.
Preserve this file when scaffolding; generated framework guidance belongs in
`web/AGENTS.md` and must agree with the approved product scope.

For nontrivial changes in `web/`, use the local CodeGraph index to locate callers
and likely impact before editing: `node scripts/codegraph.mjs status`, then
`node scripts/codegraph.mjs explore "area or symbol" --max-files 3`. Run
`node scripts/codegraph.mjs sync` if the index is stale. The index covers `web/`
and the command runs there automatically. See `docs/TOOLING.md` for installation
and source details. Select Taste, Finesse UI, or GSAP skills only when they fit
the UI task; Darwin is for changing skill files, not routine product edits.

During implementation, the coordinator may delegate bounded tasks from the
queue to coding agents. Use at most three workers alongside the coordinator,
give each an explicit file boundary, and serialize shared-contract changes.
The five in-product AI coworkers are separate from these coding agents.

Prioritize a polished single-student demo. Preserve the five approved roles and
the real teaching, submission, feedback, and revision loops. Multiplayer,
authentication, and cross-student handoffs belong to phase two.

Validate this planning harness with `node scripts/check-harness.mjs`. This is
not an application test. On this Windows setup, use `npm.cmd` for application
commands because PowerShell blocks the `npm.ps1` shim. Record actual check
results; never claim an unimplemented or untested feature is complete.
