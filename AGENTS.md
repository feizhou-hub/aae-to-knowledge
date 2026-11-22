# Agent API — `lib/`

## Review gate (highest priority after the duplicate check)

**Do not write to Salesforce until the user approves the local draft in a follow-up message.**

| Step | Action | Salesforce? |
|------|--------|-------------|
| 1–3 | `readAppointment()`, `searchKnowledge()` | Read-only |
| 4 | Save `draft-REQ-######.md`, `registerDraft()` | No writes |
| — | **STOP. Present the draft. Ask for approval.** | No writes |
| 5 | `markApproved()`, then `createKnowledgeDraft()` and `setRelatedCategories()` | Writes |

"Create a KA" is Steps 1–4 on the first turn.

## Calls

```javascript
const {
  readAppointment,
  searchKnowledge,
  registerDraft,
  markApproved,
  markCreated,
  mdToHtml,
  parseDraftSections,
  createKnowledgeDraft,
  updateKnowledgeDraft,
  setRelatedCategories,
} = require('./lib');

const row = await readAppointment('REQ-523290');

registerDraft('REQ-523290', {
  draftPath: 'draft-REQ-523290.md',
  sourceUrl: row.appointment.url,
  title: 'Article Title',
});

// After the user approves in their next message:
markApproved('REQ-523290');
const created = await createKnowledgeDraft('REQ-523290', {
  title,
  urlName,
  descriptionHtml: mdToHtml(descriptionMarkdown),
  resolutionHtml: mdToHtml(resolutionMarkdown),
  internalNotesHtml: mdToHtml(internalNotesMarkdown),
});
await setRelatedCategories('REQ-523290', created.Id, {
  productLine: row.appointment.Product_Line__c,
  productArea: row.appointment.Product__c,
  productCapability: row.appointment.Sub_Product__c,
});
markCreated('REQ-523290', { articleUrl: created.url });
```

`createKnowledgeDraft` and `setRelatedCategories` throw while the draft is pending review. `updateKnowledgeDraft(reqId, articleId, fields)` patches the already-created draft (allowed after `created`); use it to fix content, never a second create. `parseDraftSections(path)` splits the local draft by `## Heading`. The session cookie is read from Chrome. Playwright is not used.

Object map and session principle: [references/objects.md](references/objects.md).

## Related Categories

Set Product Line, Product Area, and Product Capability from the appointment. `Product__c` is the Product Area string. `Sub_Product__c` is the Capability. `Product_Line__c` is the Product Line. Use those exact strings when they already appear on `Related_Category__c`.

## Private notes and attachments

`readAppointment` returns public `Appointment_Comment__c` rows only, plus `privateNoteCount`. Do not read private bodies into the article. Inline screenshots come from `fetchNoteImages(publicNotes)` in that same process. Do not query `Attachment` or `ContentDocumentLink`.

## Duplicate check

`searchKnowledge({ titleLikes, phrases })` queries online `Knowledge__kav` versions. Judge titles. Do not treat a loose SOSL hit as a duplicate.
