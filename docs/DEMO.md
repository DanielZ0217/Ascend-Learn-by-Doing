# Local demo runbook

## Start

1. Open Docker Desktop and wait for its Linux engine to say **Running**.
2. In PowerShell, from the HACKTX project root:

   ```powershell
   docker start hacktx-redis hacktx-neo4j milvus-standalone
   cd web
   npm.cmd run check:services
   npm.cmd run build
   npm.cmd run start
   ```

3. Open <http://127.0.0.1:3000>. Credentials stay in ignored
   `web/.env.local`; never paste them into a terminal transcript or chat.

For the public demo, keep that local server and the three Docker services
running. In a second PowerShell window from `web/`, start the saved named
Cloudflare connector:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --config data/cloudflare/config.yml run
```

Then open <https://ascendsim.tech>. The connector credential is stored in
ignored `web/data/cloudflare/`; never commit or share it. Closing that second
PowerShell window stops public access. The public site also stops if this
computer, Next.js, or a required local service stops. The production server
continues to bind only to `127.0.0.1`.

Jenkins is unrelated to this app and can remain stopped. If using Bedrock,
configure the short-term key in `.env.local` before starting the server and
verify `/api/health` reports `bedrockConfigured: true`. The selected model is
the US Sonnet 4.6 inference profile; Meta remains the automatic text fallback.

`check:services` checks persisted demo data as well as service connectivity. It
expects at least one coaching turn and one graph-linked task from the current
workspace. If the data is fresh, run a short practice flow first, then repeat
the check.

## Rehearsed path

1. Choose **Neighborhood bank**, enter a prompt about payment reliability and
   customer questions, and create the company. The header identifies live AI
   or the explicit demo fixture. The offscreen supervisor builds five profiles.
2. In the office, hover over the five coworkers to preview their matching
   characters and elastic cards. Drag the scene to show the full 360-degree
   office, scroll or pinch to zoom, then choose **Reset view**. Use
   ArrowUp/ArrowDown and Enter to show the
   keyboard path. Then click **Software engineer** and choose **Start with
   Maya**. Enter “deduplicate payment
   events efficiently” or “handle an overloaded queue,” choose **Teach me
   first**, and ask a follow-up question. The coach can cite the attached
   source cards; their provenance is visible.
3. Read the assignment, run the JavaScript checks in the embedded editor,
   inspect failing results, revise the code, and submit. The review receives
   the actual run result. Submit another attempt to show progress across tries.
4. Choose **Sales & marketing** and enter a discovery-call topic. Converse
   with the generated customer, then request a review. Voice is opt-in; text
   remains available. Browser microphone permission and device output are
   controlled in the voice panel.
5. Choose **Customer support** for a separate customer issue, then **Product
   manager** and **Data analyst** for written workplace tasks and coach chat.
6. Upload one text-based PDF or paste study material in a role workspace,
   then start a new task. The material is extracted into company-scoped passages
   and shown with uploaded provenance. Scanned-image PDFs need OCR and are not
   supported in this baseline.
7. Use **Restart demo** and confirm to delete the current company, its uploaded
   learning material, team conversation, simulation, and coach turns from the
   local services. The other student is sent home on the next shared-state
   poll. Other companies remain. Create a new company for the next judge.

## Stage 2 two-student path

1. For a public check, open <https://ascendsim.tech> on both devices; the
   invite link uses that public origin. For a LAN-only fallback, start the
   built app with `npm.cmd run start:lan` from
   `web/`. On the host computer, find its private IPv4 address with
   `ipconfig`, then open `http://<private-ip>:3000` on both devices on the same
   network. Keep the host firewall limited to that network. The current
   `npm.cmd run start` command binds only to 127.0.0.1.
2. Create a **Mature** **Neighborhood bank** with **Two students** and
   **Real world**. Enter a display name, create the company, and use **Invite
   teammate**. Copying from the private-IP page produces an invite that the
   other device can open; a localhost link works only on the host computer.
   The second student enters a different display name.
3. Read the supervisor scenario and simulated company log. Student A selects
   Customer support and sends a **Problem brief / PRD** describing the
   customer's symptoms, known facts, unknowns, and requested outcome. Student
   B opens the PRD in the shared thread, asks a clarification, and chooses
   Software engineer. Either student may switch roles.
4. Pause the company log. Both views should show the same pause. Student B
   takes the engineering task, uses the left issue/right code layout, runs
   checks, submits, revises, and submits again. The role page keeps the shared
   company as a compact summary; **Open team workspace** reveals the thread.
   Resume to restart the simulated log.
5. To show an AI handoff, select **Require approval for AI handoffs**, ask an
   AI coworker for a draft, and approve or reject it. The thread labels the
   author, provider, and status. Demo fixture output is explicitly labeled.
   The feed itself is deterministic and does not call a model on each tick.
6. Leaving both pages starts a short refresh grace period. After the last
   session expires, the temporary run/feed is deleted. The company thread and
   Practice work remain. A third person cannot join a full company.

The automated two-browser fixture rehearsal and live Meta Stage 2 model
rehearsal pass; the physical second device and Bedrock Sonnet rehearsal are
still presentation checks. See
[STATUS.md](STATUS.md) for current evidence and captures.

## What is live

- Bedrock Sonnet handles supervisor creation and software-engineering task,
  coach, and review when the key works. Meta Muse Spark automatically answers
  those requests if Bedrock fails, and remains the primary model for the other
  four coworkers and customer replies. The app visibly labels fixture
  responses if live text providers are unavailable. The local usage ledger has
  separate estimated stops of $24 for Bedrock and $12 for Meta; provider billing
  remains authoritative.
- SerpApi supplies live engineering search results. Its snippets are labeled
  as search result summaries; curated and uploaded passages carry their own
  provenance and citation links or document IDs.
- Redis holds role/company conversation turns. Milvus stores local MiniLM
  embeddings and retrieves passages. Neo4j links company, role, products,
  issues, tasks, source documents, and passages. SQLite keeps source text and
  usage accounting. Run `npm.cmd run check:services` to see current counts.
- Voice input sends browser-recorded PCM WAV to Meta transcription. Output uses
  browser speech synthesis. A live public speech sample produced a transcript;
  test the actual demo microphone and speakers on this computer before judging.

## Recovery

- If the company request times out, check `http://127.0.0.1:3000/api/health`
  for configured provider booleans. If both providers fail, the app returns a
  labeled demo company automatically. Never claim the fixture is live.
- If source cards are empty, check all three Docker containers and run
  `npm.cmd run check:services`. To reload the fixed public corpus, POST once to
  `http://127.0.0.1:3000/api/admin/seed` from the same machine. The eight
  downloaded originals are under ignored `web/data/sources/`; the endpoint
  reuses those local files.
- The first vector-index run loads a local ONNX MiniLM model. Its files are
  cached under ignored `web/data/models/`; keep that directory for the demo.
  The first assignment after a cold start can take longer while retrieval warms.
- Browser voice requires microphone permission and output audio enabled.
  Text chat works if either device is unavailable.

## Verification snapshot

On 2026-10-24, Docker reported Redis and Neo4j running and Milvus healthy.
Live Meta company creation and the AI task/lesson/review API path returned 200.
Five role-specific assignment calls returned Milvus excerpts. The local PDF
upload produced five indexed passages. The isolated code runner passed its
browser smoke with failing checks, a corrected solution, timeout recovery, and
revision. The production build, two viewport browser checks, five-role live API
run, and service checks are recorded in `STATUS.md`.
