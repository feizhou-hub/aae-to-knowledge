'use strict';

/**
 * TinyMCE editor order does NOT match visual field order on the KA form.
 * Always discover editors by label text, never by tinymce.get() index.
 */
const FIELD_ALIASES = {
  description: ['Description', 'Issue'],
  resolution: ['Resolution'],
  internalNotes: ['Internal Notes'],
  cause: ['Cause'],
};

const RICH_TEXT_EVALUATE_BODY = `
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
    if (!labels) throw new Error('Unknown field key: ' + key);
    let editorId = null;
    for (const label of labels) {
      if (map[label]) { editorId = map[label]; break; }
    }
    if (!editorId) {
      throw new Error('No editor for ' + key + '. Map: ' + JSON.stringify(map));
    }
    const editor = tinymce.get(editorId);
    editor.setContent(html);
    editor.fire('change');
    editor.save();
    results[key] = { editorId, len: editor.getContent().length };
  }
  return { map, results };
`;

function getMcpSetRichTextScript() {
  const aliasesJson = JSON.stringify(FIELD_ALIASES);
  return `async (page) => {
  const fields = globalThis.__kaRichTextFields;
  if (!fields) throw new Error('Set globalThis.__kaRichTextFields before running');
  return await page.evaluate((payload) => {${RICH_TEXT_EVALUATE_BODY}
  }, { fields, aliases: ${aliasesJson} });
}`;
}

module.exports = {
  FIELD_ALIASES,
  getMcpSetRichTextScript,
};
