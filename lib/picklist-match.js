'use strict';

const { fuzzyFind, normalize } = require('./category-resolver');

/**
 * Appointment / stale-matrix labels that are not on the live Related Categories
 * picklist. Used when the open dropdown does not contain the preferred value.
 */
const PICKLIST_SYNONYMS = {
  Authentication: ['Security - Integrations'],
  'Authentication Policies': ['Tenant Configuration', 'General'],
  Integration: ['Integration Management'],
};

function pickClosestOption(preferred, options, extraFallbacks = []) {
  const list = [
    ...new Set(
      (options || [])
        .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    ),
  ];
  if (!preferred || !list.length) return null;

  const exact = list.find((option) => normalize(option) === normalize(preferred));
  if (exact) return exact;

  for (const candidate of [...extraFallbacks, ...(PICKLIST_SYNONYMS[preferred] || [])]) {
    const hit = list.find((option) => normalize(option) === normalize(candidate));
    if (hit) return hit;
  }

  return fuzzyFind(preferred, list);
}

function getPicklistMatchSource() {
  return `
  function pickNormalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function pickFuzzyFind(key, candidates) {
    const needle = pickNormalize(key);
    if (!needle) return null;
    const exact = candidates.find((candidate) => pickNormalize(candidate) === needle);
    if (exact) return exact;
    const contains = candidates.find((candidate) => {
      const hay = pickNormalize(candidate);
      return hay.includes(needle) || needle.includes(hay);
    });
    if (contains) return contains;
    let best = null;
    let bestScore = 0;
    for (const candidate of candidates) {
      const hay = pickNormalize(candidate);
      const words = needle.split(' ').filter(Boolean);
      const score = words.filter((word) => hay.includes(word)).length;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return bestScore > 0 ? best : null;
  }

  const PICKLIST_SYNONYMS = ${JSON.stringify(PICKLIST_SYNONYMS)};

  function pickClosestOption(preferred, options, extraFallbacks) {
    const list = [...new Set((options || [])
      .map((value) => String(value || '').replace(/\\s+/g, ' ').trim())
      .filter(Boolean))];
    if (!preferred || !list.length) return null;
    const exact = list.find((option) => pickNormalize(option) === pickNormalize(preferred));
    if (exact) return exact;
    for (const candidate of [...(extraFallbacks || []), ...(PICKLIST_SYNONYMS[preferred] || [])]) {
      const hit = list.find((option) => pickNormalize(option) === pickNormalize(candidate));
      if (hit) return hit;
    }
    return pickFuzzyFind(preferred, list);
  }

  async function selectComboOption(triggerName, preferred, extraFallbacks) {
    await page.getByText(triggerName, { exact: true }).first().click({ force: true });
    const exact = page.getByRole('option', { name: preferred, exact: true });
    const appeared = await exact.waitFor({ state: 'visible', timeout: 1200 }).then(() => true).catch(() => false);
    if (appeared) {
      await exact.click();
      return { selected: preferred, matchedExact: true };
    }
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 4000 });
    const options = (await page.getByRole('option').allTextContents())
      .map((text) => text.replace(/\\s+/g, ' ').trim())
      .filter(Boolean);
    const selected = pickClosestOption(preferred, options, extraFallbacks);
    if (!selected) {
      throw new Error('No picklist match for "' + preferred + '". Live options: ' + options.join(', '));
    }
    await page.getByRole('option', { name: selected, exact: true }).click();
    return { selected, matchedExact: false, options };
  }
`;
}

module.exports = {
  PICKLIST_SYNONYMS,
  pickClosestOption,
  getPicklistMatchSource,
};
