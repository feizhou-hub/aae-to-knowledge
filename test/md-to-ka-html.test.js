'use strict';

const assert = require('assert');
const { mdToHtml } = require('../lib/md-to-ka-html');

const html = mdToHtml(`Apply **any combination**. These are not sequential steps.

### Option A — Separate Service Centers by purpose

*Use when one Service Center mixes unrelated mailboxes or processes.*

- **Grant security on the Service Center.** Representative access comes from the Service Center.
`);

assert.match(html, /<h3>Option A — Separate Service Centers by purpose<\/h3>/);
assert.match(
  html,
  /<p style="margin: 0 0 12px; font-style: italic; color: #706e6b; font-size: 13px;">Use when one Service Center mixes unrelated mailboxes or processes\.<\/p>/
);
assert.doesNotMatch(html, /<p><em>Use when/);
assert.match(html, /<strong>any combination<\/strong>/);

console.log('md-to-ka-html.test.js: ok');
