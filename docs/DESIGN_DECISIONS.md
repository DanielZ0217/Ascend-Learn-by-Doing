# Visual and Technology Decision Round

Recorded: 2026-10-24, America/Chicago.
Status: setup decisions confirmed by the user on 2026-10-24. The web stack,
selected coworker representing the student, and fixed-path meeting animation
are approved. Begin setup now; detailed layout work can follow later. User
screenshots establish $50 Meta promotional credits and SerpApi free/extra
credits, but authenticated API access has not been tested.

## Current implementation decisions

### Small demo interaction changes — confirmed 2026-10-25

Collaborative companies use the same invite and session model with up to five named students. Each student can still switch among all five roles; adding seats does not add distinct coworker agents. Students can leave an engineering assignment for the open practice prompt and resume the saved task. The first engineering prompt accepts a natural-language question for Maya; conceptual questions use a written explanation task, while task-first engineering keeps the checked code exercises. My companies exposes Delete with the existing confirmed company cleanup behavior.

### Presentation provider routing — confirmed 2026-10-24

The user approved a narrow hybrid AI change for the imminent single-student
presentation. The offscreen supervisor and software engineer try Claude Sonnet
through Amazon Bedrock in `us-east-1`, then Meta Muse Spark, then the explicitly
labeled local fixture. The other four coworkers continue to try Meta first and
use the labeled fixture if it is unavailable. Meta transcription and browser
speech output retain their existing paths. The Next.js app and Redis, Milvus,
Neo4j, and SQLite remain local; no EC2, Neptune, OpenSearch, or S3 migration is
part of this presentation change. Jenkins can stay stopped while HACKTX runs.
Freeze application changes after a real Bedrock rehearsal passes.

- Install Next.js, React, shadcn/ui primitives, Three.js/React Three Fiber,
  Motion, and an embedded JavaScript editor in the project, not as global skills.
- Author one initial company scene, then refine the distinct office/restaurant
  layouts later. Preserve bank and restaurant scenarios; software-company
  support can reuse the office shell when implemented.
- The selected coworker represents the student during exercises. Guest and
  coworker always use the same designated meeting room and authored walking
  sequence. No agent, physics simulation, or autonomous pathfinding controls
  character movement.
- Default to Meta Muse Spark 1.3 for coaching/review and Muse Voice Transcribe
  1.0 for speech recognition. Use browser speech synthesis for initial spoken
  output, with text fallback; quality depends on the demo device. This avoids
  requiring an unconfirmed OpenAI account. These are implementation defaults
  under the user's authorization to choose models using the available credits.
- Use SerpApi as a server-side research tool chosen by the coach, with cached
  selected-page excerpts and citations. Keep marketing's curated local RAG.
- The SerpApi key visible in the screenshot must not be copied into code or
  configuration. The user was advised to rotate it and configure a replacement
  locally. No key from a screenshot has been used.

## Detailed office and 360-degree orbit — confirmed 2026-10-24

The user supplied a larger isometric office image and confirmed a follow-on
scene rebuild. The "ithappy" watermark points to a
[commercial office model pack](https://www.fab.com/listings/8e3fbfdf-1dc7-4b2e-8b6a-1d90bace2baf),
not a Codex skill; the user chose an original scene inspired by its multi-room
layout rather than cloning or purchasing that asset.

- All company presets use one richer office diorama for this demo. The company
  name appears on reception signage. The scene has recognizable reception,
  meeting, product work, engineering/data desks, lounge, and kitchenette areas.
- Mouse and touch drag orbit horizontally through 360 degrees using the
  installed React Three Fiber/Drei controls. Tilt and zoom have bounds; Reset
  view restores the default angle. The selected role still gets a short camera
  focus before entry. Returning from a role also starts from the default angle,
  which supersedes the earlier camera restoration behavior.
- Perimeter walls fade from the outside so the furnished interior remains
  visible during orbit. Character clicks ignore pointer movement used for
  dragging. Sales/support and the guest keep an authored route into the same
  meeting area. Reduced-motion, touch, and no-WebGL paths remain usable.

The new model is procedural original geometry in `web/src/components/company/`.
It reuses the five role IDs and existing learning routes. This is a visual
scene change, not an alternate-layout engine or autonomous character system.

The research below records alternatives and visual rationale. The current
decisions above supersede earlier provisional recommendations.

## New user direction

The user supplied a ROOMZ collage in the conversation. It depicts furnished
isometric miniature rooms with cutaway walls, detailed furniture, soft shadows,
warm lighting, varied color palettes, and a polished stylized appearance. The
attachment is visible in the conversation; it has not been saved as a local
image asset. This description preserves the direction for future coding agents.

The user wants a larger company environment, not a single square room:

- Layout and furnishing should fit the business. A restaurant should look like
  a restaurant; a software business should have workspaces and meeting rooms.
- Multiple connected functional zones should be visible in the company.
- Starting a customer meeting should include characters walking to a meeting
  space and a newly generated customer entering.

The later confirmed office-orbit decision above resolves the camera controls
and keeps one shared detailed floor plan for this demo. A software-company
preset has not replaced the approved bank preset.

## Proposed rendering and UI stack

Keep Next.js/React/TypeScript. Use editable shadcn/ui components for the ordinary
web interface, Three.js through React Three Fiber for the 3D company, and Motion
for panels and interface transitions. Character walk/idle/sit motion comes from
rigged GLTF assets and their animation clips, not from a UI component library.

Relevant GitHub repository counts observed through the GitHub API on 2026-10-24:

| Candidate | Stars | Category |
| --- | ---: | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | 126,440 | Editable React UI components; proposed choice. |
| [Material UI](https://github.com/mui/material-ui) | 99,263 | React UI system; alternative. |
| [Three.js](https://github.com/mrdoob/three.js) | 116,878 | Browser 3D renderer; proposed foundation. |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | 33,208 | React renderer for Three.js; proposed integration. |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | 26,221 | Browser engine; alternative for deeper simulation. |
| [Motion](https://github.com/motiondivision/motion) | 34,498 | Interface transitions; proposed choice. |
| [GSAP](https://github.com/greensock/GSAP) | 29,694 | Animation timelines; alternative. |
| [Godot](https://github.com/godotengine/godot) | 119,008 | Full game engine with web export. |

These are shortlisted relevant projects, not an exhaustive highest-stars
ranking. Stars do not establish visual quality or fit. The recommendation is
based on combining a React learning workspace, embedded editor, voice, and a
3D scene within the existing web application.

[R3F](https://r3f.docs.pmnd.rs/getting-started/introduction) integrates scene
objects with React. [Babylon navigation](https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/)
is relevant if navigation/simulation grows substantially. A separate
[Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
adds a game project and export boundary. Prefer the proposed React approach for
this prototype; this is an engineering judgment, not a capability limitation.

## Proposed scene design

- Camera: orthographic/isometric cutaway, controlled zoom/pan, smooth focus on
  the selected workspace; avoid hiding essential rooms behind full-height walls.
- Geometry: two authored floorplans, not procedural generation. An office has
  reception, working area, meeting room, and lounge. A restaurant has entry/
  counter, dining, kitchen, and a small staff/meeting area.
- Reuse the office shell for bank and software-company contexts with appropriate
  props and signage if the user confirms the additional company option.
- Meeting movement: selected coworker walks along known waypoints; a temporary
  customer enters; both reach designated spots; camera focuses; the conversation
  panel opens. Keep this skippable and support reduced motion.
- The selected coworker representing the student during the activity is a
  proposal, not yet a confirmed identity model. The mentor can remain in the
  coaching panel; a separate student avatar would change the scene roster.
- Use explicit scene states tied to application actions. Do not make LLM calls
  decide every footstep. No physics, free-roaming controls, or general crowd
  navigation is needed for the proposed meeting sequence.

Reusable assets are a practical starting point, not an automatic match to the
reference. Art direction, asset consistency, lighting, layout, and finishing
still require work. Verified candidates:

- [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit): 140 3D furniture assets, listed CC0.
- [Kenney Mini Characters](https://kenney.nl/assets/mini-characters): animated character assets, listed CC0.
- [Quaternius Sushi Restaurant Kit](https://quaternius.com/packs/sushirestaurantkit.html): modular restaurant interiors, food, and animated characters, listed CC0.

Check the downloaded pack's actual license and file compatibility when selecting
assets. No assets have been downloaded or incorporated during this research.

## Proposed model choices

Use one shared text model with five role prompts, source contexts, and rubrics.
Actual JavaScript checks provide execution evidence independently of AI review.

- Default if OpenAI access is available: `gpt-6.1-sol` for teaching, assignments,
  and review. The [model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
  documents structured outputs, web search, and file search. Use provider search
  for engineering research; the small local marketing retrieval index remains
  a suitable implementation.
- Spoken roleplay: `gpt-live-1`. The [GPT-Live guide](https://developers.openai.com/api/docs/guides/live)
  documents browser WebRTC audio and backend integration. Access has not been
  verified. Transcript capture and review must be exercised in the real app.
- Meta route if sponsor requirements/access favor it: `muse-spark-1.3` for text
  and optionally `muse-voice-transcribe-1.0` for recognition. The
  [Meta API overview](https://dev.meta.ai/docs/overview) documents hosted model
  access and makes clear that its transcription model does not synthesize
  speech or provide a complete speech-to-speech conversation service. Choose
  spoken output separately if using that route.

The user has now shown $50 Meta credits and SerpApi 0/250 monthly searches plus
1,000 extra credits. Exact access, expiry, and sponsor-track rules remain
unverified. Prefer the confirmed credit ecosystem; no provider calls have yet
been made. See `PROVIDERS.md` for the current defaults and budget estimate.

## Design contract to finalize after this round

The purpose is career practice for students; the primary action is selecting a
coworker and starting a learning activity. Tone: warm, polished, playful company
scene surrounding a calm professional task workspace. Memorable interaction:
a customer meeting visibly assembles before the practice conversation begins.

Keep company/role context and the current task more prominent than decoration.
Retain the PRD's 1440x900 and 1280x720 presentation checks. Record loading
(assets/model request), empty (no assignment), error (provider/runner failure),
partial (missing sources), success (review), and permission (microphone) states
with visible feedback and a safe next action. No rendered UI has been built or
verified yet; this is a design contract proposal, not finish-gate evidence.

The user has confirmed the implementation direction. Continue the setup and
keep detailed scene authoring in its planned task; do not reopen this interview
for already accepted camera, stack, or deterministic movement choices.

## 2026-10-24 — Expanded local demo decisions and correction

The user confirmed a 10 p.m. Central local demo target, a supervisor that takes
the company prompt and creates the company and five employee agents, PDF upload
or pasted learning material for task creation, opt-in voice with text input,
and a $15 Meta testing target. Every coach must support a real conversation,
including teaching, questions, hints, and feedback. The software engineer must
have an in-browser coding window with Run and Submit. These requirements amend
the earlier PRD statement that user-managed document ingestion was deferred.
The baseline still uses one scene layout and fixed meeting animation.

The current recommended implementation is one Meta Muse Spark 1.3 text adapter
with distinct role profiles and state, SerpApi for verified web research,
SQLite FTS5 for local document retrieval, and no AWS dependency for the local
demo. The technical routing is in `PROVIDERS.md` and `BUILD_PLAN.md`; it is a
recommendation pending final plan sign-off, not a claim of live integration.

Open details for that sign-off: whether the supervisor appears as a character,
whether one text-based PDF or pasted text per session without OCR is enough,
and whether local SQLite/FTS5 is accepted for the 10 p.m. baseline. The earlier
proposed two-floorplan design above was superseded by the user's one-layout-first
decision; the alternative model
discussion above remains historical research, not current provider routing.

## 2026-10-24 — Memory and source expansion requested

The user asked for Redis Open Source session memory for each coach, Milvus Open
Source vector retrieval, Neo4j Open Source graph retrieval, and public PDF/web
learning material ingested for every role. This request reopens the 10 p.m.
architecture decision. In the next round the user confirmed that all three
services and all five coaching flows should run by 10 p.m. The intended graph
connects company, roles, products, customer issues, tasks, and source passages.
Coach chat is scoped to its company while attempts/progress persist across
visits. The previous SQLite-only recommendation is superseded for the target
architecture; SQLite may still hold durable relational records if needed.
Exact requirements are in `PRD.md`; runtime prerequisites are in `STATUS.md`.
No service installation or source ingestion is claimed here.

## 2026-10-24 — Expanded design confirmed for build

The user chose a local Docker Desktop/WSL2 first attempt for Redis, Milvus, and
Neo4j, alongside a small local embedding model. The supervisor works behind
the scenes, without a sixth character. One text-based student PDF or pasted
text per company is sufficient for the first demo; curated public sources can
contain multiple PDFs and webpages for all five roles. Scanned-PDF OCR is
deferred. Procedural memory remains stable role instructions and rubrics in the
app. Redis holds per-coach company conversations; attempts and learning
progress persist across visits. The user wants the three services and all five
coaching flows live by 10 p.m. Central. This resolves the interview; the
runtime's actual health and provider credentials still require verification.

## 2026-10-24 — Coworker work and handoff direction requested

After the single-student baseline was built, the user requested a procedural
memory for the supervisor's future agent construction. Coworkers should retain
their coaching function while also performing simulated role work. They should
exchange visible handoff messages, including a support-authored PRD sent to an
engineer and the engineer's follow-up questions. This workflow should later
accept two students on separate computers. Security is a required part of the
expansion. The requested intent and proposed controls are in
`AGENT_PROCEDURES.md`; approval rules, handoff routing, and multiplayer thread
visibility remain open. This is not implemented in the current local demo.

The first interview round resolved three branches: simulated internal handoffs
proceed automatically by default, with an approval-mode toggle for the
guardrails track; support sends its PRD directly to engineering; and future
multiplayer shares company handoff threads with sender identities while
coaching chats stay private. The scope of agent work, approval-toggle coverage,
and workflow trigger/stop rules remain open in `AGENT_PROCEDURES.md`.

The second interview round resolved the remaining workflow branches: agents
perform internal simulated work only; approval mode is a company-wide setting
that gates agent handoffs and shared artifact changes when On; and a student
starts a bounded run with Pause/Stop, with no continued work after the session.
The earlier open items above are now closed. The current app still has no
inter-agent runtime; `AGENT_PROCEDURES.md` is the future policy specification.

The user then confirmed the complete second-demo design. The procedural policy
is approved as a future build target. The existing single-student demo is
unchanged; approval of the design is not evidence of implementation.

## 2026-10-24 — Stage 2 collaboration and simulation scope confirmed

The user confirmed a separate planning harness for Stage 2, with no app feature
implementation in this turn. Company setup adds independent Single/Collaborative,
Practice/Real world, and Startup/Mature choices across bank, restaurant,
semiconductor, and existing company types. Two named students join one company
by invite link on the same LAN and can switch among all five roles. Students
author the initial support PRD and engineering feature; AI coworkers coach or
draft on request, and actual shared messages/handoffs show their authors.

Real world adds a company-specific simulated activity feed at about a
five-second cadence while a participant is present. A local event engine
advances the feed without a model call on each tick. Either student can Pause
the shared feed and take a contextual task; relevant existing submissions,
code checks, feedback, and revision still apply. The feed continues until the
last participant leaves or expires, then only its temporary run/history is
erased. Practice progress persists. The approved internal-only action and
approval policy remains; model work stays bounded even though the foreground
event feed can continue. Details and acceptance are in `STAGE2_PRD.md`.

## 2026-10-24 — Stage 2 local implementation boundaries

The user then explicitly requested implementation. The shared two-seat
company runtime uses SQLite for hashed invite/session credentials, participant
presence, attributed messages/artifacts, approval status, and the temporary
simulation run. Browser-local assignment drafts remain per student; Redis
coach history gains the authenticated participant ID for Stage 2 companies.
This keeps the existing single-student memory key readable. The foreground
event engine is deterministic and never spends model credits on each tick;
on-demand coworker drafts and Pause assignments use the existing provider
fallback and are labeled by provider. Approval mode gates requested AI
handoffs. Paused work reuses the existing checks and feedback; a failing code
attempt is recorded as needing revision, while passing checks complete it.
The physical LAN check and live Stage 2 model rehearsal remain verification
gates, not evidence of deployed or external agent work.

## 2026-10-25 - Generated office concept and preset identity

The user required a visual concept before further 3D implementation and asked
for warmer, more animated offices with correct seating and visibly different
company environments. The approved implementation reference is
`docs/ui-redesign/company-presets-concept.png`, generated from the three user
screenshots as a buildable low-poly concept board. It is design evidence, not a
runtime texture or a claim that generated geometry was imported directly.

The office keeps one navigable coordinate system so camera, role selection,
meeting paths, and browser checks remain stable. Presets vary their palette,
architecture, and role-specific props inside that system: bank teller/security,
restaurant dining/kitchen, software planning/server, semiconductor lab, and a
modular custom studio. Role stations are now an explicit shared spatial
contract between furniture and character placement. Four roles sit at their
assigned chairs; the product manager uses a standing presentation pose. The UI
chrome adopts the bundled Awesome Design MD Slack reference for warm cream,
aubergine, pastel atmosphere, and pill actions, adapted to the established
Ascend role colors rather than copied as product branding.

Preset identity is implemented as authored procedural furniture rather than
five textures or five copies of the scene. Restaurant and semiconductor replace
the generic meeting and kitchen zones with purpose-built dining/open-kitchen
and lab/cleanroom components. Bank, software, and custom retain the shared
office circulation while adding distinct walls, boards, shelving, storage,
tables, and planting. This keeps role and camera coordinates stable while
allowing the room silhouettes to differ at first glance.

The coworker selector may still animate its active card, but it must not control
the 3D stage height. Desktop stage and panel heights are therefore stable and
responsive; stacked tablet/mobile layouts return to content-driven panel
height. A dedicated browser regression measures the scene before and after the
Data Analyst expansion at both desktop project sizes.

## 2026-10-25 - Company entry carousel and My companies design approved

The user approved a design-only plan for company entry and return navigation.
First-time visitors see a centered company carousel; returning visitors first
see **My companies**, a browser-local list with an Open action and a clear
path to create another. Four business presets get distinct lightweight
renders of their miniature floor plans, and **Your own idea** gets a flexible
office preview. The selected company's name, description, and existing
participant, experience, and maturity settings sit beneath the preview.

The carousel advances slowly while idle, pauses on pointer, keyboard, or touch
interaction, and offers visible arrows and swipe navigation. Reduced-motion
users get a still preview with the same choices. The bundled Awesome Design MD
Airbnb reference informs image-led browsing and spacing only; Ascend keeps its
existing warm editorial palette and miniature-office identity. The company
office retains the real interactive 3D scene.

The office and role workspace should expose real **My companies** navigation
that does not restart the company. The library lists only companies saved in
the current browser because the app has no account sync; collaborators use
their invite links. Deletion remains the confirmed **Restart demo** action in
the office. Full behavior and later acceptance checks are in
`docs/UI_DESIGN.md`. No application changes were made for this decision.

The user further specified that the UI design guide's interaction catalog
should inform the broader product, including dashboard menus, company library,
office controls, learning workspaces, and collaborative simulation. The guide
now maps appropriate patterns to those screens. This broadens the design
reference, not the approved implementation scope: use only patterns that make
the current action or state clearer and retain accessibility and performance.

## 2026-10-25 - Cross-app interaction choices confirmed

After a second grill-me interview, the user confirmed that **My companies** is
a quick Open/Create dashboard with visual saved-company cards, rather than an
activity report. The UI guide applies across the app one screen at a time.
Primary navigation uses a labeled top bar and a labeled phone Menu drawer,
rather than an icon-only rail. Each screen has one clear primary action with
real pending, success, error, and retry states; a short check follows verified
success only. Motion stays calm and purposeful.

Task, source, and event details use a desktop right panel or phone bottom
sheet. Engineering keeps its existing left task/right code layout wide, so a
detail view is temporary rather than a permanent third column. Team
conversation has a labeled view and preserves message position. Restart demo
uses a focused confirmation explaining the deletion; success notices are brief
and errors remain visible. The already approved company carousel remains the
entry experience. These are design decisions documented in `docs/UI_DESIGN.md`;
no application feature implementation was authorized in this interview.

## 2026-10-25 - Approved UI design implemented

The user subsequently authorized implementation. The first page now opens
**My companies** when this browser has saved blueprints and opens company
creation on a fresh browser. Creation uses five lightweight illustrated office
previews, a centered carousel with visible arrows, keyboard/touch navigation,
and an idle advance that stops after interaction or under reduced motion.
Names and briefs stay with their preset while a student browses the carousel.
The concept images are previews of the company types, not exact captures of
the procedural 3D rooms. The existing interactive office remains the destination.

The shared labeled navigation links the library, creation, and current company
from the office and role workspaces. A named native dialog confirms Restart
before the existing deletion API runs. Source and event excerpts open in a
temporary right detail panel or phone bottom sheet. Team conversation keeps its
desktop column and gains a labeled phone sheet. These changes retain the
existing coaching, code checking, retrieval, meeting, voice, collaboration,
and simulation paths. The wider pattern catalog still guides future passes;
it does not imply that every button or notice has been redesigned.

## 2026-10-25 - Give engineering work and starter code more room

The user found the software engineer task hard to read and solve in the
three-column layout. For code assignments, the assignment and work now form
two responsive columns, with the editor wider on desktop and both sections
stacked on phones. The existing coach conversation opens from a fixed **Ask
Maya** button instead of taking a permanent third column. A visible input and
expected output and a more useful starter scaffold help a beginner start the
task while leaving the core implementation to the student. Saved drafts remain
untouched, and the existing browser code checks and review loop still apply.

## 2026-10-25 - Restore Meta for the demo

The demo proceeds with Meta Muse Spark for all live text work and Meta Muse
Voice for transcription. Bedrock has no configured key. A configured key alone
did not make the app live: the earlier server lacked outbound access and saved
fixture mode on company creation. The server now has outbound access, and an
existing fixture company can opt into Meta without deleting its saved work;
the switch updates both the browser and shared company settings.

## 2026-10-25 - Gallery offices become the company workspace

The user approved moving the five richly furnished Three.js gallery rooms into
the main company experience. Preset identity now comes from separate room
compositions rather than the earlier shared floor plan. Your own idea uses the
gallery's creative studio. The existing five role IDs remain the learning and
selection contract; each room maps its visible coworkers to those IDs. A sixth
lab figure is atmosphere only. The current company name appears on the wall
sign. Room walls hide when the camera moves behind them so the 360-degree
orbit still reveals the interior. The stage keeps a fixed desktop height while
the role panel expands.

## 2026-10-25 - Topic-matched engineering practice and large coworker lessons

The student chooses when to enter a challenge. **Teach me first** opens a
large, accessible coach conversation for any of the five roles; the task stays
out of the way until **Try the challenge**. The coach uses a plain-language
idea, a small example, then one student step, with hints on request. Closing
and resuming the lesson preserves the conversation and draft. An Expand
control makes every coworker's coach chat large without changing the customer
voice or submission flows.

**Give me a task** maps recognized engineering topics to vetted exercises with
stable checks. Ford–Fulkerson/network flow uses a capacity-limited company
routing problem; in a bank this is payment throughput to settlement. An
unrecognized engineering topic receives a guided explanation task rather
than an unrelated code question. Coach messages render basic Markdown and
copyable highlighted code blocks. Code blocks are for reading and copying;
the checked editor continues to run JavaScript only.

## 2026-10-25 - Browser-scoped learning preferences and reusable demo companies

An explicit lasting request such as “from now on, use Minecraft analogies”
sets a bounded explanation preference for that learner across all five coaches
inside the current company. A private browser cookie identifies the learner;
the preference lives in the existing SQLite database, not PostgreSQL. Other
students and companies do not inherit it. The preference appears in coach chat
and can be removed. One-off requests do not become durable instructions. The
labeled fixture fallback uses role-specific Minecraft examples when that
preference is saved; live coaching receives the style in its developer prompt.

Collaborative joining uses a short code shown only to the creator, with a
name entered by each guest on the website. The code works wherever the site
is reachable; it does not require the same Wi-Fi or email. The five-seat limit
still applies. The legacy invite route remains for existing links but is no
longer offered in the UI.

Restart demo is creator-only and resets work within the company: role tasks,
drafts, reviews, private and team conversation, uploads, retrieval indexes,
simulation state, and preferences. It keeps the company blueprint and settings,
evicts guests, and rotates joining credentials. My companies keeps permanent
Delete separate; guests can only remove their own browser shortcut.

## 2026-10-25 - Collaborative Practice assignment ladder

A collaborative Practice company offers one repeatable customer feature
scenario for each current team size from two to five. The scenario uses the
company preset and Startup/Mature setting. The required roles grow from
Customer support + Software engineer to include Product manager, Data
analyst, and Sales & marketing in that order. Students first see a shared
preview and must select distinct required roles; Start fixes one assigned
part per present student. All parts have their own instructions, coach,
submission, and existing review loop.

Support's reviewed customer brief becomes a visible handoff to Engineering.
Engineering's final review waits for that brief. Marketing's final review
waits for the other team outcomes. A part passes when its actual review has
no "needs work" criterion; Engineering also needs all supplied executable
checks. This threshold lets the current labeled fixture reviewer provide
useful "developing" feedback without making completion impossible.
Every part must pass before the team task is complete. A present student can
take an absent student's unfinished part after selecting that role, with an
author-labeled message in the shared conversation. Practice work persists;
Restart demo removes it. Real world simulation and lone-student Practice
retain their existing flows.
