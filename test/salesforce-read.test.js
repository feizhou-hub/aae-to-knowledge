'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getMcpIntakeScript } = require('../lib/salesforce-read');

describe('getMcpIntakeScript intake contract', () => {
  it('expands Request Details, waits for Notes to settle, and parses highlights', () => {
    const script = getMcpIntakeScript(['REQ-464243']);
    assert.match(script, /expandDetailsSections/);
    assert.match(script, /Request Details/);
    assert.match(script, /notesNeedRetry/);
    assert.match(script, /parseRequestDetails/);
    assert.match(script, /highlights/);
    assert.match(script, /Created By:/);
  });
});
