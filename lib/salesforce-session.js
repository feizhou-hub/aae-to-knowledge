'use strict';

/**
 * Shared Playwright MCP session helpers — inlined into browser_run_code_unsafe scripts.
 *
 * Prevents repeated Okta/SAML prompts by:
 * - Reusing the current Lightning tab when the search box is already available
 * - Never navigating to /lightning/page/home (extra SAML round-trip)
 * - Recovering from file.force.com / about:blank via Knowledge list, not home
 */

const BASE = 'https://workday.lightning.force.com';
const LIGHTNING_FALLBACK = `${BASE}/lightning/o/Knowledge__kav/list?filterName=__Recent`;

/**
 * JS source prepended to MCP scripts. Defines dismissDialogs, getSearchInput,
 * waitForLightning, ensureReady on the Playwright page object.
 */
function getMcpSessionHelpersSource() {
  return `
  const BASE = ${JSON.stringify(BASE)};
  const LIGHTNING_FALLBACK = ${JSON.stringify(LIGHTNING_FALLBACK)};

  async function dismissDialogs() {
    for (const name of ['Cancel and close', 'Close', 'Got It']) {
      const btn = page.getByRole('button', { name });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
  }

  async function getSearchInput() {
    let input = page.locator('input[placeholder="Search..."], input[placeholder*="Search Knowledge"]').filter({ visible: true }).first();
    if (!(await input.count())) {
      const searchButton = page.locator('button.search-button').first();
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(500);
      }
      input = page.locator('input[placeholder="Search..."], input[placeholder*="Search Knowledge"]').filter({ visible: true }).first();
    }
    return input;
  }

  async function waitForLightning() {
    for (let i = 0; i < 60; i++) {
      const current = page.url();
      if (current.includes('lightning.force.com') && !current.includes('okta.com') && !current.includes('login')) break;
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(1000);
  }

  function isOnLightning() {
    return page.url().includes('lightning.force.com');
  }

  /**
   * Prefer the current tab. Only navigate when search is unavailable — and never to /lightning/page/home.
   */
  async function ensureReady() {
    await dismissDialogs();
    let input = await getSearchInput();
    if (await input.count()) return input;

    if (!isOnLightning()) {
      await page.goto(LIGHTNING_FALLBACK, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await waitForLightning();
    }

    await dismissDialogs();
    input = await getSearchInput();
    if (!(await input.count())) {
      throw new Error(
        'Salesforce search box not found. Log in once in the Playwright MCP browser (persistent profile), then retry. Do not restart MCP or open a second browser.'
      );
    }
    return input;
  }

  /**
   * Fetch an appointment attachment image without opening extra tabs.
   * Returns to returnUrl after capture.
   */
  async function fetchAttachmentBase64SameTab(namePattern, returnUrl) {
    const link = page.locator('a').filter({ hasText: namePattern }).first();
    if (!(await link.isVisible().catch(() => false))) return null;

    const beforeUrl = page.url();
    const popupPromise = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await link.click();
    const popup = await popupPromise;

    const imgPage = popup || page;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      await popup.waitForTimeout(2000);
    } else {
      await page.waitForTimeout(2500);
    }

    const data = await imgPage.evaluate(async () => {
      const img = document.querySelector('img');
      if (!img?.src) return null;
      const resp = await fetch(img.src, { credentials: 'include' });
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    });

    if (popup) {
      await popup.close();
      if (!page.url().includes('Appointment__c')) {
        await page.goto(returnUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1500);
      }
    } else if (page.url() !== beforeUrl && returnUrl) {
      await page.goto(returnUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1500);
    }

    return data;
  }
`;
}

module.exports = {
  BASE,
  LIGHTNING_FALLBACK,
  getMcpSessionHelpersSource,
};
