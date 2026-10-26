# Provider Setup and Research Strategy

Updated: 2026-10-24. The user authorized project setup and supplied screenshots
showing $50 Meta free credits and SerpApi free/extra search credits. No API keys
from screenshots are used. Account access has not been tested.

## Defaults

For the current public demo, Bedrock has no configured key. All live text
requests therefore use Meta `muse-spark-1.3`, including the supervisor and
software engineer; transcription uses Meta `muse-voice-transcribe-1.0`.
Bedrock remains an optional conditional path in code. The local Next.js server
must have outbound access to Meta; a sandboxed runtime returned `EACCES` and
caused fixture fallback despite valid local credentials. Existing companies
created during that outage can switch with **Use Meta now** in the role
workspace, which also updates their shared Stage 2 generation mode.

| Capability | Choice |
| --- | --- |
| Supervisor blueprint and software-engineering task, coach, review | Bedrock Claude Sonnet 4.6 through the US inference profile first; Meta `muse-spark-1.3` fallback; labeled fixture if neither can answer. |
| Other four coworkers and customer replies | Meta `muse-spark-1.3`; labeled fixture fallback; distinct profiles and histories per role. |
| Speech recognition | Meta `muse-voice-transcribe-1.0`. |
| Spoken output | Browser speech synthesis initially, with a selectable available voice and text fallback. |
| Engineering research | SerpApi search, selected-page extraction, cached excerpts and source URLs. |
| Local knowledge grounding | Milvus Open Source vector retrieval from curated cases and student PDF/text; Neo4j Open Source traversal of company/task/source relationships; SQLite retains metadata and can provide FTS fallback. |

Meta transcription does not synthesize speech. The initial spoken workflow is
turn-based: record -> transcribe -> customer response -> browser speech. Test
the available voices on the presentation computer. An external high-quality
voice service can be added later if access and demo needs justify it.

## $15 Meta testing target, not an account spending cap

The presentation hybrid adds a separate $24 estimated Bedrock stop in the app
and retains the $12 estimated Meta stop, leaving a buffer under the user's $40
AWS promotional credit assumption. These local estimates are independent and
not an AWS billing cap; the provider account remains authoritative. Sonnet 4.6
usage is estimated at $3 per million input tokens and $15 per million output
tokens. Bedrock failures fall through to Meta without spending a second
Bedrock request. The app records the actual responding provider in each AI API
response. The Bedrock key is server-only and is never returned by `/api/health`.

[Meta Standard pricing](https://dev.meta.ai/docs/pricing-rate-limits) lists Muse
Spark input at $1.25 per million tokens and output at $4.25 per million tokens.
Voice transcription is $0.18 per hour. For an illustrative 200 calls at 5,000
input and 1,000 billed output tokens each, text costs $2.10. Two hours of
transcription adds $0.36: $2.46 total. Billed output includes reasoning tokens;
growing history, retries, and longer outputs raise the total.

Use bounded output, concise history, low reasoning for ordinary turns, cached
research, and at most one automatic retry for transient provider failures.
Log token counts and estimated cost without prompts, audio, or secret values.
Plan an app-side stop near $12 estimated usage to leave a buffer and compare
the actual amount with Meta's Usage dashboard. The account's spend-limit
setting sends email alerts but does not stop usage. Configuration limits and
the app-side ledger cannot guarantee a hard account-wide $15 cap.

Meta's current sign-up documentation says an API key and payment method are
required before requests. The screenshot shows $50 promotional credits but no
payment method; whether the credits are an exception is not documented.
Verify through a small authenticated smoke test once the user has configured
a key. Any billing setup stays in the user's Meta dashboard; do not add a card,
buy credits, or change account settings on the user's behalf.

## Retrieval flow

Student topic -> coach creates a bounded search query -> server calls SerpApi
-> select at most two authoritative pages -> extract relevant text -> cache
excerpts and URLs -> coach teaches and creates the assignment from that evidence.

Search again only for a genuinely new topic or missing information. The model
needs a real retrieval tool; prompting alone does not give it current web access.
Do not treat search snippets as if full documents were read. Mark provenance
as live or cached and keep citations traceable.

For student-provided PDF/text, extract and chunk locally, store page/source
metadata in SQLite, index embeddings in Milvus, connect the passages to
company/task concepts in Neo4j, and show which passages grounded the generated
task. Redis holds per-coach conversations; durable attempts/progress remain in
local storage. The first-demo PDF/OCR limit and exact local runtime await final
plan sign-off. AWS-managed services are not local-demo dependencies.

## Public learning sources

The canonical seed manifest is `web/src/lib/retrieval/catalog.ts`. On October
25, 18 verified public sources were cached under ignored `web/data/sources/`
and indexed as 89 shared passages in SQLite, Milvus, and Neo4j. The ten newest
sources cover reliability and JavaScript arrays, marketing plans and the 5 Ps,
customer complaints and communication, user interactions and usability tests,
and scatter plots and histograms. They come from Google SRE, MDN,
business.gov.au, Digital.gov, and NIST. The table below includes earlier
research candidates; use the manifest to see what is actually ingested.
Source cards retain URLs, page/part locations, retrieval time, and provenance.
Student uploads keep separate company-scoped document IDs. Before adding a
candidate, verify its current URL and reuse terms, extract useful passages,
and retain its title, publisher, URL, location, and fetch date.
For reuse, [business.gov.au requests the attribution © Commonwealth of
Australia 2020](https://business.gov.au/legal-notices/copyright),
[MDN uses CC BY-SA for prose](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license),
and [Digital.gov](https://digital.gov/policies/) and
[NIST](https://www.nist.gov/copyrights-disclaimers) describe their public-text
reuse policies. Source links and publisher names are retained in the app.

| Role | Source catalog | Format and example exercise |
| --- | --- | --- |
| Software engineer | [MDN JavaScript Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map); [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/) | HTML; transaction deduplication and load-shedding tickets. [MDN's documented reuse terms](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license) require attribution and share-alike for prose. |
| Sales and marketing | [SBA marketing plan example](https://legacy.sba.gov/document/support-marketing-plan-example); [SBA marketing and sales guidance](https://www.sba.gov/counseling/manage-your-business/) | Downloadable PDF and HTML; target audience, channel, budget, and pitch exercises. |
| Customer support | [CFPB company complaint process](https://www.consumerfinance.gov/compliance/consumer-complaint-program/company-process/); [CFPB Consumer Response Annual Report](https://files.consumerfinance.gov/f/documents/cfpb_2025-cr-annual-report_2026-03.pdf) | HTML and PDF; accurate, empathetic bank complaint response. |
| Product manager | [U.S. Digital Services Playbook](https://playbook.usds.gov/); [18F Product Guide](https://github.com/18F/product-guide) | HTML/open repository; turn user needs into a prioritized feature brief. |
| Data analyst | [U.S. Census data visualization guide](https://www.census.gov/content/dam/Census/library/working-papers/2017/demo/communicating-with-census-data-data-visualization.pdf); [NIST exploratory data analysis handbook](https://www.nist.gov/publications/nistsematech-e-handbook-statistical-methods-chapter-1-exploratory-data-analysis) | PDF and HTML; investigate a small dataset and communicate findings. |

The next five verified candidates are **not yet ingested**. They would extend
real-world exercises on [Fetch error handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch),
[market research](https://business.gov.au/marketing-and-advertising/do-market-research),
[customer relationships](https://business.gov.au/people/customers/manage-customer-relationships),
[research plans](https://digital.gov/resources/how-write-research-plan), and
[box plots](https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm).

The [SerpApi free plan](https://serpapi.com/pricing) lists 250 monthly searches
and 50 requests per hour. The screenshot also shows 1,000 extra credits; bonus
expiry and actual account limits have not been checked. Extra credits do not
establish a higher hourly limit. Its separate
[Extract API](https://serpapi.com/extract-api) returns public-page content;
avoid broad crawling and account for extraction credits separately.

## Local configuration

Fill the placeholders in `web/.env.local` on this computer. It is ignored by
Git; `.env.example` contains safe defaults. Do not put keys in `NEXT_PUBLIC_*`
variables or paste them into chat. Rotate the SerpApi key exposed in the user's
screenshot before entering its replacement. Configuration status must only
report booleans and public model IDs, never secret values.
For the hybrid presentation, generate a short-term Bedrock API key in the AWS
console and set `AWS_BEARER_TOKEN_BEDROCK` in ignored `web/.env.local` without
sharing its value. `BEDROCK_REGION=us-east-1` and
`BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6` are the defaults. Restart the
app after changing `.env.local`, then check only the configuration booleans at
`/api/health`. Keep Spark and transcription configured for fallback and voice.
Run `node scripts/rehearse-bedrock.mjs --live` from `web/` to verify that the
supervisor and engineering task, coach, and review actually report `bedrock`.

Sources: [Meta API](https://dev.meta.ai/docs/overview),
[Meta reasoning billing](https://dev.meta.ai/docs/reasoning),
[browser speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis),
[SerpApi account limits](https://serpapi.com/account-api),
[Meta signup requirements](https://dev.meta.ai/help/accounts-and-login/sign-up),
[Meta spend alert](https://dev.meta.ai/help/billing/spend-limit-alert),
[SQLite FTS5](https://www.sqlite.org/fts5.html).
