# Request Intake (Steps 1–3)

## Multiple requests (batch read)

Hard limit: **3 REQ ids per `browser_run_code_unsafe` call**. `getMcpReadAppointmentBatchScript()` uses `.slice(0, 3)` — ids beyond the third are **silently dropped** unless you chunk the list and run another batch in a follow-up turn.

### 2–3 REQ ids

Read all appointments in **one** `browser_run_code_unsafe` call — do not open a new browser or navigate to home between them.

```js
const { getMcpReadAppointmentBatchScript } = require('./lib');

// Pass to browser_run_code_unsafe — returns { batch, appointments, pageUrl }
getMcpReadAppointmentBatchScript(['REQ-238778', 'REQ-241220', 'REQ-298710']);
```

Then run Steps 2–4 **per REQ** (screenshots, duplicate check, local draft). Present all drafts before stopping for approval.

### More than 3 REQ ids

Split the user's list into chunks of 3. Process chunk 1 (Steps 1–4), present drafts, **STOP**. In a follow-up turn, process chunk 2, and so on. Do **not** pass all ids to `getMcpReadAppointmentBatchScript()` at once — only the current chunk (max 3).

## Reading the request

Navigate to the appointment link. Snapshot **Details** (usually default tab):

- Subject and full Details/description text
- Record Type (e.g. "Ask an Expert") → maps to Target WSP Service in Step 5
- Product Area and Capability → Related Categories in Step 5

### Notes tab

The Notes related list has a **Private** column with a checkbox per row.

- **Unchecked** = public, customer-visible → use these
- **Checked** = internal-only → skip unless user asks for internal context

Reconstruct chronologically (list is usually newest-first): what was reported, tried, root cause, resolution.

### Finding the real resolution

Read every non-private note top to bottom — don't grep only for technical keywords.

Resolution often lives in a **different note** than the root-cause explanation. Watch for:

- A secondary consultant added mid-request ("adding X as secondary…")
- Short meeting-recap or decision notes among administrative noise (invites, availability)

If a snapshot is large, save to a file and grep/read `tabpanel "Notes"` / `tabpanel "Details"` sections only.

## Attachments tab (only when user explicitly requests)

**Standard intake:** Details + public Notes only. **Do not** open the **Attachments** tab unless the user explicitly asks (e.g. "check attachments", "review files in attachments tab").

When requested: open **Attachments**, list files, and open relevant images for context. Optionally embed illustrative screenshots in the draft or Salesforce article only when they add clear value (and strip customer PII per audience rules below).

## Screenshots (inline in Notes)

By default, check **inline** images in note bodies only — not the Attachments tab. Consultants often paste screenshots **inline in note bodies**. These do not appear in Attachments or Notes & Attachments counts.

Inline images are inside Lightning **shadow DOM** — plain `querySelectorAll('img')` won't find them. Walk shadow roots:

```js
function* walk(root) {
  for (const el of root.querySelectorAll('*')) {
    yield el;
    if (el.shadowRoot) yield* walk(el.shadowRoot);
  }
}
// filter walk(document) for el.tagName === 'IMG'
```

Images appear as `<img src="https://.../servlet/rtaImage?...">`. Scroll into view and `browser_take_screenshot` to inspect. For full resolution: open the `rtaImage` URL in a new tab, `fetch` with credentials, base64-encode, save via evaluate `filename` param.

### PII in screenshots

Depends on audience (default: **Internal Audience Only**):

| Audience | Screenshots | Prose |
|----------|-------------|-------|
| Internal Audience Only | Real tenant screenshots OK when illustrative | Strip account/contact/tenant names |
| Customer-facing (Community) | Ask before embedding names/IDs/org charts | Strip all customer-specific detail |

## Duplicate check

Use global Salesforce search with core technical terms (integration name, error text, feature — not customer names). Compare top Knowledge results' Description/Resolution against your planned draft.

**Do not** `browser_navigate` to `/lightning/globalSearch/<term>` — that path does not exist in Lightning and triggers a **"Page doesn't exist"** modal. Search via the Lightning search box instead.

```js
const { getMcpKnowledgeSearchScript } = require('./lib');

globalThis.__kaSearchQuery = 'Put Reference ID EIB load time';
// Pass getMcpKnowledgeSearchScript() to browser_run_code_unsafe
```

Or manually: focus the visible `Search...` input → type query → Enter → click the **Knowledge** filter in results.

If a **Published and Validated** article already covers the same root cause and resolution:

- Stop and report title, status, link
- Let the user decide: proceed anyway, skip, or edit the existing article
