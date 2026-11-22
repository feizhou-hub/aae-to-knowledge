'use strict';

const fs = require('fs');

/**
 * Split draft-REQ-######.md into its `## Heading` sections.
 * Returns { Title, 'URL Name', Description, Resolution, 'Internal Notes', ... }.
 * Sections end at the next line that starts with "## " (not at the first line break).
 */
function parseDraftSections(markdownOrPath) {
  const md = /\n/.test(markdownOrPath) ? markdownOrPath : fs.readFileSync(markdownOrPath, 'utf8');
  const sections = {};
  let name = null;
  let buf = [];
  const flush = () => {
    if (name) sections[name] = buf.join('\n').trim();
  };
  for (const line of md.split('\n')) {
    const m = line.match(/^## (.+?)\s*$/);
    if (m) {
      flush();
      name = m[1];
      buf = [];
    } else if (name) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

module.exports = { parseDraftSections };
