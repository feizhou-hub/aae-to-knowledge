# Salesforce Writes (Step 5)

**Only after user approval** in a follow-up message. Use `lib/salesforce-write.js` via `require('./lib')`.

```js
const { markApproved, markCreated, getMcpSetRichTextScript, getMcpFillScript, resolveCategories, productCategoryMatrix } = require('./lib');

markApproved('REQ-######');
```

## Speed: batch Playwright, don't snapshot per field

Drive the form in one `browser_run_code_unsafe` script with native locators (`page.getByRole`, `page.getByLabel`). Locators auto-wait. Only snapshot at checkpoints (after fill, after Save).

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
| Internal Notes | `Sourced from AAE request REQ-###### (Appointment APP-######): <link>` |
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
  internalNotes: '<p>Sourced from...</p>',
};
// getMcpSetRichTextScript('REQ-######') via browser_run_code_unsafe
```

For large payloads (base64 screenshots), write JS to `.playwright-mcp/` and pass `filename` to `browser_run_code_unsafe`.

Embed screenshots: `<img src="data:image/png;base64,...">` — Salesforce rewrites to `rtaImage` on save.

### HTML tables

Leave visible space between the last paragraph and a comparison table so prose does not run into the table border. In markdown, use a blank line; in Salesforce HTML, insert `<p><br></p>` before the table **and** set `margin-top: 16px` on the `<table>` (TinyMCE often collapses blank `<p>` tags alone).

```html
<p>Root cause explanation ending the prose block.</p>
<p><br></p>
<table style="border-collapse: collapse; width: 100%; margin-top: 16px;" border="1" cellpadding="6" cellspacing="0">
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
```

### Sequential steps in Resolution (HTML)

For numbered procedures, use `<h3>Step N: Title</h3>` headings and a light horizontal rule between each step. Do **not** use `<p><strong>Step N:</strong></p>` alone — it reads as body text. Do **not** rely on `<p><br></p>` alone — Salesforce often collapses blank paragraphs.

```html
<p>One-sentence framing intro.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<h3>Step 1: Identify affected security groups</h3>
<p>First action — one or two short sentences.</p>
<p>Verification or second point if needed.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<h3>Step 2: Remove the domain from affected groups</h3>
<p>Next action.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<blockquote><p><strong>Note:</strong> Caveat at the end.</p></blockquote>
```

Split long step bodies into multiple short `<p>` tags (one idea per paragraph). Use `<ul>` under a step when listing options. See [drafting.md](drafting.md#resolution-readability-rich-text) for markdown equivalents.

## Related Categories (mandatory — 3 levels)

Always set **Product Line**, **Product Area**, and **Product Capability**. Use `resolveCategories()` from the appointment's Product Area and Capability:

```js
const { resolveCategories, productCategoryMatrix } = require('./lib');

globalThis.__kaCategories = resolveCategories(productArea, capability, productCategoryMatrix);
globalThis.__kaArticleUrl = '<saved article url>';
// getMcpFillScript('REQ-######')
```

- Page opens with an empty first row — fill it, don't click New unless needed
- If Capability has no exact matrix match, use the appointment capability name or closest semantic match
- **Never** leave Product Capability blank when the appointment has a Capability — drafts must propose all 3 levels

Mappings in `product-category-matrix.json` (e.g. Integration Management → Platform and Product Extensions / Integration).

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
