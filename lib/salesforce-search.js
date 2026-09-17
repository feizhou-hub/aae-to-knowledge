'use strict';

const { getMcpSessionHelpersSource } = require('./salesforce-session');

/**
 * Invalid Salesforce Lightning URL pattern that triggers the
 * "Page doesn't exist — Enter a valid URL and try again" modal.
 *
 * Do NOT use browser_navigate with /lightning/globalSearch/... — that path
 * does not exist in Lightning Experience.
 */
const INVALID_GLOBAL_SEARCH_PATH = /\/lightning\/globalSearch\//i;

/** Matches "Knowledge 5+" and Lightning's compacted "Knowledge5+" — not the app nav "Knowledge". */
const KNOWLEDGE_FILTER_NAME = /^Knowledge\s*\d/;

function assertValidLightningUrl(url) {
  const value = String(url || '');
  if (INVALID_GLOBAL_SEARCH_PATH.test(value)) {
    throw new Error(
      `Invalid Salesforce URL: ${value}\n` +
        'Do not navigate to /lightning/globalSearch/... — it triggers "Page doesn\'t exist". ' +
        'Use getMcpKnowledgeSearchScript(query) to search via the Lightning search box instead.'
    );
  }
  return value;
}

function parseKnowledgeResultTitles(pageText) {
  const chrome =
    /^(Knowledge Results|Knowledge|\d+\+?\s*Results|•?Sorted by.*|Change sort order|Article Details|Show Actions|Refine By|Language|English|Publication Status|Published|Apply|Remove English|Select an Option|Validation Status)$/i;
  const source = String(pageText || '');
  const idx = source.search(/Knowledge Results/i);
  if (idx < 0) return [];
  const chunks = source.slice(idx).split(/\nPreview\s*\n/i);
  const titles = [];
  for (const chunk of chunks.slice(0, -1)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !chrome.test(line));
    const title = lines[lines.length - 1];
    if (title && title.length >= 12) titles.push(title.replace(/\s+/g, ' '));
  }
  return titles.slice(0, 10);
}

function knowledgeRecordUrl(href) {
  const value = String(href || '');
  if (!/\/lightning\/r\/Knowledge__kav\//i.test(value)) return null;
  const path = value.split('?')[0];
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return 'https://workday.lightning.force.com' + path;
  return null;
}

function collectKnowledgeHits(anchors, pageText) {
  const titles = parseKnowledgeResultTitles(pageText);
  const urlByTitle = new Map();
  for (const a of anchors || []) {
    const title = String(a.title || '').replace(/\s+/g, ' ').trim();
    const url = knowledgeRecordUrl(a.href);
    if (title && url) urlByTitle.set(title, url);
  }
  if (titles.length) {
    return titles.map((title) => ({
      title,
      url: urlByTitle.get(title) || null,
    }));
  }
  const out = [];
  const seen = new Set();
  for (const a of anchors || []) {
    const title = String(a.title || '').replace(/\s+/g, ' ').trim();
    const url = knowledgeRecordUrl(a.href);
    if (!title || !url || /^Preview$/i.test(title) || /^Knowledge$/i.test(title)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Inlined Knowledge search. Never click the exact-name "Knowledge" app nav link —
 * that leaves search results and opens the Recently Viewed list.
 */
function getKnowledgeSearchHelpersSource() {
  return `
  ${parseKnowledgeResultTitles.toString()}
  ${knowledgeRecordUrl.toString()}
  ${collectKnowledgeHits.toString()}

  async function searchKnowledge(query) {
    const input = await ensureReady();
    await input.click();
    await input.fill('');
    await input.fill(query);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /Top Results|Search Results/i }).first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    await page.getByText('Loading...').first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});

    const filter = page.getByRole('link', { name: ${KNOWLEDGE_FILTER_NAME.toString()} });
    if (await filter.first().isVisible().catch(() => false)) {
      await filter.first().click();
      await page.getByText(/Knowledge Results/i).first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => {});
    }

    const articles = await page.evaluate(() => {
      ${parseKnowledgeResultTitles.toString()}
      ${knowledgeRecordUrl.toString()}
      ${collectKnowledgeHits.toString()}
      const anchors = [...document.querySelectorAll('a')].map((a) => ({
        title: (a.innerText || '').replace(/\\s+/g, ' ').trim(),
        href: a.getAttribute('href') || '',
      }));
      return collectKnowledgeHits(anchors, document.body.innerText || '');
    });
    return { query, url: page.url(), articles };
  }
`;
}

/**
 * Playwright script for Step 3 duplicate check (read-only).
 * Prefer getMcpIntakeScript() so read + search run in one MCP call.
 *
 * Usage:
 *   globalThis.__kaSearchQuery = 'Put Reference ID EIB load time';
 *   // pass getMcpKnowledgeSearchScript() to browser_run_code_unsafe
 */
function getMcpKnowledgeSearchScript() {
  return `async (page) => {
  const query = globalThis.__kaSearchQuery;
  if (!query) throw new Error('Set globalThis.__kaSearchQuery before running search');
  ${getMcpSessionHelpersSource()}
  ${getKnowledgeSearchHelpersSource()}
  return await searchKnowledge(query);
}`;
}

module.exports = {
  INVALID_GLOBAL_SEARCH_PATH,
  KNOWLEDGE_FILTER_NAME,
  assertValidLightningUrl,
  parseKnowledgeResultTitles,
  knowledgeRecordUrl,
  collectKnowledgeHits,
  getKnowledgeSearchHelpersSource,
  getMcpKnowledgeSearchScript,
};
