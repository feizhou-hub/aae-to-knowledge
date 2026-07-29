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
 * Playwright script for Step 3 duplicate check (read-only).
 * Searches Knowledge articles through the global search UI, not a direct URL.
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

  const input = await ensureReady();
  await input.click();
  await input.fill(query);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4000);

  const knowledgeTab = page.getByRole('link', { name: 'Knowledge', exact: true }).first();
  if (await knowledgeTab.isVisible().catch(() => false)) {
    await knowledgeTab.click();
    await page.waitForTimeout(3000);
  }

  const body = await page.locator('body').innerText();
  const start = body.indexOf('Knowledge Results');
  const section = start >= 0 ? body.slice(start, start + 5000) : body.slice(0, 5000);
  return { url: page.url(), results: section };
}`;
}

module.exports = {
  INVALID_GLOBAL_SEARCH_PATH,
  assertValidLightningUrl,
  getMcpKnowledgeSearchScript,
};
