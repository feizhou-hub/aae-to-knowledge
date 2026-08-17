'use strict';

const assert = require('assert');
const {
  parseField,
  parseNotes,
  parseQuestionnaire,
  buildSearchQuery,
} = require('../lib/appointment-parse');

const details = `Record Type

Ask an Expert

Product Area

Integration Management

Capability
General
Status

Closed`;

assert.strictEqual(parseField(details, 'Record Type'), 'Ask an Expert');
assert.strictEqual(parseField(details, 'Product Area'), 'Integration Management');
assert.strictEqual(parseField(details, 'Capability'), 'General');
assert.strictEqual(parseField(details, 'Status'), 'Closed');
assert.strictEqual(parseField(details, 'Subject'), null);

const notes = `Notes
Created By: Feizhou Li (7/23/2026, 09:21 AM)

They should set the MIME type to application/pdf when uploading resumes.

Edit
Delete
Created By: Ebay Hampton (7/24/2026, 11:13 PM)

We can close the ticket.

Request Summary
About this AI-generated summary`;

const parsedNotes = parseNotes(notes);
assert.strictEqual(parsedNotes.length, 2);
assert.ok(parsedNotes[0].body.includes('MIME type'));
assert.ok(parsedNotes[1].body.includes('close the ticket'));

const questionnaire = `Question
Response
What is the main purpose of your request?
Troubleshooting
Please provide integration event URL and instance ID.
Joveo Recruiting API Client
Is Workday Studio installed?
Not Applicable`;

const pairs = parseQuestionnaire(questionnaire);
assert.strictEqual(pairs[0].response, 'Troubleshooting');
assert.strictEqual(pairs[1].response, 'Joveo Recruiting API Client');

const query = buildSearchQuery({
  productArea: 'Integration Management',
  capability: 'General',
  publicNotes: parsedNotes,
});
assert.ok(query.includes('MIME') || query.includes('application/pdf') || query.includes('resumes'));
assert.ok(!query.toLowerCase().includes('https'));

console.log('appointment-parse tests passed');
