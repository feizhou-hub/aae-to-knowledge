'use strict';

const assert = require('assert');
const crypto = require('crypto');
const {
  unpadPkcs7,
  stripHostPrefix,
  escapeSoql,
  parseRecordRef,
  htmlToText,
  parseEricSetCookie,
  parseAuraFramework,
  parseAuraBody,
  extractRichTextImageUrls,
  buildArticleRecord,
  buildCategoryRecord,
  articleUrl,
} = require('../lib/salesforce-api');

const padded = Buffer.concat([Buffer.from('00Dabc'), Buffer.from([2, 2])]);
assert.deepEqual(unpadPkcs7(padded), Buffer.from('00Dabc'));

const host = 'workday.my.salesforce.com';
const digest = crypto.createHash('sha256').update(host).digest();
const prefixed = Buffer.concat([digest, Buffer.from('00Dsession')]);
assert.equal(stripHostPrefix(prefixed, host), '00Dsession');
assert.equal(stripHostPrefix(Buffer.from('00Dplain'), host), '00Dplain');

assert.equal(escapeSoql("O'Hara"), "O\\'Hara");
assert.deepEqual(parseRecordRef('REQ-523290'), { kind: 'req', req: 'REQ-523290' });
assert.deepEqual(
  parseRecordRef('https://workday.lightning.force.com/lightning/r/Appointment__c/a3NVT000006optV2AQ/view'),
  { kind: 'id', id: 'a3NVT000006optV2AQ' }
);

assert.match(htmlToText('<p>Hello&nbsp;<strong>ISU</strong></p>'), /Hello ISU/);

const eric = parseEricSetCookie(['__Host-ERIC_PROD1=abc123; Path=/; Secure']);
assert.deepEqual(eric, { name: '__Host-ERIC_PROD1', value: 'abc123' });

const framework = parseAuraFramework(
  '<script src="/l/%7B%22mode%22%3A%22PROD%22%2C%22fwuid%22%3A%22FW123%22%2C%22loaded%22%3A%7B%22APPLICATION%40markup%3A%2F%2Fone%3Aone%22%3A%22LOAD1%22%7D%7D/inline.js">'
);
assert.equal(framework.fwuid, 'FW123');
assert.equal(framework.loaded, 'LOAD1');

const laterFramework = parseAuraFramework(
  '<script src="/l/%7B%22mode%22%3A%22PROD%22%2C%22loaded%22%3A%7B%22APPLICATION%40markup%3A%2F%2Fone%3Aone%22%3A%22OLD%22%7D%7D/a.js"></script>' +
    '<script src="/l/%7B%22mode%22%3A%22PROD%22%2C%22fwuid%22%3A%22FW999%22%2C%22loaded%22%3A%7B%22APPLICATION%40markup%3A%2F%2Fone%3Aone%22%3A%22LOAD9%22%7D%7D/b.js">'
);
assert.equal(laterFramework.fwuid, 'FW999');
assert.equal(laterFramework.loaded, 'LOAD9');

const imageUrls = extractRichTextImageUrls(
  '<p>See <img src="https://workday.file.force.com/servlet/rtaImage?eid=a4L&amp;feoid=00N&amp;refid=0EM" alt="setting"></p>' +
    '<img src="https://example.com/logo.png">'
);
assert.deepEqual(imageUrls, [
  'https://workday.file.force.com/servlet/rtaImage?eid=a4L&feoid=00N&refid=0EM',
]);

const aura = parseAuraBody('*/{"actions":[{"state":"SUCCESS"}]}/*ERROR*/');
assert.equal(aura.actions[0].state, 'SUCCESS');

const article = buildArticleRecord({
  title: 'Example',
  urlName: 'example',
  descriptionHtml: '<p>D</p>',
  resolutionHtml: '<p>R</p>',
  internalNotesHtml: '<p>N</p>',
});
assert.equal(article.RecordTypeId, '0124X000001RZdFQAW');
assert.equal(article.Type__c, 'WSP');
assert.equal(article.Target_WSP_Service__c, 'Ask an Expert');
assert.equal(article.Internal_Audience_Only__c, true);

const category = buildCategoryRecord('ka0VT000000z1SDYAY', {
  Product_Line__c: 'Platform and Product Extensions',
  Product_Area__c: 'Integration Management',
  Product_Area_Id__c: 'aUpVT000000028h0AA',
  Product_Capability__c: 'REST',
  Product_Capability_Id__c: 'aSxVT000000a7vp0AA',
  Case_Type__c: 'WSP',
  Category__c: 'Product Area and Product Capability',
});
assert.equal(category.Knowledge__c, 'ka0VT000000z1SDYAY');
assert.equal(category.sobjectType, 'Related_Category__c');
assert.equal(category.Id, null);
assert.match(articleUrl('ka0VT000000z1SDYAY'), /Knowledge__kav\/ka0VT000000z1SDYAY\/view$/);

console.log('salesforce-api tests passed');
