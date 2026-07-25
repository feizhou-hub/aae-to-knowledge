# Lightning Tips & Cleanup

## Navigation gotchas

- **Invalid global search URLs** — never navigate to `/lightning/globalSearch/<term>`. Lightning has no such route; it shows **"Page doesn't exist — Enter a valid URL and try again"**. Use the header search box (or `salesforce-search.js` → `getMcpKnowledgeSearchScript()`) instead.
- **Stale subtab refs** — take a fresh snapshot before clicking after switching subtabs; or open the record in a new browser tab
- **Radio clicks intercepted** — click the label text, not the input
- **Large snapshots** — save to file (`filename` param), grep/read relevant `tabpanel` sections

## Login

If `browser_navigate` lands on a login page, tell the user and wait for confirmation before re-navigating. Don't automate login.

## Cleanup

Before finishing, delete scratch files created during the workflow:

- Snapshot `.yml` files
- `browser_take_screenshot` `.png` previews
- Temporary `.playwright-mcp/*.js` helper scripts

Keep `draft-REQ-######.md` until the user confirms the Salesforce draft is done.
