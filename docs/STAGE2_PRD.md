# Stage 2 product requirements

Status: scope confirmed by the user on 2026-10-24, America/Chicago. A local
Stage 2 implementation is in verification; the physical two-device LAN check
and Bedrock Sonnet rehearsal remain pending. A live Stage 2 Meta fallback
rehearsal passed. The working
single-student baseline and its acceptance criteria remain in [PRD.md](PRD.md).
The implementation queue is [stage2-tasks.json](../harness/stage2-tasks.json).

## Purpose and first demonstration

Let one to five students learn within the same fictional company. In a
collaborative scenario, a customer need reaches support; a student writes a
problem brief or PRD, hands it to engineering in a shared conversation, and a
student implements a real feature in the existing safe coding environment.
All students can switch among all five roles. AI coworkers remain available
for coaching and bounded internal handoffs, with authorship clearly shown.

The first Stage 2 verification uses two devices on the same local network and
an invite link with a simple participant name. It does not require accounts or
internet hosting. A link is a scoped access capability; server-side checks
still enforce company and participant boundaries.

## Company setup

Creation offers three independent choices:

| Choice | Options | Effect |
| --- | --- | --- |
| Participants | Single, Collaborative | Collaborative allows up to five named students in one company. Each may change role. |
| Experience | Practice, Real world | Practice retains the current teaching, assignment, submission, feedback, and revision loops. Real world adds a shared company activity simulation and contextual pause tasks. |
| Company stage | Startup, Mature | Startup work reflects small teams, scarce capacity, and rapid iteration. Mature work reflects established operations, coordination, reliability, and change controls. |

The bank, restaurant, existing software/custom choices, and a semiconductor
company preset remain distinguishable. Industry, stage, company prompt, and
current company event shape tasks and simulated activity. A bank payment issue,
restaurant ordering issue, and semiconductor production or supply issue should
not produce interchangeable briefs. These are fictional learning scenarios;
the app must not imply an actual regulated policy or real customer fact.

## Collaborative workflow

- The offscreen supervisor creates exactly the five existing AI coworker
  profiles and a company-specific scenario. There is no sixth office character.
- The students join by invite link and enter display names. The shared
  company state and conversation show sender identity. Private coaching and
  drafts remain scoped to the appropriate student; company handoff threads are
  shared. A sixth participant cannot join the five-seat prototype.
- Students lead the first handoff: support writes the customer problem
  brief/PRD; engineering reads it, asks questions, and implements a workplace
  feature. Either student may switch role. The system must attribute each
  message, draft, submission, review, and AI contribution to its actual author.
- AI coworkers coach or draft on request and can perform bounded internal
  handoffs under [AGENT_PROCEDURES.md](AGENT_PROCEDURES.md). The shared
  conversation panel shows actual student messages and AI handoffs, with
  thread, status, and artifact links. Simulated activity-feed text is separately
  labeled and must never masquerade as a real message or completed artifact.
- Approval mode remains a company-wide option. When On, the server queues AI
  handoffs and shared artifact changes for a student's Approve/Reject action.
  Internal actions only: no actual email, deployment, purchasing, or external
  system changes.

## Real world simulation

- While at least one participant is active on the company page, one
  company-specific event engine advances the shared feed about every five
  seconds. It uses templates/state and existing company context, without a
  paid model call per tick. Events can describe a customer request, operating
  issue, incident response, or work completed within the **simulation**. The
  feed names the simulated coworker role, action, and outcome so students can
  see what each agent appears to have completed; these entries remain labeled
  as simulation, not as real generated artifacts or student submissions.
- The feed keeps going with related company work until students pause or all
  participants leave. It is not a background autonomous company. Each event
  has an ID, company/run association, timestamp, scenario type, and provenance.
  Duplicate client polls must not create duplicate events. Long active runs
  have bounded retained history and clear continuity.
- Pause is shared: either student freezes the feed for both. The app offers a
  contextual task for the current event and selected role. AI can help create
  that task, subject to provider fallback and budget limits. It should be
  genuine company work, not an unrelated algorithm puzzle. A student may
  submit the work through the existing assignment, code-check, review, and
  revision flow where relevant. A resolved task updates the simulated event
  status; either student can resume the shared feed.
- The app uses participant presence/expiry to stop the run when the last
  participant leaves. It erases only that temporary simulation run and feed.
  The company blueprint and Practice learning progress remain available.
  A refresh or brief disconnect should not falsely end an active shared
  run; the UI shows reconnecting, paused, and ended states truthfully.

## Engineering workspace and quality

The engineering task uses a responsive split layout: the company issue,
requirements, sources, and conversation context on the left; code, Run, checks,
and Submit on the right. On narrow screens it can stack. It reuses the current
isolated JavaScript runner and real rubric feedback. Voice, retrieval,
five-role coaching, meetings, office selection, reduced motion, keyboard
access, and the existing single-student path continue to work.

The activity feed and conversation panel must be readable with assistive
technology and usable without relying on animation. New messages should not
steal keyboard focus. Motion follows the existing reduced-motion preference.

## Acceptance criteria

- S2-AC-01: Company creation records participant mode, experience mode, stage,
  industry/preset, and prompt; the existing single-student Practice path still
  works, and all five roles remain available.
- S2-AC-02: Bank, restaurant, semiconductor, and existing software/custom
  scenarios visibly differ; startup and mature variants change task context in
  a plausible, reviewable way.
- S2-AC-03: A second named student joins the same company by a scoped invite
  link on another device on the local network; both see current shared state,
  and a sixth student is refused cleanly after five seats are filled.
- S2-AC-04: All students can switch among all five roles without losing their
  identity; private coaching/drafts do not leak into the shared thread or to a
  different company.
- S2-AC-05: A customer issue leads to a student-authored support PRD/problem
  brief, a visible direct handoff to engineering, clarification, and a
  student-authored feature submission tied to the original issue.
- S2-AC-06: The shared conversation shows actual student and AI messages with
  author, role, time, thread, status, and linked artifacts; simulated feed
  entries are visually and structurally distinct.
- S2-AC-07: AI coworkers can coach or draft on request; internal handoffs obey
  fixed role permissions, company/task scope, provenance, turn/time/cost
  bounds, Pause/Stop, and the server-enforced approval toggle.
- S2-AC-08: With approval mode On, Reject prevents delivery of an AI handoff
  and Approve releases it; model text alone cannot grant approval.
- S2-AC-09: The engineering workspace has a usable left issue/right editor
  composition on desktop and a readable narrow layout, preserving isolated
  Run, actual check results, Submit, and revision.
- S2-AC-10: Real world activity advances once per company run at about a
  five-second cadence only while a participant is active. It remains coherent
  with the company, stage, and current issue, logs simulated coworker actions
  and outcomes with clear provenance, and makes no model call per tick.
- S2-AC-11: Either student can Pause the shared feed; both see the same paused
  event and contextual role task. Resolution or Resume advances one shared
  state without duplicate tasks or events.
- S2-AC-12: A student can complete a pause task through the relevant existing
  submission and feedback loop, including actual code checks for engineering
  work; the activity log names the real student contribution accurately.
- S2-AC-13: When the last participant leaves or expires, the temporary run and
  feed stop and are erased; company setup and Practice progress survive.
- S2-AC-14: Company isolation, invite-token scope, five-seat limit, participant
  identity, private chat separation, and untrusted-content handling have
  server-side tests and browser checks.
- S2-AC-15: The two-device LAN rehearsal completes a support-to-engineering
  handoff and shared Pause/Resume, and regression checks preserve the existing
  single-student coaching, voice, retrieval, meeting, coding, and review flows.
- S2-AC-16: Status labels distinguish live AI, fixture fallback, real student
  work, AI drafts, and simulated event text; provider or connection failure
  leaves a recoverable task and does not invent completed work.

## Collaborative Practice team tasks (2026-10-25 addition)

- With two to five students currently present, Take team task previews one
  company-specific customer feature scenario for that team size. The same
  scenario is phrased for bank, restaurant, software, semiconductor, or custom
  companies and for Startup or Mature constraints.
- Required roles grow from Support + Engineering at two students, then add
  Product, Data, and Marketing at three, four, and five. Each student selects
  a distinct required role before Start; the server freezes the assignments.
- Each part opens in its owner's normal role workspace with individual
  instructions, coach, submission, review, and revision. Everyone sees the
  shared context, roster, progress, and reviewed handoffs.
- Engineering's final submission requires Support's reviewed PRD. Marketing's
  final message requires the other reviewed outcomes. The team completes only
  when every part passes its review; code also needs passing checks.
- An absent member's unfinished part can be taken by any present teammate
  after selecting its role, and the reassignment appears in the author-labeled
  team conversation. Restart demo clears the team task. A lone student's
  Practice and all Real world behavior remain available.

## Out of scope for Stage 2

Accounts, more than five participants, real company
integrations, unrestricted code execution, production deployment by AI,
autonomous work after everyone leaves, and model generation on every feed tick.
