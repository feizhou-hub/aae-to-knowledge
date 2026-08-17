'use strict';

const { resolveCategories } = require('./category-resolver');
const matrixData = require('./product-category-matrix.json');
const { getMcpSessionHelpersSource } = require('./salesforce-session');

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

  await page.getByText('Select Product Line', { exact: true }).first().click({ force: true });
  await page.getByRole('option', { name: productLine, exact: true }).waitFor({ state: 'visible', timeout: 8000 });
  await page.getByRole('option', { name: productLine, exact: true }).click();
  await page.keyboard.press('Escape');

  await page.getByText('Select Product Area', { exact: true }).first().click({ force: true });
  await page.getByRole('option', { name: productArea, exact: true }).waitFor({ state: 'visible', timeout: 8000 });
  await page.getByRole('option', { name: productArea, exact: true }).click();

  if (productCapability) {
    await page.getByText('Select Product Capability', { exact: true }).first().click({ force: true });
    await page.getByRole('option', { name: productCapability, exact: true }).waitFor({
      state: 'visible',
      timeout: 8000,
    });
    await page.getByRole('option', { name: productCapability, exact: true }).click();
  }

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Add / Edit Related Categories' }).waitFor({
    state: 'visible',
    timeout: 20000,
  }).catch(() => {});

  return { success: true, categories };
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
    .getByText('Select Product Line', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasEmptyRow) {
    await page.getByRole('button', { name: 'New' }).click();
    await waitVisible(page.getByText('Select Product Line', { exact: true }), 8000);
  }

  await page.getByText('Select Product Line', { exact: true }).first().click({ force: true });
  await waitVisible(page.getByRole('option', { name: categories.productLine, exact: true }), 8000);
  await page.getByRole('option', { name: categories.productLine, exact: true }).click();
  await page.keyboard.press('Escape');

  await page.getByText('Select Product Area', { exact: true }).first().click({ force: true });
  await waitVisible(page.getByRole('option', { name: categories.productArea, exact: true }), 8000);
  await page.getByRole('option', { name: categories.productArea, exact: true }).click();

  if (categories.productCapability) {
    await page.getByText('Select Product Capability', { exact: true }).first().click({ force: true });
    await waitVisible(page.getByRole('option', { name: categories.productCapability, exact: true }), 8000);
    await page.getByRole('option', { name: categories.productCapability, exact: true }).click();
  }

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Add / Edit Related Categories' })
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => {});
  return { success: true, categories, url: page.url() };
}`;
}

module.exports = {
  fillRelatedCategories,
  fillFromAppointment,
  getMcpFillScript,
  matrixData,
};
