---
name: aae-to-knowledge
description: >-
  Turns Workday WSP Salesforce appointments (Ask an Expert, REQ-###### links)
  into Knowledge Article drafts using the Chrome Salesforce session (SOQL,
  REST, and the Related Categories Apex action). Use whenever the user pastes
  a workday.lightning.force.com Appointment URL, asks to create, draft, or
  summarize a Knowledge Article from a request, or says "make a KA" — even on
  the first message. Also use when a draft is missing Related Categories or
  the article body needs a fix after creation. "Create a KA" means a local
  draft only; Salesforce writes require a follow-up approval. Do not use
  Playwright.
---

# WSP Request → Knowledge Article

Read and write Salesforce with the Chrome session cookie. The objects and the session principle are in [references/objects.md](references/objects.md). House style is in [references/drafting.md](references/drafting.md).

## Priorities

1. **No duplicate articles** — SOQL on `Knowledge__kav` before drafting
2. **No customer PII** in article prose — generalize for any customer. Do not copy private notes.
3. **No Salesforce writes until the user approves the local draft** — end the turn after Step 4

Playwright MCP is not part of this workflow. Do not launch a browser, do not call `browser_navigate`, and do not fill the Lightning form.

## Workflow

```
- [ ] Step 1: Read Appointment__c + public Appointment_Comment__c
- [ ] Step 2: Note inline images only when the public note depends on them
- [ ] Step 3: Search Knowledge__kav for a duplicate
- [ ] Step 4: Save draft-REQ-######.md and registerDraft()
- [ ] STOP — present the draft and ask for approval
- [ ] Step 5: After approval, REST-create Knowledge__kav, then Apex-save Related_Category__c
```

Run the helpers from this skill directory (`lib/salesforce-api.js`).

### Step 1 — Read the request

```javascript
const { readAppointment } = require('./lib');
const row = await readAppointment('https://workday.lightning.force.com/lightning/r/Appointment__c/a3N…/view');
// or readAppointment('REQ-523290')
```

Use `appointment.Subject__c`, `appointment.detailsText`, `appointment.Product_Line__c`, `appointment.Product__c` (Product Area), and `appointment.Sub_Product__c` (Capability). Rebuild the story from `publicNotes` in `CreatedDate` order. `privateNoteCount` is informational. Never put a private note body into the draft.

If `readAppointment` says there is no `sid`, ask the user to log into Salesforce in Chrome and retry. Do not open Playwright.

### Step 2 — Screenshots

Public note HTML may contain `file.force.com` image URLs. Fetch one only when the words do not already state the resolution. Do not open an Attachments tab.

### Step 3 — Duplicate check

```javascript
const { searchKnowledge } = require('./lib');
const hits = await searchKnowledge({
  titleLikes: ['Expense REST', 'Get_Expense_Reports'],
  phrases: ['"Expense REST"'],
});
```

Compare titles. Open an article only when the title is the same root cause. A near match belongs in the draft's duplicate table as related, not as a reason to stop, unless it already answers the question.

### Step 4 — Local draft

Save `draft-REQ-######.md`. Template: **Knowledge Articles** (Description + Resolution). Follow [references/drafting.md](references/drafting.md).

Proposed categories are the appointment's three levels when those exact strings exist on `Related_Category__c`. Say so in the draft.

```javascript
const { registerDraft } = require('./lib');
registerDraft('REQ-######', { draftPath: 'draft-REQ-######.md', sourceUrl, title });
```

### HARD STOP

**End the turn here.** Show the full draft. Ask the user to approve or edit it.

"Create a KA", "make a KA", or an appointment link is Steps 1–4 only. The next message has to say approved, looks good, create it in Salesforce, go ahead, or the same clear approval.

### Step 5 — Salesforce draft (after approval only)

```javascript
const { markApproved, markCreated, mdToHtml, createKnowledgeDraft, setRelatedCategories } = require('./lib');

markApproved('REQ-######');
const created = await createKnowledgeDraft('REQ-######', {
  title,
  urlName,
  descriptionHtml: mdToHtml(descriptionMarkdown),
  resolutionHtml: mdToHtml(resolutionMarkdown),
  internalNotesHtml: mdToHtml(internalNotesMarkdown),
});
await setRelatedCategories('REQ-######', created.Id, {
  productLine, productArea, productCapability,
});
markCreated('REQ-######', { articleUrl: created.url });
```

`createKnowledgeDraft` and `setRelatedCategories` throw if the draft is not approved. The article stays a draft. Do not publish.

Return:

**Article:** [Title](https://workday.lightning.force.com/lightning/r/Knowledge__kav/ka0…/view)

## Several requests

There is no browser batch limit. Read every appointment the user named, write one local draft each, present them together, and stop. Create Salesforce drafts only after approval, and only for the drafts they approved.

## Where to read next

| Need | File |
|------|------|
| Why these objects, and how the session is used | [references/objects.md](references/objects.md) |
| What to pull from the appointment | [references/request-intake.md](references/request-intake.md) |
| Title, Description, Resolution, Internal Notes | [references/drafting.md](references/drafting.md) |
| REST body and the Apex category call | [references/salesforce-writes.md](references/salesforce-writes.md) |
| Review-gate functions | [AGENTS.md](AGENTS.md) |
