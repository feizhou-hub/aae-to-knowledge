'use strict';

const { resolveCategories } = require('./category-resolver');
const matrixData = require('./product-category-matrix.json');

async function fillRelatedCategories(page, categories, options = {}) {
  const { productLine, productArea, productCapability } = categories;
  const articleUrl = options.articleUrl || globalThis.__kaArticleUrl;

  if (!productLine || !productArea) {
    throw new Error('productLine and productArea are required');
  }

  if (!page.url().includes('navigateProductTagging')) {
    if (!articleUrl) {
      throw new Error('articleUrl required when not already on Related Categories page');
    }
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
    await page.waitForTimeout(2000);
  }

  const body = await page.evaluate(() => document.body.innerText);
  if (
    body.includes(productLine) &&
    body.includes(productArea) &&
    (!productCapability || body.includes(productCapability))
  ) {
    return { skipped: true, reason: 'Category already exists', categories };
  }

  // Page opens with an empty first row — only click New if no empty row exists
  const hasEmptyRow = await page
    .getByText('Select Product Line', { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasEmptyRow) {
    await page.getByRole('button', { name: 'New' }).click();
    await page.waitForTimeout(500);
  }

  await page.getByText('Select Product Line', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: productLine, exact: true }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');

  await page.getByText('Select Product Area', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: productArea, exact: true }).click();
  await page.waitForTimeout(500);

  if (productCapability) {
    await page.getByText('Select Product Capability', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: productCapability, exact: true }).click();
    await page.waitForTimeout(500);
  }

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(3000);

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
  const categories = globalThis.__kaCategories;
  const articleUrl = globalThis.__kaArticleUrl;
  if (!categories?.productLine || !categories?.productArea) {
    throw new Error('Set globalThis.__kaCategories before running fill script');
  }

  if (!page.url().includes('navigateProductTagging')) {
    if (!articleUrl) throw new Error('Set globalThis.__kaArticleUrl');
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
    await page.waitForTimeout(2000);
  }

  const body = await page.evaluate(() => document.body.innerText);
  if (
    body.includes(categories.productLine) &&
    body.includes(categories.productArea) &&
    (!categories.productCapability || body.includes(categories.productCapability))
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
    await page.waitForTimeout(500);
  }

  await page.getByText('Select Product Line', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: categories.productLine, exact: true }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');

  await page.getByText('Select Product Area', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: categories.productArea, exact: true }).click();
  await page.waitForTimeout(500);

  if (categories.productCapability) {
    await page.getByText('Select Product Capability', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: categories.productCapability, exact: true }).click();
    await page.waitForTimeout(500);
  }

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(3000);
  return { success: true, categories };
}`;
}

module.exports = {
  fillRelatedCategories,
  fillFromAppointment,
  getMcpFillScript,
  matrixData,
};
