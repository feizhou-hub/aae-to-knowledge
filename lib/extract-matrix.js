'use strict';

const { getMcpSessionHelpersSource } = require('./salesforce-session');

function getMcpExtractScript() {
  return `async (page) => {
  ${getMcpSessionHelpersSource()}
  const articleUrl = globalThis.__kaArticleUrl;
  if (!articleUrl) throw new Error('Set globalThis.__kaArticleUrl to a Knowledge article URL');

  await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
  await waitVisible(page.getByRole('button', { name: 'Add / Edit Related Categories' }), 20000);
  await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
  await waitVisible(page.getByRole('button', { name: 'New' }), 15000);

  const matrix = {};
  const productLines = [];

  await page.getByRole('button', { name: 'New' }).click();
  await waitVisible(page.getByText('Select Product Line', { exact: true }).last(), 8000);
  await page.getByText('Select Product Line', { exact: true }).last().click({ force: true });
  await waitVisible(page.getByRole('option').first(), 8000);

  const lineOptions = await page.getByRole('option').allTextContents();
  await page.keyboard.press('Escape');

  for (const line of lineOptions) {
    if (!line.trim()) continue;
    productLines.push(line.trim());
    matrix[line.trim()] = {};

    await page.getByRole('button', { name: 'New' }).click();
    await waitVisible(page.getByText('Select Product Line', { exact: true }).last(), 8000);
    await page.getByText('Select Product Line', { exact: true }).last().click({ force: true });
    await waitVisible(page.getByRole('option', { name: line.trim(), exact: true }), 8000);
    await page.getByRole('option', { name: line.trim(), exact: true }).click();
    await page.keyboard.press('Escape');

    await page.getByText('Select Product Area', { exact: true }).last().click({ force: true });
    await waitVisible(page.getByRole('option').first(), 8000);
    const areaOptions = await page.getByRole('option').allTextContents();
    await page.keyboard.press('Escape');

    for (const area of areaOptions) {
      if (!area.trim()) continue;
      matrix[line.trim()][area.trim()] = [];

      await page.getByText('Select Product Area', { exact: true }).last().click({ force: true });
      await waitVisible(page.getByRole('option', { name: area.trim(), exact: true }), 8000);
      await page.getByRole('option', { name: area.trim(), exact: true }).click();

      await page.getByText('Select Product Capability', { exact: true }).last().click({ force: true });
      await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const capOptions = await page.getByRole('option').allTextContents();
      await page.keyboard.press('Escape');

      matrix[line.trim()][area.trim()] = capOptions
        .map((c) => c.trim())
        .filter(Boolean);

      await page.keyboard.press('Escape');
    }

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
  }

  return {
    _meta: {
      extractedAt: new Date().toISOString().slice(0, 10),
      source: 'Salesforce Knowledge Related Categories picklists',
      productLines,
    },
    appointmentMappings: globalThis.__kaAppointmentMappings || {},
    matrix,
  };
}`;
}

module.exports = { getMcpExtractScript };
