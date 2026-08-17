'use strict';

const { readFileSync } = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseField,
  parseNotes,
  parseRequestDetails,
  detailsNeedExpand,
  notesNeedRetry,
} = require('../lib/appointment-parse');

const fixtures = path.join(__dirname, 'fixtures');
const load = (name) => readFileSync(path.join(fixtures, name), 'utf8');

const collapsed = load('req-464243-collapsed-details.txt');
const expanded = load('req-464243-expanded-details.txt');
const highlights = load('req-464243-highlights.txt');
const notesLoading = load('req-464243-notes-loading.txt');

const NOTES_LOADED = `Notes
Notes
Action\tPrivate\tNote

Edit
Delete

Created By:  Feizhou Li  (6/26/2026, 06:16 PM)

Closing note to customer.

Edit
Delete

Created By:  Feizhou Li  (6/22/2026, 11:29 AM)

You're correct that there is no Position field in Expense_Report_WWS_DataType.
`;

describe('parseRequestDetails (REQ-464243 fixtures)', () => {
  it('does not treat collapsed Request Details as a subject', () => {
    const parsed = parseRequestDetails(collapsed);
    assert.equal(parsed.subject, null);
    assert.equal(parsed.description, null);
    assert.equal(detailsNeedExpand(collapsed), true);
  });

  it('reads Subject and the Details body after expanding Request Details', () => {
    const parsed = parseRequestDetails(expanded);
    assert.equal(
      parsed.subject,
      'Inquiry regarding setting the "Position" field via submit_expense_report API'
    );
    assert.match(parsed.description, /submit_expense_report Web Service API/);
    assert.match(parsed.description, /Expense_Report_WWS_DataType/);
    assert.doesNotMatch(parsed.description, /^Product Area$/m);
    assert.doesNotMatch(parsed.description, /Customer Details/);
    assert.equal(detailsNeedExpand(expanded), false);
  });

  it('does not use the first Details heading (Ask an Expert Details)', () => {
    assert.equal(parseField(expanded, 'Details'), 'Product Area');
    const parsed = parseRequestDetails(expanded);
    assert.notEqual(parsed.description, 'Product Area');
  });
});

describe('highlights vs Details tab', () => {
  it('reads Record Type from the highlights panel, not the Details tabpanel', () => {
    assert.equal(parseField(collapsed, 'Record Type'), null);
    assert.equal(parseField(highlights, 'Record Type'), 'Ask an Expert');
    assert.equal(parseField(highlights, 'Status'), 'Closed');
  });
});

describe('notesNeedRetry (REQ-464243 fixtures)', () => {
  it('retries while the related list still shows Loading / No records', () => {
    assert.equal(notesNeedRetry(notesLoading), true);
    assert.deepEqual(parseNotes(notesLoading), []);
  });

  it('does not retry once Created By notes are present', () => {
    assert.equal(notesNeedRetry(NOTES_LOADED), false);
    const notes = parseNotes(NOTES_LOADED);
    assert.equal(notes.length, 2);
    assert.match(notes[1].body, /no Position field/);
  });
});
