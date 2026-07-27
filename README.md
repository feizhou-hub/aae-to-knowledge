# aae-to-knowledge

Agent skill for turning Workday WSP Salesforce appointments (Ask an Expert, `REQ-######` links) into Knowledge Article drafts via Playwright — no Salesforce API.

## What it does

1. Reads appointment details and public notes
2. Checks for duplicate Knowledge articles
3. Drafts a generalized article locally (`draft-REQ-######.md`)
4. **Stops for human approval** before any Salesforce write
5. Creates the Salesforce draft after explicit approval

## Install

### 1. Clone this skill

#### Claude Code

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.claude/skills/aae-to-knowledge
```

#### Cursor

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.cursor/skills/aae-to-knowledge
```

### 2. Install Playwright MCP

This skill drives Salesforce through the browser via [Playwright MCP](https://github.com/microsoft/playwright-mcp). You need Node.js **18+** and an MCP client (Cursor, Claude Code, etc.).

#### Cursor

**Option A — Settings UI**

1. Open **Cursor Settings** → **MCP** → **Add new MCP Server**
2. Type: `command`
3. Command: `npx @playwright/mcp@latest`
4. Save and confirm the server shows as connected (green)

**Option B — `~/.cursor/mcp.json`**

Create or edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

Restart Cursor or reload MCP servers after saving.

On first run, `npx` downloads `@playwright/mcp` and Playwright browser binaries automatically.

#### Claude Code

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

#### Verify

In your agent chat, Playwright MCP tools should be available — for example `browser_navigate`, `browser_snapshot`, and `browser_run_code_unsafe`. The server name is usually `playwright` or `user-playwright`.

#### Log into Salesforce

The first time you run the workflow, the agent opens a browser window. Log into Workday Salesforce manually if prompted (SSO/MFA). The session persists in Playwright's default profile for later runs.

> **Note:** Use **Playwright MCP**, not Cursor's built-in browser MCP. This skill relies on `browser_run_code_unsafe` and other Playwright-specific tools.

See [Headless mode](#headless-mode) to hide the browser window, and [Playwright MCP configuration](https://playwright.dev/mcp/configuration/options) for all options.

## Usage

After [install](#install), open a new agent chat in Cursor or Claude Code and describe what you want in plain language. You do not need to run scripts yourself — the agent follows [SKILL.md](SKILL.md) and uses Playwright MCP to read Salesforce.

### Create a draft (Step 1 — paste one of these)

**By appointment URL** (from the browser address bar):

```
Create a KA based on https://workday.lightning.force.com/lightning/r/Appointment__c/a0XVT00000XXXXXX/view
```

**By request number**:

```
Create a KA for REQ-439659
```

```
Make a knowledge article from appointment REQ-439659
```

Other phrasing works too — `draft a KA`, `summarize this request as a knowledge article`, or pasting the Salesforce link without extra context.

### What happens next

| Turn | You | Agent |
|------|-----|-------|
| 1 | Ask to create a KA (examples above) | Reads the appointment, checks duplicates, saves `draft-REQ-######.md`, **stops and shows you the draft** |
| 2 | Review the draft. Reply **approved**, **looks good**, **go ahead**, or **create it in Salesforce** | Creates the Salesforce draft article and returns the draft URL |

On turn 1 the agent **never** saves to Salesforce — that is intentional ([review gate](AGENTS.md)). Request edits on turn 2 if the draft needs changes before approving.

### Examples

```
Create a KA based on https://workday.lightning.force.com/lightning/r/Appointment__c/a0XVT00000AbCdE/view
```

```
Create a knowledge article for REQ-462722
```

```
Draft a KA from this AAE request: REQ-442467
```

### Tips

- **Open a project folder as your workspace** so `draft-REQ-######.md` and the review-gate state are saved locally (the cloned skill directory works fine).
- **Stay logged in** to Workday Salesforce in the Playwright browser (see [Log into Salesforce](#log-into-salesforce)).
- If a **duplicate article** already exists, the agent reports it and stops instead of drafting.
- The agent **generalizes** customer-specific details — do not expect tenant names or case IDs in the article body.

## Structure

```
aae-to-knowledge/
├── SKILL.md                    # Main workflow
├── AGENTS.md                   # Review gate API reference
├── lib/                        # Node helpers (review gate + Playwright scripts)
│   ├── index.js                # Single entry point — require('./lib')
│   ├── approval-gate.js        # Blocks Salesforce writes until user approves
│   ├── salesforce-write.js     # Guarded write script generators
│   ├── salesforce-search.js    # Safe Knowledge duplicate-check search
│   ├── category-resolver.js    # Maps request fields → Related Categories
│   ├── product-category-matrix.json
│   ├── fill-related-categories.js
│   ├── set-rich-text-fields.js
│   └── extract-matrix.js       # Optional: refresh category matrix from Salesforce
└── references/
    ├── request-intake.md
    ├── drafting.md
    ├── lightning-tips.md
    └── salesforce-writes.md
```

## Why the `lib/` folder?

The skill is mostly markdown instructions for the agent, but a few small Node modules add real guardrails:

| Module | Purpose |
|--------|---------|
| `approval-gate.js` | **Required** — filesystem state that throws if an agent tries to write to Salesforce before human approval |
| `salesforce-write.js` | **Required** — wraps write scripts behind the review gate |
| `salesforce-search.js` | Duplicate-check Playwright script (avoids invalid `/lightning/globalSearch/` URLs) |
| `category-resolver.js` | Maps appointment Product Area/Capability to Knowledge categories |
| `set-rich-text-fields.js` | TinyMCE HTML fill by label (not editor index) |
| `fill-related-categories.js` | Related Categories Playwright script |
| `extract-matrix.js` | Optional maintenance — refresh `product-category-matrix.json` |

## Prerequisites

- [Playwright MCP](#2-install-playwright-mcp) installed and connected
- Logged into Workday Salesforce in the driven browser

## Headless mode

By default, Playwright MCP launches a **visible** browser so you can watch the agent work. To run the workflow without showing browser windows, enable headless mode in your MCP config.

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--headless"
      ]
    }
  }
}
```

Or set the environment variable:

```json
"env": {
  "PLAYWRIGHT_MCP_HEADLESS": "true"
}
```

Restart Cursor (or reload MCP servers) after changing this.

### Claude Code

**Option A — CLI** (recommended)

If Playwright MCP is already installed, remove it first, then re-add with `--headless`:

```bash
claude mcp remove playwright -s user
claude mcp add -s user playwright -- npx -y @playwright/mcp@latest --headless
```

Use `-s user` for all projects, or `-s local` for the current project only.

Or pass the flag via environment variable:

```bash
claude mcp add -s user -e PLAYWRIGHT_MCP_HEADLESS=true playwright -- npx -y @playwright/mcp@latest
```

**Option B — `.mcp.json`** (project scope)

Create or edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--headless"
      ]
    }
  }
}
```

Claude Code may prompt you to approve project-scoped servers on first use.

**Option C — `add-json`**

```bash
claude mcp add-json -s user playwright '{"command":"npx","args":["-y","@playwright/mcp@latest","--headless"]}'
```

**Verify**

```bash
claude mcp get playwright
```

You should see `--headless` in the Args list (or `PLAYWRIGHT_MCP_HEADLESS` in Environment).

### Salesforce login in headless mode

Headless mode has no visible window for SSO or MFA. Use one of:

- **Persistent profile** — log in once in headed mode, then reuse the profile:

  ```json
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--headless",
    "--user-data-dir",
    "~/.playwright-mcp/salesforce-profile"
  ]
  ```

  For Claude Code with the CLI:

  ```bash
  claude mcp add -s user playwright -- npx -y @playwright/mcp@latest --headless --user-data-dir ~/.playwright-mcp/salesforce-profile
  ```

- **`--storage-state`** — path to a saved auth state file (`PLAYWRIGHT_MCP_STORAGE_STATE`)
- **Playwright browser extension** — connect to an existing logged-in Chrome/Edge tab (`--extension`)

### Notes

- In **Cursor**, use **Playwright MCP** (`user-playwright`), not Cursor's built-in browser MCP — the IDE browser always opens a visible tab.
- Headless only hides the browser UI. The review gate still applies: Steps 1–4 run as usual, and Step 5 waits for explicit approval before any Salesforce write.
- Screenshots and snapshots still work headless; you just won't see live navigation.

See [Playwright MCP configuration](https://playwright.dev/mcp/configuration/options) for all options.

## Quick start

Run helpers from the cloned skill directory:

```javascript
const {
  registerDraft,
  markApproved,
  getMcpSetRichTextScript,
  getMcpFillScript,
  getMcpKnowledgeSearchScript,
  resolveCategories,
  productCategoryMatrix,
} = require('./lib');
```

See [AGENTS.md](AGENTS.md) for the review gate API and [SKILL.md](SKILL.md) for the full workflow.
