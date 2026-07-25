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

- Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`)
- Logged into Workday Salesforce in the driven browser

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
