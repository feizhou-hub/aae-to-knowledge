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

## Optional companion tooling

For review gates, category resolution, and Salesforce form-fill helpers, use [ka-creator-tools](https://github.com/feizhou-hub/ka-creator-tools) alongside this skill.

## Structure

```
aae-to-knowledge/
├── SKILL.md
└── references/
    ├── case-intake.md
    ├── drafting.md
    ├── lightning-tips.md
    └── salesforce-writes.md
```

## Prerequisites

- Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`)
- Logged into Workday Salesforce in the driven browser
