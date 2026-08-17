'use strict';

const { getMcpSessionHelpersSource } = require('./salesforce-session');
const { getMcpSetRichTextScript } = require('./set-rich-text-fields');
const { getMcpFillScript } = require('./fill-related-categories');

/**
 * One MCP call: New Article → fill → TinyMCE → Save → Related Categories.
 *
 * Usage (after markApproved):
 *   globalThis.__kaArticle = { title, urlName, targetWspService, richText, categories };
 *   // pass getMcpCreateArticleScript(reqId) from salesforce-write.js
 */
function getMcpCreateArticleScript() {
  const setRichText = getMcpSetRichTextScript();
  const runFillCategories = getMcpFillScript();
  return `async (page) => {
  ${getMcpSessionHelpersSource()}
  const setRichText = ${setRichText};
  const runFillCategories = ${runFillCategories};
  const article = globalThis.__kaArticle;
  if (!article?.title || !article?.urlName || !article?.richText || !article?.categories) {
    throw new Error('Set globalThis.__kaArticle with title, urlName, richText, and categories');
  }
  const targetService = article.targetWspService || 'Ask an Expert';

  if (!page.url().includes('/Knowledge__kav/new')) {
    await page.goto(LIGHTNING_FALLBACK, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitVisible(page.getByRole('button', { name: /^(New Article|New)$/ }), 20000);
    const newArticle = page.getByRole('button', { name: 'New Article' });
    if (await newArticle.isVisible().catch(() => false)) await newArticle.click();
    else await page.getByRole('button', { name: 'New' }).first().click();
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await nextBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
  }

  await waitVisible(page.getByRole('combobox', { name: 'Case Type (Team)' }), 20000);
  const caseType = page.getByRole('combobox', { name: 'Case Type (Team)' });
  const caseTypeText = await caseType.innerText().catch(() => '');
  if (!caseTypeText.includes('WSP')) {
    await caseType.click();
    await waitVisible(page.getByRole('option', { name: 'WSP' }), 8000);
    await page.getByRole('option', { name: 'WSP' }).click();
  }
  await waitVisible(page.getByLabel('*Target WSP Service'), 20000);

  const chosen = page.getByLabel('*Target WSP Service').getByRole('listbox', { name: 'Chosen' });
  const chosenText = await chosen.innerText().catch(() => '');
  if (!chosenText.includes(targetService)) {
    await page.getByRole('option', { name: targetService, exact: true }).click();
    await page.getByLabel('*Target WSP Service').getByRole('button', { name: 'Move selection to Chosen' }).click();
  }

  await page.getByRole('textbox', { name: 'Title' }).fill(article.title);
  await page.getByRole('textbox', { name: 'URL Name' }).fill(article.urlName);
  await page.getByRole('checkbox', { name: 'Internal Audience Only' }).check();

  globalThis.__kaRichTextFields = article.richText;
  await setRichText(page);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForURL(/\\/Knowledge__kav\\/ka0/, { timeout: 30000 });
  const articleUrl = page.url();

  globalThis.__kaCategories = article.categories;
  globalThis.__kaArticleUrl = articleUrl;
  const catResult = await runFillCategories(page);
  return { title: article.title, articleUrl, catResult, pageUrl: page.url() };
}`;
}

module.exports = { getMcpCreateArticleScript };
