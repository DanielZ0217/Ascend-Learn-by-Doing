# UI redesign brief — implemented

Updated 2026-10-24. The user clarified the visual direction and interactions
in the grilling round, then confirmed this shared interpretation for build.
The product and behavior contracts remain in
[PRD.md](PRD.md). The visual reference is the user's ROOMZ isometric-room
collage; the motion references are [Monaco 2's character-oriented UI](https://rive.app/blog/pocketwatch),
[an interactive Rive character](https://rive.app/marketplace/28492-53895-interactive-customizable-character/),
and [Motion's React layout animation guide](https://motion.dev/docs/react-layout-animations).

## What the current render shows

The 1440×900 browser captures are in
[`before-create.png`](ui-redesign/before-create.png),
[`before-office.png`](ui-redesign/before-office.png), and
[`before-engineering.png`](ui-redesign/before-engineering.png).

- The company creation screen devotes almost half the first viewport to a
  preview panel that initially appears empty while WebGL prepares. The form is
  legible but visually reads as a row of small selection cards.
- The office model is a small, sparse square in a large beige frame. Its five
  coworkers are difficult to distinguish at the default camera distance, and
  the room does not yet communicate a larger working company.
- The engineer workspace has many nested cards, tiny explanatory text, and a
  long vertical reading path before/after the editor. The code and its result
  should feel like the central work surface. Role switching and the tutor
  should remain easy to find.

These are observations from rendered screens, not a judgment that the working
learning, review, voice, and retrieval flows should change.

## Confirmed visual direction

**A miniature workplace you can enter:** an inviting, tactile isometric
company as the visual centerpiece, paired with a calm editorial workbench for
actual learning. Keep the current warm beige and forest-green palette, low-poly
characters, brand identity, cozy office environment, and five coworker roles.
Avoid a neon game interface, generic SaaS dashboard, or conventional landing
page. The main redesign is the office and character selection; the working
coach, coding, voice, and retrieval flows remain intact.

At 1440×900 and 1280×720, the user should see the company, five selectable
roles, and one obvious next action without scrolling. The office is an
authored connected plan with recognizable work areas and a designated meeting
room. Reuse the existing Three.js scene and models, then improve their scale,
character response, and selected-desk readability rather than rebuilding the
environment. The model stays clickable, and a role list remains available for
keyboard users or absent WebGL.

## Character-selection interaction contract

1. Give the five-role menu a visible selection cursor/arrow. ArrowUp and
   ArrowDown move the preview; Enter confirms. Hover previews; click confirms.
   The 3D coworker and menu remain synchronized. Focus is visible.
2. The previewed card grows into a rounded, elevated bubble. Adjacent cards
   move out of its way through actual layout animation, then settle with a
   subtle spring. The previous card contracts as the new one grows. The arrow
   glides with the card, including rapid and interrupted selection changes.
   Do not expand every card on first paint.
3. Use the installed Motion for React package: `LayoutGroup`,
   `motion.* layout`, and shared `layoutId` where they make the movement
   reliable. Keep hover feedback immediate; target roughly 250–400 ms for the
   elastic menu. Avoid stacking independent CSS transforms against Motion's
   layout transforms.
4. Give each 3D coworker small, distinct idle activity (such as typing,
   turning, blinking, or stretching). Hover slightly elevates that coworker
   and shows a soft floor highlight. Confirmation triggers one restrained
   wave/bounce and highlights the corresponding desk without dimming away the
   rest of the team.
5. Entering a role uses a gentle 600–900 ms camera move toward the selected
   coworker before the route transition. Returning to the office restores a
   full-company view smoothly. Existing fixed customer meeting movement stays
   deterministic.
6. Bring the selected role detail into view with a short coordinated
   transition; stagger its title, description, and action subtly. Buttons get
   restrained hover/press feedback. Keep ambient animation sparse.

## Visual and motion rules

- Motion should clarify preview, confirmation, and movement into the role.
  No constant pulsing, particle field, dramatic zoom, or generic fade on every
  element. Target smooth response on an ordinary desktop, with reduced-motion
  alternatives and touch input that still works without hover.
- Keep honest fixture/live labels, source provenance, loading/errors, and a
  stable layout while WebGL initializes. Improve the currently blank first
  preview as part of the office-focused polish if it remains visible.
- The workspaces may receive small consistency fixes for typography and
  spacing, but no flow or backend redesign is included in this UI pass.

## Skill fit

- [Taste Skill](https://github.com/Leonxlnx/taste-skill) supplies art
  direction and screenshot critique.
- [Finesse UI](https://github.com/mouse-lin/finesse-skill) supplies
  redesign-first and product/workflow screen guidance. The repo URL in the
  supplied transcript did not resolve under that owner; the linked repo is the
  verified matching project. Its manual instruction to replace `AGENTS.md`
  will not be used because this project already has its own instructions.
- [GSAP skills](https://github.com/greensock/gsap-skills) were assessed, but
  this interaction is a better fit for the installed Motion layout system.
  No second animation runtime is needed for this pass.
- [CodeGraph](https://github.com/colbymchenry/codegraph) and the matching
  [Darwin Skill](https://github.com/alchaincyf/darwin-skill) are not needed for
  the visible UI pass. They address code indexing and skill optimization.

## Finish checks

Compare before/after screenshots at 1440×900 and 1280×720, plus a narrow
viewport. Verify hover preview versus click/Enter confirmation; rapid
ArrowUp/ArrowDown; bubble growth pushing neighbors rather than overlapping;
3D hover/selection reaction; camera entry/return; all five role routes; code
checks; voice/text controls; WebGL fallback; reduced motion; touch selection;
loading and provider-error states. Run lint, typecheck, focused tests,
production build, and E2E. Keep the current demo usable throughout.

## Confirmation

The user chose the office scene and characters as the primary target, warm
miniature plus editorial as the direction, and preservation of existing
behavior. Their detailed motion and character-selection brief is reflected
above. They confirmed this shared interpretation before implementation, as
required by `AGENTS.md`.

## Implementation and visual review

Completed 2026-10-24. The office keeps the existing Three.js environment and
five low-poly coworkers. The scene fills more of its stage and has subtle
character idle movement, hover lift and floor highlights, a selected-role
bounce/wave, and highlighted work areas. The fixed customer meeting route is
unchanged. A camera rig moves toward the confirmed role before entry and
eases back to the company view on return.

The role roster now uses Motion layout springs and one shared moving arrow.
Hover and focus preview; ArrowUp/ArrowDown move through the roles; click or
Enter confirm. The expanded bubble changes actual card height and pushes its
neighbors. A confirmed role keeps its Start action stable while the pointer
passes over other cards, then restores its preview when the pointer leaves the
roster. The detail panel transitions separately. Reduced-motion settings
remove the layout/character/camera movement; click and touch still work.

Final captures: [1440×900 office](ui-redesign/after-office-desktop.png),
[1280×720 office](ui-redesign/after-office-compact.png), and
[390-pixel narrow office](ui-redesign/after-office-mobile.png). The two desktop
captures contain the office, five roles, and Start action within the initial
viewport. The narrow page stacks the office and roster without horizontal
overflow. These were inspected against the before captures above.

The optimized production build, lint, typecheck, 26 focused tests, and
production Playwright flows passed. Browser checks covered both desktop
sizes, narrow/reduced-motion behavior, moving cursor, keyboard preview and
confirmation, touch selection without WebGL, return to the office, all five
role routes, and the engineering task/editor/checks path. Smooth 60 FPS is a
design target; it was not measured on the presentation computer. The coach,
retrieval, voice, and review code was left intact, and its earlier baseline
verification remains in [STATUS.md](STATUS.md).

The later approved detailed floor plan and 360-degree orbit are recorded in
[DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) and shown in the
[new office captures](ui-redesign/floorplan-desktop.png). That update replaces
the smaller scene shown in the before captures above.
