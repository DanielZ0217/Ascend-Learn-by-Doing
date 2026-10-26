# Ascend — Learn by Doing

An AI company simulator where students solve realistic tasks from their chosen
industry, individually or collaboratively, alongside AI coworkers. Students
create a company, explore its office, learn relevant skills, and improve their
work through feedback.

The single-student scope and Stage 2 collaboration scope were approved on
2026-10-24. The working local app is in `web/`; the PRDs and harnesses track
requirements and verification.

## Documentation map

| Role | Canonical source | What it answers |
| --- | --- | --- |
| Constitution | [AGENTS.md](AGENTS.md) | Rules for agents and contributors. |
| Map | This README | Where code, requirements, and checks live. |
| Status | [docs/STATUS.md](docs/STATUS.md) | What works now, what is blocked, and what is intentionally absent. |
| History | [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) | Why durable choices were made and which proposals were superseded. |
| Demo | [docs/DEMO.md](docs/DEMO.md) | How to start, present, and recover the local prototype. |

| Need | Go to | Verify with |
| --- | --- | --- |
| Run or configure the current app | [docs/DEMO.md](docs/DEMO.md), `web/.env.example`, `web/src/lib/config-schema.ts` | Local server, `/api/health`, and `npm.cmd run check:services`; never print secret values. |
| Change company, role, or task data | `web/src/lib/contracts/` | Schema tests, typecheck, and the PRD. |
| Find feature ownership | [harness/tasks.json](harness/tasks.json) | `node scripts/check-harness.mjs` and actual files. |
| Review product scope | [docs/PRD.md](docs/PRD.md) | Acceptance criteria and browser evidence. |
| Review current build order | [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Task dependencies and current status. |
| Build or verify Stage 2 | [docs/STAGE2_PRD.md](docs/STAGE2_PRD.md), [docs/STAGE2_BUILD_PLAN.md](docs/STAGE2_BUILD_PLAN.md), [harness/stage2-tasks.json](harness/stage2-tasks.json) | Confirmed collaboration and simulation scope, implementation gates, and checks. |
| Design coworker work and handoffs | [docs/AGENT_PROCEDURES.md](docs/AGENT_PROCEDURES.md) | Future supervisor policy, security boundaries, and pending decisions. |
| Review the proposed UI redesign | [docs/UI_REDESIGN_BRIEF.md](docs/UI_REDESIGN_BRIEF.md) | Rendered problems, visual direction, screen changes, and finish checks. |
| Choose future UI refinements | [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | The user's interaction catalog, Ascend fit, motion rules, and first refinement candidates. |
| Navigate code and use installed design skills | [docs/TOOLING.md](docs/TOOLING.md) | CodeGraph commands, local skill sources, and installation status. |

The scene, agent services, PDF ingestion, voice, and coding workspace are
implemented. Current verification and any remaining limitations are in
`docs/STATUS.md`.

- [Product requirements](docs/PRD.md)
- [Build plan and shared interfaces](docs/BUILD_PLAN.md)
- [Visual reference and confirmed technology decisions](docs/DESIGN_DECISIONS.md)
- [Provider setup, budget, and retrieval](docs/PROVIDERS.md)
- [Coding-agent workflow](docs/AGENT_HARNESS.md)
- [Future AI coworker procedural memory](docs/AGENT_PROCEDURES.md)
- [Stage 2 product requirements](docs/STAGE2_PRD.md)
- [Stage 2 build plan](docs/STAGE2_BUILD_PLAN.md)
- [Stage 2 task queue](harness/stage2-tasks.json)
- [UI design guide and interaction catalog](docs/UI_DESIGN.md)
- [Current status and setup checklist](docs/STATUS.md)
- [Local demo runbook](docs/DEMO.md)
- [Task queue](harness/tasks.json)
- [Agent entry point](AGENTS.md)

Validate the documentation and task queue from this directory:

```powershell
node scripts/check-harness.mjs
node scripts/check-stage2-harness.mjs
```

These checkers validate planning consistency, not application readiness. Stage
2 is implemented locally and is undergoing the physical LAN and Bedrock
rehearsal gates recorded in [docs/STATUS.md](docs/STATUS.md).
Application commands run inside `web/`; use `npm.cmd` on this Windows machine.
The existing `everything-claude-code/` directory is reference material.

```powershell
cd web
npm.cmd run build
npm.cmd run start
```

Open `http://127.0.0.1:3000`. Start Docker Desktop first for Redis, Neo4j, and
Milvus; detailed steps are in [docs/DEMO.md](docs/DEMO.md). Enter credentials
only in ignored `web/.env.local`; never expose them in chat. Live AI and search
requests consume provider credits.
