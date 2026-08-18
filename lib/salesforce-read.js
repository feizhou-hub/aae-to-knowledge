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
const { getAppointmentParseSource } = require('./appointment-parse');
const { getKnowledgeSearchHelpersSource } = require('./salesforce-search');
const MAX_BATCH = 3;

function normalizeBatch(reqIds) {
  const batch = (Array.isArray(reqIds) ? reqIds : [reqIds])
    .map((id) => String(id).match(/REQ-\d+/i)?.[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_BATCH);
  if (!batch.length) throw new Error('Provide at least one REQ id');
  return batch;
}

function getIntakeScriptSource(batch, includeSearch) {
  return `async (page) => {
  const BATCH = ${JSON.stringify(batch)};
  const INCLUDE_SEARCH = ${includeSearch ? 'true' : 'false'};
  const results = {};
  ${getMcpSessionHelpersSource()}
  ${getAppointmentParseSource()}
  ${includeSearch ? getKnowledgeSearchHelpersSource() : ''}

  async function openAppointment(reqId) {
    const knownUrl = globalThis.__kaAppointmentUrls && globalThis.__kaAppointmentUrls[reqId];
    if (knownUrl) {
      await page.goto(knownUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitVisible(page.getByRole('tab', { name: 'Details' }), 20000);
      const appId = (page.url().match(/APP-\\d+/) || [])[0]
        || (await page.locator('body').innerText()).match(/APP-\\d+/)?.[0]
        || null;
      return { appId, url: page.url() };
    }

    const input = await getSearchInput();
    await input.click();
    await input.fill('');
    await input.fill(reqId);
    await page.keyboard.press('Enter');
    await page.getByRole('link', { name: /APP-\\d+/ }).first().waitFor({ state: 'visible', timeout: 15000 });

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
    await waitVisible(page.getByRole('tab', { name: 'Details' }), 20000);
    return { appId: hit.appId, url: page.url() };
  }

  async function expandDetailsSections() {
    for (const name of ['Request Details', 'Customer Details', 'Tenant Details']) {
      const btn = page.getByRole('button', { name, exact: true }).first();
      if (!(await btn.isVisible().catch(() => false))) {
        await btn.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      }
      if (!(await btn.isVisible().catch(() => false))) continue;
      const expanded = await btn.getAttribute('aria-expanded').catch(() => null);
      if (expanded === 'true') continue;
      await btn.click().catch(() => {});
      await settle(400);
    }
  }

  async function readDetailsPanelText() {
    const named = page.getByRole('tabpanel', { name: 'Details' });
    if (await named.count()) {
      await named.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      return (await named.first().innerText().catch(() => '')) || '';
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

  async function readHighlights() {
    const loc = page.locator('records-lwc-highlights-panel, .slds-page-header').first();
    if (!(await loc.count())) return '';
    return (await loc.innerText().catch(() => '')) || '';
  }

  async function readDetailsSettled() {
    const tab = page.getByRole('tab', { name: 'Details', exact: true });
    if (await tab.isVisible().catch(() => false)) await tab.click();
    await page.getByRole('button', { name: 'Request Details', exact: true }).first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
    const deadline = Date.now() + 15000;
    let details = '';
    while (Date.now() < deadline) {
      await expandDetailsSections();
      details = await readDetailsPanelText();
      if (!detailsNeedExpand(details)) return details;
      await settle(400);
    }
    return details;
  }

  async function readNotesSettled() {
    const tab = page.getByRole('tab', { name: 'Notes', exact: true });
    if (await tab.isVisible().catch(() => false)) await tab.click();
    const named = page.getByRole('tabpanel', { name: 'Notes' }).first();
    await named.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const deadline = Date.now() + 15000;
    let notes = '';
    while (Date.now() < deadline) {
      notes = (await named.innerText().catch(() => '')) || '';
      if (!notesNeedRetry(notes)) return notes;
      await settle(400);
    }
    return notes;
  }

  await ensureReady();

  for (const reqId of BATCH) {
    try {
      const opened = await openAppointment(reqId);
      const highlights = await readHighlights();
      const details = await readDetailsSettled();
      const notes = await readNotesSettled();
      const request = parseRequestDetails(details);
      const publicNotes = parseNotes(notes);
      results[reqId] = {
        reqId,
        appId: opened.appId,
        url: opened.url,
        subject: request.subject || parseField(details, 'Subject'),
        recordType: parseField(highlights, 'Record Type') || parseField(details, 'Record Type'),
        productArea: parseField(details, 'Product Area') || parseField(highlights, 'Product Area'),
        capability: parseField(details, 'Capability'),
        status: parseField(highlights, 'Status') || parseField(details, 'Status'),
        description: request.description || parseField(details, 'Description'),
        publicNotes,
        highlights,
        details,
        notes,
      };
    } catch (err) {
      results[reqId] = { reqId, error: String(err) };
    }
  }

  let duplicateCheck = null;
  if (INCLUDE_SEARCH) {
    const first = BATCH.map((id) => results[id]).find((row) => row && !row.error);
    const query = globalThis.__kaSearchQuery || (first ? buildSearchQuery(first) : '');
    if (query) duplicateCheck = await searchKnowledge(query);
  }

  return { batch: BATCH, appointments: results, duplicateCheck, pageUrl: page.url() };
}`;
}

/**
 * Steps 1–3 in one MCP call: Details + Notes, then Knowledge search.
 * Optional: globalThis.__kaSearchQuery to override the auto-derived query.
 * Optional: globalThis.__kaAppointmentUrls = { 'REQ-######': 'https://.../Appointment__c/...' }
 */
function getMcpIntakeScript(reqIds) {
  return getIntakeScriptSource(normalizeBatch(reqIds), true);
}

function getMcpReadAppointmentBatchScript(reqIds) {
  return getMcpIntakeScript(reqIds);
}

module.exports = {
  BASE,
  MAX_BATCH,
  getMcpIntakeScript,
  getMcpReadAppointmentBatchScript,
};
