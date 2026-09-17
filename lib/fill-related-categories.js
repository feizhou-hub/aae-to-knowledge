'use strict';

const { resolveCategories } = require('./category-resolver');
const matrixData = require('./product-category-matrix.json');
const { getMcpSessionHelpersSource } = require('./salesforce-session');
const { pickClosestOption, getPicklistMatchSource } = require('./picklist-match');

async function selectComboOption(page, triggerName, preferred, extraFallbacks = []) {
  await page.getByText(triggerName, { exact: true }).first().click({ force: true });
  const exact = page.getByRole('option', { name: preferred, exact: true });
  const appeared = await exact
    .waitFor({ state: 'visible', timeout: 1200 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await exact.click();
    return { selected: preferred, matchedExact: true };
  }
  await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 4000 });
  const options = (await page.getByRole('option').allTextContents())
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const selected = pickClosestOption(preferred, options, extraFallbacks);
  if (!selected) {
    throw new Error(
      `No picklist match for "${preferred}". Live options: ${options.join(', ')}`
    );
  }
  await page.getByRole('option', { name: selected, exact: true }).click();
  return { selected, matchedExact: false, options };
}

async function fillRelatedCategories(page, categories, options = {}) {
  const { productLine, productArea, productCapability } = categories;
  const articleUrl = options.articleUrl || globalThis.__kaArticleUrl;

  if (!productLine || !productArea || !productCapability) {
    throw new Error('productLine, productArea, and productCapability are required');
  }

  if (!page.url().includes('navigateProductTagging')) {
    if (!articleUrl) {
      throw new Error('articleUrl required when not already on Related Categories page');
    }
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add / Edit Related Categories' }).waitFor({
      state: 'visible',
      timeout: 20000,
    });
    await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
    await page.getByText('Select Product Line', { exact: true }).first()
      .or(page.getByRole('button', { name: 'New' }))
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  const body = await page.evaluate(() => document.body.innerText);
  const capUnset = await page
    .getByText('Select Product Capability', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (
    body.includes(productLine) &&
    body.includes(productArea) &&
    !capUnset
  ) {
    return { skipped: true, reason: 'Category already exists', categories };
  }

  const hasEmptyRow = await page
    .getByText('Select Product Line', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasEmptyRow) {
    await page.getByRole('button', { name: 'New' }).click();
    await page.getByText('Select Product Line', { exact: true }).first().waitFor({
      state: 'visible',
      timeout: 8000,
    });
  }

  const line = await selectComboOption(page, 'Select Product Line', productLine);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const area = await selectComboOption(page, 'Select Product Area', productArea);
  await page.waitForTimeout(200);

  let capability = { selected: productCapability, matchedExact: true };
  if (productCapability) {
    capability = await selectComboOption(
      page,
      'Select Product Capability',
      productCapability,
      ['General']
    );
  }

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Add / Edit Related Categories' }).waitFor({
    state: 'visible',
    timeout: 20000,
  }).catch(() => {});

  const selected = {
    productLine: line.selected,
    productArea: area.selected,
    productCapability: capability.selected,
  };
  return { success: true, categories, selected };
}

async function fillFromAppointment(page, appointmentProductArea, appointmentCapability, options = {}) {
  const categories = resolveCategories(
    appointmentProductArea,
    appointmentCapability,
    matrixData
  );
  return fillRelatedCategories(page, categories, options);
}

/**
 * Returns Playwright MCP script for filling Related Categories.
 * For KA creation workflow, use getMcpFillScript(reqId) from
 * salesforce-write.js instead — it enforces the human review gate.
 */
function getMcpFillScript() {
  return `async (page) => {
  ${getMcpSessionHelpersSource()}
  ${getPicklistMatchSource()}
  const categories = globalThis.__kaCategories;
  const articleUrl = globalThis.__kaArticleUrl;
  if (!categories?.productLine || !categories?.productArea || !categories?.productCapability) {
    throw new Error('Set globalThis.__kaCategories with productLine, productArea, and productCapability before running fill script');
  }

  if (!page.url().includes('navigateProductTagging')) {
    if (!articleUrl) throw new Error('Set globalThis.__kaArticleUrl');
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
    await waitVisible(page.getByRole('button', { name: 'Add / Edit Related Categories' }), 20000);
    await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
    await page.getByText('Select Product Line', { exact: true }).first()
      .or(page.getByRole('button', { name: 'New' }))
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
  }

  const body = await page.evaluate(() => document.body.innerText);
  const capUnset = await page
    .getByText('Select Product Capability', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (
    body.includes(categories.productLine) &&
    body.includes(categories.productArea) &&
    !capUnset
  ) {
    return { skipped: true, reason: 'Category already exists', categories };
  }

  const hasEmptyRow = await page
    .getByText('Select Product Line', { exact: true }).first()
    .isVisible()
    .catch(() => false);
  if (!hasEmptyRow) {
    await page.getByRole('button', { name: 'New' }).click();
    await waitVisible(page.getByText('Select Product Line', { exact: true }), 8000);
  }

  const line = await selectComboOption('Select Product Line', categories.productLine);
  await page.keyboard.press('Escape');
  await settle(200);

  const area = await selectComboOption('Select Product Area', categories.productArea);
  await settle(200);

  const capability = categories.productCapability
    ? await selectComboOption('Select Product Capability', categories.productCapability, ['General'])
    : { selected: categories.productCapability, matchedExact: true };

  const selected = {
    productLine: line.selected,
    productArea: area.selected,
    productCapability: capability.selected,
  };

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Add / Edit Related Categories' })
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => {});
  return { success: true, categories, selected, url: page.url() };
}`;
}

module.exports = {
  fillRelatedCategories,
  fillFromAppointment,
  getMcpFillScript,
  selectComboOption,
  matrixData,
};
