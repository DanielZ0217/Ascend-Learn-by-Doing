# Current Status

Updated: 2026-10-25, America/Chicago. Local demo target: 10 p.m. Central.

## Collaborative Practice team tasks (2026-10-25)

Collaborative Practice now supports a shared customer feature task for the
number of students currently present, from two through five. The preview
requires distinct Support and Engineering roles, then Product, Data, and
Marketing as the team grows. Start fixes one part per student. Each part opens
in its owner's existing role workspace with coaching, submission, checks when
applicable, review, and revision. The shared board shows the scenario,
ownership, progress, and reviewed handoff artifacts. Engineering review waits
for Support's reviewed brief; Marketing waits for all other reviewed outcomes.
Absent students' unfinished parts can be reassigned to a present teammate
who selects the role, and the change is logged. Restart demo clears the task.
The Real world feed and one-student Practice flow remain intact.

The creator's **Restart demo** confirmation now explicitly names the team
assignment and every part. A new reset regression creates an active two-person
task, restarts the company, and verifies that the task, its parts, shared
messages, and the guest are gone while the company remains. The browser flow
also verifies that the creator's local assignment is cleared and the join
code rotates.

The focused reset and Practice service suites passed (10 tests), full ESLint
and the optimized TypeScript production build passed, and the two-browser
Practice rehearsal now includes Restart demo. The `.next-team-restart` build
serves port 3000; a fresh public browser read `ok` from
`https://ascendsim.tech/api/health`. The isolated QA server and database were
removed after verification.

Verification: CodeGraph was current before edits; four focused team-task
service tests passed, as did all 49 service tests, full ESLint, TypeScript,
and the optimized production build. A two-browser production rehearsal on an
isolated port and database passed code joining, role preview, assignment,
Support review, and the shared reviewed handoff. Screenshot:
[team-practice-board.png](screenshots/team-practice-board.png). The final
`.next-team-practice` build served port 3000 for the initial release. A fresh public browser loaded
the Ascend homepage and `/api/health` through the existing Cloudflare tunnel;
health reported `ok`. The temporary QA server was stopped and its test
database removed. Old generated builds were cleared, except a small OneDrive
cache directory that Windows would not remove.

## Learner memory, company codes, and in-place demo restart (2026-10-25)

The current implementation stores explicit lasting explanation preferences in
the existing SQLite database for one browser identity within one company. A
student can see and remove the preference in any of the five coach chats. Live
coaches receive it as an explanation style; the labeled fixture fallback also
acknowledges it. One-off analogy requests are not saved.

Collaborative creators see an eight-character company code in the team
workspace. A guest chooses **Join a company** on the site or the creation page,
enters the code and a name, and can join from any device that can reach the
site. The five-student seat limit remains. The old link route remains for
existing invitations, but the app no longer offers links to copy.

**Restart demo** now retains the company and creator but clears role work,
chat, uploads and retrieval indexes, company feed, and learner preferences.
It removes guests and rotates both the join code and legacy invitation token.
The separate **Delete** action in My companies permanently removes a creator's
company; a guest sees **Leave** and removes only their browser shortcut.

Typecheck, full ESLint, 12 company/service tests, 16 learning/provider tests,
and the optimized production build passed. The company-library desktop browser test passed for
restart versus permanent Delete. The two-browser reset test passed against
the final port-3000 build: code join, persistent preference across two roles,
the fixture's actual minecart analogy, upload, reset, guest removal, and
preference removal. The public `/join` page and `/api/health` both returned
HTTP 200 at `ascendsim.tech`. Captures:
`docs/screenshots/creator-company-code.png`,
`docs/screenshots/join-by-code.png`,
`docs/screenshots/saved-learning-preference.png`, and
`docs/screenshots/restarted-company.png`. The ESLint ignore now covers
generated `.next-*` builds, allowing the full lint run to complete.
Temporary test servers were stopped and stale generated `.next-*` build
folders were removed; `.next-demo-final` served port 3000 at that point
through the existing Cloudflare tunnel.

## Guided coworker lessons and topic-matched coding (2026-10-25)

**Teach me first** now opens a large coach conversation for all five roles.
The student sees a short explanation and can request a hint or next step,
close and resume the lesson, then choose **Try the challenge**. The mentor
conversation carries into the task. Every role's coach has an Expand control;
chat now formats basic Markdown and copyable, syntax-colored code blocks.
The checked engineering editor remains JavaScript.

**Give me a task** recognizes Ford–Fulkerson/network flow and opens a vetted
capacity-limited routing challenge with four checks. A bank uses payment
routes to settlement; other company types use their own work items. Unknown
engineering topics open a guided written explanation rather than an unrelated
deduplication question. The task picker is deterministic; live Meta powers
coach replies when available, with a visibly labeled fixture fallback.

Focused TypeScript, ESLint, nine learning service tests, and the optimized
build passed. A desktop browser flow passed against the review server:
lesson, close/resume, matching challenge, highlighted Python chat block,
company navigation, and deletion. The 390 px lesson had no horizontal
overflow. Captures: `docs/screenshots/guided-lesson-desktop.png`,
`docs/screenshots/guided-lesson-mobile.png`, and
`docs/screenshots/coach-code-desktop.png`. A later browser run exposed that
the home screen's startup depended on `requestAnimationFrame`, which did not
fire in that session; startup now uses a deferred microtask. A fresh browser
opened company creation in the final build. A final browser test rerun stopped
at a carousel auto-advance race during the test's initial screenshots; the
test now enables reduced motion before loading the page. The final build is
on port 3000; public page and health routes at `ascendsim.tech` returned 200.

## Saved company deletion after session expiry (2026-10-25)

The My companies card can outlive its server session. Delete previously called the authenticated cleanup route directly and showed `session_expired` after the participant timed out. Delete now uses the saved invite and display name to rejoin once, then retries the same server cleanup. If the invitation is missing or invalid, the dialog reports why it cannot remove shared server data. TypeScript, targeted lint, the optimized build, and a desktop browser flow with an injected 401/rejoin/retry passed. The updated build is on port 3000; local and public page/health checks returned 200.

## Small practice, library, and collaboration update (2026-10-25)

The engineering assignment now has **Back to practice** and **Resume current task** controls. The practice prompt accepts a full question; **Teach me first** passes that question to Maya. Open-ended questions get a written explanation task tied to the question, while **Give me a task** retains the checked coding exercises. My companies offers a confirmed Delete action that uses the same company cleanup route as Restart demo. Collaborative companies now admit five named participants through the existing invite link, with a five-seat presence count. The five coworkers and private role coaching remain as before.

Targeted TypeScript, changed-file ESLint, six Stage 2 service tests, seven learning service tests, and the optimized build passed. A focused desktop browser test passed for asking Maya a concept question, leaving and resuming the task, and deleting a company from My companies. The final build is on port 3000 through the existing tunnel; both local and public page and health routes returned 200.

## Meta live mode restored for the public demo (2026-10-25)

The public server is running with outbound network access. A prior isolated
server could not connect to Meta (`EACCES`) and silently produced fixture
companies even though the Meta key was configured. A small authenticated Meta
request and an app-level company request now both return live Meta responses.
Bedrock remains unconfigured, so Muse Spark 1.3 serves text and Muse Voice
remains the transcription provider.

Existing fixture companies show **Use Meta now** in the role workspace. It
updates both the browser's request mode and the shared company's generation
mode without removing assignments or drafts. A temporary fixture company was
switched to live mode, and its next software-engineer task returned
`mode=live, provider=meta`; the temporary company was then removed. The public
health route returned `ok`, the new button appeared in a browser check, and
the optimized build, TypeScript, and targeted lint passed. A final function
rename addressed the lint rule without changing runtime behavior.

## Engineering workbench refinement (2026-10-25)

Code assignments now give **Your work** more room than **The assignment** on
wide screens and stack the two sections on phones. **Ask Maya** is a floating
button that follows the student while scrolling and opens the existing coach
conversation in a focused panel. The assignment shows one supplied input and
expected output. New local code exercises have explicit starter scaffolds with
a TODO for the student to complete. Existing saved drafts still open as saved;
an older draft is not silently replaced with the new scaffold.

The isolated optimized build and its TypeScript stage passed. Browser inspection
at desktop and 390px phone width confirmed the larger editor, no horizontal
overflow, fixed coach button, dialog focus, and scroll behavior. A foreground
browser run returned the expected failing checks for an unfinished draft. The
two-student Stage 2 browser test reported a pass, including the new workbench
assertions and the shared PRD, pause, code checks, and review flow. The updated
build is served on port 3000 through the existing tunnel; the public health
route returned `ok`. The first isolated Stage 2 run failed at company creation
because its review server stopped responding; the rerun against the main server
reported the test case as passed, though the runner lingered after the result
and was stopped. Targeted ESLint on the changed TypeScript files passed. The
full ESLint pass before the isolated build finished with one focus-ref warning;
that warning was fixed and the targeted rerun passed. A later full ESLint scan
was stopped because scanning the additional build output was unusually slow.

## Five illustrated offices integrated (2026-10-25)

The company workspace now uses the five authored Three.js rooms from the
standalone office gallery: a software studio, bank, restaurant, semiconductor
lab, and creative office for Your own idea. Each room has its own layout,
furniture, lighting, planting, palette, and seated coworkers. The 3D people
remain linked to the five selectable roles, and the room sign uses the actual
company name. Customer meetings animate a coworker and guest into the room.
Orbit, reset, role focus, reduced motion, the WebGL fallback, and the stable
scene height beside an expanded role card remain available.

Visual and interaction checks on the isolated review server and the live local
server at port 3000 passed across all five presets at 1440 px, with a 390 px
phone check. The check clicked a 3D
coworker, expanded Data Analyst without resizing the stage, completed a sales
meeting, orbited through a reverse view, and reset the camera. Captures are in
`docs/screenshots/office-integrated-*.png`. ESLint, TypeScript, 38 unit tests,
and the planning harness passed. Both the isolated and default optimized
production builds passed. The existing `cloudflared` process still routes
`ascendsim.tech` to port 3000. Local and public HTTPS `/api/health` both
returned 200. The earlier
office descriptions below record their state at the time; this section is the
current implementation.

## Ascend UI redesign live (2026-10-25)

The approved My companies and company-entry redesign is running on the local
production server at <http://127.0.0.1:3000> and through the existing named
tunnel at <https://ascendsim.tech>. A fresh public browser showed the new
carousel, labeled navigation, five preview images, and no extra WebGL canvas.
The production health route and the isolated review build both returned 200.

First-time browsers see a centered, five-company illustrated carousel with
visible arrows, keyboard and touch selection, slow idle advance, and a still
state for reduced motion. The name and Just me/Two students, Practice/Real
world, and Startup/Mature settings are directly below it. The carousel keeps
name and brief drafts for each preset while browsing. Returning browsers
see visual cards for companies saved in that browser, each with an Open action;
the top navigation links My companies, Create, and the current company. The
office and role workspace use the same navigation. The previews are cropped
from the approved concept board and are distinct visual introductions, not
exact captures of the procedural rooms. The interactive 3D office is unchanged.

Restart demo now has a native, named confirmation that states which company and
shared material will be removed. Source excerpts and company events open in a
temporary desktop detail panel or phone sheet. Team conversation has a labeled
phone sheet while retaining its desktop column. Existing learning, code checks,
retrieval, coaching, voice, meeting, collaboration, and simulation flows remain
in place. Wider button/notice ideas in `UI_DESIGN.md` remain guidance rather
than a claim that every control was restyled.

Checks: ESLint, TypeScript, 38 unit tests, and both isolated and default
optimized production builds passed. The focused browser library test passed
after checking role-to-library navigation, two saved companies, Cancel/confirm
Restart behavior, desktop/phone layouts, mobile menu, keyboard selection, and
reduced motion. The existing workplace browser test passed at 1440 and 1280
widths, including 3D orbit/reset, source detail focus return, mobile team
conversation, retrieved task, and code checks. The two-browser Restart and
fixed-stage office tests also passed at their applicable widths. One earlier
combined browser run failed because the new test tried to click an offscreen
carousel item while reduced motion had stopped auto advance; the test now uses
the visible arrows and passed on rerun. The final combined suite was not
rerun after that test correction. A separate two-student browser rehearsal
passed with event detail, PRD exchange, shared Pause, reviewed code work, and
Resume. The final complete ESLint run and TypeScript check passed. The separate
review server and its build files were removed after deployment; port 3000 is
the only running Next.js server. After the last carousel draft fix, lint,
typecheck, the default production build, and the focused library browser test
passed on port 3000; the public page and `/api/health` returned the new UI and
200 respectively.

Screenshots: [creation desktop](screenshots/ascend-redesign-creation.png),
[creation phone](screenshots/ascend-redesign-creation-mobile.png),
[My companies](screenshots/ascend-redesign-library.png), and
[phone menu](screenshots/ascend-redesign-mobile-menu.png).

## ascendsim.tech public demo (2026-10-25)

<https://ascendsim.tech> now serves the local production app through the
approved named Cloudflare tunnel `ascendsim-demo`. The registrar uses only
`cody.ns.cloudflare.com` and `rosalie.ns.cloudflare.com`; Cloudflare reports
the zone Active. The tunnel DNS CNAME points the domain to tunnel
`ede42583-1ed1-4729-989e-b4d03ef39969`. Four Cloudflare edge connections
registered successfully. An external HTTPS request to `/api/health` returned
200 with app status `ok`, and the public two-browser fixture test passed: a
student joined, uploaded fictional text, and **Restart demo** removed the
company for both sessions. A headless screenshot of the public landing page is
at [ascendsim-public-home.png](deploy/ascendsim-public-home.png).

The connector, Next.js app, and local SQLite, Redis, Neo4j, and Milvus services
must keep running on this computer for the public site to work. Tunnel config
and credentials are under ignored `web/data/cloudflare/`; do not commit or
share the credential JSON. `web/data` is ignored. The earlier temporary
`trycloudflare.com` escalation was rejected by automatic approval review and
was not retried. `/api/health` currently reports `bedrockConfigured: false`,
so the live text fallback is Meta; Sonnet remains unrehearsed. Plain HTTP
currently returns 200 rather than redirecting to HTTPS. Share the `https://`
URL and enable Cloudflare's Always Use HTTPS before accepting real uploads.

The production app also responds locally at <http://127.0.0.1:3000>, and the
SQLite, Redis, Neo4j, and Milvus service check passed. The full app requires
these local services.

**Restart demo** now requires confirmation and a current company session. It
deletes that company's shared participants, messages, artifacts, run, events,
and uploaded passages from SQLite/FTS, Milvus vectors, Neo4j graph references,
and Redis coach turns. Other companies remain. It clears the initiating
browser's company keys; another participant is sent home and clears its keys
on the next shared-state poll. Uploads now require a company session and same
origin. The focused service test passed (2 tests), as did the production build,
typecheck, and a two-browser Playwright reset test against the local services.
The browser check uploaded a fictional text note, restarted from the first
student, and observed both students return home and the API return 404 for the
deleted company. The fictional Demo Bank PDF requested for a later turn has not
been created.

## Ascend interface cleanup (2026-10-25)

The product now uses **Ascend** and the line “Learn by doing in an AI company
simulator.” The company setup page keeps its five company types, participant
count, Practice/Real world mode, and Startup/Mature setting, while showing a
single selected-company description and moving the editable brief and size
under **Company details**. Choosing **Your own idea** opens that brief. The
landing page uses a 30 KB still of the existing miniature office instead of
mounting a second live WebGL scene; the interactive 3D office remains in the
company workspace. The learning page has a shorter role introduction and less
repeated setup copy, bringing the teaching and task controls higher.

At 1280×720, the setup page's measured full height fell from 1,957 px to
823 px, and the entry button begins at 668 px. At 390 px width, there is no
horizontal overflow or landing canvas. A production browser check confirmed
the office still has one canvas and the role workspace still shows all five
roles and the existing task controls. The mobile reduced-motion check measured
the entry button transition at effectively zero. Screenshots: [desktop setup](screenshots/ascend-cleanup-desktop.png),
[mobile setup](screenshots/ascend-cleanup-mobile.png),
[office](screenshots/ascend-cleanup-office.png), and
[software engineer](screenshots/ascend-cleanup-role.png).

The `ai-slop-cleaner` skill was installed from
[Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode/tree/main/skills/ai-slop-cleaner)
and used with the installed Taste and Finesse UI guidance. Final local checks:
lint, typecheck, 36 unit tests, and optimized build passed. The current
production browser suite passed seven scenarios with three project-inapplicable
skips when Playwright wrote artifacts to the system temp folder. The earlier
OneDrive test-artifact disappearance and generated-build file lock were local
filesystem issues; the final default `.next` build and localhost production
server passed. The site is at <http://127.0.0.1:3000>.

## Baseline ready

The approved single-student prototype is running locally at
<http://127.0.0.1:3000>. It includes company creation by an offscreen Meta
supervisor, a polished interactive isometric office, five selectable
conversational coaches, teach-or-task choice, sourced assignments, iterative
reviews, a JavaScript editor with isolated checks, text customer roleplay, and
opt-in voice. Bank and restaurant presets share the same office layout for this
baseline. The company/session persists locally; attempts and progress survive
refreshes and role switches. Login, multiplayer, alternate floor plans, and AWS
deployment are later work.

Redis stores company-and-role chat turns. Milvus indexes local MiniLM embeddings
of public and uploaded passages. Neo4j links companies, roles, products,
issues, tasks, documents, and passages. SQLite persists source text and
estimated AI usage. Eighteen attributed public sources cover the five roles,
including three downloaded PDFs. A text-based user PDF or pasted text can be
uploaded and retrieved with visible provenance. Scanned-image PDF OCR is not in
this baseline.

## Final verification

- `npm.cmd run lint` and `npm.cmd run typecheck` passed after the final editor
  change. `npm.cmd test` passed 26 focused tests. The optimized production
  `npm.cmd run build` passed after moving aside a OneDrive-locked generated
  `.next` cache; the failure was on cache deletion, not application code.
- `npm.cmd run test:e2e` passed both 1440-pixel and 1280-pixel production
  browser flows: create a fixture company, enter the office, open engineering,
  retrieve a sourced task, and run the starter checks. The browser runner smoke
  passed all five role paths, uploaded grounding, customer chats, written
  reviews, failed/corrected code checks, revision, persistence, both widths,
  network/storage isolation, syntax errors, timeout recovery, and output cap.
- A separate live API rehearsal passed all five roles using Meta Muse Spark
  for task, coach, and review. Sales and support also passed live customer
  conversation. Each role retrieved Milvus passages; engineering used live
  SerpApi research. The app explicitly labels fixture paths and search-result
  snippets.
- Meta transcription returned a real spoken transcript through the browser
  Start/Stop voice path using a fake microphone that played a public speech
  sample. A customer reply triggered browser speech synthesis. Permission
  denial retained text input. Physical microphone and speaker output on the
  presentation device should be checked before the live pitch.
- Latest `npm.cmd run check:services` passed: SQLite 15 documents/52 passages;
  Redis `PONG` and a saved coach key; Neo4j 19 companies, 52 role-source links,
  315 task-source paths; Milvus collection with 52 flushed rows. These are
  historical check results; current source counts are recorded below.

The app stops paid Meta calls at $12 estimated Meta usage. The last recorded
local estimate after the earlier five-role rehearsal was about $0.12; provider
billing is authoritative. Credentials stay in ignored `web/.env.local`.
The SerpApi key shown in an earlier screenshot should be rotated if it is the
same credential used locally.

## Bedrock presentation integration

The user approved Bedrock Sonnet 4.6 for the supervisor and software engineer,
with automatic Meta fallback and a labeled fixture if neither provider can
answer. The other four roles and Meta voice keep their existing provider path.
The local data services remain unchanged; no EC2 instance is used. A separate
$24 estimated Bedrock usage stop accompanies the existing $12 Meta stop.
Every text API response reports `provider: bedrock | meta | fixture` so a
rehearsal can confirm which model actually answered. The `jenkins-blueocean`
container was stopped without deleting it, releasing its approximately 2.1 GB
working memory footprint observed before the stop.

Implementation checks: lint and typecheck passed; 29 unit tests passed;
the optimized production build passed. The production browser suite exited
cleanly with four passing scenarios and two project-inapplicable skips.
With the local server granted network access, the paid five-role live rehearsal
passed: all five roles returned live sourced tasks, coaching, and reviews;
sales and support returned live customer turns. Redis, Milvus, Neo4j, and
SQLite passed the service check (16 documents and 53 passages). The planning
harness also passed. A live Bedrock rehearsal has **not** passed yet:
`AWS_BEARER_TOKEN_BEDROCK` was not configured at the last check. The prepared
opt-in rehearsal command is
`node scripts/rehearse-bedrock.mjs --live` from `web/`. Do not claim Sonnet is
live until all four steps print `provider: bedrock`.

## Learning workspace responsive polish

A browser audit found one weak point in the otherwise polished flow: at phone
widths, the coworker icon, identity, role, and availability badge competed in a
single wrapping row. Long role names collapsed into an overly narrow text
column and made the introduction card much taller than its content warranted.
The introduction now uses a compact two-column mobile composition, gives the
identity copy a reliable minimum width, places coach availability on its own
row, and returns to the existing flexible desktop composition at the `sm`
breakpoint. The horizontal five-role picker keeps touch scrolling while hiding
its decorative scrollbar.

The change preserves all five roles, the office and orbit controls, coaching,
coding, voice, retrieval, meetings, reduced-motion behavior, and the warm
editorial palette. No GSAP was added; the existing Motion and Three.js behavior
was left intact. A Playwright regression assertion now requires the mobile role
heading to retain a useful width, remain visible with coach availability, and
avoid document-level horizontal overflow.

Final captures are [desktop office](ui-polish/office-desktop.png),
[desktop learning workspace](ui-polish/workspace-desktop.png), and
[mobile learning workspace](ui-polish/workspace-mobile.png). Browser checks at
320, 390, 768, and 1280 pixels showed no horizontal overflow. ESLint,
TypeScript, all 26 focused tests, and the optimized build passed. Playwright
passed four scenarios across desktop and compact-desktop projects; the two
project-inapplicable duplicate touch cases were skipped. Taste lint reported
zero failures (advisory warnings remain for the established shadow and section
numbering language), and the Finesse detector reported zero P0 findings.

## Operation

See [DEMO.md](DEMO.md) for startup, presentation sequence, and recovery. Docker
Desktop must stay running with `hacktx-redis`, `hacktx-neo4j`, and
`milvus-standalone`. The verified production server is currently on port 3000
with Meta live access. Restart it after adding the Bedrock key so Next.js reads
the new environment value. The
downloaded sources, local model, database, and generated cache live in ignored
`web/data/` or `web/.next/`; preserve `web/data/` for the demo.

## Stage 2 collaboration and simulation

The user confirmed and then requested implementation of the
[Stage 2 PRD](STAGE2_PRD.md). The local app now offers Single/Collaborative,
Practice/Real world, Startup/Mature, and bank, restaurant, software,
semiconductor, or custom setup. Two named students can share a company through
an invite link. The server enforces two seats, scoped sessions, and one shared
thread; either student can enter any of the five roles. Support can write a
customer problem brief/PRD and engineering can read it, clarify the need, and
implement a feature in a left issue/right editor workspace. Coach memory is
scoped to each participant. All five AI coworkers can make bounded, labeled
internal drafts on request; approval mode holds a draft until a student
approves or rejects it. No external action is performed.

Real world mode uses a company and stage-specific event catalog that advances
about every five seconds while a participant is on the company or role page.
The five-role event cycle explicitly labels simulated outcomes. Pause freezes the shared run,
creates a contextual role task through the existing provider fallback, and
lets one student claim it. Review and revision reuse the baseline learning
flow; a failed code check remains an attempt needing work, and a passing
checked attempt completes the paused task. An abandoned run is erased after
the last session expires; shared messages and Practice progress remain.

Verification so far: lint, typecheck, 36 unit tests, optimized build, the
fixture HTTP smoke (two seats, PRD read, all five AI draft roles, approval
Reject and exactly-once Approve, shared Pause/claim/Resume, and deletion of
the temporary run after both leave), and production Playwright passed. The
browser flow used two isolated contexts on one computer and exercised a
support PRD, engineer clarification and reply, failing then passing code
checks, revision, shared Resume, a keyboard-dismissable artifact dialog, and
a 390-pixel stacked editor with no horizontal overflow.
The full production browser suite passed five scenarios with three
project-inapplicable skips. Baseline Redis, Neo4j, Milvus, and SQLite service
checks passed. Captures: [company](stage2-captures/company-desktop.png),
[engineering](stage2-captures/engineering-desktop.png), and
[phone engineering](stage2-captures/engineering-mobile.png).

The LAN-bound production server passed the fixture smoke through the host's
private Wi-Fi address. An opt-in paid Stage 2 rehearsal also passed with
`provider: meta` for supervisor creation, an engineering AI handoff, and a
contextual Pause task. One earlier supervisor attempt fell back to a fixture
after an invalid Meta response; the successful rerun confirms recovery, not a
guarantee that every live generation succeeds.

On October 25, the physical two-device rehearsal passed over a phone hotspot.
A host browser created a mature bank Real world run, posted a support PRD, and
shared an invite. Daniel joined from the phone as the second participant and
sent an engineering clarification; the host observed the named message. Daniel
paused the shared company at event 48, the count stayed fixed, then resumed it;
the host observed running status and events 49 and 50. The first attempt on the
campus Wi-Fi did not reach the join form. Windows had a Public-profile Node.js
inbound block, so a temporary exception limited to the phone's hotspot IP and
TCP port 3000 was used for the successful rehearsal. Its four-minute timer
restored the original TCP block; the rule state was verified and the temporary
helper was removed. A Cloudflare tunnel attempt was denied by
the environment's network permissions and was not needed for the pass.

`/api/health` reports `bedrockConfigured: false`, so Sonnet remains unverified.
The deterministic event feed needs no model call. Temporary runs
are stored in local SQLite and resume after a short restart if a participant
returns before the presence expiry; otherwise the cleanup sweep erases them. The
[Stage 2 build plan](STAGE2_BUILD_PLAN.md) and
[task queue](../harness/stage2-tasks.json) retain these verification gates.
The queue records all ten Stage 2 implementation and integration tasks as done.

## Office character-selection redesign

The user confirmed the office-focused motion brief in
[UI_REDESIGN_BRIEF.md](UI_REDESIGN_BRIEF.md), and the redesign is complete.
The five-role menu has an interruptible Motion spring arrow and elastic cards;
hover and keyboard navigation preview a coworker, while click or Enter
confirm. Characters have restrained idle, hover, and selection responses,
with matching work-area highlights and a gentle entry/return camera path.
The selected Start action remains available as the pointer crosses the menu.
The company palette, deterministic meeting path, and learning flows remain;
the scene received the detailed floor-plan update below.

Final office captures at 1440×900, 1280×720, and a 390-pixel narrow view are
in `docs/ui-redesign/`. Both desktop views show the full office, all five
roles, and the Start action without scrolling. The current optimized build
passed; lint, typecheck, and 26 focused tests passed. Production browser tests
passed the role selection, office return, all five role routes, sourced
engineering task/editor/checks, narrow and reduced-motion behavior, and a
touch route with WebGL disabled. Actual frame rate and physical-device touch
have not been measured.

## Detailed orbitable office

The user approved an original, larger miniature inspired by an ITHappy office
render. The shared office scene now has a named reception, meeting space,
product desk, engineering/data work area, lounge, kitchenette, more furniture,
and five visible clickable coworkers. Mouse or touch drag rotates the camera
through 360 degrees; tilt/zoom are bounded and Reset view restores the default
angle. Exterior walls fade when viewed from behind. Role entry still focuses
the selected coworker; returning starts at the default office angle. The
sales/support coworker and customer still follow fixed paths into the meeting
room. The model is original project geometry.

Final production screenshots are
[desktop](ui-redesign/floorplan-desktop.png),
[rotated](ui-redesign/floorplan-orbit.png),
[meeting](ui-redesign/floorplan-meeting.png),
[compact desktop](ui-redesign/floorplan-compact.png), and
[narrow](ui-redesign/floorplan-mobile.png).
The optimized build, lint, typecheck, and 26 focused tests passed. Production
Playwright passed four scenarios across desktop and compact sizes: role routes,
sourced engineering work, mouse orbit and Reset, fixed meeting arrival, touch
orbit and Reset, and touch selection with WebGL disabled. Three repeated
touch-orbit runs also passed. Physical-device performance and audio remain
presentation checks.

## Public knowledge curation (October 25)

The shared five-role library now has 18 cited public documents and 89 passages
in SQLite. This session added ten official pages: Google SRE and MDN for
engineering; Australian government marketing plans and the 5 Ps for sales;
Australian government complaint handling and customer communication for
support; Digital.gov user interactions and usability testing for product; and
NIST scatter plots and histograms for analysis. All ten returned indexed
Milvus passages and recorded Neo4j links. Role-filtered SQLite search found a
relevant new passage for each role. The source manifest is
[`web/src/lib/retrieval/catalog.ts`](../web/src/lib/retrieval/catalog.ts).

Measured persistent storage after ingestion was 760,545,666 bytes across
`web/data`, Neo4j data/logs, Milvus, and Redis, below the planned 1.8 GB
public-ingestion stop. This was a manual curation batch; the daily background
curator, scheduler, and control page are not implemented. The production app
still listens on 127.0.0.1 only; the approved named Cloudflare tunnel above
provides the public route without binding the app to the LAN. An earlier
request to bind on 0.0.0.0 was rejected by automatic approval review, and the
server was restarted on localhost.

## Company-specific office refinement (October 25)

The office redesign now follows a generated concept board created before the
Three.js edit, saved as
[company-presets-concept.png](ui-redesign/company-presets-concept.png). The
reference established five distinct preset directions: a calm bank with teller
and secure-service cues, a warm restaurant with dining and open-kitchen cues, a
software studio with planning boards and a server rack, a cool semiconductor
lab with benches and equipment, and a modular custom studio. The implementation
uses shared procedural geometry and preset-specific palettes, furnishings, and
architectural details rather than loading the concept image into the runtime.

The five presets now have authored room-level geometry rather than palette-only
variation. Shared desks include drawer pedestals, dual monitors, keyboards,
desk objects, and wheeled task chairs. The bank adds a navy feature wall,
financial-institution mark, teller/service areas, glass offices, and a client
table. The restaurant replaces the generic meeting room and kitchenette with a
terracotta dining floor, multiple guest tables, pendant lights, an open service
counter, kitchen storage, and planting. The semiconductor preset similarly
replaces those generic rooms with lab benches, instruments, cleanroom glass,
equipment cabinets, and a chip-process board. Software and custom offices add
planning boards, bookshelves, planting, storage, and collaborative furniture.

Four coworkers now use explicit seated workstation poses aligned with their
chairs and monitors; the product manager presents beside the planning area.
Seated coworkers type and look around subtly, while the existing sales/support
meeting route changes them back to a walking pose. Framed glass dividers make
the desk stations read as office pods. The surrounding page uses a restrained
Slack-inspired cream, aubergine, lavender, peach, and dusty-green system while
preserving the existing role colors, controls, accessibility, and interaction
flows.

The office stage and coworker panel now have independent stable desktop
dimensions. Expanding the Data Analyst or another role card no longer resizes
the WebGL canvas. A focused Playwright regression passed at 1440x900 and
1280x720 and requires the stage width and height to stay within one pixel while
the card expands. On October 25, the denser five-preset implementation passed
ESLint, TypeScript, all 38 focused tests, both desktop fixed-stage browser
projects, five direct visual renders, and the optimized production build. The
new production build was restarted on local port 3000, and the public
`https://ascendsim.tech/api/health` route returned status `ok`. The
broader desktop workplace scenario reached the
later mobile workspace check, where the current branch expects `Ask Amira` but
the rendered workspace does not contain that copy; this is outside the office
change and remains an outstanding full-suite mismatch.
