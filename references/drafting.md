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
| **Sequential steps** | Each action depends on the prior one; there is one correct order (configure → test → deploy; diagnose → fix → verify) | `### Step N: Title` heading + short body; separator line between steps (see readability below) |
| **Parallel strategies** | Recommendations are independent; the customer can apply one or more without doing the others first (batch sizing, parallel runs, off-peak scheduling, monitoring) | `###` heading per strategy + bullet list (see readability below) |

**Ask:** Would step 2 still make sense if the customer skipped step 1? If yes, they are parallel strategies, not steps.

Do not relabel parallel strategies as steps, and do not flatten a true procedure into unordered bullets.

#### Resolution readability (rich text)

Salesforce renders Resolution as HTML. Dense paragraphs are hard to scan — structure for quick reading:

| Element | Do | Avoid |
|---------|-----|-------|
| **Step / strategy headings** | `### Step N: Title` / `<h3>` per step or parallel strategy | Bold text on its own line (looks like body text in TinyMCE) |
| **Spacing between steps** | Blank line in markdown; `<hr>` separator + `<h3>` in Salesforce HTML | Stacked paragraphs with no visual break between steps |
| **Body under each heading** | 1–2 short paragraphs or a bullet list (one idea per line) | Long paragraphs mixing rationale, numbers, and examples |
| **Bullet lead-ins** | `**Bold label:** explanation` (e.g. `**Test in sandbox first.** Validate batch size…`) | Scattering bold on random words inside prose |
| **Intro** | One or two sentences framing the approach | Repeating the Description |
| **Caveats** | `> **Note:**` blockquote at the end (after final separator) | Burying caveats inside step bullets |

**Parallel strategies example (markdown):**

```markdown
### Reduce and partition batch files

- **Test in sandbox first.** Validate batch size before production.
- **Target 50,000 records per file** instead of 100,000.
- **Example:** partition 3 million records into 60 files of 50,000 each.
```

**Sequential steps example (markdown):**

```markdown
Review and adjust domain security so users cannot override eligibility.

### Step 1: Identify affected security groups

Locate the security groups assigned to roles that can add compensation plans.

Confirm whether those groups include the **Select Any Compensation Package** domain.

### Step 2: Remove the domain from affected groups

Edit the security group and remove the domain assignment.

Save the security group changes.

> **Note:** Caveat or doc pointer at the end.
```

**Sequential steps in Salesforce HTML** — use `<h3>` headings and a light rule between steps so they scan like separate blocks:

```html
<p>One-sentence framing intro.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<h3>Step 1: Identify affected security groups</h3>
<p>First action — keep to one or two short sentences.</p>
<p>Second sentence or verification point if needed.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<h3>Step 2: Remove the domain from affected groups</h3>
<p>Next action.</p>
<hr style="border: none; border-top: 1px solid #d8dde6; margin: 16px 0;">
<blockquote><p><strong>Note:</strong> Caveat at the end.</p></blockquote>
```

Do **not** rely on `<p><br></p>` alone — Salesforce often collapses it. Prefer `<hr>` plus `<h3>` for sequential procedures.

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
