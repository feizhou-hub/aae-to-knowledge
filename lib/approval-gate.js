'use strict';

const fs = require('fs');
const path = require('path');

const WORKFLOW_DIR = path.join(__dirname, '..', '.ka-workflow');
const STATUSES = {
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  CREATED: 'created',
};

function ensureWorkflowDir() {
  fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
}

function normalizeReqId(reqId) {
  const value = String(reqId || '').trim();
  const match = value.match(/REQ-\d+/i);
  if (match) return match[0].toUpperCase();
  throw new Error(`Invalid REQ id: ${reqId}`);
}

function statePath(reqId) {
  return path.join(WORKFLOW_DIR, `${normalizeReqId(reqId)}.json`);
}

function readState(reqId) {
  const file = statePath(reqId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeState(reqId, state) {
  ensureWorkflowDir();
  fs.writeFileSync(statePath(reqId), JSON.stringify(state, null, 2) + '\n');
}

/**
 * Call after saving draft-REQ-######.md (end of Step 4).
 * Blocks Salesforce writes until markApproved().
 */
function registerDraft(reqId, { draftPath, sourceUrl, title } = {}) {
  const id = normalizeReqId(reqId);
  const now = new Date().toISOString();
  const state = {
    reqId: id,
    status: STATUSES.PENDING_REVIEW,
    draftPath: draftPath || `draft-${id}.md`,
    sourceUrl: sourceUrl || null,
    title: title || null,
    registeredAt: now,
    approvedAt: null,
    createdAt: null,
  };
  writeState(id, state);
  return state;
}

/**
 * Call only after the user explicitly approves the draft in a follow-up message.
 */
function markApproved(reqId) {
  const id = normalizeReqId(reqId);
  const existing = readState(id);
  if (!existing) {
    throw new Error(
      `Cannot approve ${id}: no draft registered. Call registerDraft() after saving the markdown draft.`
    );
  }
  if (existing.status === STATUSES.CREATED) {
    return existing;
  }
  const state = {
    ...existing,
    status: STATUSES.APPROVED,
    approvedAt: new Date().toISOString(),
  };
  writeState(id, state);
  return state;
}

/**
 * Call after Salesforce draft is saved (end of Step 5).
 */
function markCreated(reqId, { articleUrl } = {}) {
  const id = normalizeReqId(reqId);
  const existing = readState(id);
  if (!existing) {
    throw new Error(`Cannot mark created: ${id} is not registered.`);
  }
  const state = {
    ...existing,
    status: STATUSES.CREATED,
    articleUrl: articleUrl || null,
    createdAt: new Date().toISOString(),
  };
  writeState(id, state);
  return state;
}

function isApproved(reqId) {
  const state = readState(reqId);
  return (
    state?.status === STATUSES.APPROVED || state?.status === STATUSES.CREATED
  );
}

function assertApproved(reqId) {
  const id = normalizeReqId(reqId);
  const state = readState(id);
  if (!state) {
    throw new Error(
      `REVIEW GATE (${id}): No draft registered. Complete Step 4 (save draft-${id}.md, call registerDraft), present the draft to the user, and wait for explicit approval before any Salesforce write.`
    );
  }
  if (state.status === STATUSES.PENDING_REVIEW) {
    throw new Error(
      `REVIEW GATE (${id}): Draft is pending review. Present draft-${id}.md to the user and STOP. Do not navigate to Salesforce Knowledge, click New Article, Save, or fill Related Categories until the user replies with explicit approval (e.g. "approved", "looks good", "create it in Salesforce").`
    );
  }
  if (state.status === STATUSES.CREATED) {
    throw new Error(
      `REVIEW GATE (${id}): Salesforce draft already created${state.articleUrl ? ` at ${state.articleUrl}` : ''}.`
    );
  }
  return state;
}

function listPending() {
  ensureWorkflowDir();
  return fs
    .readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readState(name.replace('.json', '')))
    .filter((state) => state?.status === STATUSES.PENDING_REVIEW);
}

module.exports = {
  STATUSES,
  WORKFLOW_DIR,
  normalizeReqId,
  registerDraft,
  markApproved,
  markCreated,
  isApproved,
  assertApproved,
  readState,
  listPending,
};
