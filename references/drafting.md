# Drafting (Step 4)

## Template choice

Default: **Knowledge Articles** (pre-selected in New Article picker).

| Template | Fields | When |
|----------|--------|------|
| Knowledge Articles | Title, Description, Resolution, Internal Notes, URL Name | Default — merge issue + cause into Description |
| Troubleshooting | Title, Issue, Cause, Resolution, Internal Notes, URL Name | Break-fix with clear problem/cause/resolution; only if user asks |
| General | Title, Description, Internal Notes, URL Name | How-tos without a resolution field |
| FAQ | Check field layout before assuming | Rare |

Case Type = WSP reveals additional fields on some templates.

## House style

Written for technical integration consultants. Direct, second-person imperative. No pleasantries.

### Title

No `[Product Area] - Title` prefix. Key off integration/feature name or literal symptom:

- Break-fix: `<Integration/Feature> - <Symptom>` or `<Feature> "<error>" Error When <context>`
- How-to: imperative phrase, e.g. *"How To Verify And Validate Keystore Installation…"*

Title Case, ≤255 chars.

Prefer **broad, reusable titles** when the resolution applies beyond one integration or object. Use a specific integration (for example, Put Reference ID) as an example in the body, not in the title, unless the fix is truly integration-specific.

### URL Name

Derive a hyphenated slug from the **final** title — lowercase, words separated by hyphens, no special characters. If the title changes during review (for example, generalizing from a specific integration), update the URL Name to match.

Example: title *Inbound EIB - Optimize Load Time for High-Volume Data Loads* → `inbound-eib-optimize-load-time-for-high-volume-data-loads`

In Salesforce, Title auto-fills URL Name and may concatenate or truncate oddly — always **overwrite** the URL Name field after setting Title.

### Description (Knowledge Articles)

1. Lead with trigger: "When attempting to X…"
2. State exact symptom; quote literal errors verbatim (code block for logs, **bold** for short inline)
3. Name root cause; **bold** key technical term on first use
4. Use a comparison table when two similar concepts are confused
5. Link official Workday docs if they exist in source material — don't invent links

Generalize customer-specific context so the article helps any tenant with the same pattern. Name a specific integration or object parenthetically as an example when useful.

### Resolution

1. Open with one sentence framing the fix or available approaches
2. Choose the structure that matches how the resolution actually works (see below)
3. Bullets as `**Bold label:** explanation` when >2 related points
4. Inline `code` for field names, commands, status codes
5. Close with `> **Note:**` for caveats or doc pointers

#### Decide: sequential steps or parallel strategies?

Read the request notes and decide which pattern fits **before** writing the Resolution. Do not default to numbered steps.

| Pattern | Use when | Format |
|---------|----------|--------|
| **Sequential steps** | Each action depends on the prior one; there is one correct order (configure → test → deploy; diagnose → fix → verify) | `Step 1:` / `Step 2:` or a numbered list |
| **Parallel strategies** | Recommendations are independent; the customer can apply one or more without doing the others first (batch sizing, parallel runs, off-peak scheduling, monitoring) | `###` heading per strategy + bullet list (see readability below) |

**Ask:** Would step 2 still make sense if the customer skipped step 1? If yes, they are parallel strategies, not steps.

Do not relabel parallel strategies as steps, and do not flatten a true procedure into unordered bullets.

#### Resolution readability (rich text)

Salesforce renders Resolution as HTML. Dense paragraphs are hard to scan — structure for quick reading:

| Element | Do | Avoid |
|---------|-----|-------|
| **Strategy headings** | `###` / `<h3>` per parallel strategy or sequential phase | Bold text on its own line (looks like body text in TinyMCE) |
| **Body under each heading** | Bullet list with one idea per line | Long paragraphs mixing rationale, numbers, and examples |
| **Bullet lead-ins** | `**Bold label:** explanation` (e.g. `**Test in sandbox first.** Validate batch size…`) | Scattering bold on random words inside prose |
| **Intro** | One or two sentences framing the approach | Repeating the Description |
| **Caveats** | `> **Note:**` blockquote at the end | Burying caveats inside strategy bullets |

**Parallel strategies example (markdown):**

```markdown
### Reduce and partition batch files

- **Test in sandbox first.** Validate batch size before production.
- **Target 50,000 records per file** instead of 100,000.
- **Example:** partition 3 million records into 60 files of 50,000 each.
```

**Sequential steps example (markdown):**

```markdown
**Step 1: Configure the keystore**

Import the certificate into the tenant keystore…

**Step 2: Verify the installation**

Run the connectivity test…
```

### PII stripping (prose)

Remove: account/company names, contact/employee names, tenant-specific IDs.

Test: would this be equally useful for a different customer with the same issue?

## Local draft file

Save as `draft-REQ-######.md` in the project directory (not chat-only). Include:

- Source appointment link, template, Target WSP Service
- Title, URL Name, Description, Resolution, Internal Notes
- Proposed Related Categories — **all 3 levels** (Product Line, Product Area, Product Capability from the appointment; never `*(none)*` when a capability exists)
- Duplicate check summary

Then register the draft:

```js
const { registerDraft } = require('./lib');
registerDraft('REQ-######', {
  draftPath: 'draft-REQ-######.md',
  sourceUrl: '<appointment url>',
  title: '<article title>',
});
```

**Stop and present the draft for approval before any Salesforce write.**
