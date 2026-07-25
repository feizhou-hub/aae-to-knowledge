'use strict';

const FILL_CATEGORIES_BODY = `
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
`;

function getMcpFillScript() {
  return `async (page) => {${FILL_CATEGORIES_BODY}}`;
}

module.exports = { getMcpFillScript };
