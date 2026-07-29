# Agent API — `lib/`

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
const {
  registerDraft,
  markApproved,
  markCreated,
  getMcpSetRichTextScript,
  getMcpFillScript,
  getMcpKnowledgeSearchScript,
  resolveCategories,
  productCategoryMatrix,
} = require('./lib');

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

## Salesforce browser session (mandatory)

Repeated Okta login prompts happen when agents fight over the Chrome profile. **Use one MCP browser only.**

| Do | Don't |
|----|-------|
| Playwright MCP (`user-playwright`) only | `launchPersistentContext`, `.scratch-fetch-reqs.mjs`, or any second Chrome |
| `getMcpReadAppointmentBatchScript()` for Steps 1–3 | `pkill playwright-mcp`, `browser_close`, or a second Chrome |
| Batch up to **3 REQ ids** per session | `browser_navigate` to `/lightning/page/home` (use current tab or Knowledge list) |
| `browser_run_code_unsafe` with `salesforce-session.js` helpers | Standalone `browser_navigate` when a script can continue the same tab |
| Leave MCP running after login | `--headless` MCP (login/MFA won't stick visibly) |

MCP profile (persistent): `~/Library/Caches/ms-playwright-mcp/workday-salesforce`

```javascript
const { getMcpReadAppointmentBatchScript } = require('./lib');
// Pass getMcpReadAppointmentBatchScript(['REQ-238778', 'REQ-241220']) to browser_run_code_unsafe
```

If MCP shows **Not connected**: Cursor Settings → MCP → Playwright → Restart. Log in once in the headed browser window, then continue.

Session helpers live in `lib/salesforce-session.js` (`ensureReady`, `fetchAttachmentBase64SameTab`). Scripts never navigate to `/lightning/page/home`.

## Related Categories (mandatory — 3 levels)

Always set **Product Line**, **Product Area**, and **Product Capability** from the appointment (or closest matrix match). Never save with only two levels unless the Salesforce picklist has no capability for that area (rare — note it in Internal Notes).

```javascript
const { resolveCategories, productCategoryMatrix } = require('./lib');
resolveCategories(appointmentProductArea, appointmentCapability, productCategoryMatrix);
```

## Attachments tab (optional — user request only)

**Do not** open the **Attachments** tab as part of the standard intake. Default Steps 1–3 use **Details** and public **Notes** only.

Open **Attachments** only when the user explicitly asks (e.g. "check attachments", "attachments tab", "review the files"). That step is slow (extra navigation, image fetch, embed) and is not required for most requests.

Inline screenshots in **Notes** are separate: follow [SKILL.md](SKILL.md) Step 2 only when a note references pasted images.

## Duplicate check (Step 3)

**Never** `browser_navigate` to `/lightning/globalSearch/...` — that URL does not exist and shows **"Page doesn't exist"**.

```javascript
const { getMcpKnowledgeSearchScript } = require('./lib');

globalThis.__kaSearchQuery = 'Put Reference ID EIB load time';
// Pass getMcpKnowledgeSearchScript() to browser_run_code_unsafe
```
