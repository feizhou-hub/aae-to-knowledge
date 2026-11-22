# Request intake

Read with `readAppointment()` from `lib/salesforce-api.js`. The return value is the Details tab and the public Notes tab.

## Appointment fields

| Use this | For |
|----------|-----|
| `Subject__c` | Working title and the duplicate-search phrase |
| `detailsText` | The customer's request, already stripped of HTML |
| `Product_Line__c` | Related Categories level 1 |
| `Product__c` | Product Area (level 2). This is the string, not the `Product_Area__c` lookup. |
| `Sub_Product__c` | Capability (level 3) |
| `Name` | `APP-######`, for Internal Notes and the source link |
| `Req_Number__c` | `REQ-######` |
| `RecordTypeName__c` | Ask an Expert maps to Target WSP Service **Ask an Expert** |

If Subject is empty, take the technical problem from the first public notes. Do not draft from Product Area alone.

## Notes

`publicNotes` is oldest-first. Read every public note. The resolution is often in a later note than the diagnosis.

Skip boilerplate check-ins and out-of-office replies when they add no technical fact. Keep the diagnosis, the test result, and what the customer accepted.

`privateNoteCount > 0` means a private note exists. Do not request its body and do not put it in the article. Say in Internal Notes that a private note was omitted.

## Images

An `<img>` in note HTML is optional. Use it when the public text does not already contain the error or the successful response. The image URL is on `file.force.com`.

## What to leave out of the article

Tenant names, worker names, email addresses, tokens, report ids, and customer addresses stay out of Description and Resolution. A support case number or the source REQ may appear in Internal Notes.
