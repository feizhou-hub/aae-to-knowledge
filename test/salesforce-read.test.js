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

  it('force-cycles Request Details even when aria-expanded is already true (REQ-489686)', () => {
    const script = getMcpIntakeScript(['REQ-489686']);
    const cycle = functionSource(script, 'forceExpandRequestDetails');
    assert.match(cycle, /Request Details/);
    assert.match(cycle, /expanded === 'true'/);
    assert.match(cycle, /scrollIntoViewIfNeeded/);
    const details = functionSource(script, 'readDetailsSettled');
    assert.match(details, /forceExpandRequestDetails/);
    assert.match(details, /aria-selected/);
    assert.doesNotMatch(
      details,
      /if \(await tab\.isVisible\(\)\.catch\(\(\) => false\)\) await tab\.click\(\)/,
      're-clicking a selected Details tab remounts an empty Request Details accordion'
    );
  });

  it('opens Notes from the More Tabs overflow (REQ-489686)', () => {
    const script = getMcpIntakeScript(['REQ-489686']);
    const open = functionSource(script, 'openNotesTab');
    assert.match(open, /More Tabs/);
    assert.match(open, /menuitem/);
    const notes = functionSource(script, 'readNotesSettled');
    assert.match(notes, /openNotesTab/);
  });

  it('inlines name-stripped duplicate search and Knowledge5+ result parsing', () => {
    const script = getMcpIntakeScript(['REQ-487736']);
    assert.match(script, /collectPersonTokens/);
    assert.match(script, /MENTION_NAME/);
    assert.match(script, /Knowledge\\s\*\\d/);
    assert.match(script, /parseKnowledgeResultTitles/);
    assert.match(script, /collectKnowledgeHits/);
  });
});
