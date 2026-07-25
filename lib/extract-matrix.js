'use strict';

function getMcpExtractScript() {
  return `async (page) => {
  const articleUrl = globalThis.__kaArticleUrl;
  if (!articleUrl) throw new Error('Set globalThis.__kaArticleUrl to a Knowledge article URL');

  await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Add / Edit Related Categories' }).click();
  await page.waitForTimeout(2000);

  const matrix = {};
  const productLines = [];

  await page.getByRole('button', { name: 'New' }).click();
  await page.waitForTimeout(500);

  await page.getByText('Select Product Line', { exact: true }).last().click({ force: true });
  await page.waitForTimeout(500);

  const lineOptions = await page.getByRole('option').allTextContents();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  for (const line of lineOptions) {
    if (!line.trim()) continue;
    productLines.push(line.trim());
    matrix[line.trim()] = {};

    await page.getByRole('button', { name: 'New' }).click();
    await page.waitForTimeout(500);

    await page.getByText('Select Product Line', { exact: true }).last().click({ force: true });
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: line.trim(), exact: true }).click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');

    await page.getByText('Select Product Area', { exact: true }).last().click({ force: true });
    await page.waitForTimeout(500);
    const areaOptions = await page.getByRole('option').allTextContents();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    for (const area of areaOptions) {
      if (!area.trim()) continue;
      matrix[line.trim()][area.trim()] = [];

      await page.getByText('Select Product Area', { exact: true }).last().click({ force: true });
      await page.waitForTimeout(300);
      await page.getByRole('option', { name: area.trim(), exact: true }).click();
      await page.waitForTimeout(500);

      await page.getByText('Select Product Capability', { exact: true }).last().click({ force: true });
      await page.waitForTimeout(500);
      const capOptions = await page.getByRole('option').allTextContents();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      matrix[line.trim()][area.trim()] = capOptions
        .map((c) => c.trim())
        .filter(Boolean);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cancel' }).click().catch(() => {});
    await page.waitForTimeout(500);
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
