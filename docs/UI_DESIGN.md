# Ascend UI design guide

Updated 2026-10-25. This guide turns the user's pasted collection of 44
interaction ideas into a reference for future UI improvements. It is a design
guide, not approval to implement every pattern. Product behavior and finish
criteria remain in [PRD.md](PRD.md), and the implemented office interaction is
documented in [UI_REDESIGN_BRIEF.md](UI_REDESIGN_BRIEF.md).

## Direction

Ascend should feel like a warm miniature workplace joined to a calm editorial
workbench. The office invites exploration; the role pages make real work easy
to read, attempt, and improve. Motion should show where an action came from,
what changed, and what to do next. Keep the five coworkers, 360-degree orbit,
camera return, meeting sequence, coaching, coding, voice, retrieval, review,
collaboration, and simulation flows intact.

The new [company creation capture](screenshots/ascend-redesign-creation.png),
[phone creation capture](screenshots/ascend-redesign-creation-mobile.png),
[My companies capture](screenshots/ascend-redesign-library.png),
[mobile menu capture](screenshots/ascend-redesign-mobile-menu.png),
[office capture](ui-redesign/floorplan-desktop.png), and
[engineering capture](ui-polish/workspace-desktop.png) are the current visual
baseline. The current coworker roster already uses Motion for React layout
springs. Reuse that system and existing design tokens. CSS can handle small
state changes; use GSAP only when a timeline genuinely improves an interaction.

## Confirmed company entry and library direction (2026-10-25)

The user confirmed this design through the project interview. The company
library, carousel, setup form, and return navigation are implemented. The
screenshots above show the resulting desktop and phone surfaces.

### Plain-language terms

| Term | What it does in Ascend |
| --- | --- |
| Company carousel | A centered row of large company choices; arrows or a swipe move the chosen company into focus. |
| Floor plan preview | A lightweight image of a distinct miniature workplace before creation. The actual company office remains interactive 3D after entry. |
| Preset | A starting company type: bank, restaurant, software studio, or semiconductor company. “Your own idea” uses a flexible office. |
| Company library / My companies | The returning student's list of companies saved in this browser, each with an Open action. It is not an account or cross-device library. |
| Reduced motion | A device preference that stops automatic carousel movement while retaining all choices and controls. |

### Screen flow

1. **First visit or no saved companies:** open the creation experience. Place
   the selected miniature floor plan at the center, with neighboring choices
   partly visible so the arrows' purpose is clear. A short company name and
   description identify the selected type.
2. **Returning visit:** open **My companies** first. Show each saved company's
   name, type, Practice/Real world mode, and **Open** action. Provide one clear
   **Create a company** action that opens the carousel. An empty library routes
   to the same first-visit creation experience.
3. **Creation:** below the selected preview, show the company name and the
   existing participant, experience, and maturity settings: Just me/Two
   students, Practice/Real world, Startup/Mature. Keep the editable brief and
   company size available as details. The primary Create/Enter action follows
   the settings. Choosing **Your own idea** shows the flexible office preview
   and updates its visible name/description as the student types.
4. **Office and role workspace:** the Ascend logo and a labeled **My companies**
   action return to the library without restarting or deleting the company.
   The office breadcrumb must become a real link. Existing role navigation,
   learning, simulation, and collaboration remain reachable.
5. **Removal:** keep deletion inside the existing confirmed **Restart demo**
   action in the company. After a successful restart, the deleted company no
   longer appears in this browser's library. Other companies remain.

### Carousel behavior and visual direction

- Use five **distinct, lightweight illustrated previews** for bank,
  restaurant, software studio, semiconductor company, and flexible custom
  office. These are cropped from the approved concept board; they convey the
  workplace type but are not exact captures of the procedural 3D rooms. Avoid
  mounting five live WebGL canvases on the entry page. Keep the chosen
  company's full office interactive after creation.
- Advance slowly only while idle. Pause when the pointer enters, keyboard
  focus reaches the carousel, a touch begins, or the student chooses a slide.
  Visible left and right buttons and a swipe option provide direct control;
  arrows cannot depend on hover alone. Preserve the current choice and form
  values while browsing. Autoplay must never move focus.
- Under `prefers-reduced-motion: reduce`, keep one still selected preview and
  direct controls. Use short, interruptible transitions when motion is allowed.
  The floor plan must have useful alternative text, and the selected company
  name and position must be available to assistive technology.
- Draw from the bundled Awesome Design MD **Airbnb** reference for image-led
  browsing, generous space around the selected card, clear arrow controls,
  and a simple return library. Retain Ascend's warm cream, green, aubergine,
  editorial typography, miniature offices, and existing office role colors.
  Do not import Airbnb branding, pink CTAs, or its font.
- Let the centered preview be the main visual. Keep settings immediately below
  it and comfortably readable at 1280×720 and on phones. Avoid a second
  decorative hero image competing with the carousel or moving behind a form.

### Implementation boundaries and acceptance checks

- Browser storage currently contains individual company blueprints and a
  single active-company pointer. The library should enumerate valid saved
  blueprints rather than treat the active pointer as the whole library. With
  no login, it must say **Saved in this browser**; a collaborator on another
  device returns by invite link. Do not imply a private account or syncing.
- Real world simulation history remains temporary under its existing presence
  rules. Returning to a saved company must not imply that an expired event
  feed can be restored. Practice progress and drafts retain their current
  persistence behavior.
- Check first visit, multiple saved companies, open a non-recent company,
  create another, return from office and each role, restart one company, and
  confirm the other companies remain. Check arrows, swipe, keyboard, focus,
  screen-reader labels, reduced motion, and 390px/1280px/1440px layouts.
- Compare loading and interaction cost against the current 30 KB still-image
  home page. Keep the carousel light enough that the public demo and 3D office
  remain responsive on the presentation computer.

## Confirmed interaction choices across Ascend

The user selected these patterns in a second grill-me interview on 2026-10-25.
They guide the whole app, one screen at a time. The My companies hub, navigation,
source/event detail sheet, mobile team sheet, and named Restart confirmation are
implemented. Broader button and notice refinements remain guidance for later
passes. The 44-pattern catalog below remains a source of ideas, not a checklist
to install every effect. Keep Ascend's warm editorial palette and
miniature-office identity across all surfaces.

| Surface | Selected pattern and what it does | Boundary |
| --- | --- | --- |
| My companies dashboard | An image-led grid of saved-company cards, each with a small still preview, name, type, mode, and **Open** action. **Create a company** is the other obvious action. | This is a quick Open/Create hub, not a second activity report. It lists only companies saved in this browser. |
| Main menu | A short top bar with visible destination names and a clear active location. On phones, a labeled **Menu** button opens a short drawer with **My companies**, **Create**, and the current company. | No icon-only or hover-expanding primary navigation. The drawer needs a visible Close action, focus management, and keyboard/touch access. |
| Company creation | The previously agreed centered, lightweight floor-plan carousel, with settings beneath the selected preview. A selected card may receive restrained emphasis. | Slow movement only while idle; pause for pointer, focus, touch, and reduced motion. No extra live WebGL canvases. |
| Primary buttons | One visually dominant action per screen. Press feedback is short; pending text or a reserved loading state stays visible until the actual operation completes. A brief check may appear after verified success. | Errors show a message and retry where possible. Do not show a success check before server confirmation or delay navigation merely to play an animation. Keep **Restart demo** visually distinct. |
| Office and coworker selection | Retain the current expandable role cards and synchronized 3D character response. Add the same clearly labeled **My companies** navigation. | Do not add animation that competes with orbit, meetings, or the existing Motion role menu. |
| Task, source, and event details | A right-side panel on wide screens keeps the current work in view; on phones, a labeled button opens a bottom sheet with a clear Close control. | In engineering, preserve the left task/right code layout. A temporary detail view must not create a permanent narrow third column or shrink the editor. |
| Team conversation and Real world feed | A named **Team conversation** view sits beside company activity on desktop; phones open it from a labeled control. A restrained Pause/Resume icon and text reflect confirmed shared state. | Preserve author labels and message scroll position. Pause/Resume feedback follows the server result, never an optimistic guess. |
| Restart and notices | A focused Ascend-styled confirmation names the company and explains that its uploads and shared work will be deleted; provide explicit Cancel/Delete actions. Brief success notices can leave after announcement; errors stay until resolved or dismissed. | The dialog manages focus and works with keyboard and touch. Remove the company card only after restart succeeds; retain errors beside the action they concern. |

Use the Airbnb reference selected for the company entry and library for visual
browsing and generous spacing, while the existing Slack-informed office chrome
continues to guide warm colors and controls. The reference systems are inputs,
not replacement branding. Keep work and navigation surfaces still while a
student reads, codes, speaks, or watches the simulation; use motion to explain
selection, opening, and confirmed completion.

### Engineering workbench refinement

For code assignments, keep **02 The assignment** and **03 Your work** as one
responsive workbench. On wide screens the editor receives more width, while the
assignment narrows to its readable minimum; on phones the sections stack in
reading order. Show one input and expected output from the supplied checks and
label the editable starter function clearly. The scaffold should establish the
function signature and useful data structures while leaving the core decision
for the student. Keep **Ask Maya** reachable as a floating, labeled button;
opening it shows the existing coach conversation in a focused panel, and
closing it returns focus to the button. Preserve the local code runner,
review/revision loop, saved drafts, and reduced-motion behavior.

### Checks when this design is implemented

- Verify the same destinations are reachable from the dashboard, creation,
  office, and every role page with mouse, keyboard, and touch.
- Check primary, pending, success, and error states against real outcomes for
  company creation, messages, upload, code checks, review, and Pause/Resume.
- Check panel and drawer opening/closing, focus return, message position, and
  reduced-motion behavior at desktop and phone widths.
- Confirm engineering's task and editor remain usable when a source or event
  detail opens. Confirm office orbit and role selection still work.
- Test restart with two saved companies: the named one disappears only after
  confirmed deletion, while the other remains available.

## First places to improve

| Surface | Proposed refinement | What the student should perceive |
| --- | --- | --- |
| Company creation, task generation, review | Reserve the result's space while waiting; show a restrained loading state that resolves into the actual result or an actionable error. | The app is working, and the layout does not jump. |
| Run checks and submit for review | A short press response, distinct running state, then a check or failure state tied to the real result. | The action completed, failed, or still needs attention. |
| Real world simulation | Coordinate the Pause/Resume icon, status label, event feed, and task card after shared state confirms the change. | Both students can tell whether the company is running or paused. |
| Event and task details | Consider a right-side detail panel on wide screens; a bottom sheet can carry the same content on narrow screens. | The current event stays visible while its task is examined. |
| Mobile team conversation | A clearly labeled sheet or drawer with a visible close control and preserved message position. | Students can switch between the office and team context without losing their place. |
| Restart demo | Replace the browser confirmation with a focused, accessible dialog when polishing this action. State that the current company's uploads and shared work will be deleted for both students. | The irreversible effect is clear before confirming. |

These are candidates for a later UI pass. Inspect the current screen and user
flow before selecting one. Improve the weakest point first and compare before
and after screenshots at 1440×900, 1280×720, and a narrow touch viewport.

## Interaction rules

- Give every asynchronous action visible idle, pending, success, and error
  states. Success feedback follows the real server or code-check result.
- Keep a stable layout while the 3D office, AI result, sources, or shared feed
  loads. Avoid a second live WebGL canvas on the setup page.
- Use motion for one clear relationship at a time: selection, expansion,
  handoff, or completion. Existing camera and coworker movement already carry
  the office's main motion.
- Keep native cursor, keyboard focus, text labels, and clear hit targets. Hover
  may enrich a control but cannot be required to discover or use it.
- Reduced-motion mode must preserve information and sequence while removing
  nonessential transforms, tracking, shimmer, particles, and long transitions.
- On touch screens, avoid gestures that compete with the office orbit, page
  scroll, text selection, or editor input. Provide a visible button alternative.
- Avoid continuous effects that consume CPU/GPU while a student is reading,
  coding, speaking, or watching the simulated event feed.
- Keep errors visible until dismissed or resolved; a short success notice may
  disappear after it has been announced. Use appropriate live regions and
  restore focus after dialogs and sheets close.

## Reference pattern catalog

The names and mechanics below preserve the pasted inspiration. **Use** means a
strong fit for an existing Ascend action. **Adapt** means keep the interaction
principle with less visual weight. **Later** means revisit only when a real
workflow needs it. **Skip** means it conflicts with the current product or
adds cost without helping the student.

### 1. Eight visual interactions

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Magnetic buttons | Pointer distance nudges a button toward the cursor, then a spring returns it. The notes suggest about 30% of the offset. | **Later.** Possible on a single decorative desktop entry action; core controls must remain steady. |
| Custom trailing cursor | A dot and delayed ring follow the pointer and can become a “View” bubble. | **Skip.** Preserve the system cursor, clear hover states, and ordinary input behavior. |
| Character-by-character title | Masked letters rise in a short stagger; the reference uses roughly 0.03 seconds between letters. | **Later.** A single introduction could use it; avoid delaying task text or screen-reader reading. |
| Image trail | Pointer distance releases images that scale in and fade away. | **Skip.** Adds constant work beside the 3D office and obscures content. |
| Spotlight cards | Pointer-following radial highlight and a moving border gradient. | **Adapt.** A faint static or short hover highlight may help the selected coworker card; avoid perpetual border rotation. |
| Seamless marquee | Duplicated text loops continuously and slows on hover. | **Skip.** The company feed already supplies useful live activity; scrolling decorative text adds noise. |
| Pinned horizontal gallery | Vertical scroll drives a pinned horizontal sequence, often with ScrollTrigger. | **Skip.** Keep natural page scrolling through the learning workspace. |
| Curtain transition | A panel covers the viewport during navigation, then reveals the next screen. | **Skip for current routes.** The existing camera entry and role transition provide the spatial connection. |

### 2. Six app interactions and components

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Completion feedback button | Press, loading contraction, drawn check, optional particles. | **Use, restrained.** Tie check or failure to task submission and review state; omit particles. |
| Synchronized checkbox feedback | Progress ring, count, and card tone update together. | **Adapt.** Use for actual task milestones or code checks; never imply completion before verification. |
| Expandable stacked cards | Layered cards open and restack in sequence. | **Adapt.** The five-role menu already has purposeful expansion; preserve its existing layout spring. |
| Snapping cards with line drawing | Scroll settles a card, then a connecting line draws. | **Later.** Only if a future guided task sequence needs ordered steps. |
| Inertial scrolling wheel | A wheel coasts and snaps to a tick. | **Skip.** Native scrolling and standard selectors work better beside code and long text. |
| Circular expansion transition | A selected tab grows from the touch point to cover the screen. | **Skip.** It would slow frequent role and workspace changes. |

### 3. Five dashboard menu ideas

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Transparent top navigation | Minimal chrome; the active item receives a soft pill. | **Adapt.** Keep the current warm header and strong active location label. |
| Expanding active item | Selected icon grows into a labeled pill. | **Later.** Use only if labels remain visible or equally clear to touch and keyboard users. |
| Icon navigation with large title | Compact rail plus a prominent current-page heading. | **Adapt.** Large workspace headings help; the five role labels should stay explicit. |
| Icon rail with hover tooltips | Narrow rail reveals labels on hover. | **Skip as primary navigation.** Hover-only labels fail on touch and are slower for new students. |
| Quick actions beside the menu | Frequent actions sit in a separate compact column. | **Later.** Add only after observing repeated navigation for the same task action. |

### 4. Seven smoothing interactions

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Drag-and-drop reordering | A long-pressed row lifts; neighbors make space; release settles. | **Later.** There is no current student-owned ordered list that needs it. |
| Pull-to-refresh | Pull distance fills an icon before a refresh springs back. | **Skip.** Shared state already polls; keep a visible refresh/retry control where needed. |
| Parabolic add-to-cart | A thumbnail flies into a cart and updates its badge. | **Skip.** No shopping action exists in Ascend. |
| Swipe-away card stack | The top card tilts away, revealing the next. | **Skip.** Workplace tasks need comparison and revision, not disposable cards. |
| Shimmering skeleton | Reserved blocks indicate pending content, then resolve. | **Use, restrained.** Reserve layout for AI and retrieval results; static blocks in reduced-motion mode. |
| Shrinking sticky title | Large heading contracts into navigation during scroll. | **Later.** Test whether long role pages actually need this before adding scroll tracking. |
| Long-press floating menu | Held card lifts over a blurred page and reveals actions. | **Skip.** Keep task and team actions visible. |

### 5. Seven button ideas

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Press and spring back | Scale briefly on press, then settle. The reference uses 92%; use a subtler response here. | **Use.** Apply consistently to primary actions without shifting surrounding layout. |
| Loading into checkmark | Pending icon resolves into a check and brief emphasis. | **Use.** Good for upload, code checks, message delivery, and review when confirmed. |
| Long-press charging fill | A hold fills a bar before a destructive action fires. | **Skip as the only safeguard.** Restart demo needs an explicit confirmation that works with keyboard and touch. |
| Morphing play/pause icon | The icon changes shape while the control stays in place. | **Use.** Pair with visible Running/Paused text and shared-state confirmation. |
| Success particle burst | Small particles and a bounce celebrate completion. | **Skip.** Feedback should stay calm during learning and review. |
| Liquid color fill | New color spreads from the click position. | **Later.** A simple state color change is clearer for current controls. |
| Magnetic hover glow | Pointer attraction combines with a bright halo. | **Skip.** Adds tracking and visual weight to an already animated office. |

### 6. Six sidebar ideas

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Left sliding drawer | Menu enters over a dimmed page and closes from the backdrop. | **Adapt.** A mobile team panel can use this with visible close, focus management, and scroll lock. |
| Right-side detail panel | Record details enter while the source list remains visible. | **Use.** Strong fit for company events, task details, and source excerpts on wide screens. |
| Compact icon rail | Icons free content width and mark the active item. | **Skip for role selection.** Students need the five role names while learning the product. |
| Hover-to-expand sidebar | A collapsed rail grows on pointer hover. | **Skip.** Touch and keyboard users need stable, explicit navigation. |
| Edge-swipe drawer | An edge drag follows the finger and snaps open or closed. | **Later.** Only after testing conflicts with page scroll and 3D orbit. |
| Push sidebar | Opening the sidebar shifts the main page aside. | **Skip.** Avoid resizing the WebGL scene and code editor during work. |

### 7. Five popup ideas

| Pattern | Reference mechanic | Ascend fit |
| --- | --- | --- |
| Bottom sheet | A temporary panel rises from the bottom and can snap closed. | **Adapt.** Useful for mobile team conversation or event detail with a visible open/close control. |
| Center spring modal | A dialog scales into view with a backdrop. | **Adapt.** Keep scale small and focus behavior correct for artifact or task details. |
| Frosted confirmation alert | A dangerous action gets a distinct overlay and explicit choices. | **Use.** Appropriate for Restart demo; blur is optional and must not reduce legibility. |
| Trigger-anchored popover | Detail grows from its button and closes back toward it. | **Adapt.** Suitable for source provenance or short options if the relationship remains clear without animation. |
| Top notification banner | A short notice slides in, then leaves. | **Use selectively.** Announce success briefly; retain errors until the student can act on them. |

## Review checklist for any chosen pattern

1. Name the student action and the state change it should explain.
2. Capture the current screen and check whether the pattern removes friction.
3. Implement one pattern on one surface with the current Motion/CSS system.
4. Verify pointer, keyboard, touch, reduced motion, narrow layout, and focus.
5. Confirm real pending/success/error states, no content jump, and no loss of
   coaching, coding, voice, retrieval, or meeting behavior.
6. Compare browser captures and keep the change only if the task feels clearer
   and the page remains responsive on the presentation computer.

## Guided coworker lesson (implemented 2026-10-25)

**Teach me first** opens a large, calm reading space around the coworker chat.
The assignment waits until **Try the challenge**. The reply leads with a
plain-language idea, one small example, and a question for the student;
**Hint** and **Show next step** reveal help on demand. Every coworker chat
has an Expand control, and Close returns to the previous work without
discarding the draft or conversation. The focused view traps focus, closes
with Escape, and returns focus to the launcher. On phones it fills the
viewport without horizontal scrolling.

Coach messages use readable paragraphs, emphasis, and labeled code blocks.
Python and JavaScript examples have syntax color and Copy; execution remains
in the checked JavaScript workspace. The interface keeps fixture responses
clearly labeled when live Meta is unavailable.

## Join, memory, and restart controls (implemented 2026-10-25)

The top navigation names **Join a company**. The join screen and the bottom
of creation use the same two-field form: eight-character code and teammate
name. The creator sees the current code in the team workspace with Copy;
guests do not see the code there. A saved explanation preference appears as
a small, removable note above the coach conversation on every role page.

**Restart demo** is a creator-only action in the office. Its confirmation
states what work will be cleared, that guests will leave, and that the code
will change. It keeps the company itself. In My companies, **Delete** is a
separate permanent action for creators; guests see **Leave** for their own
browser shortcut.
