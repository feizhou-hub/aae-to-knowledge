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
4. Use a comparison table when two similar concepts are confused — leave a **blank line** between the preceding paragraph and the table (markdown and HTML)
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
| **Sequential steps** | Each action depends on the prior one; there is one correct order (configure → test → deploy; diagnose → fix → verify) | **Step express** layout: numbered circle + title + italic context + numbered sub-steps (see below) |
| **Parallel strategies** | Recommendations are independent; the customer can apply one or more without doing the others first (batch sizing, parallel runs, off-peak scheduling, monitoring) | `###` heading per strategy + bullet list (see readability below) |

**Ask:** Would step 2 still make sense if the customer skipped step 1? If yes, they are parallel strategies, not steps.

Do not relabel parallel strategies as steps, and do not flatten a true procedure into unordered bullets.

#### Resolution readability (rich text)

Salesforce renders Resolution as HTML. Dense paragraphs are hard to scan — structure for quick reading:

| Element | Do | Avoid |
|---------|-----|-------|
| **Step / strategy headings** | Step express: circled number + bold title + italic context line; or `###` for parallel strategies | Bold text on its own line (looks like body text in TinyMCE) |
| **Spacing between steps** | Dotted vertical connector between numbered circles in step express HTML | Stacked paragraphs with no visual break between steps |
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

**Sequential steps example (markdown — step express):**

```markdown
Review and adjust domain security so users cannot override eligibility.

**1 — Identify affected security groups**
*Review security group domain access*

1. Locate the security groups assigned to roles that can add compensation plans.
2. Confirm whether those groups include the **Select Any Compensation Package** domain.

**2 — Remove the domain from affected groups**
*Update security group domains*

1. Edit the security group and remove the domain assignment.
2. Save the security group changes.

> **Note:** Caveat or doc pointer at the end.
```

**Step express in Salesforce HTML** — numbered circle rail, bold title, italic context, numbered sub-steps:

```html
<table style="width: 100%; border: none; border-collapse: collapse; margin: 0;">
<tr>
<td style="width: 44px; vertical-align: top; border: none; padding: 0; height: 1px;">
<table style="width: 28px; margin: 0 auto; border: none; border-collapse: collapse; height: 100%;" height="100%">
<tr>
<td style="border: none; padding: 0; text-align: center; vertical-align: top;">
<div style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #0176d3; color: #0176d3; font-weight: 700; text-align: center; line-height: 26px; font-size: 14px;">1</div>
</td>
</tr>
<tr style="height: 100%;">
<td style="border: none; padding: 6px 0 0 0; vertical-align: top; height: 100%;">
<div style="height: 100%; min-height: 48px; margin-left: 13px; border-left: 2px dotted #c9c9c9;"></div>
</td>
</tr>
</table>
</td>
<td style="vertical-align: top; border: none; padding: 0 0 0 12px;">
<p style="margin: 0 0 4px; font-weight: 700; font-size: 15px;">Identify affected security groups</p>
<p style="margin: 0 0 12px; font-style: italic; color: #706e6b; font-size: 13px;">Review security group domain access</p>
<ol style="margin: 0; padding-left: 20px;">
<li>First numbered action.</li>
<li>Second numbered action or verification.</li>
</ol>
</td>
</tr>
</table>
```

Repeat the outer table for each step. The dotted line must run from the bottom of one circle to the top of the next — use the nested `height: 100%` connector row (not a short stub `div`). Omit the connector row on the **last** step.

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
