'use strict';

/**
 * Maps Salesforce Knowledge Article rich-text field labels to TinyMCE editor IDs.
 *
 * tinymce.get() order does NOT match the visual field order on the form.
 * Confirmed 2026-07-25 on Knowledge Articles template:
 *   Description    → discovered via label (NOT editors[0])
 *   Resolution     → discovered via label
 *   Internal Notes → discovered via label
 *
 * Always discover the mapping from DOM labels — never assume tinymce.get() index.
 */

const FIELD_ALIASES = {
  description: ['Description', 'Issue'],
  resolution: ['Resolution'],
  internalNotes: ['Internal Notes'],
  cause: ['Cause'],
};

function setFieldsInBrowser(fields, aliases) {
  const map = {};
  const iframes = document.querySelectorAll('iframe[id$="_ifr"]');
  for (const iframe of iframes) {
    const editorId = iframe.id.replace('_ifr', '');
    let el = iframe;
    for (let i = 0; i < 30 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      const lbl = el.querySelector('.slds-form-element__label, label');
      if (lbl) {
        const text = lbl.textContent.trim();
        if (text) {
          map[text] = editorId;
          break;
        }
      }
    }
  }

  const results = {};
  for (const [key, html] of Object.entries(fields)) {
    if (!html) continue;
    const labels = aliases[key];
    if (!labels) throw new Error('Unknown field key: ' + key);
    let editorId = null;
    for (const label of labels) {
      if (map[label]) {
        editorId = map[label];
        break;
      }
    }
    if (!editorId) {
      throw new Error(
        'No editor found for field: ' +
          key +
          ' (labels: ' +
          labels.join(', ') +
          '). Discovered: ' +
          JSON.stringify(map)
      );
    }
    const editor = tinymce.get(editorId);
    editor.setContent(html);
    editor.fire('change');
    editor.save();
    results[key] = { editorId, len: editor.getContent().length };
  }
  return { map, results };
}

/**
 * Playwright helper: set rich-text fields on the current KA form page.
 * @param {import('playwright').Page} page
 * @param {Object} fields - { description?, resolution?, internalNotes?, cause? }
 */
async function setRichTextFields(page, fields) {
  return page.evaluate(
    (payload) => {
      const { fields, aliases } = payload;
      const map = {};
      document.querySelectorAll('iframe[id$="_ifr"]').forEach((iframe) => {
        const editorId = iframe.id.replace('_ifr', '');
        let el = iframe;
        for (let i = 0; i < 30 && el; i++) {
          el = el.parentElement;
          if (!el) break;
          const lbl = el.querySelector('.slds-form-element__label, label');
          if (lbl) {
            const text = lbl.textContent.trim();
            if (text) {
              map[text] = editorId;
              break;
            }
          }
        }
      });
      const results = {};
      for (const [key, html] of Object.entries(fields)) {
        if (!html) continue;
        const labels = aliases[key];
        if (!labels) throw new Error('Unknown field key: ' + key);
        let editorId = null;
        for (const label of labels) {
          if (map[label]) {
            editorId = map[label];
            break;
          }
        }
        if (!editorId) {
          throw new Error(
            'No editor found for field: ' +
              key +
              ' (labels: ' +
              labels.join(', ') +
              '). Discovered: ' +
              JSON.stringify(map)
          );
        }
        const editor = tinymce.get(editorId);
        editor.setContent(html);
        editor.fire('change');
        editor.save();
        results[key] = { editorId, len: editor.getContent().length };
      }
      return { map, results };
    },
    { fields, aliases: FIELD_ALIASES }
  );
}

/**
 * Returns an async Playwright script for browser_run_code_unsafe.
 * Set globalThis.__kaRichTextFields before running.
 *
 * For KA creation workflow, use getMcpSetRichTextScript(reqId) from
 * salesforce-write.js instead — it enforces the human review gate.
 */
function getMcpSetRichTextScript() {
  const aliasesJson = JSON.stringify(FIELD_ALIASES);
  return `async (page) => {
  const fields = globalThis.__kaRichTextFields;
  if (!fields) throw new Error('Set globalThis.__kaRichTextFields before running');
  const aliases = ${aliasesJson};
  return await page.evaluate((payload) => {
    const { fields, aliases } = payload;
    const map = {};
    document.querySelectorAll('iframe[id$="_ifr"]').forEach((iframe) => {
      const editorId = iframe.id.replace('_ifr', '');
      let el = iframe;
      for (let i = 0; i < 30 && el; i++) {
        el = el.parentElement;
        if (!el) break;
        const lbl = el.querySelector('.slds-form-element__label, label');
        if (lbl) {
          const text = lbl.textContent.trim();
          if (text) { map[text] = editorId; break; }
        }
      }
    });
    const results = {};
    for (const [key, html] of Object.entries(fields)) {
      if (!html) continue;
      const labels = aliases[key];
      let editorId = null;
      for (const label of labels) {
        if (map[label]) { editorId = map[label]; break; }
      }
      if (!editorId) throw new Error('No editor for ' + key + '. Map: ' + JSON.stringify(map));
      const editor = tinymce.get(editorId);
      editor.setContent(html);
      editor.fire('change');
      editor.save();
      results[key] = { editorId, len: editor.getContent().length };
    }
    return { map, results };
  }, { fields, aliases });
}`;
}

module.exports = {
  FIELD_ALIASES,
  setFieldsInBrowser,
  setRichTextFields,
  getMcpSetRichTextScript,
};
