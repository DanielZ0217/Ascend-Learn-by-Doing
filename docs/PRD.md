# Product Requirements: AI Workplace Learning Prototype

Status: baseline approved on 2026-10-24, America/Chicago, and implemented as
recorded in `STATUS.md`. The later coworker-work design is in
`AGENT_PROCEDURES.md`; durable choices are in `DESIGN_DECISIONS.md`.
Product name: working description only; no final brand chosen.
Build constraint: one human builder with coding-agent help. The local demo
target is 10 p.m. Central on 2026-10-24.

## Purpose and priorities

Help students learn job skills by completing realistic assignments inside a
fictional company. Each AI coworker teaches, creates assignments, reviews the
student's work, and supports improvement. The student does the work; the
company is the context for learning.

Priorities, in order: a convincing live demo; elegant, professional UI/UX;
complete learning loops with real AI; simple, maintainable-enough implementation.
Avoid infrastructure work that does not improve the hackathon demonstration.

## Users and roles

The baseline supports one student in one browser, with no login. Students may
switch between five coworkers in the same company.

| Stable role ID | Coworker | Typical assignment and submission |
| --- | --- | --- |
| software-engineer | Software engineer | Fix duplicate transaction records or summarize data; submit JavaScript code. |
| sales-marketing | Sales & marketing | Pitch a company product to a generated customer; submit the conversation. Written campaign briefs are also supported by the common text task flow. |
| customer-support | Customer support | Resolve a simulated customer's problem using company information; submit the conversation or a structured response. |
| product-manager | Product manager | Turn a customer problem into a feature brief with priorities and acceptance criteria; submit text. |
| data-analyst | Data analyst | Interpret a small supplied dataset and recommend an action supported by calculations; submit a structured written analysis. |

Engineering, sales & marketing, and customer support are the main demo
showcases. All five roles must have a usable assignment and feedback flow.
The supervisor creates the company and role profiles from the setup prompt; it
is separate from these five student-facing coaching roles and stays offscreen.

## Student journey

1. Create a company from a bank or restaurant preset or a free-text company
   prompt. A supervisor agent converts the prompt and editable defaults into a
   validated company blueprint and five distinct employee profiles. Default
   counts are scenario metadata, not extra simulated agents.
2. Enter a stylized 3D company scene containing five clickable coworkers.
3. Select a coworker. See suggested practice topics, a free-text learning goal,
   difficulty, and a "Choose for me" shortcut.
4. Choose "Teach me first" or "Give me a task." Teaching explains the concepts
   needed for the assignment; skipping teaching leads directly to the task.
5. Optionally upload a PDF or paste learning text. The selected coach retrieves
   relevant material and creates a realistic company task with a clear
   deliverable and evaluation criteria. Conversational teaching and progressive
   hints remain available while working.
6. Write code, create a written deliverable, or talk to a simulated customer.
7. Submit to the selected coworker. Receive evidence-based feedback, revise or
   retry, and see how the next attempt improves.

The selected coworker owns both coaching and review. No manager approval gate
is required. A generated customer is a temporary exercise participant, not a
sixth permanent employee. Switching roles must preserve unfinished work.

## Learning and source requirements

### Memory and knowledge expansion — confirmed scope

On 2026-10-24 the user requested Redis Open Source memory for each coaching
session, Milvus Open Source for vector retrieval, Neo4j Open Source for graph
retrieval, and an ingested collection of relevant public PDFs or web resources
for every role. Source examples include customer-service and marketing guides;
the collection must also cover software engineering, product management, and
data analysis. Each ingested item needs attribution and retrievable passage
metadata so lessons and tasks can cite their actual evidence. The user also
asked about episodic, semantic, and procedural memory. The user has since
confirmed that the five coaching flows **and** all three data services should
work in the 10 p.m. local demo. Neo4j should connect company, roles, products,
customer issues, tasks, and source passages. Coaches should retain chat within
the current company and retain attempts and learning progress across visits.
The user approved a local Docker Desktop/WSL2 first attempt for Redis, Milvus,
and Neo4j with a small local embedding model. The supervisor remains behind
the scenes. The first student input accepts one text-based PDF or pasted text
per company; scanned-PDF OCR can follow later. Procedural memory uses stable
role instructions and rubrics in the app. Runtime evidence for the stack and
corpus is in `STATUS.md`.

The approved baseline requirements below remain active; runtime evidence is in
`STATUS.md`.

Engineering tasks use research relevant to the student's topic and company.
Display real source links and distinguish newly fetched material from cached
material. Starter exercises cover practical arrays, maps/sets, grouping,
deduplication, validation, and debugging. Use workplace tickets, starter code,
sample inputs, and acceptance checks instead of abstract puzzle framing.

Marketing uses a small stored collection of sourced documents, including
publicly accessible PDFs when appropriate. Retrieve relevant passages using
the learning goal and company context, then pass those passages into teaching
and assignment generation. This must be actual retrieval, not a fixed prompt
described as RAG. A local document index is sufficient; a managed vector
database is not required by the original baseline. The confirmed expanded
scope requires Milvus Open Source vector retrieval. Preserve title, URL, and
passage/page metadata in either retrieval path.

Students can upload a PDF or paste text about what they are learning and ask for
a similar workplace task. Extract usable text, retrieve task-relevant passages,
show where they came from, and explain invalid or empty documents. The first
demo accepts one text-based PDF or pasted text per company; scanned PDF OCR
is deferred.

Other roles use company context, supplied scenario information, and explicit
rubrics. Coaching must distinguish grounded information from assumptions.
Treat retrieved documents and student submissions as data, not instructions
that can override the application's role or reveal secrets.

## Submission and feedback behavior

Engineering includes an embedded editor, starter code, Run and Submit controls,
actual test results, and an agent review. Automated results and AI judgments
must be visually distinguishable. JavaScript is the approved initial language;
the editor is for bounded exercises, not arbitrary packages or full projects.

Sales & marketing creates a customer with a need, objections, and a scenario
goal. Students practice through voice, with a visible transcript and text
fallback. The mentor reviews that transcript and supports another attempt.
Customer support uses a related roleplay flow focused on diagnosis, empathy,
accuracy, and provided company policies.

Feedback names specific strengths and mistakes, explains why they matter, and
gives actionable next steps. Keep the task's rubric stable across revisions.
Use small rubric ratings and evidence rather than unexplained scores or
claims of professional certification. Retain prior attempts for comparison.
Each of the five coaches supports multi-turn conversation: the student can ask
follow-up questions, request an explanation or hint, discuss feedback, and
continue toward a revised submission without losing role or assignment context.

## Presentation and reliability

Use a professional, stylized 3D office with clear role labels, selection states,
and coherent lighting, typography, spacing, and motion. The user has supplied a
ROOMZ isometric-room collage and requested a larger company with connected,
business-specific spaces and a customer-arrival animation. The observations
and confirmed implementation direction are in `DESIGN_DECISIONS.md`. The user
approved fixed camera controls and a repeatable meeting sequence: the selected
coworker represents the student, and coworker/guest always walk to the same
designated meeting room. Detailed layouts can follow after initial setup.

The scene opens a readable task workspace containing the assignment, coach,
sources, submission surface, and feedback. Include keyboard-accessible role
selection, reduced-motion behavior, and a usable fallback if WebGL is absent.
Do not let animation block reading or typing. Laptop presentation is primary.

Persist the current company, drafts, transcripts, and attempts locally. Include
a deliberate reset/demo restart action. Keep API keys on the server. Request
microphone access only when voice starts; provide Stop and handle denial.

Unavailable providers must produce clear retryable states. Explicitly labeled
fixtures may support development and rehearsal, but do not replace real AI in
the accepted live demo or masquerade as live research, voice, or evaluation.

## Acceptance criteria

- AC-01: Both presets create coherent company context and exactly the five approved coworkers, with defaults requiring no lengthy setup.
- AC-02: The company scene shows five selectable characters; selecting each opens the correct role workspace, with an accessible alternative.
- AC-03: Every role offers practice suggestions, a custom goal, difficulty, "Teach me first," and "Give me a task"; both paths reach an assignment.
- AC-04: All five roles produce company-appropriate tasks and real AI coaching; the student remains responsible for the deliverable.
- AC-05: Engineering research uses relevant fetched sources and valid links; research failures identify cached or unavailable material honestly.
- AC-06: Marketing generation demonstrably retrieves relevant passages from stored source documents and shows traceable source metadata.
- AC-07: The editor runs real JavaScript checks, reports failures and successes correctly, and submits code for review; bounded execution, timeout recovery, and isolation are verified before arbitrary student code is enabled.
- AC-08: Sales creates a task-specific customer; voice input/output and an accurate visible transcript work on the demo browser; Stop, denied-microphone handling, and text fallback work.
- AC-09: Support produces a customer problem, accepts a response or conversation, and evaluates it against the scenario's information and policies.
- AC-10: Product management and data analysis each accept a meaningful written deliverable and return a role-specific review, rather than an inactive placeholder.
- AC-11: The selected mentor gives specific evidence, explanations, and next steps; a second attempt uses the same rubric and preserves the first attempt.
- AC-12: Refresh and role switching preserve the current company and in-progress work; explicit reset returns to a clean demo state.
- AC-13: Missing keys, provider failures, empty retrieval, and invalid submissions are handled visibly; secrets stay server-side and untrusted content cannot redefine system instructions.
- AC-14: The setup, office, editor, conversation, and review screens are coherent and readable at 1440x900 and 1280x720; keyboard focus, loading/error states, and reduced motion are checked in a browser.
- AC-15: A rehearsed walkthrough demonstrates company creation, an engineering correction and resubmission, a spoken customer pitch and review, and a support exercise; remaining roles receive a smoke check.
- AC-16: The baseline works without authentication, a second player, or a cross-student dependency; fixtures are labeled and live functionality is reported truthfully.
- AC-17: Company creation calls a real supervisor to produce a validated company blueprint and five distinct employee profiles from the student's prompt; failures are visible and retryable.
- AC-18: A student can upload a PDF or paste learning text, retrieve relevant passages for a chosen topic, see source/page context, and receive a grounded task or a clear extraction/retrieval error.
- AC-19: All five coaches support multi-turn questions and hints during teaching, work, and revision; the software engineer opens an in-browser code editor with Run, Submit, and visible results.
- AC-20: Each coach uses isolated Redis-backed session memory for company conversations; attempts and learning progress remain available across visits, and one role's private conversation does not appear in another role.
- AC-21: Milvus Open Source holds retrievable vectors for ingested learning passages and returns relevant passages with source/page metadata to task or teaching generation.
- AC-22: Neo4j Open Source stores and queries company, role, product, customer-issue, task, and source-passage relationships; at least one task or answer demonstrates an actual graph traversal combined with retrieved evidence.
- AC-23: The local knowledge corpus contains at least one attributable, actually ingested PDF or web resource for each of the five roles; retrieval and user-facing citations resolve to those sources.
- AC-24: The office provides one visible, smoothly traveling role cursor; hover and ArrowUp/ArrowDown preview a coworker, while click and Enter confirm. The active card expands and moves its neighbors through interruptible spring layout animation, synchronized with the matching 3D coworker.
- AC-25: Coworkers have restrained idle and hover/selection reactions; the selected desk remains visible, and entering/returning uses a gentle camera move. Reduced motion, touch input, keyboard focus, WebGL fallback, and rapid selection changes remain usable.
- AC-26: The office redesign retains the cozy palette, low-poly scene, five roles, fixed meeting sequence, and all working coaching, coding, voice, retrieval, and review flows. Target screens remain legible at 1440x900 and 1280x720.
- AC-27: The shared office scene is a larger original miniature with recognizable reception, working desks, meeting room, lounge, and kitchenette, plus company-specific signage. All five coworkers remain clickable, and the fixed customer meeting still reaches its designated room.
- AC-28: Mouse and touch drag can orbit the office through a full horizontal 360 degrees; tilt and zoom remain bounded, Reset view restores the default angle, and walls fade or cut away when they block the interior. Entering a role focuses the coworker, while returning starts from the default office angle.
- AC-29: The richer scene remains legible at the demo desktop sizes, works with reduced motion and no-WebGL fallback, and does not break the five-role coaching, coding, voice, retrieval, or review routes.

## Deferred scope and unresolved inputs

The confirmed Stage 2 expansion now has its own requirements and queue in
[STAGE2_PRD.md](STAGE2_PRD.md) and
[stage2-tasks.json](../harness/stage2-tasks.json). The baseline acceptance
criteria below remain a record of the working single-student version; Stage 2
approval does not mean the new app behavior is implemented.

Phase two: two students on separate computers sharing a company, role-based
collaboration, shared state, and handoffs such as support creating a problem
brief for engineering. Preserve identifiers that allow this later; do not build
multiplayer rooms, sockets, accounts, permissions, or multiplayer UI in the baseline.

The user has added a second-demo direction: coworkers should both coach and
perform simulated role work, with visible coworker-to-coworker conversations.
The first handoff is support drafting a PRD/problem brief for engineering,
followed by engineering clarification questions. A later multiplayer version
lets students join these workflows from separate computers. The confirmed
demo behavior is automatic internal handoffs by default, with an approval-mode
toggle to showcase human oversight. Support sends directly to engineering;
shared company handoff threads show sender identity, while personal coaching
chats remain private. Agents create internal artifacts only; no real external
actions. The company-wide toggle gates handoffs and shared artifact changes
when On. A student starts a bounded scenario run with Pause/Stop; work ends
when the session ends. Security controls and the second-demo check are in
[AGENT_PROCEDURES.md](AGENT_PROCEDURES.md). This does not change the completed
single-student baseline or claim that inter-agent execution is already live.

Also deferred: full cloud IDEs, arbitrary dependency installation, arbitrary
file execution, production deployment operations, and elaborate organization
simulation. Basic student PDF/text ingestion is included in the baseline.

Open inputs: detailed layouts, authenticated provider access, final product
name, and deployment target. Screenshots show $50 Meta
credits and SerpApi free/extra credits. The current defaults are Meta coaching
and transcription, browser speech output, and SerpApi-backed engineering
research; see `PROVIDERS.md`. Configure credentials locally without using the
exposed screenshot key. Continue independent work while access is pending.
