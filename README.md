# aae-to-knowledge

Turn a Workday Ask an Expert appointment into a Knowledge Article draft, then into a Salesforce draft, using the Chrome session cookie.

Playwright is not required. Chrome must already be logged into Salesforce. The skill reads the `sid` cookie and calls the same objects the Lightning page uses.

## Principle

The appointment page, the Notes tab, the Knowledge search box, and the New Article form are views on a few records. With a valid session those records are available directly:

1. **Read** the appointment and its public notes with SOQL.
2. **Search** existing articles with SOQL (and a phrase SOSL when a title filter is too narrow).
3. **Write** the article with the REST API.
4. **Write** Related Categories by calling the Apex method the Related Categories button already uses. That object rejects a direct REST insert.

The session id is the `sid` cookie. REST uses the cookie on `workday.my.salesforce.com` as a bearer token. The category Apex call uses the cookie on `workday.lightning.force.com` plus a short-lived ERIC cookie as the Aura CSRF token. Chrome encrypts both. `lib/salesforce-api.js` decrypts them locally. Nothing in this skill logs in or opens a browser. When Okta expires, log in again in Chrome.

Full object map: [references/objects.md](references/objects.md).

## Objects

| Step | Object | What it is |
|------|--------|------------|
| Details | `Appointment__c` | The Ask an Expert request. Subject, Details, Product Line, Product Area (`Product__c`), Capability (`Sub_Product__c`). |
| Notes | `Appointment_Comment__c` | One row per note. Public rows (`Is_Private__c = false`) are the conversation. |
| Duplicate check | `Knowledge__kav` | Article version. Search `Title` on the latest online English version. |
| Article master | `Knowledge__ka` | Parent of the version. The Lightning URL uses the version id, not this one. |
| Create article | `Knowledge__kav` | REST `POST`. Description, Resolution, and Internal Notes are rich-text fields. The new row is a Draft. |
| Related Categories | `Related_Category__c` | Product Line, Product Area, and Product Capability for that version. Saved by `CaseFeedArticleController.upsertAndDeleteProductTaggings`. |

## Workflow

Two turns. The first turn only writes a local markdown file. The second turn writes to Salesforce after you approve.

**Turn 1.** Paste an appointment URL or `Create a KA for REQ-######`. The agent reads the appointment, checks Knowledge, saves `draft-REQ-######.md`, and stops.

**Turn 2.** Reply `approved`, `looks good`, `create it in Salesforce`, or `go ahead`. The agent creates the Salesforce **draft** (not published) and returns the URL.

Several appointments can be drafted in one turn. Salesforce creates still wait for that approval.

## Install

You need Node.js and a Chrome profile that is logged into Workday Salesforce. You do not install Playwright.

Each app has its own skills folder. Follow the section for the app you use. If you use both, install into both folders.

| App | Skill folder |
| --- | --- |
| Cursor | `~/.cursor/skills/aae-to-knowledge` |
| Claude Code | `~/.claude/skills/aae-to-knowledge` |

### Cursor

Ask the agent:

```
Install the aae-to-knowledge skill from https://github.com/feizhou-hub/aae-to-knowledge

Download the whole repository (not just SKILL.md) into:
~/.cursor/skills/aae-to-knowledge
```

Or in a terminal:

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.cursor/skills/aae-to-knowledge
```

### Claude Code

Switch to Accept edits (`Shift+Tab` until the status bar shows `accept edits on`), then ask the agent:

```
Install the aae-to-knowledge skill from https://github.com/feizhou-hub/aae-to-knowledge

Download the whole repository (not just SKILL.md) into:
~/.claude/skills/aae-to-knowledge
```

Or in a terminal:

```bash
git clone https://github.com/feizhou-hub/aae-to-knowledge.git ~/.claude/skills/aae-to-knowledge
```

### Either app, one command

```bash
npx skills add https://github.com/feizhou-hub/aae-to-knowledge -g --agent cursor claude-code
```

Use `--agent cursor` or `--agent claude-code` to install for one app only.

Start a new chat after install. The folder has to contain `SKILL.md`, `lib/`, and `references/`, not `SKILL.md` alone.

Chrome cookie decryption uses the macOS Keychain item `Chrome Safe Storage`. The first run may ask you to allow that read.

## Update

Update the folder for the app you use. The skill is the whole checkout, so pull `main` into it. Do not replace `SKILL.md` alone. Start a new chat after the files change so the agent reads the new skill.

### Cursor

Ask the agent:

```
Update the aae-to-knowledge skill in ~/.cursor/skills/aae-to-knowledge to the latest version from https://github.com/feizhou-hub/aae-to-knowledge (whole repository, not just SKILL.md).
```

Or in a terminal:

```bash
git -C ~/.cursor/skills/aae-to-knowledge pull
```

### Claude Code

Switch to Accept edits (`Shift+Tab` until the status bar shows `accept edits on`), then ask the agent:

```
Update the aae-to-knowledge skill in ~/.claude/skills/aae-to-knowledge to the latest version from https://github.com/feizhou-hub/aae-to-knowledge (whole repository, not just SKILL.md).
```

Or in a terminal:

```bash
git -C ~/.claude/skills/aae-to-knowledge pull
```

## Layout

```
aae-to-knowledge/
├── SKILL.md                 # Workflow the agent follows
├── AGENTS.md                # Review gate and function calls
├── lib/
│   ├── salesforce-api.js    # Session, SOQL, REST create, Apex categories
│   ├── approval-gate.js     # Blocks writes until you approve the draft
│   ├── md-to-ka-html.js     # Draft markdown → Salesforce HTML
│   └── category-resolver.js # Optional label fallback from the local matrix
└── references/
    ├── objects.md           # Principle and object map
    ├── request-intake.md
    ├── drafting.md
    ├── salesforce-writes.md
    └── uml-diagrams.md
```

Older files under `lib/` (`salesforce-read.js`, `create-knowledge-article.js`, and the other Playwright script builders) remain for the tests that lock the old UI behavior. The skill does not call them.
