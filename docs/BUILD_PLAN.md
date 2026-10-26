# Build Plan

The product requirements in `PRD.md` are user-approved. The choices below are
implementation defaults, not additional user requirements; change them when
evidence warrants it and record consequential changes in `STATUS.md`.

## Implementation shape

- Application directory: `web/`, separate from the existing ECC reference tree.
- Next.js App Router, TypeScript, React, and Tailwind CSS; server route handlers
  keep provider credentials out of the browser. Select mutually compatible
  stable packages when scaffolding and commit the resulting lockfile if Git is
  initialized later. Do not initialize or publish a remote as part of setup.
- React Three Fiber/Three.js for a small stylized office. Load the scene and
  code editor on the client. Match the renderer to the selected React major.
- An established embedded editor such as Monaco for JavaScript exercises.
- Local browser persistence for drafts; local SQLite for durable company,
  attempts/progress, passage metadata, and metered AI usage. Redis Open Source
  holds company-scoped coach conversation state; Milvus Open Source holds
  passage vectors; Neo4j Open Source holds company, role, product, issue, task,
  and passage relationships. FTS5 can supplement vector retrieval.
- Configurable adapters for text generation, engineering research, and voice.
  Default to Meta Muse Spark 1.3, Meta voice transcription, browser speech
  synthesis, and SerpApi search/extraction; see `PROVIDERS.md`. Credentials and
  live integrations still need verification. No multi-provider framework.
- Schema-validated requests and model responses. A supervisor generates one
  company blueprint and five distinct agent profiles from the creation prompt.
  Bounded retries and concise context; no autonomous background company process.

The five coworkers are conversational agents with distinct profiles, prompts,
source contexts, rubrics, and session histories sharing a learning engine and
Meta model adapter. They answer follow-up questions during teaching, work, and
revision. Customers are temporary personas tied to an assignment. Use a shared
interface with role-specific inputs and submission surfaces.

At company creation, the supervisor returns a structured company blueprint.
At task creation, the selected coach combines the student's goal, company
state, retrieved passages, and a realistic seed case to create a task and fixed
rubric. Keep model-generated scenario text separate from executed checks and
retrieved-source provenance. The engineer opens a client-side code editor with
Run and Submit; the coach comments on both actual checks and submitted code.

The user approved the web libraries and deterministic meeting animation: the
selected coworker represents the student, and coworker/guest walk to the same
meeting room along authored paths every time. Detailed business layouts can
follow after setup. Use scene state and animation clips; no LLM movement calls.

## Shared contracts to establish in T01

Put canonical types and validation in `web/src/lib/contracts/`. The coordinator
owns contract changes; workers consume them rather than defining competing
versions. Exact field names can be refined in T01; preserve these semantics.
T01 is already complete; the coordinator must extend its contracts for the
newly confirmed blueprint, agent-profile, and uploaded-source scope before
assigning dependent feature edits.

| Contract | Required semantics |
| --- | --- |
| Company | ID, preset, name, description, products, customer context, default counts, five role IDs. |
| LearningGoal | Role ID, topic, difficulty, teach-first/task-first choice. |
| SourceExcerpt | ID, title, real URL, excerpt, page/section where available, retrieval time, live/cached provenance. |
| Assignment | ID, company/role/goal, brief, deliverable kind, fixed rubric, sources, optional starter code/tests, dataset, or customer persona. |
| ConversationTurn | ID, assignment ID, speaker, text, timestamp, voice/text origin. |
| Submission | ID, assignment ID, attempt number, code/text/transcript payload, prior submission ID when revising. |
| RunResult | Actual check results, bounded output, error/timeout state; never inferred from an LLM response. |
| Review | Submission ID, rubric results, concrete evidence, strengths, improvements, next steps, referenced sources. |
| LearningSession | Company, active role, assignments, drafts, conversation turns, submissions, reviews, local schema version. |

The client supplies stable IDs and validated structured input. The server
controls mentor instructions and injects company and source context. For a
single-user demo, local persistence is sufficient; do not add a database only
to simulate production architecture.

## Service boundaries

Use narrow operations: createCompanyBlueprint, ingestLearningMaterial,
createAssignment, teach, coach, reviewSubmission, researchEngineering,
retrievePassages, customerTurn, transcribe, and speak.
No general-purpose endpoint that executes arbitrary tool names from the client.

Service errors must provide a safe code/message, whether retry is appropriate,
and an action the UI can offer. Limit retries (at most one automatic retry for
transient provider errors by default); preserve the student's draft. Never
retry authentication errors indefinitely or expose provider error secrets.

Ingest curated source cases and student-provided PDF/text into local metadata
storage and Milvus vectors using one consistent embedding model. Preserve
source title, page/section, and the student's topic. Neo4j links each passage
to relevant company/product/issue/task nodes so a graph traversal can augment
retrieval. Start with text-extractable PDFs; OCR and multi-document management
remain open details for final plan sign-off. Engineering research needs a real
search/retrieval adapter. A curated cached result can be a labeled fallback,
not proof of live research. Keep Redis chats isolated by company and coach;
store attempts and learning progress durably across visits.

## Code execution boundary

Treat student code as untrusted. Never execute it in the application server or
the main page context. A Web Worker alone is not a security sandbox: workers
can access networking and storage APIs. Choose an isolated browser execution
boundary, restrictive policy, and a terminable worker, then verify isolation.

The runner must prevent access to the application's DOM, storage, secrets,
network, and server endpoints; enforce a short timeout and capped output; and
recover from syntax errors and endless loops. Validate messages across its
boundary. Test attempted network/storage access, not only successful exercises.
Disable Run with a clear explanation if isolation is not established; do not
claim AC-07 passes. Arbitrary packages, imports, and filesystem access are out
of scope. Exercise checks are public learning feedback, not secure exams.

## Sequence toward the 10 p.m. Central local demo

The user set 10 p.m. Central on 2026-10-24 as the baseline target. This is a
target, not proof of completion. T01 setup is complete. Keep the last period
for an actual demo walkthrough and record any missing acceptance criteria.
Preflight found 15.7 GB physical RAM, Docker Desktop stopped, unverified WSL2,
and no running Redis/Milvus/Neo4j services. Milvus's Windows standalone setup
requires Docker Desktop with WSL2 and at least 8 GB RAM (16 GB recommended).
Use its documented single-container standalone route plus Redis and Neo4j
Community containers if local checks pass. A small Apache-2.0 local embedding
model (`all-MiniLM-L6-v2-ONNX`, 384 dimensions) is the current recommendation;
verify downloads, latency, and service health before claiming vector RAG works.
If the stack exhausts memory or fails to start, record the exact blocker and
reassess the runtime with the user rather than labeling fixtures as live.

References: [Milvus Windows standalone](https://milvus.io/docs/install_standalone-windows.md),
[Milvus prerequisites](https://milvus.io/docs/prerequisite-docker.md),
[Neo4j Docker](https://neo4j.com/docs/operations-manual/current/docker/introduction/),
[Redis Docker](https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/),
[local embedding model](https://huggingface.co/onnx-community/all-MiniLM-L6-v2-ONNX).

| Gate | Deliverable |
| --- | --- |
| Plan and access | Close the open decision round; user configures Meta and rotated SerpApi keys locally; perform tiny live access checks. Verify Docker Desktop/WSL2 and start Redis, Milvus, and Neo4j locally. Coordinator extends contracts and harness. |
| Parallel core | T02 builds company creation and scene; T03 builds supervisor, role AI, Redis memory, Milvus vector retrieval, Neo4j graph traversal, and research; T04 builds conversational workspace and persistence; coordinator prepares the five-role source corpus and PDF ingestion boundaries. |
| Interactive exercises | T05 adds isolated JavaScript checks and editor; T06 adds customer roleplay, opt-in transcription, spoken output, and visible text fallback. |
| Integration | Connect all five coach flows; verify prompt → task → conversation → submission → feedback → revision, plus actual Milvus/Neo4j retrieval, Redis memory, document grounding, and the fixed meeting animation. |
| Demo gate before 10 p.m. | Run app checks and rehearse bank engineering revision, sales voice exchange, support conversation, and smoke checks for the other roles and restaurant. Record live versus fixture evidence. |

Use `../harness/tasks.json` for dependencies and ownership. Foundation comes
first; scene, service, content, and workspace work can then be assigned within
available agent capacity. Integrate shared interfaces before parallel edits.

## Checks and delivery evidence

T01 must define scripts in `web/package.json`: lint, typecheck, test, test:e2e,
and build. Use focused behavior tests for retrieval selection, session
revisions, runner isolation/timeouts, and schema validation. Browser tests cover
the main flows; live provider smoke checks are recorded separately from fixtures.

Run from `web/` on this machine:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

These commands passed for the T01 foundation on 2026-10-24; they do not yet
verify the unimplemented learning/scene features. Capture screenshots of setup, office, editor/results, customer
conversation, and review at the PRD's desktop sizes. Record the exact steps and
whether live AI/voice/research were used in `STATUS.md`. Do not count a stubbed
network response as a live integration check.

## Sources checked for implementation defaults

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): framework setup, supported Node version, and project scripts.
- [React Three Fiber installation](https://r3f.docs.pmnd.rs/getting-started/installation): React major-version compatibility and Next.js integration.
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers): worker execution, messaging, and network/storage capabilities.

Local read-only setup check found Node 24.14.1, npm 11.11.0, Python 3.12.7, and
Git 2.53.0.windows.1. `npm.cmd` works; `npm.ps1` is blocked by PowerShell policy.
The application foundation now exists in `web/`; the HACKTX root is still not
a Git repository. See `STATUS.md` for current implementation evidence.
