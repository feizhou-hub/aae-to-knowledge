# Salesforce Writes (Step 5)

**Only after user approval** in a follow-up message. Use `salesforce-write.js` in this skill folder.

```js
const { markApproved, markCreated } = require('./approval-gate');
const { getMcpSetRichTextScript, getMcpFillScript } = require('./salesforce-write');

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

Use proper structure so Salesforce renders borders:

```html
<table style="border-collapse: collapse; width: 100%;" border="1" cellpadding="6" cellspacing="0">
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

## Related Categories

```js
const { resolveCategories } = require('./category-resolver');
const matrix = require('./product-category-matrix.json');

globalThis.__kaCategories = resolveCategories(productArea, capability, matrix);
globalThis.__kaArticleUrl = '<saved article url>';
// getMcpFillScript('REQ-######')
```

- Page opens with an empty first row — fill it, don't click New unless needed
- If Capability has no exact match, pick closest semantic match and tell the user
- Leave Product Capability blank when article spans multiple integration types

Mappings in `product-category-matrix.json` (e.g. Integration Management → Platform and Product Extensions / Integration).

## After Save

```js
markCreated('REQ-######', { articleUrl: page.url() });
```

Return the article URL to the user as the primary deliverable.
