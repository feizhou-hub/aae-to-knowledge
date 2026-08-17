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

/**
 * Inlined Knowledge search. Never click the exact-name "Knowledge" app nav link —
 * that leaves search results and opens the Recently Viewed list.
 */
function getKnowledgeSearchHelpersSource() {
  return `
  async function searchKnowledge(query) {
    const input = await ensureReady();
    await input.click();
    await input.fill('');
    await input.fill(query);
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: /Top Results|Search Results/i }).first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});

    const filter = page.getByRole('link', { name: /^Knowledge\\s+\\d/ });
    if (await filter.first().isVisible().catch(() => false)) {
      await filter.first().click();
      await page.locator('a[href*="Knowledge__kav"]').first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => {});
    }

    const articles = await page.evaluate(() => {
      const host = 'https://workday.lightning.force.com';
      const seen = new Set();
      const out = [];
      for (const a of document.querySelectorAll('a[href*="Knowledge__kav"]')) {
        const href = a.getAttribute('href') || '';
        const title = (a.innerText || '').replace(/\\s+/g, ' ').trim();
        if (!title || /^Preview$/i.test(title) || seen.has(href)) continue;
        seen.add(href);
        out.push({
          title,
          url: href.startsWith('http') ? href : host + href,
        });
        if (out.length >= 10) break;
      }
      return out;
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
  assertValidLightningUrl,
  getKnowledgeSearchHelpersSource,
  getMcpKnowledgeSearchScript,
};
