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

const REQUEST_DETAILS_END =
  /^(Customer Details|Tenant Details|Assign Me As Consultant|QL Details|Consultant Details|Meeting Details|Cancellation Details|Feedback Details)\s*$/m;

function requestDetailsBlock(text) {
  const source = String(text || '');
  const parts = source.split(/^Request Details\s*$/m);
  const block = parts.length >= 2 ? parts[1] : source;
  return block.split(REQUEST_DETAILS_END)[0];
}

/** Subject + Details body from the Request Details accordion — not "Ask an Expert Details". */
function parseRequestDetails(text) {
  const block = requestDetailsBlock(text);
  const subject = parseField(block, 'Subject');
  const match = block.match(/^Details\s*\n+([\s\S]*)$/m);
  const description = match ? match[1].trim() : null;
  return {
    subject: subject || null,
    description: description || null,
  };
}

function detailsNeedExpand(text) {
  return !parseRequestDetails(text).subject;
}

function notesNeedRetry(text) {
  const source = String(text || '');
  if (/Created By:/i.test(source)) return false;
  if (/Loading/i.test(source)) return true;
  if (/No records to display/i.test(source)) return true;
  return !source.trim();
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

function searchStopWords() {
  return new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'please',
    'thanks', 'thank', 'regards', 'would', 'could', 'about', 'after', 'before',
    'which', 'there', 'their', 'them', 'then', 'than', 'into', 'just', 'also',
    'hello', 'what', 'when', 'where', 'some', 'more', 'like', 'make', 'need',
    'hi', 'hey', 'dear',
  ]);
}

const MENTION_NAME = /@([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3})/g;

function addNameTokens(tokens, value) {
  String(value || '')
    .split(/[^A-Za-z]+/)
    .filter((part) => part.length > 1)
    .forEach((part) => tokens.add(part.toLowerCase()));
}

function collectPersonTokens(appointment) {
  const tokens = new Set();
  for (const note of appointment.publicNotes || []) {
    addNameTokens(tokens, note.author);
    const body = String(note.body || '');
    for (const match of body.matchAll(new RegExp(MENTION_NAME.source, 'g'))) {
      addNameTokens(tokens, match[1]);
    }
  }
  return tokens;
}

function tokenizeSearchText(text, personTokens) {
  const stop = searchStopWords();
  const excluded = personTokens || new Set();
  const stripped = String(text || '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(new RegExp(MENTION_NAME.source, 'g'), ' ');
  return stripped
    .replace(/[^A-Za-z0-9_./-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => {
      if (word.length <= 3) return false;
      if (/^\d+$/.test(word)) return false;
      const lower = word.toLowerCase();
      if (stop.has(lower) || excluded.has(lower)) return false;
      if (/^req-\d+/i.test(word) || /^app-\d+/i.test(word)) return false;
      if (word.includes('@')) return false;
      return true;
    });
}

function uniqueSearchWords(words) {
  const seen = new Set();
  const out = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

function buildSearchQuery(appointment) {
  const row = appointment || {};
  const personTokens = collectPersonTokens(row);
  const primary = uniqueSearchWords(
    tokenizeSearchText(
      [row.subject, row.capability, row.productArea].filter(Boolean).join(' '),
      personTokens
    )
  );
  if (primary.length >= 5) return primary.slice(0, 8).join(' ');
  const noteText = (row.publicNotes || []).map((note) => note.body || '').join(' ');
  return uniqueSearchWords(primary.concat(tokenizeSearchText(noteText, personTokens)))
    .slice(0, 8)
    .join(' ');
}

function getAppointmentParseSource() {
  return `
  ${parseField.toString()}
  const REQUEST_DETAILS_END = ${REQUEST_DETAILS_END.toString()};
  ${requestDetailsBlock.toString()}
  ${parseRequestDetails.toString()}
  ${detailsNeedExpand.toString()}
  ${notesNeedRetry.toString()}
  ${parseNotes.toString()}
  ${parseQuestionnaire.toString()}
  ${searchStopWords.toString()}
  const MENTION_NAME = ${MENTION_NAME.toString()};
  ${addNameTokens.toString()}
  ${collectPersonTokens.toString()}
  ${tokenizeSearchText.toString()}
  ${uniqueSearchWords.toString()}
  ${buildSearchQuery.toString()}
`;
}

module.exports = {
  parseField,
  parseNotes,
  parseQuestionnaire,
  parseRequestDetails,
  detailsNeedExpand,
  notesNeedRetry,
  collectPersonTokens,
  buildSearchQuery,
  getAppointmentParseSource,
};
