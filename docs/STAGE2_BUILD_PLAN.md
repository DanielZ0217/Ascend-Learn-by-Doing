# Stage 2 build plan

Status: local implementation in verification. Read
[STAGE2_PRD.md](STAGE2_PRD.md) for requirements and
[AGENT_PROCEDURES.md](AGENT_PROCEDURES.md) for the internal AI action policy.
The machine-readable queue is [stage2-tasks.json](../harness/stage2-tasks.json).
The user explicitly requested implementation after confirming this scope.

## Implementation choices and current proof

- SQLite stores the two-seat participant roster, hashed invite and session
  credentials, shared messages/artifacts, and the bounded temporary run. An
  HttpOnly, SameSite cookie identifies each student. The shared thread is
  separate from participant-scoped Redis coach memory and browser-local drafts.
- A server-owned event catalog advances on foreground polling, at most one
  event per five seconds per company. A 15-second sweep expires abandoned
  participants and deletes the temporary run when the last session expires.
  The company, shared work, and local Practice progress remain.
- Pause is shared. A role-specific assignment uses the existing AI task path
  with provider fallback and the existing isolated code runner and review.
  Failed checks appear as reviewed attempts needing revision; a passing code
  attempt marks the task complete. Internal AI drafts are requested explicitly,
  capped at 12 per company, labeled by provider, and held for student approval
  when approval mode is on.
- The role workspace opens with a compact company summary so the issue and
  editor remain visible near the top. The full shared thread can be opened.
- Production Playwright has passed the two-browser support PRD → engineering
  revision → shared Resume path at desktop and 390-pixel widths. This is one
  computer with two isolated browser contexts. A physical second LAN device
  is still a separate check. The live supervisor, engineering handoff, and
  contextual Pause task each passed through Meta fallback; Bedrock remains
  unconfigured and unverified.

## Architecture boundaries

1. The coordinator extends the canonical contracts in `web/src/lib/contracts/` for company
   choices, participant session, presence, run/event, thread/message,
   artifact, and approval state. Keep the existing five role IDs and
   single-student data readable. Shared-contract changes are serialized by
   the coordinator.
2. Keep all invite tokens and participant permissions server-side. An
   unguessable invite grants access only to its company; a participant receives
   a separate session identity after entering a display name. Enforce the
   two-seat limit, validate every company/thread/task ID, and expire stale
   presence. LAN access requires an explicitly configured host binding and a
   two-device test; do not expose the dev server to the wider internet.
3. Persist shared handoff messages and student artifacts with author,
   provenance, timestamps, and immutable event IDs. Keep each student's coach
   history and drafts separate. Reuse the current local service boundaries;
   choose storage placement during the contract task using access patterns and
   the existing SQLite/Redis/Neo4j setup. Do not migrate databases as a
   prerequisite merely to resemble production infrastructure.
4. A server-owned event engine advances one run at most once per cadence
   interval, independent of how many clients poll. Events come from
   company/stage-specific state and templates. It records simulated outcomes
   as such; actual agent or student work requires a separate attributed
   message/artifact. Bound retained events and cap model turns, time, and
   estimated spend for on-demand AI work.
5. The shared Pause state is authoritative on the server. Freeze event
   generation for both participants, snapshot the current event, create at
   most one contextual task per accepted pause, and resume idempotently.
   Reuse the present task, retrieval, isolated runner, review, and revision
   services rather than building a second grader.
6. The engineering view composes the existing problem/source and Monaco
   editor components into a split desktop layout and a stacked narrow layout.
   The collaboration panel is a separate shared thread surface, with
   accessible announcements and no focus stealing.
7. Presence heartbeats keep the temporary simulation alive while anyone is
   on the company page. A short expiry grace period handles refresh and
   disconnection. After the last participant expires, stop work and delete
   only run/feed state; preserve company and Practice progress. Exact TTL and
   retention bounds are implementation defaults to measure and document.

## Build sequence

| Gate | Tasks | Proof before moving on |
| --- | --- | --- |
| Shared foundation | S2-01, S2-02 | Existing company data migrates; invite/join and two-seat enforcement work in two browser contexts. |
| Human collaboration | S2-03, S2-04 | Two LAN devices exchange identified messages and a student support PRD reaches engineering. |
| Agent and simulation runtime | S2-05, S2-06, S2-07 | Approval and internal-action checks pass; one shared event stream pauses and resumes without duplicate ticks. |
| Work surfaces | S2-08, S2-09 | Contextual task uses existing checks/review; editor and conversation panel work at target widths. |
| Integration | S2-10 | Two-device scenario, security and regression checks, screenshots, lint, typecheck, tests, and build pass. |

## Demo scenario and failure checks

Start a mature bank with two students. Invite the second device. A simulated
customer reports duplicate payment notifications. Student A, acting as
support, writes a brief with known facts and uncertainties, hands it to
engineering, and answers a clarification. Student B, acting as engineering,
sees the issue on the left and implements/tests a deduplication feature on the
right. Pause the shared Real world feed at a related event; both devices show
the same paused state, and one student completes the contextual task. Switch
roles, resume, then let both participants leave and verify the temporary feed
is removed while Practice progress remains.

Repeat setup with a startup restaurant and a mature semiconductor company to
check that industry and stage alter incidents and task requirements. Run an
approval-mode On handoff and prove Reject blocks delivery. Test a third join,
expired invite/session, concurrent pause requests, network interruption,
provider fallback, cross-company reads, and untrusted text attempting to
override role or approval policy. Finally rehearse the original single-student
office, coaching, voice, retrieval, meeting, coding, and review paths.

Planning validation: `node scripts/check-stage2-harness.mjs` checks the
Stage 2 manifest and acceptance coverage. It does not prove any app behavior.
Do not mark a feature task done until its own test and browser evidence exist.
