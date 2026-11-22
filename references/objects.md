# Principle and objects

The agent does not drive the Salesforce UI. Chrome is already logged in. The session id in the `sid` cookie is the credential for the same user, and the Knowledge Article workflow calls the objects behind the page instead of clicking tabs.

## Session

| Cookie | Host | Use |
|--------|------|-----|
| `sid` | `workday.my.salesforce.com` | REST and SOQL. Send `Authorization: Bearer <sid>`. |
| `sid` | `workday.lightning.force.com` | Aura calls. The Lightning host rejects `/services/data` with `INVALID_SESSION_ID`. |
| `__Host-ERIC_PROD…` | Set on the Lightning page response | Short-lived Aura CSRF token. Send it as `aura.token` and as a cookie on the Aura POST. |

Chrome encrypts cookie values (`v10`, AES-128-CBC). On cookie DB version 24 the plaintext starts with SHA-256 of the host; skip those 32 bytes. `lib/salesforce-api.js` does this. It reads the logged-in Chrome profile (`Profile 1`, then `Default`). It does not launch a browser and it does not log in. When the session expires, the user logs in again in Chrome.

## Objects

```
Appointment__c
  ├── Appointment_Comment__c     public Notes (Is_Private__c = false)
  └── fields used as Details     Subject__c, Special_Instructions__c, product fields

Knowledge__ka                      article master (not the Lightning URL)
  └── Knowledge__kav               article version. REST create. Lightning URL uses this Id.
        └── Related_Category__c    Product Line / Area / Capability. Written by Apex, not REST.
```

### Read the appointment

`Appointment__c` is the Ask an Expert record (`APP-######`, `REQ-######`).

| UI label | Field | Role |
|----------|-------|------|
| Appointment | `Name` | `APP-######` |
| Request | `Req_Number__c` | `REQ-######` |
| Subject | `Subject__c` | Article topic |
| Details | `Special_Instructions__c` | Request body (rich text) |
| Product Line | `Product_Line__c` | Related Categories level 1 |
| Product Area | `Product__c` | Related Categories level 2 |
| Capability | `Sub_Product__c` | Related Categories level 3 |
| Record type | `RecordTypeName__c` | Ask an Expert → Target WSP Service |

`Product_Area__c` on this object is a lookup and is often empty. Use `Product__c` for the Product Area string.

### Read the notes

`Appointment_Comment__c` is the Notes tab. Lookup field: `Appointment__c`. Body: `Comment__c`. `Is_Private__c = true` stays out of the article. Count private notes; do not copy their text. A private note can contain a credential.

### Find duplicate articles

`Knowledge__kav` is the article version consultants open. Filter `IsLatestVersion = true`, `Language = 'en_US'`, and `PublishStatus = 'Online'` for the duplicate check. Compare `Title` and `ArticleNumber`. Open a hit only when the title describes the same root cause.

`Knowledge__ka` is the parent article (`KnowledgeArticleId` on the version). Lightning links use the `Knowledge__kav` id (`ka0…`).

Phrase search uses SOSL. Title filters use SOQL. A title `LIKE` is the one to trust when SOSL tokenizes the words into unrelated hits.

### Write the article

`POST /services/data/v62.0/sobjects/Knowledge__kav`

| Field | Value |
|-------|--------|
| `RecordTypeId` | `0124X000001RZdFQAW` (Knowledge Articles) |
| `Language` | `en_US` |
| `Title`, `UrlName` | From the approved draft |
| `Description__c`, `Resolution__c`, `InternalNotes__c` | Rich text HTML from `mdToHtml()` |
| `Type__c` | `WSP` |
| `Target_WSP_Service__c` | `Ask an Expert` |
| `Internal_Audience_Only__c` | `true` |

Leave `PublishStatus` unset. The platform saves a **Draft**. Do not publish.

### Write Related Categories

`Related_Category__c` is the Related Categories list. Direct REST insert returns `entity type cannot be inserted`.

The **Add / Edit Related Categories** button opens the Lightning component `knowledgeArticleProductSelection`, which calls:

`CaseFeedArticleController.upsertAndDeleteProductTaggings`

Call that method through the Aura action endpoint `aura://ApexActionController/ACTION$execute`. Copy `Product_Area_Id__c` and `Product_Capability_Id__c` from an existing `Related_Category__c` row with the same three labels. Those ids are catalog ids, not customer data.

| Field | Example |
|-------|---------|
| `Knowledge__c` | the new `Knowledge__kav` id |
| `Product_Line__c` | Platform and Product Extensions |
| `Product_Area__c` | Integration Management |
| `Product_Area_Id__c` | catalog id, for example `aUp…` |
| `Product_Capability__c` | REST |
| `Product_Capability_Id__c` | catalog id, for example `aSx…` |
| `Case_Type__c` | `WSP` |
| `Category__c` | `Product Area and Product Capability` when a capability is set |

Always set all three levels from the appointment: Product Line, Product Area, Product Capability. Prefer the appointment's Product Area string when that exact string already exists on `Related_Category__c`. Do not invent a substitute such as Workday Extend or Integration when that label is not the appointment value.
