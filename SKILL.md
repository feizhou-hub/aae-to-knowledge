---
name: aae-to-knowledge
description: >-
  Turns Workday WSP Salesforce appointments (Ask an Expert, REQ-###### links)
  into Knowledge Article drafts via Playwright — no Salesforce API. Checks
  duplicates, strips customer PII, saves a local markdown draft, and stops for
  human approval before any Salesforce write. Use whenever the user pastes a
  workday.lightning.force.com Appointment URL, asks to create/draft/summarize a
  Knowledge Article from a case, or says "make a KA" — even on the first
  message. "Create a KA" means local draft only; Salesforce writes require a
  follow-up approval. Use the bundled approval-gate and salesforce-write helpers
  in this skill folder.
---

# WSP Case → Knowledge Article

Browser-only workflow (Playwright MCP). WSP consultants use the Salesforce UI, not the API.

## Priorities (in order)

1. **No duplicate articles** — search before drafting
2. **No customer PII** in article prose — generalize for any customer
3. **No Salesforce writes until the user approves the local draft** — end your turn after Step 4

## Prerequisites

- Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`, `browser_tabs`)
- User logged into Salesforce in the driven browser; if login page appears, wait for user confirmation

## Workflow

```
- [ ] Step 1: Read case (Details + public Notes)          → references/case-intake.md
- [ ] Step 2: Check inline screenshots (if referenced)    → references/case-intake.md
- [ ] Step 3: Search for duplicate Knowledge articles     → references/case-intake.md
- [ ] Step 4: Draft locally (draft-REQ-######.md)         → references/drafting.md
- [ ] STOP — present draft, ask for approval              → (below)
- [ ] Step 5: Create Salesforce draft (after approval)    → references/salesforce-writes.md
- [ ] Cleanup scratch files                               → references/lightning-tips.md
```

### Step 1 — Read the case

Navigate to the appointment. Capture from **Details**: Subject, description, Record Type, Product Area, Capability. Open **Notes**; use only rows where **Private** is unchecked. Reconstruct chronologically (list is usually newest-first). Read every public note fully — resolution may be in a different note than the root-cause diagnosis.

→ Full guidance: [references/case-intake.md](references/case-intake.md)

### Step 2 — Screenshots

Only if a note references pasted screenshots. Skip the Attachments tab. Inline images live in shadow DOM.

→ Full guidance: [references/case-intake.md](references/case-intake.md#screenshots)

### Step 3 — Duplicate check

Search Salesforce for core technical terms (not customer names). If a Published/Validated article covers the same root cause and resolution, stop and report it.

→ Full guidance: [references/case-intake.md](references/case-intake.md#duplicate-check)

### Step 4 — Local draft

Default template: **Knowledge Articles** (Description + Resolution, no separate Issue/Cause). Save `draft-REQ-######.md` in the project directory. Match house style:

- **Generalize** when the resolution applies broadly; cite a specific integration or object as an example in the body, not the title
- **Decide** whether Resolution items are sequential steps or parallel strategies based on the case — do not default to numbered steps
- **Structure for scanability:** `###` headings + bullet lists in Resolution; avoid dense paragraphs (see drafting.md readability section)

```js
const { registerDraft } = require('./approval-gate');
registerDraft('REQ-######', { draftPath: 'draft-REQ-######.md', sourceUrl, title });
```

→ House style & templates: [references/drafting.md](references/drafting.md)

### HARD STOP — human review

**End your turn here.** Present the full draft and ask the user to approve or request edits.

- "Create a KA" / "make a KA" / pasting an appointment link = **Steps 1–4 only** on the first turn
- Do **not** navigate to `Knowledge__kav/new`, click New Article/Save, or fill Related Categories until the user's **next message** explicitly approves ("approved", "looks good", "create it in Salesforce", "go ahead")

### Step 5 — Salesforce draft (after approval only)

```js
const { markApproved, markCreated } = require('./approval-gate');
const { getMcpSetRichTextScript, getMcpFillScript } = require('./salesforce-write');

markApproved('REQ-######');
// ... create article via Playwright ...
markCreated('REQ-######', { articleUrl });
```

Use `salesforce-write.js` (not `set-rich-text-fields.js` / `fill-related-categories.js` directly) — it enforces the review gate.

→ Form fill, TinyMCE, categories, tables: [references/salesforce-writes.md](references/salesforce-writes.md)

## Deliverable

After Step 5, always return the draft URL:

**Article:** [Title](https://workday.lightning.force.com/lightning/r/Knowledge__kav/ka0VT.../view)

Remind the user it is a **draft** (not published). Do not click Publish.

## Tooling

| Need | Where |
|------|-------|
| Review gate, category resolver, rich-text helpers | `approval-gate.js`, `salesforce-write.js`, `category-resolver.js` — see [AGENTS.md](AGENTS.md) |
| Lightning navigation gotchas | [references/lightning-tips.md](references/lightning-tips.md) |
