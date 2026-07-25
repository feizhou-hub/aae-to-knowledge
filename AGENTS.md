# KA Creator Tools — Agent Instructions

## Review gate (highest priority after duplicate check)

**Do not write to Salesforce until the user approves the local draft in a follow-up message.**

| Step | Action | Salesforce? |
|------|--------|-------------|
| 1–3 | Read appointment, check duplicates | Read-only OK |
| 4 | Save `draft-REQ-######.md`, `registerDraft()` | No writes |
| — | **STOP. Present draft. Ask for approval.** | No writes |
| 5 | `markApproved()` then create draft + categories | Writes OK |

"Create a KA" = Steps 1–4 only on the first turn.

## API

```javascript
const { registerDraft, markApproved, markCreated, assertApproved } = require('./approval-gate');
const { getMcpFillScript, getMcpSetRichTextScript } = require('./salesforce-write');

// After saving draft markdown:
registerDraft('REQ-439659', {
  draftPath: 'draft-REQ-439659.md',
  sourceUrl: 'https://workday.lightning.force.com/...',
  title: 'Article Title',
});

// After user approves in their NEXT message:
markApproved('REQ-439659');
getMcpSetRichTextScript('REQ-439659'); // throws if not approved

// After Salesforce Save succeeds:
markCreated('REQ-439659', { articleUrl: 'https://workday.lightning.force.com/...' });
```

See [SKILL.md](SKILL.md) for the full workflow. Step 4 stops for review; Step 5 uses the helpers in this folder.

## Duplicate check (Step 3)

**Never** `browser_navigate` to `/lightning/globalSearch/...` — that URL does not exist and shows **"Page doesn't exist"**.

```javascript
const { getMcpKnowledgeSearchScript } = require('./salesforce-search');

globalThis.__kaSearchQuery = 'Put Reference ID EIB load time';
// Pass getMcpKnowledgeSearchScript() to browser_run_code_unsafe
```
