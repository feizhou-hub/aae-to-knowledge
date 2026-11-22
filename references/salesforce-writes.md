# Salesforce writes

Writes run only after `markApproved(reqId)` in the user's follow-up message. `createKnowledgeDraft` and `setRelatedCategories` call `assertApproved` and throw otherwise.

## Article — REST

`createKnowledgeDraft(reqId, article)` posts to `Knowledge__kav`.

```javascript
const { mdToHtml, createKnowledgeDraft } = require('./lib');

const created = await createKnowledgeDraft('REQ-######', {
  title: 'Expense REST API Returns 403 Forbidden For an Integration System User',
  urlName: 'expense-rest-api-returns-403-forbidden-for-an-integration-system-user',
  descriptionHtml: mdToHtml(descriptionMarkdown),
  resolutionHtml: mdToHtml(resolutionMarkdown),
  internalNotesHtml: mdToHtml(internalNotesMarkdown),
});
```

Defaults, all overridable:

| Field | Default |
|-------|---------|
| `RecordTypeId` | `0124X000001RZdFQAW` (Knowledge Articles) |
| `Language` | `en_US` |
| `Type__c` | `WSP` |
| `Target_WSP_Service__c` | `Ask an Expert` |
| `Internal_Audience_Only__c` | `true` |

`mdToHtml()` turns the draft sections into TinyMCE HTML, including table spacing and the blank paragraph after an Internal Notes source line. Pass each section's markdown, not the whole draft file.

Confirm the read-back: `PublishStatus` is `Draft`, `ArticleNumber` is set, and `created.url` opens the version.

Do not call the Publish quick action.

## Related Categories — Apex

`Related_Category__c` rejects a REST insert. `setRelatedCategories` finds an existing row with the same Product Line, Product Area, and Product Capability, copies that row's catalog ids, and calls:

`CaseFeedArticleController.upsertAndDeleteProductTaggings`

through `POST https://workday.lightning.force.com/aura` (`ApexActionController.execute`). The Lightning `sid` plus the response's `__Host-ERIC_PROD…` cookie (as `aura.token`) authenticate the call.

```javascript
const { setRelatedCategories } = require('./lib');

await setRelatedCategories('REQ-######', created.Id, {
  productLine: 'Platform and Product Extensions',
  productArea: 'Integration Management',
  productCapability: 'REST',
});
```

The helper queries the new article afterward. If that triple is already on the article, it does not insert a second row.

The three labels have to already exist together on some `Related_Category__c` row. That is how the catalog ids (`Product_Area_Id__c`, `Product_Capability_Id__c`) are known. If the query finds none, stop and tell the user the labels are not on the category list yet. Do not substitute a different Product Area.

## After save

```javascript
const { markCreated } = require('./lib');
markCreated('REQ-######', { articleUrl: created.url });
```

Tell the user the article is a draft.
