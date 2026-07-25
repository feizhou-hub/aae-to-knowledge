'use strict';

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

function getMcpKnowledgeSearchScript() {
  return `async (page) => {
  const query = globalThis.__kaSearchQuery;
  if (!query) throw new Error('Set globalThis.__kaSearchQuery before running search');

  const closeDialog = page.getByRole('button', { name: 'Cancel and close' });
  if (await closeDialog.isVisible().catch(() => false)) {
    await closeDialog.click();
    await page.waitForTimeout(500);
  }

  let input = page.locator('input[placeholder="Search..."], input[placeholder*="Search Knowledge"]').filter({ visible: true }).first();
  if (!(await input.count())) {
    const searchButton = page.locator('button.search-button').first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
      await page.waitForTimeout(500);
    }
    input = page.locator('input[placeholder="Search..."], input[placeholder*="Search Knowledge"]').filter({ visible: true }).first();
  }

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
