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
4. **Comparison tables** when two similar concepts are confused — see [When to use a comparison table](#when-to-use-a-comparison-table) (mandatory spacing rules)
5. **Optionally** use a UML-style diagram when branching logic is hard to scan in prose (3+ if/else paths, integration hand-offs, role permissions) — see [uml-diagrams.md](uml-diagrams.md)
6. Link official Workday docs if they exist in source material — don't invent links

Generalize customer-specific context so the article helps any tenant with the same pattern. Name a specific integration or object parenthetically as an example when useful.

#### When to use a comparison table

Use a **comparison table** in Description (or Resolution intro) when the appointment explains **two or more similar things that customers mix up** — not for every fact list.

| Trigger (appointment or notes mention…) | Table columns (examples) |
|----------------------------------------|--------------------------|
| **A vs B** behavior ("with X" vs "without X", "when enabled" vs "when disabled") | Concept A \| Concept B \| Key difference |
| **Domain / setting on vs off** | Setting state \| Resulting behavior |
| **Integration or config type** (Connector vs EIB vs Studio vs RaaS) | Type \| Output \| Compliance / notes |
| **Scenario matrix** (same effective date vs different date) | Scenario \| Inputs \| Expected result |
| **Frequency / timing variants** (monthly vs annual grade profile) | Variant \| Underlying data \| What configuration allows |

**Do not** use a comparison table for:
- A single root cause with no paired alternative
- Resolution steps (use step express or bullets)
- Related Categories metadata in the draft file

**Mandatory layout** — prose first, then **one blank line**, then the table, then **one blank line** after the table before the next paragraph:

```markdown
One or two sentences naming both concepts and why they are confused.

| Column A | Column B |
|----------|----------|
| Row 1    | Row 1    |

Prose that continues after the table.
```

**Bad** (no blank line — prose runs into the table in Salesforce):

```markdown
The grade profile frequency determines whether TBP is monthly or annual.
| Monthly | Monthly | No |
```

**Good**:

```markdown
The grade profile frequency determines whether TBP is monthly or annual.

| Grade profile frequency | TBP frequency | Configurable Compensation Basis annualizes monthly TBP? |
|---|---|---|
| Monthly | Monthly | **No** |
| Annual | Annual | **Yes** |

A Configurable Compensation Basis cannot annualize a monthly TBP amount.
```

**Before finishing Description**, scan for paired concepts. If you wrote "when X … but when Y" or compared two settings, confirm you added a table with a blank line **above and below** it.

**Step 5 HTML** — `mdToHtml()` adds spacing automatically, but if you hand-write HTML use `<p><br></p>` + `margin-top: 16px` **before** the table, and `<p>&nbsp;</p>` + `margin-bottom: 16px` **after** it (see [salesforce-writes.md](salesforce-writes.md#html-tables)).

#### Highlight the differing token

When two values are **almost identical** — URL templates, OMS metadata, encoded payloads — and differ in **one segment**, do **not** put both full strings in one sentence. Readers miss `??` vs `?application/pdf?`.

Put each variant on its own table row and **color the differing token**:

| State | Token | Color |
|-------|-------|-------|
| Present / correct | the real value (for example `application/pdf`) | Green pill `#2e844a` on white text |
| Missing / wrong | label the empty slot **missing** — do not leave `??` | Red pill `#c23934` on white text |

Optional row tint: present `#eef8f1`, missing `#fdecea`. Markdown drafts may bold the token; Step 5 HTML must use the colored `<span>` pills in [salesforce-writes.md](salesforce-writes.md#html-tables).

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
| **Parallel strategies** | Recommendations are independent; the customer can apply one or more without doing the others first (batch sizing, lock-down vs split, monitoring) | **Chooser table** (situation → A/B/C) + `### Option A — Title` + italic *Use when* + bullets. Letters, not numbers. No dotted step rail |

**Ask:** Would step 2 still make sense if the customer skipped step 1? If yes, they are parallel strategies, not steps.

Do not relabel parallel strategies as steps, and do not flatten a true procedure into unordered bullets.

**Do not** number parallel strategies as Optional 1, Optional 2, or Step 1 — numbers still read as a sequence. Use **Option A / B / C**. Do not use step-express circles with a dotted connector (that pattern is sequential only).

#### Branching logic — optional diagrams

When the Resolution (or Description) has **three or more conditional paths** — integration-type forks, error-code branches, security-role checks — **consider** an **activity flowchart** instead of nested "If… else if…" paragraphs. Use your judgment; plain prose or a comparison table may still be clearer for simple cases.

| Pattern | Diagram type | Where |
|---------|--------------|-------|
| "Which integration type / config applies?" | Activity (`flowchart TD`) | Description or Resolution intro |
| Request/response order between systems | Sequence (`sequenceDiagram`) | Description |
| Who can perform an action | Use case table or small flowchart | Resolution |

Write Mermaid in the local `draft-REQ-######.md`. In Step 5, render activity flowcharts to a **light PNG** and embed the image — TinyMCE will not show Mermaid, and `mdToHtml()` only produces a table. Full syntax and embed steps: [uml-diagrams.md](uml-diagrams.md).

#### Resolution readability (rich text)

Salesforce renders Resolution as HTML. Dense paragraphs are hard to scan — structure for quick reading:

| Element | Do | Avoid |
|---------|-----|-------|
| **Step / strategy headings** | Sequential: step express numbered circles + italic context. Parallel: `### Option A — Title` + italic *Use when* (no numbered rail) | Bold text on its own line (looks like body text in TinyMCE); **Optional 1 / 2 / 3** headings |
| **Spacing between steps** | Sequential: dotted vertical connector between numbered circles. Parallel: chooser table, then option blocks with no connector | Stacked paragraphs with no visual break between steps |
| **Body under each heading** | 1–2 short paragraphs or a bullet list (one idea per line) | Long paragraphs mixing rationale, numbers, and examples |
| **Bullet lead-ins** | `**Bold label:** explanation` (e.g. `**Test in sandbox first.** Validate batch size…`) | Scattering bold on random words inside prose |
| **Intro** | One or two sentences framing the approach | Repeating the Description |
| **Caveats** | `> **Note:**` blockquote at the end (after final separator) | Burying caveats inside step bullets |

**Parallel strategies example (markdown):**

Lead with “apply any combination,” then a chooser table, then **Option A / B / C** (letters). Each option gets an italic *Use when* line so readers can skip. `mdToHtml()` styles `*Use when …*` as gray italic.

```markdown
Apply **any combination**. These are not sequential steps.

| If this is the situation | Apply |
|---|---|
| Mixed operational and notification mailboxes on one Service Center | **A** |
| Shared inbox should receive notifications | **B** |
| Notification-only account can still sign in | **C** |

### Option A — Separate Service Centers by purpose

*Use when one Service Center mixes unrelated mailboxes or processes.*

- **Grant security on the Service Center.** Representative access comes from the Service Center.
- **Do not reuse an operational Service Center** for an unrelated mailbox.

### Option B — Use Service Centers as shared notification recipients

*Use when the recipient is a shared inbox, not a named worker.*

- **Keep security to a minimum.** Enable only the access required to receive the notifications.

### Option C — Lock down notification-only representative accounts

*Use when a notification-only representative could still sign in to Workday.*

- **Set Do Not Allow UI Login to Yes** on the representative Workday account.
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
<td style="vertical-align: top; border: none; padding: 0 0 20px 12px;">
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

Repeat the outer table for each step. The dotted line must run from the bottom of one circle to the top of the next — use the nested `height: 100%` connector row (not a short stub `div`). Add `padding-bottom: 20px` on the content cell when another step follows (omit on the last step). Omit the connector row on the **last** step.

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
