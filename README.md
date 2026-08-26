# aae-to-knowledge

Agent skill for turning Workday WSP Salesforce appointments (Ask an Expert, `REQ-######` links) into Knowledge Article drafts via Playwright — no Salesforce API.

## What it does

1. Reads appointment details and public notes
2. Checks for duplicate Knowledge articles
3. Drafts a generalized article locally (`draft-REQ-######.md`)
4. **Stops for human approval** before any Salesforce write
5. Creates the Salesforce draft after explicit approval

## Install

You do **not** need git. Pick **one** way to get the skill, then install Playwright MCP (Option 1 does both in one chat).

### 1. Get the skill

Pick **one** option. Do not mix them.

| Option | Best for | Git? | Terminal? | Cursor + Claude in one step? | Then install Playwright MCP? |
|--------|----------|------|-----------|------------------------------|------------------------------|
| [1 — Ask the agent](#option-1--ask-the-agent-recommended) | Non-technical setup | No | No | No — use the prompt for the app you're in | Included in the prompt |
| [2 — Download a ZIP](#option-2--download-a-zip) | Finder / File Explorer | No | No | No — copy the folder once per app | Yes, [step 2](#2-install-playwright-mcp) |
| [3 — `npx` command](#option-3--npx-command) | You have Node.js | No | One command | Yes | Yes, [step 2](#2-install-playwright-mcp) |
| [4 — git clone](#option-4--git-clone) | You already use git | Yes | Yes | No — clone once per app | Yes, [step 2](#2-install-playwright-mcp) |

#### Option 1 — Ask the agent (recommended)

Paste a prompt. No git, no ZIP, no terminal. Use **only the prompt for the app you are in**.

1. Open a **new chat** in Cursor or Claude Code.
2. Paste the matching prompt:

   **Cursor**

   ```
   Install the aae-to-knowledge skill from https://github.com/feizhou-hub/aae-to-knowledge

   Download the whole repository (not just SKILL.md) into:
   ~/.cursor/skills/aae-to-knowledge

   Then install Playwright MCP so I can create Knowledge Articles from Salesforce appointments.
   ```

   **Claude Code**

   Claude Code starts in **Manual** mode (the default), which asks you to approve every file edit. Switch to **Accept edits** before pasting so the install can write the skill files without a prompt per edit:
   - **CLI:** press `Shift+Tab` until the status bar shows `accept edits on`
   - **VS Code / desktop app:** use the mode selector and pick **Accept edits**

   Then paste:

   ```
   Install the aae-to-knowledge skill from https://github.com/feizhou-hub/aae-to-knowledge

   Download the whole repository (not just SKILL.md) into:
   ~/.claude/skills/aae-to-knowledge

   Then install Playwright MCP so I can create Knowledge Articles from Salesforce appointments.
   ```

3. **Approve** what the agent asks for (downloading files, creating folders, editing MCP settings). Shell commands and MCP setup still need your approval in Accept edits mode.
4. When it finishes, **start a new chat** so the skill is picked up.
5. On the **first KA run**, a browser window opens — **log into Workday Salesforce** (SSO/MFA). That login is saved for later runs.

Do not send a link to `SKILL.md` alone. The agent needs the whole folder (`lib/`, `references/`, and `SKILL.md`).

If you used Option 1, skip [step 2](#2-install-playwright-mcp) unless Playwright MCP is not connected.

#### Option 2 — Download a ZIP

Use Finder or File Explorer. No git, no terminal.

1. Open [github.com/feizhou-hub/aae-to-knowledge](https://github.com/feizhou-hub/aae-to-knowledge).
2. Click the green **Code** button → **Download ZIP**.
3. Unzip the file. You get a folder named `aae-to-knowledge-main` (or similar).
4. Rename that folder to exactly `aae-to-knowledge`.
5. Move it into your skills folder:

   **Mac (Cursor):** In Finder, press **Shift-Command-G**, paste `~/.cursor/skills`, click **Go**, then drop the folder there.

   **Mac (Claude Code):** Same, but paste `~/.claude/skills`.

   **Windows (Cursor):** In File Explorer, paste `%USERPROFILE%\.cursor\skills` into the address bar and press Enter, then drop the folder there.

   **Windows (Claude Code):** Use `%USERPROFILE%\.claude\skills`.

If Finder or File Explorer says the folder does not exist, open a chat and ask:

```
Create the folder ~/.cursor/skills for me, then open it in Finder
```

(Use `~/.claude/skills` for Claude Code, or `%USERPROFILE%\.cursor\skills` on Windows.)

The result must look like this (not a single `SKILL.md` file):

```
aae-to-knowledge/
  SKILL.md
  README.md
  lib/
  references/
```

Then go to [step 2 — Install Playwright MCP](#2-install-playwright-mcp). After both steps, **start a new chat**.

#### Option 3 — `npx` command

Needs [Node.js](https://nodejs.org/) so `npx` is available. No git.

**Both Cursor and Claude Code:**

```bash
npx skills add https://github.com/feizhou-hub/aae-to-knowledge -g --agent cursor claude-code
```

**Cursor only:**

```bash
npx skills add https://github.com/feizhou-hub/aae-to-knowledge -g --agent cursor
```

**Claude Code only:**

```bash
npx skills add https://github.com/feizhou-hub/aae-to-knowledge -g --agent claude-code
```

`-g` puts the skill in your user skills folder (every project). Then go to [step 2 — Install Playwright MCP](#2-install-playwright-mcp), and **start a new chat**.

#### Option 4 — git clone

Only if you already use git.

**Claude Code:**

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.claude/skills/aae-to-knowledge
```

**Cursor:**

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.cursor/skills/aae-to-knowledge
```

Then go to [step 2 — Install Playwright MCP](#2-install-playwright-mcp).

### 2. Install Playwright MCP

Skip this if you used **Option 1** and Playwright MCP is already connected.

This skill opens Salesforce in a real browser via [Playwright MCP](https://github.com/microsoft/playwright-mcp). You do **not** need to edit config files or run terminal commands yourself — **ask your AI agent to install it**.

#### Easiest way (recommended)

1. Open a **new chat** in Cursor or Claude Code.
2. Paste one of these prompts:

   ```
   Install the Playwright MCP server for me
   ```

   ```
   Set up Playwright MCP so I can create Knowledge Articles from Salesforce appointments
   ```

3. **Approve** what the agent asks for (editing `mcp.json`, running `npx`, or opening Cursor Settings).
4. If the agent says to **restart Cursor** or **reload MCP servers**, do that once.
5. On the **first KA run**, a browser window opens — **log into Workday Salesforce** (SSO/MFA). That login is saved for later runs.

> **Important:** Use **Playwright MCP** (`playwright` / `user-playwright`), not Cursor's built-in browser MCP. This skill needs Playwright-specific tools like `browser_run_code_unsafe`.

#### Check it worked

Ask the agent:

```
Is Playwright MCP connected? What browser tools do you have?
```

You should hear tools like `browser_navigate`, `browser_snapshot`, and `browser_run_code_unsafe`. In **Cursor Settings → MCP**, the Playwright server should show as **connected** (green).

#### Manual setup (optional)

Use this only if the agent cannot edit your machine (locked-down laptop, etc.). You need **Node.js 18+**.

**Cursor** — **Settings → MCP → Add new MCP Server**: type `command`, command `npx @playwright/mcp@latest`, save, reload MCP.

Or add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

On first run, `npx` downloads Playwright and browser binaries automatically.

See [Headless mode](#headless-mode) to hide the browser window (ask the agent: *"Enable headless mode for Playwright MCP"*), and [Playwright MCP configuration](https://playwright.dev/mcp/configuration/options) for all options.

## Usage

After [install](#install), open a new agent chat in Cursor or Claude Code. You do not need to run scripts yourself — the agent follows [SKILL.md](SKILL.md) and uses Playwright MCP to read Salesforce.

Creating an article is **two turns**. Step 1 only writes a local markdown file. Step 2 writes to Salesforce **after you approve**.

### Step 1 — Create a local draft

Paste one of these into the chat:

**Appointment URL** (from the browser address bar):

```
Create a KA based on https://workday.lightning.force.com/lightning/r/Appointment__c/a0XVT00000AbCdE/view
```

**Request number:**

```
Create a knowledge article for REQ-462722
```

```
Draft a KA from this AAE request: REQ-442467
```

Other phrasing works too — `make a KA`, `summarize this request as a knowledge article`, or pasting the Salesforce link with no extra text.

The agent **immediately opens the appointment** in the headed Playwright window, then reads Details and Notes, checks for duplicates, saves `draft-REQ-######.md`, and **stops so you can review**. It does **not** save to Salesforce on this turn ([review gate](AGENTS.md)).

### Step 2 — Review and approve

Read the draft. Ask for edits if anything is wrong. When it looks right, reply with one of:

```
approved
```

```
looks good
```

```
create it in Salesforce
```

```
go ahead
```

The agent then creates the Salesforce **draft** article (not published) and returns the URL.

### Multiple requests (bulk)

You can ask for several appointments in one message. The agent still **stops for review** before any Salesforce write. Approval can cover one draft or the whole batch.

**Limit: 3 requests per batch.** Paste at most three REQ ids (or appointment URLs) at a time.

```
Create KAs for REQ-238778, REQ-241220, and REQ-293057
```

```
Draft knowledge articles from these appointments:
https://workday.lightning.force.com/lightning/r/Appointment__c/a0XVT00000AbCdE/view
https://workday.lightning.force.com/lightning/r/Appointment__c/a0XVT00000FgHiJ/view
```

Same two turns as a single request:

| Turn | You | Agent |
|------|-----|-------|
| 1 | Paste up to 3 REQ ids or URLs | Reads each appointment, saves each `draft-REQ-######.md`, **stops and shows all drafts** |
| 2 | Reply **approved** (or name which ones to skip) | Creates those Salesforce drafts and returns the URLs |

**More than 3:** split the list yourself, or paste the full list — the agent processes the first 3, then continues the rest after you approve (or in a follow-up). Example for five requests:

| Turn | What happens |
|------|----------------|
| 1 | Draft REQs A, B, C → review |
| 2 | You approve → Salesforce drafts for A, B, C |
| 3 | Draft REQs D, E → review |
| 4 | You approve → Salesforce drafts for D, E |

Stay in the **same chat** and keep Playwright MCP connected. Do not close the Salesforce browser window between appointments in a batch.

### Tips

- **Open a project folder as your workspace** so `draft-REQ-######.md` and the review-gate state are saved locally (the cloned skill directory works fine).
- **Stay logged in** to Workday Salesforce in the Playwright browser (see [Install](#2-install-playwright-mcp)). You should see that window jump to the appointment as soon as you paste the link — that is intake starting, not a Salesforce write.
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

By default, Playwright MCP opens a **visible** browser so you can watch the agent and log into Salesforce.

**Easiest:** ask your agent:

```
Enable headless mode for Playwright MCP
```

The agent will update your MCP config. You still need a saved Salesforce login (log in once in headed mode first, or use a persistent profile — see below).

### Manual — Cursor (`~/.cursor/mcp.json`)

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

### Manual — Claude Code

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
