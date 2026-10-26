# Design skills and CodeGraph

Updated 2026-10-24. The five requested tool families were cloned under
`tools/skill-sources/`. Their sources and installed forms are:

| Tool | Source | Installed form |
| --- | --- | --- |
| CodeGraph | [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph) | Local CLI 1.6.2 in `tools/codegraph-cli/`; index in `web/.codegraph/`. |
| Taste Skill | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | `~/.codex/skills/taste-skill/`. |
| Finesse UI | [mouse-lin/finesse-skill](https://github.com/mouse-lin/finesse-skill) | `~/.codex/skills/finesse-ui/`. |
| GSAP Skills | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | Eight `gsap-*` skills in `~/.codex/skills/`. |
| Darwin Skill | [alchaincyf/darwin-skill](https://github.com/alchaincyf/darwin-skill) | `~/.codex/skills/darwin-skill/`. |
| AI Slop Cleaner | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode/tree/main/skills/ai-slop-cleaner) | `~/.codex/skills/ai-slop-cleaner/`. |

The earlier `swheezy/finesse-skill` and
`AI-evolution-peanut/darwin-skill` URLs returned repository-not-found errors.
The Finesse UI and Darwin sources above provide the matching published skills.
The cloned source trees are reference copies; `web/` remains the application.

## CodeGraph

From the project root, run:

```powershell
node scripts/codegraph.mjs status
node scripts/codegraph.mjs explore "OfficeScene CameraController coworker selection" --max-files 3
node scripts/codegraph.mjs sync
```

The graph was initialized for `web/` and verified with a real office-scene
query. Its first index held 63 files, 935 nodes, and 3,553 edges. It respects
`web/.gitignore`, so generated output and credentials are outside the index.
If the local CLI is missing, run `npm.cmd install --prefix tools/codegraph-cli`.
The CodeGraph CLI is available in this session through the project command.
CodeGraph is also registered as a global Codex MCP server, pointing to this
project's `web/` index; Codex can load that server in a fresh session. The new
Codex skills are discoverable on the next turn or a fresh session.

The GSAP skills teach animation techniques; installing them does not add GSAP
to the website. The current coworker menu uses Motion for React. Use the new
skills only when their guidance fits the feature being built. Darwin's
evaluation checkpoints apply when optimizing a `SKILL.md`, not when editing
the application.
