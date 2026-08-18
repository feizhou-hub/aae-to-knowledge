'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getMcpIntakeScript } = require('../lib/salesforce-read');

function functionSource(script, name) {
  const start = script.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const next = script.indexOf('\n  async function ', start + 1);
  const fallback = script.indexOf('\n  await ensureReady()', start);
  const end = next === -1 ? fallback : next;
  assert.ok(end > start, `could not bound ${name}`);
  return script.slice(start, end);
}

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

  it('polls Request Details until Subject appears instead of one-shot expand (REQ-474503)', () => {
    const script = getMcpIntakeScript(['REQ-474503']);
    const details = functionSource(script, 'readDetailsSettled');
    assert.match(details, /while \(Date\.now\(\) < deadline\)/);
    assert.match(details, /detailsNeedExpand/);
    assert.match(details, /Request Details/);
    assert.doesNotMatch(
      details,
      /readTab\('Details'\)/,
      're-clicking the Details tab after expand can reset the accordion'
    );
  });
});
