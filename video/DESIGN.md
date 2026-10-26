# Ascend film design specification

## Format and truth

180 seconds, 1920 × 1080, 30 fps. Instrumental soundtrack, no narration. Real Ascend UI captures from a fictional, fixture-backed company session. Labels and voice of the film must not imply live AI output, real customers, five simultaneous students in the captured session, arbitrary PDF-to-code generation, or production server changes. The film shows five AI coworker perspectives and two students working in one company. The cross-role handoff shown is support to engineering.

## Visual system

- Product palette: paper `#F7F6F2`, cream `#F2F0E8`, ink `#213731`, primary `#245846`, fresh green `#75A788`, coral `#CF8069`.
- Helvetica/Arial for captions and UI; Georgia italic for the opening thought. Big, high-contrast captions (64–88 px). Keep screenshots on warm paper with rounded corners and restrained shadows.
- The actual UI fills most of the frame. Animation comes from camera moves, gentle scale, staggered cards, and captions. Do not redraw or counterfeit UI.
- Small `SIMULATED COMPANY DEMO` provenance label during product footage. Five roles are introduced one at a time; the two-student collaboration beat is visually separate.

## Story and shot grammar

The exact narrative timeline and screen copy are in [`../docs/VIDEO_PLAN.md`](../docs/VIDEO_PLAN.md). Use a held editorial opener derived from the skill's spotlight hero grammar (one lift and settle), a brisk five-card role sequence derived from deck-deal stagger timing, and a gathered office/brand outro derived from the group's final reveal grammar. These are adaptations of the shot cards, not copies of their provided demo scenes.

Timing in seconds: 0–10 hook; 10–24 company; 24–42 PDF learning; 42–68 build and fail; 68–88 revise and feedback; 88–95 role overview; 95–130 five roles, seven seconds each; 130–145 company events and pause; 145–156 second student; 156–170 support to engineering handoff; 170–180 final brand. Cuts land on whole frames at 30 fps. Every caption has a clear reading hold.

## Audio

`cat-walk.mp3` is crossfaded into a 180-second bed, with a restrained fade-in and fade-out. Sparse interface swishes and emphasis effects come from the installed skill's bundled audio. The mix should remain secondary to the visual explanation. Render a second video without the background music for easy soundtrack replacement. Source and licensing notes are in [`ASSET_SOURCES.md`](ASSET_SOURCES.md).

## Verification

Check representative opening, source upload, code failure, feedback, each role, collaboration, and final brand frames; verify audio, exact duration, no black gaps, and caption readability at delivery size. The exported MP4 is the final artifact, with source and capture scripts retained for revision.
