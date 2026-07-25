# aae-to-knowledge

Agent skill for turning Workday WSP Salesforce appointments (Ask an Expert, `REQ-######` links) into Knowledge Article drafts via Playwright — no Salesforce API.

## What it does

1. Reads appointment details and public notes
2. Checks for duplicate Knowledge articles
3. Drafts a generalized article locally (`draft-REQ-######.md`)
4. **Stops for human approval** before any Salesforce write
5. Creates the Salesforce draft after explicit approval

## Install

### Claude Code

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.claude/skills/aae-to-knowledge
```

### Cursor

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.cursor/skills/aae-to-knowledge
```

Or clone into a project's `.cursor/skills/` directory to share with your team.

## Structure

```
aae-to-knowledge/
├── SKILL.md                    # Main workflow
├── AGENTS.md                   # Review gate API reference
├── approval-gate.js            # Draft lifecycle — blocks Salesforce writes until approved
├── salesforce-write.js         # Guarded Playwright write helpers
├── salesforce-search.js        # Safe Knowledge duplicate-check search
├── category-resolver.js        # Maps appointment fields → Related Categories
├── product-category-matrix.json
├── fill-related-categories.js  # Playwright: auto-fill Related Categories
├── set-rich-text-fields.js     # Playwright: set TinyMCE fields by label
├── extract-matrix.js           # Refresh category matrix from Salesforce
└── references/
    ├── request-intake.md
    ├── drafting.md
    ├── lightning-tips.md
    └── salesforce-writes.md
```

## Prerequisites

- Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`)
- Logged into Workday Salesforce in the driven browser

## Quick start

Run helpers from the cloned skill directory:

```javascript
const { registerDraft, markApproved } = require('./approval-gate');
const { getMcpSetRichTextScript, getMcpFillScript } = require('./salesforce-write');
const { getMcpKnowledgeSearchScript } = require('./salesforce-search');
```

See [AGENTS.md](AGENTS.md) for the review gate API and [SKILL.md](SKILL.md) for the full workflow.
