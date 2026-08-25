# Salesforce Writes (Step 5)

**Only after user approval** in a follow-up message. Use `lib/salesforce-write.js` via `require('./lib')`.

Gated helpers (`getMcpSetRichTextScript(reqId)`, `getMcpCreateArticleScript(reqId)`) **throw** after `markCreated()` (`status: created`). For a user-requested **edit** of an existing draft article (embed a diagram, fix Description), use `set-rich-text-fields.js` / `fill-related-categories.js` **directly** — do not call the gated wrappers.

```js
const { markApproved, markCreated, getMcpCreateArticleScript, resolveCategories, productCategoryMatrix } = require('./lib');

markApproved('REQ-######');
globalThis.__kaArticle = {
  title,
  urlName,
  targetWspService: 'Ask an Expert',
  richText: { description, resolution, internalNotes },
  categories: resolveCategories(productArea, capability, productCategoryMatrix),
};
// Pass getMcpCreateArticleScript('REQ-######') to browser_run_code_unsafe
```

## Speed: batch Playwright, don't snapshot per field

Drive the form in **one** `getMcpCreateArticleScript(reqId)` call (New Article → TinyMCE → Save → Related Categories). Locators auto-wait — do **not** add `waitForTimeout(8000)` after Save. Only snapshot at checkpoints if something fails.

Template picker defaults to Knowledge Articles — click **Next** without snapshotting.

Case Type → WSP triggers a real server round trip for Target WSP Service — that's expected latency.

### Page 2 form (example)

```js
async (page) => {
  await page.getByRole('combobox', { name: 'Case Type (Team)' }).click();
  await page.getByRole('option', { name: 'WSP' }).click();
  await page.getByRole('option', { name: 'Ask an Expert' }).click();
  await page.getByLabel('*Target WSP Service').getByRole('button', { name: 'Move selection to Chosen' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('...');
  await page.getByRole('textbox', { name: 'URL Name' }).fill('...');
  await page.getByRole('checkbox', { name: 'Internal Audience Only' }).check();
}
```

From the request: **Knowledge** tab → **New Article** → default template → Next.

### Form fields

| Field | Value |
|-------|-------|
| Case Type (Team) | WSP |
| Target WSP Service | Map from Record Type (e.g. Ask an Expert → Ask an Expert) |
| Title / Resolution / Description | Rich-text HTML via TinyMCE |
| URL Name | Hyphenated slug — overwrite cleanly after Title (auto-fill concatenates) |
| Internal Audience Only | Checked |
| Internal Notes | Source line first (`Sourced from AAE request REQ-###### (Appointment APP-######): <link>`), then a blank line, then context. TinyMCE needs `<p>&nbsp;</p>` after the source paragraph — see below |
| Visible in Community to | Empty unless user says otherwise |

Save (not Save & New). Do **not** Publish.

## Rich-text fields (TinyMCE)

`browser_type` produces unformatted walls of text. Set HTML via TinyMCE API in one script:

```js
// Never use tinymce.get() array index — order ≠ visual field order
// Use label-based discovery via salesforce-write.js:
globalThis.__kaRichTextFields = {
  description: '<p>...</p>',
  resolution: '<p>...</p>',
  internalNotes: '<p>Sourced from...</p>\n<p>&nbsp;</p>\n<p>Subject: ...</p>',
};
// getMcpSetRichTextScript('REQ-######') via browser_run_code_unsafe
```

For large payloads (base64 screenshots), write JS to `.playwright-mcp/` and pass `filename` to `browser_run_code_unsafe`.

Embed screenshots: `<img src="data:image/png;base64,...">` — Salesforce rewrites to `rtaImage` on save.

### HTML tables

Comparison tables separate **paired concepts** (A vs B, on vs off, scenario matrix). Draft rules and triggers: [drafting.md — When to use a comparison table](drafting.md#when-to-use-a-comparison-table).

**Spacing (required)** — leave visible space **before and after** a comparison table so prose does not run into the table border:

| Format | Rule |
|--------|------|
| Markdown draft | **One blank line** before the `\|` table row **and** one blank line after the last table row |
| Salesforce HTML (before) | `<p><br></p>` before `<table>` **and** `margin-top: 16px` on `<table>` |
| Salesforce HTML (after) | `margin-bottom: 16px` on `<table>` **and** `<p>&nbsp;</p>` immediately after `</table>` before the next paragraph. TinyMCE often collapses `<p><br></p>` after tables; `&nbsp;` survives Save |
| `mdToHtml()` | Inserts before- and after-table spacing automatically — still add the blank lines in markdown. Also inserts `<p>&nbsp;</p>` after an Internal Notes source paragraph (`Sourced from AAE request`) |

```html
<p>Root cause explanation ending the prose block.</p>
<p><br></p>
<table style="border-collapse: collapse; width: 100%; margin-top: 16px; margin-bottom: 16px;" border="1" cellpadding="6" cellspacing="0">
  <thead>
    <tr>
      <th style="background-color: #f3f3f3; text-align: left; border: 1px solid #d8dde6; padding: 8px;">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d8dde6; padding: 8px; vertical-align: top;">Cell</td>
    </tr>
  </tbody>
</table>
<p>&nbsp;</p>
<p>Prose that continues after the table.</p>
```

**Differing token (required when two strings are almost identical)** — color the one segment that changes. Do not dump both full strings in one sentence.

```html
<code>oms-attachments/{id}?{timestamp}?<span style="background-color:#2e844a;color:#ffffff;padding:2px 8px;border-radius:3px;font-weight:700;white-space:nowrap;">application/pdf</span>?resume.pdf</code>
```

```html
<code>oms-attachments/{id}?{timestamp}?<span style="background-color:#c23934;color:#ffffff;padding:2px 8px;border-radius:3px;font-weight:700;white-space:nowrap;">missing</span>?resume.pdf</code>
```

Optional row tint: present `#eef8f1`, missing `#fdecea`. Label an empty delimiter slot **missing** (red) instead of `??`.

### Internal Notes spacing

Put the source line (REQ, APP, appointment URL) in its own paragraph. Then **one blank line**, then `Subject:` and the rest. TinyMCE collapses adjacent `<p>` tags, so `<p><br></p>` is not enough — use `&nbsp;`:

```html
<p>Sourced from AAE request REQ-###### (Appointment APP-######): https://workday.lightning.force.com/lightning/r/Appointment__c/.../view</p>
<p>&nbsp;</p>
<p>Subject: ...</p>
```

`mdToHtml()` inserts that spacer after a paragraph that starts with `Sourced from AAE request`. Do not concatenate the URL and `Subject:` into one paragraph.

### Sequential steps in Resolution (step express HTML)

For numbered procedures, use the **step express** layout: circled step number with dotted connector rail, bold title, italic context line, and numbered `<ol>` sub-steps. Do **not** use `<p><strong>Step N:</strong></p>` alone — it reads as body text.

```html
<p>One-sentence framing intro.</p>
<p><br></p>
<table style="width: 100%; border: none; border-collapse: collapse; margin: 0;">
<tr>
<td style="width: 44px; vertical-align: top; border: none; padding: 0; height: 1px;">
<table style="width: 28px; margin: 0 auto; border: none; border-collapse: collapse; height: 100%;" height="100%">
<tr>
<td style="border: none; padding: 0; text-align: center; vertical-align: top;">
<div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #0176d3; color: #0176d3; font-weight: 700; text-align: center; line-height: 26px; font-size: 14px;">1</div>
</td>
</tr>
<tr style="height: 100%;">
<td style="border: none; padding: 6px 0 0 0; vertical-align: top; height: 100%;">
<div style="height: 100%; min-height: 48px; margin-left: 13px; border-left: 2px dotted #c9c9c9;"></div>
</td>
</tr>
</table>
</td>
<td style="vertical-align: top; border: none; padding: 0 0 20px 12px;">
<p style="margin: 0 0 4px; font-weight: 700; font-size: 15px;">Identify affected security groups</p>
<p style="margin: 0 0 12px; font-style: italic; color: #706e6b; font-size: 13px;">Review security group domain access</p>
<ol style="margin: 0; padding-left: 20px;">
<li>First numbered action.</li>
<li>Verification or second action.</li>
</ol>
</td>
</tr>
</table>
```

Repeat for each step. The dotted line must span from one circle to the next — use the nested `height: 100%` connector row, not a short stub. Add `padding-bottom: 20px` on the content cell when another step follows (last step: `padding-bottom: 0`). Omit the connector row on the last step. Nest `<ul>` inside an `<ol>` item for sub-options (for example, parameter fields). See [drafting.md](drafting.md#resolution-readability-rich-text) for markdown equivalents.

### Parallel strategies in Resolution (chooser + Option A/B/C)

Independent recommendations are **not** step express. Do not use numbered circles or a dotted connector rail.

Markdown in the local draft (chooser table + `### Option A —` + `*Use when …*`): `mdToHtml()` converts the table and styles each `*Use when …*` line as gray italic. Hand-written HTML:

```html
<p>Apply <strong>any combination</strong>. These are not sequential steps.</p>
<p><br></p>
<table style="border-collapse: collapse; width: 100%; border: 1px solid #d8dde6; margin-top: 16px; margin-bottom: 16px;" border="1" cellpadding="6" cellspacing="0">
  <thead>
    <tr>
      <th style="background-color: #f3f3f3; text-align: left; border: 1px solid #d8dde6; padding: 8px;">If this is the situation</th>
      <th style="background-color: #f3f3f3; text-align: left; border: 1px solid #d8dde6; padding: 8px;">Apply</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #d8dde6; padding: 8px; vertical-align: top;">Situation that matches option A</td>
      <td style="border: 1px solid #d8dde6; padding: 8px; vertical-align: top;"><strong>A</strong></td>
    </tr>
  </tbody>
</table>
<p>&nbsp;</p>
<h3>Option A — Short strategy title</h3>
<p style="margin: 0 0 12px; font-style: italic; color: #706e6b; font-size: 13px;">Use when this situation applies.</p>
<ul>
  <li><strong>Bold label.</strong> Explanation.</li>
</ul>
```

Use **Option A / B / C** (letters). Do not label them Optional 1, Optional 2, or Step 1.

### UML diagrams (optional — activity, sequence, use case)

TinyMCE does **not** render Mermaid. The local preview graphic will not appear in the KA unless you embed a **PNG**.

| Draft (Mermaid) | Salesforce |
|-----------------|------------|
| `flowchart TD` / `flowchart LR` (visual) | Render PNG + `<img src="data:image/png;base64,...">` (rewrites to `rtaImage` on Save) |
| `flowchart TD` / `flowchart LR` (table OK) | Bordered table with `→` arrows — **not** a substitute for the graphic |
| `sequenceDiagram` | Step / From / To / Message table |
| Use case (actors) | Actor / action comparison table |

Templates, mermaid-cli command, and verify steps: [uml-diagrams.md](uml-diagrams.md). `mdToHtml()` only produces the table rail.

## Related Categories (mandatory — 3 levels)

Always set **Product Line**, **Product Area**, and **Product Capability**. Use `resolveCategories()` from the appointment's Product Area and Capability:

```js
const { resolveCategories, productCategoryMatrix } = require('./lib');

globalThis.__kaCategories = resolveCategories(productArea, capability, productCategoryMatrix);
globalThis.__kaArticleUrl = '<saved article url>';
// getMcpFillScript('REQ-######')
```

- Page opens with an empty first row — fill it, don't click New unless needed
- **Prefer the appointment Product Area/Capability when those strings exist on the live picklist.** `resolveCategories()` against a stale matrix can return **Workday Extend** or **Integration**, which are often **not** Product Area options. Live PPE areas include **Orchestrate for Integrations - HCM**, **Orchestrate for Integrations - FINS**, **Integration Management**, **Workday Studio - HCM**, etc.
- If `getByRole('option', { name: productArea })` times out, read the open option list and pick the appointment value when it is there — do not invent a matrix synonym
- If Capability has no exact matrix match, use the appointment capability name (including **General**) or closest semantic match
- **Never** leave Product Capability blank when the appointment has a Capability — drafts must propose all 3 levels

Mappings in `product-category-matrix.json`. Keep the project copy in sync with `lib/product-category-matrix.json` in this skill (PPE picklist refreshed 2026-08-17).

## Bulk creation (up to 3 per session)

When creating multiple approved drafts in Step 5:

- Use **one** Playwright MCP session for the whole batch
- Drive each article in a single `browser_run_code_unsafe` script (form fill → Save → rich text → Related Categories → next article)
- Batch up to **3 REQ ids**; if more than 3, finish the batch and start the next in a follow-up turn
- Do **not** `browser_navigate` to `/lightning/page/home` between articles in the same batch
- Do **not** `pkill playwright-mcp` or `browser_close` mid-batch

Return a draft URL for each article when the batch completes.

## After Save

```js
markCreated('REQ-######', { articleUrl: page.url() });
```

Return the article URL to the user as the primary deliverable.
