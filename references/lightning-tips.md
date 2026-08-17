# Lightning Tips & Cleanup

## Locator waits (mandatory)

Do **not** use long `waitForTimeout(3000–8000)` sleeps. Wait for the next Lightning control instead:

- Search results: `getByRole('link', { name: /APP-\d+/ })`
- Appointment: `getByRole('tab', { name: 'Details' })`
- Knowledge search filter: `getByRole('link', { name: /^Knowledge\s+\d/ })` — never the exact-name app nav **Knowledge**
- After Save: `waitForURL(/\/Knowledge__kav\/ka0/)`

`settle(200)` is only for picklist animation after a click.

## Navigation gotchas

- **Invalid global search URLs** — never navigate to `/lightning/globalSearch/<term>`. Lightning has no such route; it shows **"Page doesn't exist — Enter a valid URL and try again"**. Use the header search box (or `salesforce-search.js` → `getMcpKnowledgeSearchScript()`) instead.
- **Stale subtab refs** — take a fresh snapshot before clicking after switching subtabs; or open the record in a new browser tab
- **Radio clicks intercepted** — click the label text, not the input
- **Large snapshots** — save to file (`filename` param), grep/read relevant `tabpanel` sections

## Login

If `browser_navigate` lands on a login page, tell the user and wait for confirmation before re-navigating. Don't automate login.

## Browser session (mandatory)

Repeated Okta/SAML prompts usually mean competing Chrome processes on the same profile.

| Do | Don't |
|----|-------|
| One Playwright MCP session per batch | `launchPersistentContext`, scratch Node Chrome, `browser_close`, or `pkill playwright-mcp` |
| `browser_run_code_unsafe` + `salesforce-session.js` `ensureReady()` | Standalone `browser_navigate` when a script can reuse the current tab |
| Batch read/create up to **3 REQs** per session | Navigate to `/lightning/page/home` (scripts use Knowledge list fallback instead) |
| Leave MCP running after login | Close the browser mid-batch |

For bulk intake use `getMcpIntakeScript()` from `lib/salesforce-read.js` (Details + Questionnaire + Notes + Knowledge titles in one call).

## Cleanup

Before finishing, delete scratch files created during the workflow:

- Snapshot `.yml` files
- `browser_take_screenshot` `.png` previews
- Temporary `.playwright-mcp/*.js` helper scripts

Keep `draft-REQ-######.md` until the user confirms the Salesforce draft is done.
