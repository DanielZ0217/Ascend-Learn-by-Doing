# Web application

Read the parent `AGENTS.md` and its planning documents before editing. This app
is the approved learning prototype with a working single-student baseline and
the Stage 2 collaboration implementation, not the ECC reference repository.

Use `npm.cmd` on this Windows machine. Keep canonical schemas in
`src/lib/contracts/`; coordinate shared edits. Server-only credentials belong
in `.env.local`. Never read or print their values into task output, expose them
through `NEXT_PUBLIC_*`, or use the key shown in the user's screenshot.

Shadcn components are installed project source. Use the configured registry and
existing theme. Import 3D and editor surfaces client-side when implementing them.
Do not claim placeholder configuration means live integrations have been tested.

The DOMPurify 3.4.17 override patches Monaco's pinned vulnerable sanitizer.
Retain it until the upstream editor dependency is patched; verify `npm audit`
before removing it. Setup audit reported zero known vulnerabilities after the fix.

Run lint, typecheck, focused tests, browser smoke checks, and build for meaningful
changes. Browser tests use installed Edge by default; `PLAYWRIGHT_CHANNEL=chrome`
selects Chrome. Do not install another browser unless one is actually needed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
