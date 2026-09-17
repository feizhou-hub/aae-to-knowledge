'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
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

const notes = `Notes
Created By: Feizhou Li (7/23/2026, 09:21 AM)

They should set the MIME type to application/pdf when uploading resumes.

Edit
Delete
Created By: Ebay Hampton (7/24/2026, 11:13 PM)

We can close the ticket.

Request Summary
About this AI-generated summary`;

describe('parseField / parseNotes / parseQuestionnaire', () => {
  it('reads highlights-style field pairs', () => {
    assert.equal(parseField(details, 'Record Type'), 'Ask an Expert');
    assert.equal(parseField(details, 'Product Area'), 'Integration Management');
    assert.equal(parseField(details, 'Capability'), 'General');
    assert.equal(parseField(details, 'Status'), 'Closed');
    assert.equal(parseField(details, 'Subject'), null);
  });

  it('parses public notes and skips the AI request summary', () => {
    const parsedNotes = parseNotes(notes);
    assert.equal(parsedNotes.length, 2);
    assert.match(parsedNotes[0].body, /MIME type/);
    assert.match(parsedNotes[1].body, /close the ticket/);
  });

  it('parses questionnaire pairs', () => {
    const pairs = parseQuestionnaire(`Question
Response
What is the main purpose of your request?
Troubleshooting
Please provide integration event URL and instance ID.
Joveo Recruiting API Client
Is Workday Studio installed?
Not Applicable`);
    assert.equal(pairs[0].response, 'Troubleshooting');
    assert.equal(pairs[1].response, 'Joveo Recruiting API Client');
  });
});

describe('buildSearchQuery (duplicate-check keywords)', () => {
  it('does not pad a complete subject with @mention customer names (REQ-487736)', () => {
    const query = buildSearchQuery({
      subject: 'Authentication Policies - Workday Support Implementers Accounts',
      capability: 'Authentication Policies',
      productArea: 'Authentication',
      publicNotes: [
        {
          author: 'Feizhou Li',
          body: '@James Aten\n\nHello James,\n\nSince we have completed our testing and confirmed that we can still successfully log in using the wd-support account.',
        },
      ],
    });
    assert.match(query, /Authentication/);
    assert.match(query, /Implementers/);
    assert.doesNotMatch(query, /James|Aten|Feizhou/i);
  });

  it('keeps technical note tokens when the subject is too short, still without person names', () => {
    const query = buildSearchQuery({
      subject: 'SSO',
      capability: 'Authentication Policies',
      productArea: 'Authentication',
      publicNotes: [
        {
          author: 'James Aten',
          body: '@James Aten Please confirm wd-support still signs in after removing the Implementers row.',
        },
      ],
    });
    assert.match(query, /Authentication|Policies|Implementers|wd-support/i);
    assert.doesNotMatch(query, /James|Aten/i);
  });

  it('uses note technical terms when subject is missing, without URLs', () => {
    const query = buildSearchQuery({
      productArea: 'Integration Management',
      capability: 'General',
      publicNotes: parseNotes(notes),
    });
    assert.match(query, /MIME|application\/pdf|resumes/i);
    assert.doesNotMatch(query, /https?:\/\//i);
  });
});
