'use strict';

/**
 * Read-only Salesforce helpers for Playwright MCP (browser_run_code_unsafe).
 *
 * Session rules — prevents repeated Okta/SAML login prompts:
 * - Use ONLY Playwright MCP; never launch a separate Chrome/Playwright process.
 * - Never pkill playwright-mcp or open launchPersistentContext on the MCP profile.
 * - Do not browser_navigate to /lightning/page/home between appointments in a batch.
 * - Batch up to 3 REQ ids per MCP session; run another batch in a follow-up turn.
 */

const { BASE, getMcpSessionHelpersSource } = require('./salesforce-session');
const MAX_BATCH = 3;

function getMcpReadAppointmentBatchScript(reqIds) {
  const batch = (Array.isArray(reqIds) ? reqIds : [reqIds])
    .map((id) => String(id).match(/REQ-\d+/i)?.[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_BATCH);

  if (!batch.length) {
    throw new Error('Provide at least one REQ id');
  }

  return `async (page) => {
  const BATCH = ${JSON.stringify(batch)};
  const results = {};
  ${getMcpSessionHelpersSource()}

  async function openAppointment(reqId) {
    const input = await getSearchInput();
    await input.click();
    await input.fill('');
    await input.fill(reqId);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    const hit = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('table tr, [role="row"]')];
      for (const row of rows) {
        const text = row.innerText || '';
        if (/APP-\\d+/.test(text)) {
          const link = row.querySelector('a[href*="/lightning/r/"]');
          if (link) {
            return {
              href: link.getAttribute('href'),
              appId: text.match(/APP-\\d+/)?.[0] || null,
            };
          }
        }
      }
      return null;
    });

    if (!hit?.href) throw new Error('No appointment found for ' + reqId);
    const url = hit.href.startsWith('http') ? hit.href : BASE + hit.href;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    return { appId: hit.appId, url: page.url() };
  }

  async function readTab(tabName) {
    const tab = page.getByRole('tab', { name: tabName, exact: true });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(2500);
    }
    const panels = page.locator('[role="tabpanel"]');
    for (let i = 0; i < await panels.count(); i++) {
      const panel = panels.nth(i);
      if (await panel.isVisible().catch(() => false)) {
        const text = await panel.innerText().catch(() => '');
        if (text.trim().length > 80) return text;
      }
    }
    return '';
  }

  function parseField(text, label) {
    const re = new RegExp(label.replace(/[.*+?^\\$()|[\\]\\\\]/g, '\\\\$&') + '\\\\s*\\\\n([^\\\\n]+)', 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  }

  await ensureReady();

  for (const reqId of BATCH) {
    try {
      const opened = await openAppointment(reqId);
      const details = await readTab('Details');
      const notes = await readTab('Notes');
      results[reqId] = {
        reqId,
        appId: opened.appId,
        url: opened.url,
        subject: parseField(details, 'Subject'),
        recordType: parseField(details, 'Record Type'),
        productArea: parseField(details, 'Product Area'),
        capability: parseField(details, 'Capability'),
        status: parseField(details, 'Status'),
        description: parseField(details, 'Description'),
        details,
        notes,
      };
    } catch (err) {
      results[reqId] = { reqId, error: String(err) };
    }
  }

  return { batch: BATCH, appointments: results, pageUrl: page.url() };
}`;
}

module.exports = {
  BASE,
  MAX_BATCH,
  getMcpReadAppointmentBatchScript,
};
