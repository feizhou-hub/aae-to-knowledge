---
name: aae-to-knowledge
description: >-
  Turns Workday WSP Salesforce appointments (Ask an Expert, REQ-###### links)
  into Knowledge Article drafts via Playwright — no Salesforce API. Checks
  duplicates, strips customer PII, saves a local markdown draft, and stops for
  human approval before any Salesforce write. Use whenever the user pastes a
  workday.lightning.force.com Appointment URL, asks to create/draft/summarize a
  Knowledge Article from a request, or says "make a KA" — even on the first
  message. "Create a KA" means local draft only; Salesforce writes require a
  follow-up approval. Use the bundled approval-gate and salesforce-write helpers
  in this skill folder.
---

# WSP Request → Knowledge Article

Browser-only workflow (Playwright MCP). WSP consultants use the Salesforce UI, not the API.

## Priorities (in order)

1. **No duplicate articles** — search before drafting
2. **No customer PII** in article prose — generalize for any customer
3. **No Salesforce writes until the user approves the local draft** — end your turn after Step 4

## Prerequisites

- Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`, `browser_tabs`)
- User logged into Salesforce in the driven browser; if login page appears, wait for user confirmation
- **One MCP browser session** — do not launch a second Chrome or `pkill playwright-mcp` mid-workflow (see [AGENTS.md](AGENTS.md#salesforce-browser-session-mandatory))

## Multiple requests (bulk)

Hard limit: **3 REQ ids per Playwright MCP session** (reads and writes). `getMcpReadAppointmentBatchScript()` only accepts the first 3 ids — it does **not** auto-chunk longer lists.

### 2–3 REQ ids in one turn

1. **Steps 1–3** — one `browser_run_code_unsafe` batch read (no home navigation between appointments)
2. **Step 4** — save each `draft-REQ-######.md`, `registerDraft()` each, present all drafts, **STOP**
3. **Step 5** (after approval) — one MCP session; create up to **3 articles** per batch script

```js
const { getMcpReadAppointmentBatchScript } = require('./lib');
// Pass getMcpReadAppointmentBatchScript(['REQ-238778', 'REQ-241220']) to browser_run_code_unsafe
```

### More than 3 REQ ids

**Chunk the list yourself** — process at most 3 per turn for Steps 1–4, and at most 3 per turn for Step 5 after approval.

Example: user asks for REQ-A through REQ-E (5 ids).

| Turn | Action |
|------|--------|
| 1 | Batch read + draft REQ-A, B, C → present all 3 drafts → **STOP** |
| 2 | User approves → create 3 Salesforce drafts (A, B, C) |
| 3 | Batch read + draft REQ-D, E → present both drafts → **STOP** |
| 4 | User approves → create 2 Salesforce drafts (D, E) |

Rules for every batch:

- **One** Playwright MCP session per batch — do not `browser_close` or restart MCP mid-batch
- Do **not** `browser_navigate` to `/lightning/page/home` between appointments or articles in the same batch
- Each REQ still gets its own `registerDraft()` / review gate — approval can cover one or all drafts in a batch
- Tell the user how many REQs remain after each batch

→ Session rules: [AGENTS.md](AGENTS.md#salesforce-browser-session-mandatory) · Batch writes: [references/salesforce-writes.md](references/salesforce-writes.md#bulk-creation-up-to-3-per-session)

## Workflow

```
- [ ] Step 1: Read request (Details + public Notes)          → references/request-intake.md
- [ ] Step 2: Check inline screenshots (if referenced)    → references/request-intake.md
- [ ] Step 3: Search for duplicate Knowledge articles     → references/request-intake.md
- [ ] Step 4: Draft locally (draft-REQ-######.md)         → references/drafting.md
- [ ] STOP — present draft, ask for approval              → (below)
- [ ] Step 5: Create Salesforce draft (after approval)    → references/salesforce-writes.md
- [ ] Cleanup scratch files                               → references/lightning-tips.md
```

### Step 1 — Read the request

Navigate to the appointment. Capture from **Details**: Subject, description, Record Type, Product Area, Capability. Open **Notes**; use only rows where **Private** is unchecked. Reconstruct chronologically (list is usually newest-first). Read every public note fully — resolution may be in a different note than the root-cause diagnosis.

→ Full guidance: [references/request-intake.md](references/request-intake.md)

### Step 2 — Screenshots (notes only, by default)

Only if a note references pasted **inline** screenshots. Inline images live in shadow DOM.

**Do not open the Attachments tab** unless the user explicitly asks (e.g. "check attachments", "attachments tab"). That is not part of the standard workflow — it adds significant time and is only for explicit requests.

→ Full guidance: [references/request-intake.md](references/request-intake.md#screenshots)

### Step 3 — Duplicate check

Search Salesforce for core technical terms (not customer names). If a Published/Validated article covers the same root cause and resolution, stop and report it.

→ Full guidance: [references/request-intake.md](references/request-intake.md#duplicate-check)

### Step 4 — Local draft

Default template: **Knowledge Articles** (Description + Resolution, no separate Issue/Cause). Save `draft-REQ-######.md` in the project directory. Match house style:

- **Generalize** when the resolution applies broadly; cite a specific integration or object as an example in the body, not the title
- **Decide** whether Resolution items are sequential steps or parallel strategies based on the request — do not default to numbered steps
- **Structure for scanability:** `###` headings + bullet lists in Resolution; avoid dense paragraphs (see drafting.md readability section)
- **Optional — branching logic:** consider Mermaid activity/sequence/use-case diagrams when 3+ if/else paths would be hard to scan in prose (see [references/uml-diagrams.md](references/uml-diagrams.md))

```js
const { registerDraft } = require('./lib');
registerDraft('REQ-######', { draftPath: 'draft-REQ-######.md', sourceUrl, title });
```

→ House style & templates: [references/drafting.md](references/drafting.md)

### HARD STOP — human review

**End your turn here.** Present the full draft and ask the user to approve or request edits.

- "Create a KA" / "make a KA" / pasting an appointment link = **Steps 1–4 only** on the first turn
- Do **not** navigate to `Knowledge__kav/new`, click New Article/Save, or fill Related Categories until the user's **next message** explicitly approves ("approved", "looks good", "create it in Salesforce", "go ahead")

### Step 5 — Salesforce draft (after approval only)

```js
const { markApproved, markCreated, getMcpSetRichTextScript, getMcpFillScript } = require('./lib');

markApproved('REQ-######');
// ... create article via Playwright ...
markCreated('REQ-######', { articleUrl });
```

Use `salesforce-write.js` (via `require('./lib')`, not the underlying modules directly) — it enforces the review gate.

→ Form fill, TinyMCE, categories, tables: [references/salesforce-writes.md](references/salesforce-writes.md)

## Deliverable

After Step 5, always return the draft URL:

**Article:** [Title](https://workday.lightning.force.com/lightning/r/Knowledge__kav/ka0VT.../view)

Remind the user it is a **draft** (not published). Do not click Publish.

## Tooling

| Need | Where |
|------|-------|
| Review gate, category resolver, rich-text helpers, batch read | `lib/` — see [AGENTS.md](AGENTS.md) |
| Lightning navigation gotchas | [references/lightning-tips.md](references/lightning-tips.md) |
