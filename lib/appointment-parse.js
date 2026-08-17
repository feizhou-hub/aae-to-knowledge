'use strict';

/**
 * Pure parsers for appointment Details / Notes / Questionnaire text.
 * Inlined into Playwright MCP scripts via getAppointmentParseSource().
 */

function parseField(text, label) {
  const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped + '\\s*\\n+([^\\n]+)', 'i');
  const m = String(text || '').match(re);
  if (!m) return null;
  const value = m[1].trim();
  if (!value || /^(Tabs|Preview|Follow|Edit|Delete|More)$/i.test(value)) return null;
  return value;
}

function parseNotes(text) {
  const parts = String(text || '').split(/Created By:\s*/);
  const notes = [];
  for (const part of parts.slice(1)) {
    const headerMatch = part.match(/^([^\n(]+?)\s*\(([^)]+)\)/);
    const author = headerMatch ? headerMatch[1].trim() : null;
    const date = headerMatch ? headerMatch[2].trim() : null;
    let body = headerMatch ? part.slice(headerMatch[0].length) : part;
    body = body.split(/\n(?:Edit|Delete)\n|\nRequest Summary\n|\nTabs\n/)[0].trim();
    if (body) notes.push({ author, date, body: body.slice(0, 12000) });
  }
  return notes;
}

function parseQuestionnaire(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const pairs = [];
  const skip = /^(Question|Response|Action|Row Number|Notes|Details|Questionnaire|Show Actions)$/i;
  for (let i = 0; i < lines.length - 1; i++) {
    const isQuestion =
      lines[i].endsWith('?') || /^(Please |How |What |Do you |Is |Why |When |Where )/i.test(lines[i]);
    if (!isQuestion || skip.test(lines[i])) continue;
    const response = lines[i + 1];
    if (!response || response.endsWith('?') || skip.test(response)) continue;
    if (/^(Please |How |What |Do you |Is |Why |When |Where )/i.test(response)) continue;
    pairs.push({ question: lines[i], response });
  }
  return pairs;
}

function buildSearchQuery(appointment) {
  const stop = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'please',
    'thanks', 'thank', 'regards', 'would', 'could', 'about', 'after', 'before',
    'which', 'there', 'their', 'them', 'then', 'than', 'into', 'just', 'also',
    'hello', 'what', 'when', 'where', 'some', 'more', 'like', 'make', 'need',
  ]);
  const noteText = (appointment.publicNotes || [])
    .map((note) => note.body || '')
    .join(' ');
  const source = [
    appointment.subject,
    appointment.capability,
    appointment.productArea,
    noteText,
  ]
    .filter(Boolean)
    .join(' ');
  const words = source
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^A-Za-z0-9_./-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word.toLowerCase()) && !/^\d+$/.test(word));
  return [...new Set(words)].slice(0, 8).join(' ');
}

function getAppointmentParseSource() {
  return `
  ${parseField.toString()}
  ${parseNotes.toString()}
  ${parseQuestionnaire.toString()}
  ${buildSearchQuery.toString()}
`;
}

module.exports = {
  parseField,
  parseNotes,
  parseQuestionnaire,
  buildSearchQuery,
  getAppointmentParseSource,
};
