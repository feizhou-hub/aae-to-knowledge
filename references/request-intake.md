# Request Intake (Steps 1–3)

## Show the appointment first

On the first tool batch of a “create a KA” turn, open the source record in Playwright MCP so the user sees the headed browser move:

- **Appointment URL** — `browser_navigate` to that Lightning record immediately (reuse the current tab). Parallel with reading this file is OK; delaying until an intake script exists is not.
- **REQ id only** — search/open the appointment as the first browser action; then pass `__kaAppointmentUrls` into `getMcpIntakeScript` once the URL is known.

Do not navigate to `/lightning/page/home`. After the record is on screen, continue with `getMcpIntakeScript` as usual.

## Multiple requests (batch read)

Hard limit: **3 REQ ids per `browser_run_code_unsafe` call**. `getMcpIntakeScript()` uses `.slice(0, 3)` — ids beyond the third are **silently dropped** unless you chunk the list and run another batch in a follow-up turn.

### 2–3 REQ ids

Read all appointments in **one** `browser_run_code_unsafe` call — do not open a new browser or navigate to home between them.

```js
const { getMcpIntakeScript } = require('./lib');

// One MCP call: Details + Notes + Knowledge duplicate titles
// Optional: globalThis.__kaSearchQuery = 'Put Candidate Attachment MIME type'
// Optional: globalThis.__kaAppointmentUrls = { 'REQ-238778': 'https://workday.lightning.force.com/lightning/r/Appointment__c/...' }
getMcpIntakeScript(['REQ-238778', 'REQ-241220', 'REQ-298710']);
```

Then run Steps 2–4 **per REQ** (screenshots only if notes mention inline images; local draft). Duplicate titles come back on `duplicateCheck.articles`. Present all drafts before stopping for approval.

### More than 3 REQ ids

Split the user's list into chunks of 3. Process chunk 1 (Steps 1–4), present drafts, **STOP**. In a follow-up turn, process chunk 2, and so on. Do **not** pass all ids to `getMcpIntakeScript()` at once — only the current chunk (max 3).

## Reading the request

`getMcpIntakeScript` opens **Details** and **Notes** and returns structured fields (`recordType`, `productArea`, `capability`, `publicNotes`). Use those first; only snapshot a tab if a field is missing. Do **not** open the **Questionnaire** tab.

- Record Type (e.g. "Ask an Expert") → maps to Target WSP Service in Step 5. It lives on the **highlights panel**, not the Details tabpanel.
- Product Area and Capability → Related Categories in Step 5
- Subject and the customer write-up live in the collapsed **Request Details** accordion. The write-up field is labeled **Details**, not Description. Intake expands that section and parses it with `parseRequestDetails()` so it does not pick up **Ask an Expert Details**.

If Subject is missing after intake, the accordion was still collapsed — do not draft from Product Area/Capability alone.

### Notes tab

The Notes related list has a **Private** column with a checkbox per row.

- **Unchecked** = public, customer-visible → use these
- **Checked** = internal-only → skip unless user asks for internal context

The related list often shows **Loading** / **No records to display** for several seconds after the tab is visible. Intake polls until `Created By:` appears (or 15s). Do not treat that placeholder as an empty appointment. If notes still look like a loading placeholder, wait and re-read — do not search Knowledge from Product Area/Capability words alone.

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

Use global Salesforce search with core technical terms (integration name, error text, feature — not customer names). **Compare titles first** — only open an article if the title looks like the same root cause.

**Do not** `browser_navigate` to `/lightning/globalSearch/<term>` — that path does not exist in Lightning and triggers a **"Page doesn't exist"** modal. Search via the Lightning search box instead.

**Do not** click the exact-name **Knowledge** link in the app nav. That opens Recently Viewed, not search results. Click the search-results filter named like `Knowledge 5+`.

Intake already searches in the same MCP call. To override the query or re-search:

```js
const { getMcpKnowledgeSearchScript } = require('./lib');

globalThis.__kaSearchQuery = 'Put Reference ID EIB load time';
// Pass getMcpKnowledgeSearchScript() to browser_run_code_unsafe
// Returns { query, url, articles: [{ title, url }] }
```

If a **Published and Validated** article already covers the same root cause and resolution:

- Stop and report title, status, link
- Let the user decide: proceed anyway, skip, or edit the existing article
