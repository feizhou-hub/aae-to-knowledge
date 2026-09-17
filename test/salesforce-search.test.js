'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  KNOWLEDGE_FILTER_NAME,
  parseKnowledgeResultTitles,
  collectKnowledgeHits,
  getKnowledgeSearchHelpersSource,
} = require('../lib/salesforce-search');

const KNOWLEDGE_RESULTS_TEXT = `Search Results
Top Results
Knowledge
5+
Knowledge Results
Knowledge

50+ Results

•Sorted byRelevance
Change sort order

Workday Core Access To Environments (wd-developer, wd-environments, wd-support)
Preview

environments? What is the purpose of the wd-support account in Workday...Named Support Contact
Article Details
Show Actions

Will Our Authentication Policy Affect Wd Accounts?
Preview

This article addresses whether the wd accounts requires
Article Details
Show Actions
`;

describe('Knowledge search filter name', () => {
  it('matches Knowledge5+ and Knowledge 5+, not the app nav Knowledge link', () => {
    assert.equal(KNOWLEDGE_FILTER_NAME.test('Knowledge5+'), true);
    assert.equal(KNOWLEDGE_FILTER_NAME.test('Knowledge 5+'), true);
    assert.equal(KNOWLEDGE_FILTER_NAME.test('Knowledge 12'), true);
    assert.equal(KNOWLEDGE_FILTER_NAME.test('Knowledge'), false);
  });
});

describe('parseKnowledgeResultTitles', () => {
  it('reads article titles from the Knowledge Results section, not Preview chrome', () => {
    const titles = parseKnowledgeResultTitles(KNOWLEDGE_RESULTS_TEXT);
    assert.deepEqual(titles, [
      'Workday Core Access To Environments (wd-developer, wd-environments, wd-support)',
      'Will Our Authentication Policy Affect Wd Accounts?',
    ]);
  });
});

describe('collectKnowledgeHits', () => {
  it('drops the Recently Viewed Knowledge app nav link and keeps record URLs', () => {
    const hits = collectKnowledgeHits(
      [
        {
          title: 'Knowledge',
          href: '/lightning/o/Knowledge__kav/list?filterName=__Recent',
        },
        {
          title: 'Workday Core Access To Environments (wd-developer, wd-environments, wd-support)',
          href: '/lightning/r/Knowledge__kav/ka0VT000000hgs1YAA/view',
        },
        {
          title: 'Will Our Authentication Policy Affect Wd Accounts?',
          href: 'javascript:void(0);',
        },
      ],
      KNOWLEDGE_RESULTS_TEXT
    );
    assert.equal(hits.length, 2);
    assert.equal(
      hits[0].title,
      'Workday Core Access To Environments (wd-developer, wd-environments, wd-support)'
    );
    assert.match(hits[0].url, /Knowledge__kav\/ka0VT000000hgs1YAA/);
    assert.equal(hits[1].title, 'Will Our Authentication Policy Affect Wd Accounts?');
  });
});

describe('getKnowledgeSearchHelpersSource', () => {
  it('clicks Knowledge5+ (optional space) and parses Knowledge Results text', () => {
    const src = getKnowledgeSearchHelpersSource();
    assert.match(src, /Knowledge\\s\*\\d/);
    assert.match(src, /parseKnowledgeResultTitles/);
    assert.match(src, /collectKnowledgeHits/);
    assert.match(src, /Knowledge Results/);
    assert.doesNotMatch(src, /name: \/\^Knowledge\\s\+\\d\//);
  });
});
